const ASSISTANT_KNOWLEDGE = require("../../assistant-knowledge.json");

const CONTACT = {
  phone: ASSISTANT_KNOWLEDGE.phone,
  email: ASSISTANT_KNOWLEDGE.email,
  quotePath: ASSISTANT_KNOWLEDGE.quotePath
};

const SITE_KNOWLEDGE = ASSISTANT_KNOWLEDGE.contentChunks;
const FAQS = ASSISTANT_KNOWLEDGE.faqs;
const STOP_WORDS = new Set(["about", "and", "are", "can", "for", "get", "how", "the", "this", "that", "what", "with", "you", "your"]);

const FALLBACK_MESSAGE = `I don't see that listed on the site, but you can request a quote and Urban Yards can confirm. Phone: ${CONTACT.phone}. Email: ${CONTACT.email}.`;

function tokenize(value = "") {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));
}

function scoreSection(section, queryTokens) {
  const haystack = `${section.title} ${section.text}`.toLowerCase();
  const keywordTokens = new Set(tokenize((section.keywords || []).join(" ")));
  const haystackTokens = new Set(tokenize(haystack));
  const score = queryTokens.reduce((total, token) => {
    if (keywordTokens.has(token)) return total + 6;
    if (haystackTokens.has(token)) return total + (tokenize(section.title).includes(token) ? 3 : 1);
    return total;
  }, 0);
  return section.id === "footer" ? score * 0.5 : score;
}

function scoreFaq(faq, queryTokens) {
  const haystack = `${faq.question} ${faq.answer}`.toLowerCase();
  const keywordTokens = new Set(tokenize((faq.keywords || []).join(" ")));
  const haystackTokens = new Set(tokenize(haystack));
  return queryTokens.reduce((total, token) => {
    if (keywordTokens.has(token)) return total + 8;
    if (haystackTokens.has(token)) return total + (tokenize(faq.question).includes(token) ? 4 : 1);
    return total;
  }, 0);
}

function getRelevantKnowledge(query = "", currentPage = "") {
  const tokens = tokenize(`${query} ${currentPage}`);
  const scored = SITE_KNOWLEDGE
    .map((section) => ({ section, score: scoreSection(section, tokens) }))
    .sort((a, b) => b.score - a.score);
  const relevant = scored.filter((item) => item.score > 0).slice(0, 5).map((item) => item.section);
  if (!relevant.length) return [SITE_KNOWLEDGE[0], SITE_KNOWLEDGE[5], SITE_KNOWLEDGE[6]];
  const required = [SITE_KNOWLEDGE.find((section) => section.id === "contact-quote"), SITE_KNOWLEDGE.find((section) => section.id === "footer")];
  return [...new Map([...relevant, ...required].filter(Boolean).map((section) => [section.id, section])).values()].slice(0, 7);
}

function getRelevantFaqs(query = "") {
  const tokens = tokenize(query);
  return FAQS
    .map((faq) => ({ faq, score: scoreFaq(faq, tokens) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((item) => item.faq);
}

function buildSiteContext(query = "", currentPage = "") {
  const sections = getRelevantKnowledge(query, currentPage);
  const faqs = getRelevantFaqs(query);
  return [
    "Urban Yards website knowledge source. Use only these site facts for Urban Yards-specific claims.",
    `Business: ${ASSISTANT_KNOWLEDGE.businessName}. Tagline: ${ASSISTANT_KNOWLEDGE.tagline}.`,
    `Contact: ${CONTACT.phone}. ${CONTACT.email}. Quote CTA: ${ASSISTANT_KNOWLEDGE.quoteCTA}.`,
    ...sections.map((section) => `Page: ${section.title}\nURL: ${section.url}\nFacts: ${section.text}`),
    ...faqs.map((faq) => `FAQ: ${faq.question}\nAnswer: ${faq.answer}`),
    `Unlisted information fallback: ${FALLBACK_MESSAGE}`
  ].join("\n\n");
}

function hasLeadIntent(text) {
  return ASSISTANT_KNOWLEDGE.leadQualification.intentSignals.some((signal) => text.includes(signal));
}

function nextLeadPrompt(lead = {}) {
  if (!lead.propertyType) return "What type of property is it: a home, apartment community, HOA, condominium, or another property type?";
  if (!lead.city && !lead.propertyLocation) return "What city or general area is the property in?";
  if (!lead.service && !lead.serviceRequested) return "What service are you looking for: mowing, cleanup, landscape maintenance, pressure washing, property support, or something else listed on the site?";
  if (!lead.phone && !lead.email) return "What is the best phone number or email for Urban Yards to follow up?";
  return "";
}

function answerFromSiteKnowledge(query = "", lead = {}) {
  const text = String(query).toLowerCase();
  const quotePrompt = `The best next step is to request a free quote through the website form with your property address or general area, service needed, timeline, details, and photos if useful. Phone: ${CONTACT.phone}. Email: ${CONTACT.email}.`;
  const leadPrompt = hasLeadIntent(text) ? nextLeadPrompt(lead) : "";
  const leadFollowUp = leadPrompt ? `\n\nI can help gather a few details for the quote request. ${leadPrompt}` : "";
  const faq = getRelevantFaqs(query)[0];

  if (text.includes("owner") || text.includes("owned") || text.includes("owner operated") || text.includes("who owns")) {
    return `Yes. Urban Yards is owner-operated by Tyler Gage. The site describes Urban Yards as practical, eco-conscious, reliable, and focused on cleaner, healthier, more welcoming outdoor spaces.\n\n${quotePrompt}`;
  }
  if (text.includes("quote") || text.includes("estimate") || text.includes("price") || text.includes("cost")) {
    return `You can request a free quote through the website form. The form asks for name, email, phone, property address or general area, service needed, optional photos, and additional details.\n\nFinal pricing and scheduling require review of the property and project details. Phone: ${CONTACT.phone}. Email: ${CONTACT.email}.${leadFollowUp}`;
  }
  if (text.includes("area") || text.includes("serve") || text.includes("where") || text.includes("location")) {
    return `The site lists Beaverton, Portland, Vancouver, North Portland, and nearby communities as the core service area. If you are near those areas, Urban Yards can confirm through a quote request.\n\n${CONTACT.phone}. ${CONTACT.email}.`;
  }
  if (text.includes("apartment") || text.includes("hoa") || text.includes("condo") || text.includes("multifamily") || text.includes("property manager") || text.includes("porter")) {
    return `Yes. Urban Yards lists property management services for apartment communities, condominium associations, HOAs, property management companies, and multifamily properties.\n\nRelevant services include common area upkeep, trash and recycling enclosure care, day porter services, pressure washing, seasonal cleanup, recurring groundskeeping, and property appearance audits. ${quotePrompt}${leadFollowUp}`;
  }
  if (text.includes("pressure wash") || text.includes("pressure washing") || text.includes("wash")) {
    return `Yes. Pressure Washing is listed in the site footer services and on the Property Management Services page. ${quotePrompt}`;
  }
  if (text.includes("lawn") || text.includes("mow") || text.includes("mowing") || text.includes("edge")) {
    return `Yes. Urban Yards lists lawn mowing, edging, weed management, garden bed maintenance, seasonal cleanup, and routine groundskeeping for homeowners and other property types.\n\n${quotePrompt}${leadFollowUp}`;
  }
  if (text.includes("mulch") || text.includes("bed") || text.includes("plant") || text.includes("native") || text.includes("pollinator") || text.includes("low-water") || text.includes("ecological")) {
    return `Yes. The site lists landscape improvements such as plant installations, mulch refreshes, privacy screens, and ecological enhancements like native plantings, pollinator habitat, low-water landscapes, and urban greening.\n\n${quotePrompt}`;
  }
  if (text.includes("phone") || text.includes("email") || text.includes("contact")) {
    return `You can contact Urban Yards through the quote form, by phone, or by email. Phone: ${CONTACT.phone}. Email: ${CONTACT.email}.`;
  }
  if (faq) return `${faq.answer}\n\n${quotePrompt}${leadFollowUp}`;
  return FALLBACK_MESSAGE;
}

module.exports = {
  ASSISTANT_KNOWLEDGE,
  CONTACT,
  FAQS,
  FALLBACK_MESSAGE,
  SITE_KNOWLEDGE,
  answerFromSiteKnowledge,
  buildSiteContext,
  getRelevantFaqs,
  getRelevantKnowledge
};
