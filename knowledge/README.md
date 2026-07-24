# Urban Yards Landscaping Intelligence Knowledge

This directory is the version-controlled source for general, Pacific Northwest regional, Urban Yards company, and safety/licensing knowledge. Customer/property memory and temporary ticket/conversation context are intentionally stored elsewhere and must never be copied into these records.

## Structure

- `schemas/` contains the canonical record schema.
- `indexes/records.json` is the approved, bounded starter index loaded lazily by the server.
- `general/`, `regional/`, `company/`, and `safety/` are human-editing lanes for future Markdown or JSONL batches.
- `templates/` contains authoring templates.
- `evaluations/` contains retrieval and safety questions.
- `archive/` is for retired exported versions; retired records remain traceable and are excluded from normal retrieval.

## Lifecycle

Write one procedure, rule, diagnosis, calculation, plant, or decision per record. Validate against the schema, review sources and jurisdictional limits, approve it through the owner workflow, then publish a version. Updates increment `version`; retirement changes `status` without silently deleting history.

Retrieval normalizes a question, applies keyword and alias scoring, boosts matching layer/region/season/property/job context, deduplicates related records, and returns only the highest-value approved records. The complete library is never inserted into a prompt.

Property facts and preferences require an entity ID, source, author, date, confidence, visibility, and review/expiration date. Uncertain AI conclusions remain previews until an authorized user confirms them.

Gemini receives only the minimum retrieved passages and bounded ticket/property context needed for a difficult consultation. It is advisory and cannot override approved company policy, verified property facts, permissions, or approval gates.
