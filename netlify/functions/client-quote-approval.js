const crypto = require("node:crypto");
const {
  ipFromEvent,
  json,
  rateLimit,
  requirePermission,
  supabaseAdminRequest,
  writeAuditLog,
  writeSystemError
} = require("./lib/dashboard-auth");
const { getSiteUrl } = require("./lib/site-url");

function parseBody(event) {
  try {
    return event.body ? JSON.parse(event.body) : {};
  } catch {
    const error = new Error("Invalid JSON.");
    error.statusCode = 400;
    throw error;
  }
}

function cleanText(value, max = 2000) {
  return String(value || "").trim().slice(0, max);
}

function tokenHash(token) {
  return crypto.createHash("sha256").update(String(token || "")).digest("hex");
}

function validToken(value) {
  const token = cleanText(value, 200);
  return /^[A-Za-z0-9_-]{32,200}$/.test(token) ? token : "";
}

async function recordShareEvent(linkId, event, eventType, metadata = {}) {
  const ipHash = crypto.createHash("sha256").update(ipFromEvent(event)).digest("hex");
  await supabaseAdminRequest("client_share_link_events", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      share_link_id: linkId,
      event_type: eventType,
      ip_hash: ipHash,
      user_agent: cleanText(event.headers?.["user-agent"] || event.headers?.["User-Agent"], 500),
      metadata
    })
  });
}

async function sendEmail({ to, subject, link, clientName, quoteNumber }) {
  if (!process.env.RESEND_API_KEY || !to) return { status: "not_configured", channel: "email" };
  const from = process.env.QUOTE_EMAIL_FROM || process.env.RESEND_FROM_EMAIL || "Urban Yards <team@urbanyards.us>";
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html: `<p>Hello ${clientName || "there"},</p><p>Your Urban Yards quote ${quoteNumber} is ready for review.</p><p><a href="${link}">Review and approve your quote</a></p><p>This private link expires automatically.</p>`
    }),
    signal: AbortSignal.timeout(10000)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || "Approval email could not be sent.");
  return { status: "sent", channel: "email", providerId: payload.id || "" };
}

async function sendSms({ to, link, quoteNumber }) {
  const sid = process.env.TWILIO_ACCOUNT_SID || "";
  const token = process.env.TWILIO_AUTH_TOKEN || "";
  const from = process.env.TWILIO_FROM_NUMBER || "";
  if (!sid || !token || !from || !to) return { status: "not_configured", channel: "sms" };
  const body = new URLSearchParams({
    From: from,
    To: to,
    Body: `Urban Yards quote ${quoteNumber} is ready. Review and respond securely: ${link}`
  });
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body,
    signal: AbortSignal.timeout(10000)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || "Approval text could not be sent.");
  return { status: "sent", channel: "sms", providerId: payload.sid || "" };
}

async function createShare(event, body) {
  const permission = await requirePermission(event, "operations:share", { entityType: "sales_documents" });
  if (!permission.ok) return json(permission.statusCode, { error: permission.error });

  const documentId = cleanText(body.documentId, 80);
  const rows = await supabaseAdminRequest(`sales_documents?id=eq.${encodeURIComponent(documentId)}&select=*&limit=1`, { method: "GET" });
  const document = rows?.[0];
  if (!document || document.document_type !== "estimate") return json(404, { error: "Quote not found." });

  const ticketRows = body.ticketId
    ? await supabaseAdminRequest(`job_tickets?id=eq.${encodeURIComponent(cleanText(body.ticketId, 80))}&select=id,ticket_number&limit=1`, { method: "GET" })
    : await supabaseAdminRequest(`job_tickets?quote_id=eq.${encodeURIComponent(documentId)}&select=id,ticket_number&limit=1`, { method: "GET" });
  const ticket = ticketRows?.[0] || null;
  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + Math.min(30, Math.max(1, Number(body.expiresInDays || 14))) * 86400000).toISOString();
  const linkRows = await supabaseAdminRequest("client_share_links", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      related_table: "sales_documents",
      related_id: documentId,
      contact_email: cleanText(body.contactEmail || document.client_email, 320) || null,
      title: `Urban Yards quote ${document.document_number}`,
      token_hash: tokenHash(token),
      token_hint: token.slice(-6),
      status: "Active",
      expires_at: expiresAt,
      allowed_sections: ["quote", "approval"],
      metadata: {
        ticketId: ticket?.id || null,
        ticketNumber: ticket?.ticket_number || null,
        quoteNumber: document.document_number,
        deliveryChannel: cleanText(body.delivery, 20) || "copy"
      },
      created_by: permission.actor?.userId || null
    })
  });
  const share = linkRows?.[0];
  const url = `${getSiteUrl(event)}/quote-approval?token=${encodeURIComponent(token)}`;
  const deliveryChannel = cleanText(body.delivery, 20).toLowerCase();
  let delivery = { status: "link_created", channel: deliveryChannel || "copy" };
  if (deliveryChannel === "email") {
    delivery = await sendEmail({
      to: cleanText(body.contactEmail || document.client_email, 320),
      subject: `Urban Yards quote ${document.document_number}`,
      link: url,
      clientName: document.client_name,
      quoteNumber: document.document_number
    });
  } else if (deliveryChannel === "sms") {
    delivery = await sendSms({
      to: cleanText(body.contactPhone, 40),
      link: url,
      quoteNumber: document.document_number
    });
  }

  await supabaseAdminRequest(`sales_documents?id=eq.${encodeURIComponent(documentId)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ status: "sent" })
  });
  if (ticket?.id) {
    await supabaseAdminRequest(`job_tickets?id=eq.${encodeURIComponent(ticket.id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        stage: "customer_approval_pending",
        status: "open",
        next_action: "Await secure customer quote response",
        updated_at: new Date().toISOString()
      })
    });
    await supabaseAdminRequest("job_ticket_events", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        ticket_id: ticket.id,
        event_type: "customer_quote_sent",
        actor_user_id: permission.actor?.userId || null,
        notes: `Secure approval link created for quote ${document.document_number}.`,
        new_value: { shareLinkId: share.id, delivery }
      })
    });
  }

  await supabaseAdminRequest("approval_requests", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      request_type: "Customer Quote Approval",
      related_table: "sales_documents",
      related_id: documentId,
      title: `Approve quote ${document.document_number}`,
      description: "Customer review through the secure Urban Yards quote portal.",
      status: "Pending",
      due_at: expiresAt,
      requested_by: permission.actor?.userId || null,
      created_by: permission.actor?.userId || null,
      metadata: { shareLinkId: share.id, ticketId: ticket?.id || null, delivery }
    })
  });
  await supabaseAdminRequest("communications", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      direction: "outbound",
      channel: deliveryChannel === "sms" ? "sms" : deliveryChannel === "email" ? "email" : "portal",
      related_table: "sales_documents",
      related_id: documentId,
      contact_name: document.client_name,
      contact_email: document.client_email || null,
      contact_phone: cleanText(body.contactPhone, 40) || null,
      subject: `Urban Yards quote ${document.document_number}`,
      body: "Secure quote approval link created.",
      outcome: delivery.status,
      sent_at: delivery.status === "sent" ? new Date().toISOString() : null,
      created_by: permission.actor?.userId || null
    })
  });
  await recordShareEvent(share.id, event, "created", { delivery });
  await writeAuditLog({
    actor: permission.actor,
    action: "quote_approval_link_created",
    entityType: "sales_documents",
    entityId: documentId,
    metadata: { shareLinkId: share.id, delivery },
    event
  });
  return json(200, { url, expiresAt, delivery });
}

async function shareFromToken(token) {
  const rows = await supabaseAdminRequest(`client_share_links?token_hash=eq.${encodeURIComponent(tokenHash(token))}&select=*&limit=1`, { method: "GET" });
  const share = rows?.[0];
  if (!share || share.status !== "Active") return { error: "This approval link is invalid or no longer active.", statusCode: 404 };
  if (share.expires_at && new Date(share.expires_at).getTime() <= Date.now()) {
    await supabaseAdminRequest(`client_share_links?id=eq.${encodeURIComponent(share.id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ status: "Expired", updated_at: new Date().toISOString() })
    });
    return { error: "This approval link has expired. Please ask Urban Yards for a new link.", statusCode: 410 };
  }
  return { share };
}

async function viewShare(event, body) {
  const token = validToken(body.token);
  if (!token) return json(400, { error: "Approval token is missing." });
  const result = await shareFromToken(token);
  if (result.error) return json(result.statusCode, { error: result.error });
  const share = result.share;
  const rows = await supabaseAdminRequest(`sales_documents?id=eq.${encodeURIComponent(share.related_id)}&select=*&limit=1`, { method: "GET" });
  const document = rows?.[0];
  if (!document || document.document_type !== "estimate") return json(404, { error: "Quote not found." });
  await supabaseAdminRequest(`client_share_links?id=eq.${encodeURIComponent(share.id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      last_viewed_at: new Date().toISOString(),
      view_count: Number(share.view_count || 0) + 1,
      updated_at: new Date().toISOString()
    })
  });
  await recordShareEvent(share.id, event, "viewed");
  return json(200, {
    quote: {
      number: document.document_number,
      clientName: document.client_name,
      clientEmail: document.client_email || "",
      issueDate: document.issue_date,
      dueDate: document.due_date,
      status: document.status,
      lineItems: Array.isArray(document.line_items) ? document.line_items : [],
      subtotal: Number(document.subtotal || 0),
      tax: Number(document.tax || 0),
      total: Number(document.total || 0),
      notes: document.notes || ""
    },
    expiresAt: share.expires_at,
    decision: share.metadata?.decision || ""
  });
}

async function decideShare(event, body) {
  const token = validToken(body.token);
  const decision = cleanText(body.decision, 40).toLowerCase();
  const customerName = cleanText(body.customerName, 160);
  const notes = cleanText(body.notes, 2000);
  if (!token || !["approved", "changes_requested"].includes(decision)) return json(400, { error: "Choose approve or request changes." });
  if (!customerName) return json(400, { error: "Enter your name to confirm this response." });
  const result = await shareFromToken(token);
  if (result.error) return json(result.statusCode, { error: result.error });
  const share = result.share;
  const now = new Date().toISOString();
  const approvalStatus = decision === "approved" ? "Approved" : "Needs More Info";

  try {
    await supabaseAdminRequest(`sales_documents?id=eq.${encodeURIComponent(share.related_id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ status: decision === "approved" ? "approved" : "sent" })
    });
  } catch (error) {
    if (!/constraint|status/i.test(error.message)) throw error;
  }
  const approvals = await supabaseAdminRequest(`approval_requests?related_table=eq.sales_documents&related_id=eq.${encodeURIComponent(share.related_id)}&status=eq.Pending&select=id&order=created_at.desc&limit=1`, { method: "GET" });
  if (approvals?.[0]?.id) {
    await supabaseAdminRequest(`approval_requests?id=eq.${encodeURIComponent(approvals[0].id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        status: approvalStatus,
        reviewed_at: now,
        decision_notes: notes || `${customerName} ${decision === "approved" ? "approved the quote" : "requested changes"}.`,
        updated_at: now,
        metadata: { shareLinkId: share.id, customerName, decision }
      })
    });
  }
  const ticketId = share.metadata?.ticketId;
  if (ticketId) {
    const ticketPayload = decision === "approved"
      ? { customer_approval_recorded: true, stage: "needs_budget", status: "open", next_action: "Begin internal cost review", updated_at: now }
      : { customer_approval_recorded: false, stage: "scope_change_requested", status: "on_hold", next_action: "Review customer-requested quote changes", updated_at: now };
    await supabaseAdminRequest(`job_tickets?id=eq.${encodeURIComponent(ticketId)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(ticketPayload)
    });
    await supabaseAdminRequest("job_ticket_events", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        ticket_id: ticketId,
        event_type: decision === "approved" ? "customer_quote_approved" : "customer_quote_changes_requested",
        notes: notes || `${customerName} submitted a secure quote response.`,
        new_value: { decision, customerName, shareLinkId: share.id }
      })
    });
  }
  await supabaseAdminRequest(`client_share_links?id=eq.${encodeURIComponent(share.id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      status: "Archived",
      metadata: { ...share.metadata, decision, customerName, decisionNotes: notes, decidedAt: now },
      updated_at: now
    })
  });
  await supabaseAdminRequest("communications", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      direction: "inbound",
      channel: "portal",
      related_table: "sales_documents",
      related_id: share.related_id,
      contact_name: customerName,
      contact_email: share.contact_email || null,
      subject: decision === "approved" ? "Quote approved" : "Quote changes requested",
      body: notes || `${customerName} submitted a secure quote response.`,
      outcome: approvalStatus,
      sent_at: now
    })
  });
  await recordShareEvent(share.id, event, decision, { customerName });
  return json(200, {
    decision,
    message: decision === "approved"
      ? "Thank you. Your approval was recorded and Urban Yards has been notified."
      : "Your requested changes were recorded and Urban Yards has been notified."
  });
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed." }, { Allow: "POST" });
  const requestLimit = rateLimit(`quote-approval:${ipFromEvent(event)}`, 40, 60000);
  if (!requestLimit.allowed) return json(429, { error: "Too many requests. Please wait and try again." }, { "Retry-After": String(requestLimit.retryAfter || 60) });
  try {
    const body = parseBody(event);
    const action = cleanText(body.action, 40).toLowerCase();
    if (action === "create") return createShare(event, body);
    if (action === "view") return viewShare(event, body);
    if (action === "decide") return decideShare(event, body);
    return json(400, { error: "Unsupported approval action." });
  } catch (error) {
    await writeSystemError({ error, route: "client-quote-approval", event });
    return json(error.statusCode || 500, { error: error.statusCode ? error.message : "Quote approval service is temporarily unavailable." });
  }
};
