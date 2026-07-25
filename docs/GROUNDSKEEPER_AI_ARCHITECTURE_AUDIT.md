# Groundskeeper AI Architecture Audit

Date: July 24, 2026 (continuation audit)

## Executive summary

Groundskeeper AI currently has two working surfaces: a public website helper and an authenticated dashboard assistant. Both use the same protected server endpoint. The dashboard also has deterministic browser-side helpers for record search, ticket completeness, priorities, and schedule previews. The safest upgrade path is to preserve those behaviors while moving request classification, permission checks, tool selection, citations, verification, and error recovery into a modular server-side orchestration layer.

That foundation is now implemented. The current continuation preserves it and deepens the existing landscaping retrieval and diagnostic behavior without adding a competing endpoint, table, memory platform, or assistant surface.

## Current implementation status

### Working

- The floating dashboard assistant is rendered in `dashboard.js` and calls the shared protected `groundskeeper-ai` endpoint.
- OpenAI remains the primary responder (`gpt-4.1-mini` by default).
- Gemini is a server-side, rate-limited specialist consultant. It is called selectively, returns structured review data, and cannot override verified records, approved policy, permissions, or approval gates.
- The modular server orchestration in `src/assistant` provides intent routing, page-context sanitizing, entity resolution, permissions, read tools, citations, verification, UI actions, diagnostics, scoped memory, and write previews.
- Durable scoped memory uses `assistant_memories`; recommendation outcomes use `assistant_outcomes`.
- The landscaping library uses small versioned JSON records with schema, evaluation fixtures, owner catalog controls, and lazy retrieval.
- Existing business context includes permitted snapshots of properties, tickets, clients, leads, schedules, invoices, expenses, and documents.
- Ticket stage changes are preview-only until explicit approval.

### Partial

- Retrieval is hybrid keyword and metadata ranking, not embedding/vector search.
- Property and ticket context is bounded to the records supplied to the endpoint; there is no unrestricted database agent.
- Memory supports scope, source, confidence, approval, expiry, and active state but does not yet expose the complete field-observation verification vocabulary proposed in the continuation brief.
- Knowledge editing currently supports catalog search/export and update drafting; full compare/version restore and embedding rebuild controls are not yet implemented.
- Completed-work learning compares estimate and actual cost but the ticket completion form does not yet capture every proposed outcome-learning field.

### Duplication audit

- One primary assistant surface and one shared endpoint exist.
- One Gemini provider and consultation policy exist.
- One scoped memory table exists.
- One landscaping knowledge library exists.
- No competing property database, vector store, assistant endpoint, or Gemini integration was added.

### Safe continuation implemented

- Added structured symptom diagnosis that reports alternatives, required observations, safe immediate action, confidence, escalation conditions, and contradictions.
- Added verified-record contradiction detection that requests owner review rather than silently choosing a value.
- Added automatic seasonal context without claiming live weather.
- Added authority, confidence, and freshness weight to the existing ranking function.
- Expanded the existing approved library from 11 to 17 focused records covering turf discoloration, PNW moss/compaction, plant wilt/yellowing, trunk/crown mulch safety, heat/traffic safety, and commercial recurring inspections.
- Preserved lazy loading, bounded results, 2.5-second tool timeouts, server-side model calls, role permissions, citations, and explicit write approval.

## Reasoning continuation

The next continuation adds the requested operating pattern to the same orchestration path without exposing chain-of-thought or introducing a second model workflow.

### Added

- Multi-intent classification for landscaping, plant identification, diagnosis, irrigation, drainage, property inspection, estimates, material and labor calculations, field guidance, safety, licensing, photos, and memory.
- Combinable reasoning modes: general, landscaping diagnostic, property analysis, estimating, field worker, quality control, business operations, and safety/compliance.
- A bounded execution plan containing desired outcome, required record types, selected tools, missing information, risk flags, consultation candidacy, and expected output.
- An approved mulch/soil/gravel volume calculator that uses supplied square footage and depth, shows its formula and contingency, and refuses to invent missing dimensions.
- Confidence calibration across information completeness, grounded sources, contradictions, partial results, safety, licensing, and specialist-review need.
- A concise final self-check contract for record resolution, unsupported measurements, contradictions, regional/seasonal context, and practical next actions.
- Targeted Gemini roles for horticulture, turf, irrigation, drainage, safety, licensing, estimating, property operations, or general critical review.
- Expanded structured Gemini output for seasonal considerations, property-damage risk, economical alternatives, and durable alternatives.

### Performance and security boundaries retained

- No additional model round trip is introduced by task planning, calculators, or verification.
- Simple greetings and navigation requests remain in general mode.
- Calculators and reasoning metadata execute locally inside the existing bounded server orchestration.
- Gemini remains threshold-controlled, rate-limited, single-depth, server-side, sanitized, optional, and failure tolerant.
- Existing permission checks run before every tool.
- No new table, migration, embedding request, initial-dashboard query, client secret, or autonomous write was added.

### Still incomplete

- Photo understanding requires a separately authorized image-input path; metadata alone is not treated as image content.
- Current weather and rainfall tools are not yet registered with a trusted provider.
- Full labor, plant-spacing, disposal, travel, overhead, margin, and cost calculators remain future work.
- Memory does not yet expose the full verification-state vocabulary in its persisted schema.
- Completed-ticket forms do not yet capture every proposed outcome-learning field.
- The owner evaluation workspace does not yet aggregate reasoning-test and production-telemetry results.

### Remain untouched

- Dashboard navigation and visual design
- Authentication and existing role model
- Ticket, property, customer, estimate, scheduling, and financial schemas
- Supabase configuration and existing data
- Primary model endpoint and Gemini environment variables
- Production deployment pattern

## 1. Existing components and endpoints

- `dashboard.js`
  - Renders the floating Groundskeeper panel.
  - Stores in-session message history.
  - Performs deterministic global search, ticket readiness checks, priority summaries, and schedule previews.
  - Requires explicit confirmation before a prepared visit is inserted.
- `api/groundskeeper-ai.js`
  - Shared public/dashboard AI handler.
  - Loads AI knowledge, calls OpenAI, logs conversations, and records audit events.
  - Manages training rules and publication actions.
- `netlify/functions/groundskeeper-ai.js`
  - Netlify adapter for the shared API handler.
- `api/lib/site-knowledge.js`
  - Builds public website context.
- `netlify/functions/lib/dashboard-auth.js`
  - Verifies Supabase sessions, resolves roles, enforces permissions, reads feature flags, and writes audit/system-error records.

## 2. Model provider and configuration

- Provider: OpenAI Chat Completions API.
- Default model: `gpt-4.1-mini`.
- Override: `OPENAI_MODEL`.
- Dashboard limit: 900 output tokens.
- Public limit: 360 output tokens.
- Network timeout: 12 seconds.
- Dashboard temperature before Phase 1: 0.55.

## 3. Existing tool or function calling

- No server-side model tool calling existed before Phase 1.
- The browser provided deterministic command routing for search, ticket auditing, priorities, and scheduling previews.
- The server received a bounded dashboard snapshot embedded in a prompt.
- The model could recommend but could not directly execute database mutations.

## 4. Supabase records available to the assistant

The browser snapshot can include:

- Tickets and ticket events
- Leads, outreach companies, and outreach properties
- Contacts
- Scheduled jobs
- Route stops
- Invoices, expenses, vendors, and financial documents
- General documents
- Operations/tasks
- Equipment
- AI settings, knowledge, FAQs, rules, saved answers, training rules, versions, and logs

The endpoint also uses Supabase-backed AI knowledge and logging tables. Phase 1 tools operate only on a minimized, permission-approved snapshot. They never accept raw SQL.

## 5. Permission enforcement

- Dashboard mode required a valid owner/admin session.
- `dashboard-auth.js` resolves the trusted role from protected profile/role records rather than editable auth metadata.
- Table and action permissions are centrally mapped.
- Phase 1 adds a second permission check at tool execution time.

## 6. Existing approval workflow

- The assistant cannot directly write through the model.
- Browser-side schedule commands create a preview with Add to Work and Cancel.
- Ticket transitions and other existing dashboard actions keep their current role checks, validation, confirmation, audit, and undo behavior.
- Phase 1 registers read-only tools only. Future write tools must be preview-only and require explicit approval.

## 7. Conversation storage and memory

- Current panel history is session memory held in browser state and sent as the most recent ten messages.
- `ai_conversation_logs` stores bounded questions and answers.
- No durable entity memory, preference memory, plan memory, or outcome memory exists yet.
- Phase 1 adds structured recent-entity references to orchestration results but does not add durable memory tables.

## 8. Latency and timeout risks

- One model request can wait up to 12 seconds.
- AI knowledge loading and conversation logging add Supabase calls.
- The previous dashboard prompt serialized up to 14,000 characters of a broad snapshot.
- Financial search hydration can delay browser-side searches.
- There was no per-tool latency reporting or partial-result contract.

Phase 1 adds per-tool timeouts, bounded tool output, orchestration timing, and structured partial-result/error metadata. Streaming is deferred because the existing endpoint and UI are request/response based.

## 9. Files modified in Phase 1

- `api/groundskeeper-ai.js`
- `dashboard.js`
- `package.json`
- `src/assistant/*`
- `test/groundskeeper-orchestrator.test.js`
- `docs/GROUNDSKEEPER_AI_ARCHITECTURE_AUDIT.md`

## 10. Database migrations

No migration is required for Phase 1.

Likely later migrations:

- Saved assistant plans and plan steps
- Scoped assistant memory
- Generated insights and insight status
- Recommendation outcomes
- Action previews and approvals linked to conversations
- Tool execution telemetry
- Relationship index/materialized search support, if current relational queries become too slow

## 11. Risks to existing functionality

- Changing endpoint response shape could break the existing panel. Mitigation: retain `reply` and add optional metadata.
- Over-routing could provide irrelevant records. Mitigation: conservative intent rules and bounded tools.
- Client-provided context could be untrusted. Mitigation: sanitize page context, treat all record content as data, and never interpret retrieved instructions as policy.
- Permission drift between tools and dashboard actions. Mitigation: every tool declares a required permission and the registry enforces it.
- Large context could increase latency or expose irrelevant data. Mitigation: send only page context and selected tool results to the model.
- Model citations could be invented. Mitigation: citations are produced from tool results and returned separately from model prose.

## 12. Phased implementation plan

### Phase 1 — Reliable foundation

- Modular orchestrator
- Intent router
- Page-context sanitizer
- Controlled read-tool registry
- Permission guard
- Record resolver
- Structured citations
- Verification pass
- Prompt-injection boundary
- Timeouts and specific recovery messages
- Regression tests

### Phase 2 — Business understanding

- Business ontology and relationship helpers
- Server-side hybrid search
- Event history
- Scoped conversation/entity memory

### Phase 3 — Operational intelligence

- Configurable rules
- Deterministic priority scores
- Readiness checks
- Proactive insights
- Client/property intelligence views
- Morning, end-of-day, and weekly briefings

### Phase 4 — Planning and decisions

- Saved multi-step plans
- Goal decomposition
- Simulations
- Capacity, route, financial, and anomaly engines

### Phase 5 — Safe execution

- Typed write previews
- Explicit approval records
- Audit-linked execution
- Suggested automations
- Correction and outcome tracking

### Phase 6 — Quality and speed

- 100+ scenario evaluation suite
- Streaming responses
- Tool/result caching
- Query optimization
- Development diagnostics
- Continuous regression additions
