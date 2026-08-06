const test = require("node:test");
const assert = require("node:assert/strict");

const {
  reconcileContributions,
  runTandemAssistant,
  shouldUseTandem,
  verifiedGrounding
} = require("../src/assistant/tandem-orchestrator");
const { createAssistantToolBroker } = require("../src/assistant/tool-broker");

const verifiedTicket = {
  id: "ticket-1042",
  entityType: "ticket",
  title: "Dakota Street gutter cleaning",
  status: "quote_sent",
  amount: 2500,
  details: { customerApprovalRecorded: false }
};

const groundedInput = {
  searchResults: [verifiedTicket],
  citations: [{ recordType: "ticket", recordId: "ticket-1042", displayId: "1042", title: verifiedTicket.title }],
  toolResults: [{
    name: "search_records",
    ok: true,
    output: { search: { results: [verifiedTicket], uniqueMatch: true }, records: [verifiedTicket] }
  }]
};

function contribution(statement, extras = {}) {
  return {
    findings: [{ statement, supportingRecordIds: ["ticket-1042"], confidence: "high" }],
    suggestedActions: extras.suggestedActions || [],
    ambiguities: extras.ambiguities || [],
    warnings: extras.warnings || [],
    optionalComment: extras.optionalComment || ""
  };
}

test("complicated requests run both providers against one verified fact set and deduplicate findings", async () => {
  const result = await runTandemAssistant({
    message: "Review the Dakota Street financial status and double-check it",
    routing: { intents: ["record_search", "analysis", "financial_action"] },
    ...groundedInput,
    applicationActions: [],
    groundskeeperTask: async () => contribution("The Dakota Street ticket is at Quote Sent with a $2,500 amount."),
    lawnmowerTask: async () => ({ consultation: contribution("The Dakota Street ticket is at Quote Sent with a $2,500 amount.") })
  });
  assert.equal(result.decision.useTandem, true);
  assert.deepEqual(result.collaboration.providers.sort(), ["google", "openai"]);
  assert.equal(result.reply.match(/\$2,500/g)?.length, 1);
  assert.equal(result.collaboration.contributions.every((item) => item.findings[0].supportingRecordIds[0] === "ticket-1042"), true);
});

test("Gemini ambiguity blocks navigation even when Groundskeeper selected one record", async () => {
  const result = await runTandemAssistant({
    message: "Find Greenbridge and open it",
    routing: { intents: ["record_search", "navigation"] },
    ...groundedInput,
    applicationActions: [{ type: "open_record", recordType: "ticket", recordId: "ticket-1042", presentation: "side_panel" }],
    groundskeeperTask: async () => contribution("The verified match is the Dakota Street ticket."),
    lawnmowerTask: async () => ({ consultation: contribution("The Dakota Street ticket is one candidate.", { ambiguities: ["A similarly named current lead also matches Greenbridge."] }) })
  });
  assert.equal(result.collaboration.requiresClarification, true);
  assert.deepEqual(result.finalActions, []);
  assert.match(result.reply, /more than one|similarly named|choose/i);
});

test("unsupported Gemini amounts are rejected before reconciliation", () => {
  const grounding = verifiedGrounding(groundedInput);
  const result = reconcileContributions({
    message: "What is the amount?",
    grounding,
    contributions: [
      { provider: "openai", value: contribution("The verified ticket amount is $2,500.") },
      { provider: "google", value: contribution("The ticket amount is $9,999.") }
    ],
    applicationActions: []
  });
  assert.match(result.reply, /\$2,500/);
  assert.doesNotMatch(result.reply, /\$9,999/);
  assert.equal(result.collaboration.rejectedFindings.some((finding) => finding.provider === "google"), true);
});

test("duplicate model recommendations cannot cause duplicate dashboard navigation", async () => {
  const openAction = { type: "open_record", recordType: "ticket", recordId: "ticket-1042", presentation: "side_panel" };
  const result = await runTandemAssistant({
    message: "Find the Dakota Street financial record and open it",
    routing: { intents: ["record_search", "financial_action", "navigation"] },
    ...groundedInput,
    applicationActions: [openAction, { ...openAction }],
    groundskeeperTask: async () => contribution("The Dakota Street ticket is the verified record.", { suggestedActions: [{ type: "OPEN_RECORD", recordId: "ticket-1042" }] }),
    lawnmowerTask: async () => ({ consultation: contribution("The Dakota Street ticket is the verified record.", { suggestedActions: [{ type: "OPEN_RECORD", recordId: "ticket-1042" }] }) })
  });
  assert.deepEqual(result.finalActions, [openAction]);
});

test("simple navigation stays on the Groundskeeper fast path", async () => {
  let geminiCalls = 0;
  const result = await runTandemAssistant({
    message: "Open the Money page.",
    routing: { intents: ["navigation"] },
    searchResults: [],
    toolResults: [],
    citations: [],
    applicationActions: [{ type: "navigate", route: "documents" }],
    groundskeeperTask: async () => ({ findings: [{ statement: "Opening Money.", supportingRecordIds: [], confidence: "high" }] }),
    lawnmowerTask: async () => { geminiCalls += 1; return { consultation: {} }; }
  });
  assert.equal(shouldUseTandem({ message: "Open the Money page." }), false);
  assert.equal(result.decision.useTandem, false);
  assert.equal(geminiCalls, 0);
  assert.equal(result.finalActions.length, 1);
  assert.equal(shouldUseTandem({ message: "Open ticket 1042.", routing: { intents: ["record_search", "navigation"] }, searchResults: [{ id: "1042" }] }), false);
  assert.equal(shouldUseTandem({ message: "Show today's route.", routing: { intents: ["record_search", "navigation"] } }), false);
});

test("Gemini failure preserves Groundskeeper and is not added to the user-facing reply", async () => {
  const result = await runTandemAssistant({
    message: "Review the Dakota Street financial status",
    routing: { intents: ["analysis", "financial_action"] },
    ...groundedInput,
    applicationActions: [],
    groundskeeperTask: async () => contribution("The verified ticket amount is $2,500."),
    lawnmowerTask: async () => { throw Object.assign(new Error("provider unavailable"), { category: "provider_unavailable" }); }
  });
  assert.match(result.reply, /\$2,500/);
  assert.doesNotMatch(result.reply, /Gemini|unavailable/i);
  assert.equal(result.providerStatus.find((item) => item.provider === "google").status, "rejected");
});

test("both provider failures leave normal dashboard use available", async () => {
  const result = await runTandemAssistant({
    message: "Review the complicated schedule conflict",
    routing: { intents: ["analysis", "schedule"] },
    searchResults: [],
    toolResults: [],
    citations: [],
    applicationActions: [],
    groundskeeperTask: async () => { throw new Error("OpenAI unavailable"); },
    lawnmowerTask: async () => { throw new Error("Gemini unavailable"); }
  });
  assert.match(result.reply, /The Lawnmower Man is unavailable/i);
  assert.match(result.reply, /dashboard is still available/i);
  assert.deepEqual(result.finalActions, []);
});

test("Gemini fallback remains read-only when OpenAI fails", async () => {
  const result = await runTandemAssistant({
    message: "Review the Dakota Street financial status",
    routing: { intents: ["analysis", "financial_action"] },
    ...groundedInput,
    applicationActions: [{ type: "open_record", recordType: "ticket", recordId: "ticket-1042", presentation: "side_panel" }],
    groundskeeperTask: async () => { throw new Error("OpenAI unavailable"); },
    lawnmowerTask: async () => ({ consultation: contribution("The verified ticket amount is $2,500.") })
  });
  assert.match(result.reply, /\$2,500/);
  assert.deepEqual(result.finalActions, []);
  assert.deepEqual(result.collaboration.providers, ["google"]);
});

test("public web findings remain separate from verified dashboard actions", async () => {
  const result = await runTandemAssistant({
    message: "Search the web for Greenbridge's official website",
    routing: { intents: ["record_search"] },
    searchResults: [],
    toolResults: [],
    citations: [],
    applicationActions: [],
    groundskeeperTask: async () => ({ findings: [], warnings: [] }),
    lawnmowerTask: async () => ({
      consultation: contribution("Greenbridge publishes an official company website."),
      webSources: [{ title: "Greenbridge", url: "https://example.com/greenbridge" }]
    })
  });
  assert.match(result.reply, /official company website/i);
  assert.deepEqual(result.finalActions, []);
  assert.deepEqual(result.collaboration.webResults, [{ title: "Greenbridge", url: "https://example.com/greenbridge" }]);
});

test("persona mode appears only when both assistants add grounded value", async () => {
  const result = await runTandemAssistant({
    message: "Show both perspectives on the Dakota Street financial record",
    routing: { intents: ["analysis", "financial_action"] },
    ...groundedInput,
    requestedMode: "persona",
    groundskeeperTask: async () => contribution("The ticket is at Quote Sent."),
    lawnmowerTask: async () => ({ consultation: contribution("Customer approval has not been recorded.", { optionalComment: "The machine detected an empty checkbox." }) })
  });
  assert.equal(result.collaboration.mode, "persona");
  assert.equal(result.collaboration.personaContributions.length, 2);
  assert.deepEqual(result.collaboration.personaContributions.map((item) => item.persona), ["groundskeeper", "lawnmower_man"]);
});

test("application tool broker validates identity and deduplicates provider requests", async () => {
  let executions = 0;
  const audit = [];
  const registry = {
    definitions: () => [{ name: "search_records", inputSchema: { query: "string" } }],
    async execute(name, args) {
      executions += 1;
      return { name, ok: true, output: { query: args.query } };
    }
  };
  const broker = createAssistantToolBroker({ registry, audit: async (event) => audit.push(event) });
  const runtime = { actor: { userId: "owner-1", role: "owner" } };
  const base = { toolName: "search_records", arguments: { query: "Dakota" }, authenticatedUserId: "owner-1" };
  const [openai, google] = await Promise.all([
    broker.execute({ ...base, requestedBy: "openai" }, runtime),
    broker.execute({ ...base, requestedBy: "google" }, runtime)
  ]);
  assert.equal(executions, 1);
  assert.deepEqual(openai, google);
  assert.equal(audit.filter((event) => event.status === "completed").length, 1);
  await assert.rejects(() => broker.execute({ ...base, requestedBy: "other" }, runtime), (error) => error.code === "TOOL_REQUESTER_INVALID");
  await assert.rejects(() => broker.execute({ ...base, requestedBy: "openai", authenticatedUserId: "someone-else" }, runtime), (error) => error.code === "TOOL_IDENTITY_MISMATCH");
  await assert.rejects(() => broker.execute({ ...base, requestedBy: "openai", arguments: { query: "Dakota", rawSql: "select *" } }, runtime), (error) => error.code === "TOOL_ARGUMENT_INVALID");
});
