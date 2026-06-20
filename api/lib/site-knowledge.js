const ASSISTANT_KNOWLEDGE = require("../../assistant-knowledge.json");

const CONTACT = {
  phone: ASSISTANT_KNOWLEDGE.phone,
  email: ASSISTANT_KNOWLEDGE.email,
  quotePath: ASSISTANT_KNOWLEDGE.quotePath
};

const SITE_KNOWLEDGE = ASSISTANT_KNOWLEDGE.contentChunks;
const FAQS = ASSISTANT_KNOWLEDGE.faqs;
const STOP_WORDS = new Set(["about", "and", "are", "can", "for", "get", "how", "the", "this", "that", "what", "with", "you", "your"]);
const CITY_PATTERNS = [
  { value: "Beaverton", pattern: /\bbeaverton\b/i },
  { value: "Portland", pattern: /\bportland\b/i },
  { value: "Vancouver", pattern: /\bvancouver\b/i },
  { value: "North Portland", pattern: /\bnorth portland\b/i }
];
const INTENTS = [
  {
    id: "quote",
    leadIntent: true,
    keywords: ["quote", "estimate", "price", "cost", "hire", "schedule", "book", "how much", "what would it cost"]
  },
  {
    id: "property_management",
    leadIntent: true,
    keywords: ["apartment", "apartments", "multifamily", "hoa", "condo", "condominium", "property manager", "property management", "community", "building", "complex"]
  },
  {
    id: "cleanup",
    leadIntent: true,
    keywords: ["rough", "mess", "messy", "cleanup", "clean up", "overgrown", "out of hand", "neglected", "weeds are crazy", "getting crazy", "needs help"]
  },
  {
    id: "lawn_care",
    leadIntent: true,
    keywords: ["lawn", "mow", "mowing", "grass", "edging", "edge", "weed", "weeds", "yard care"]
  },
  {
    id: "trimming",
    leadIntent: true,
    keywords: ["trim", "trimming", "shrubs", "bushes", "prune", "pruning", "hedges", "overgrown shrubs"]
  },
  {
    id: "property_improvement",
    leadIntent: true,
    keywords: ["landscaping", "landscape", "improve", "refresh", "mulch", "planting", "plants", "beds", "curb appeal", "privacy screen"]
  },
  {
    id: "service_area",
    keywords: ["area", "serve", "service area", "where", "location", "beaverton", "portland", "vancouver", "north portland"]
  },
  {
    id: "contact",
    keywords: ["contact", "phone", "email", "call", "reach", "number"]
  },
  {
    id: "homeowner_services",
    keywords: ["homeowner", "homeowners", "house", "home", "residential", "my yard"]
  },
  {
    id: "casual",
    keywords: ["hello", "hi", "hey", "thanks", "thank you"]
  }
];

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

function includesMeaning(text, phrase) {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (phrase.includes(" ")) return new RegExp(`\\b${escaped}\\b`, "i").test(text);
  return new RegExp(`\\b${escaped}\\b`, "i").test(text);
}

function detectIntent(query = "") {
  const text = String(query).toLowerCase();
  const scores = INTENTS.map((intent) => {
    const score = intent.keywords.reduce((total, keyword) => total + (includesMeaning(text, keyword) ? 1 : 0), 0);
    return { ...intent, score };
  }).sort((a, b) => b.score - a.score);
  return scores[0]?.score > 0 ? scores[0] : { id: "unknown", leadIntent: false, score: 0 };
}

function extractLeadDetails(message = "") {
  const text = String(message);
  const lower = text.toLowerCase();
  const details = {};
  const city = CITY_PATTERNS.find((item) => item.pattern.test(text));
  if (city) details.city = city.value;
  if (/\b(apartment|apartments|multifamily|building|complex)\b/i.test(text)) details.propertyType = "Apartment community";
  else if (/\bhoa\b/i.test(text)) details.propertyType = "HOA";
  else if (/\b(condo|condominium)\b/i.test(text)) details.propertyType = "Condominium";
  else if (/\b(home|house|yard)\b/i.test(text)) details.propertyType = "Home";

  if (/\b(mow|mowing|lawn|grass|edge|edging)\b/i.test(text)) details.serviceRequested = "Lawn care";
  else if (/\b(cleanup|clean up|overgrown|rough|messy|weeds?)\b/i.test(text)) details.serviceRequested = "Cleanup";
  else if (/\b(trim|trimming|shrubs?|bushes|prun(e|ing)|hedges?)\b/i.test(text)) details.serviceRequested = "Shrub trimming";
  else if (/\bpressure wash|pressure washing\b/i.test(lower)) details.serviceRequested = "Pressure washing";
  else if (/\b(landscaping|landscape|mulch|planting|beds|refresh)\b/i.test(text)) details.serviceRequested = "Landscape improvement";

  const nameMatch = text.match(/\b(?:my name is|i am|i'm)\s+([a-z][a-z\s'-]{1,40})/i);
  if (nameMatch) details.name = nameMatch[1].trim().replace(/\s+/g, " ");
  return details;
}

function inferConversationContext(query = "", history = [], lead = {}) {
  const userTurns = Array.isArray(history) ? history.filter((message) => message?.role === "user").slice(-6) : [];
  const remembered = userTurns.reduce((details, message) => ({ ...details, ...extractLeadDetails(message.content) }), {});
  const current = extractLeadDetails(query);
  return {
    intent: detectIntent(query),
    lead: {
      ...remembered,
      ...lead,
      ...current
    }
  };
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
  const intent = detectIntent(text);
  return Boolean(intent.leadIntent) || ASSISTANT_KNOWLEDGE.leadQualification.intentSignals.some((signal) => text.includes(signal));
}

function nextLeadPrompt(lead = {}) {
  if (!lead.propertyType) return "What type of property is it: a home, apartment community, HOA, condominium, or another property type?";
  if (!lead.city && !lead.propertyLocation) return "What city or general area is the property in?";
  if (!lead.service && !lead.serviceRequested) return "What service are you looking for: mowing, cleanup, landscape maintenance, pressure washing, property support, or something else listed on the site?";
  if (!lead.phone && !lead.email) return "What is the best phone number or email for Urban Yards to follow up?";
  return "";
}

function answerFromSiteKnowledge(query = "", lead = {}, history = []) {
  const text = String(query).toLowerCase();
  const context = inferConversationContext(query, history, lead);
  const rememberedLead = context.lead;
  const intent = context.intent;
  const quotePrompt = `A free quote is the best next step once Urban Yards has the property details. Phone: ${CONTACT.phone}. Email: ${CONTACT.email}.`;
  const leadPrompt = (intent.leadIntent || hasLeadIntent(text)) ? nextLeadPrompt(rememberedLead) : "";
  const leadFollowUp = leadPrompt ? `\n\n${leadPrompt}` : "";
  const faq = getRelevantFaqs(query)[0];

  if (intent.id === "casual") {
    return "Hi, I can help with Urban Yards services, service areas, property care questions, or getting ready for a quote. What are you looking at on your property?";
  }
  if (intent.id === "cleanup") {
    return `Sounds like it may be time for a cleanup. Urban Yards lists seasonal cleanup, weed management, property upkeep, and garden bed maintenance.\n\nIs it mostly overgrown grass, weeds, shrubs, or a little bit of everything?`;
  }
  if (intent.id === "trimming") {
    return `Urban Yards lists shrub trimming and landscape refreshes for outdoor spaces that need steady care.\n\nAre the shrubs simply overgrown, or are you looking for more shaping and cleanup around the beds too?`;
  }
  if (intent.id === "property_improvement") {
    return `I can help with that. Urban Yards lists landscape improvements like planting, mulch refreshes, better beds, privacy screens, and curb appeal updates.\n\nWhat kind of property is it, and what are you hoping to improve?`;
  }
  if (text.includes("owner") || text.includes("owned") || text.includes("owner operated") || text.includes("who owns")) {
    return `Yes. Urban Yards is owner-operated by Tyler Gage. The site describes Urban Yards as practical, eco-conscious, reliable, and focused on cleaner, healthier, more welcoming outdoor spaces.\n\n${quotePrompt}`;
  }
  if (intent.id === "quote") {
    const propertyNote = rememberedLead.propertyType ? ` for the ${rememberedLead.propertyType.toLowerCase()}` : "";
    return `You can request a free quote${propertyNote} through the website form. It asks for name, email, phone, property address or general area, service needed, optional photos, and additional details. Final pricing and scheduling require property review.${leadFollowUp || `\n\n${quotePrompt}`}`;
  }
  if (intent.id === "service_area") {
    return `The site lists Beaverton, Portland, and Vancouver as the core service area. If you are near those areas, Urban Yards can confirm through a quote request.\n\n${CONTACT.phone}. ${CONTACT.email}.`;
  }
  if (intent.id === "property_management") {
    return `Urban Yards works with apartment communities, condominium associations, HOAs, property management companies, and multifamily properties. Services listed include common area upkeep, trash and recycling enclosure care, day porter services, pressure washing, seasonal cleanup, recurring groundskeeping, and property appearance audits.${leadFollowUp || "\n\nIs this an apartment community, HOA, condominium, or another type of property?"}`;
  }
  if (text.includes("pressure wash") || text.includes("pressure washing") || text.includes("wash")) {
    return `Yes. Pressure Washing is listed in the site footer services and on the Property Management Services page. ${quotePrompt}`;
  }
  if (intent.id === "lawn_care") {
    return `Yes. Urban Yards lists lawn mowing, edging, weed management, garden bed maintenance, seasonal cleanup, and routine groundskeeping for homeowners and other property types.\n\nAre you looking for recurring maintenance or a one-time service?`;
  }
  if (text.includes("mulch") || text.includes("bed") || text.includes("plant") || text.includes("native") || text.includes("pollinator") || text.includes("low-water") || text.includes("ecological")) {
    return `Yes. The site lists landscape improvements such as plant installations, mulch refreshes, privacy screens, and ecological enhancements like native plantings, pollinator habitat, low-water landscapes, and urban greening.\n\n${quotePrompt}`;
  }
  if (intent.id === "contact") {
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
  detectIntent,
  inferConversationContext,
  getRelevantFaqs,
  getRelevantKnowledge
};
