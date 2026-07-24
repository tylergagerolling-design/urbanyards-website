# Groundskeeper AI Architecture Audit

Date: July 24, 2026

## Executive summary

Groundskeeper AI currently has two working surfaces: a public website helper and an authenticated dashboard assistant. Both use the same protected server endpoint. The dashboard also has deterministic browser-side helpers for record search, ticket completeness, priorities, and schedule previews. The safest upgrade path is to preserve those behaviors while moving request classification, permission checks, tool selection, citations, verification, and error recovery into a modular server-side orchestration layer.

Phase 1 adds that foundation without changing Supabase schemas or enabling autonomous writes.

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

