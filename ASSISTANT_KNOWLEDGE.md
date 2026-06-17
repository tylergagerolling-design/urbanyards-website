# The Groundskeeper Assistant Knowledge

The assistant is local/site-content-first by default. It answers from approved Urban Yards sources and does not call an external AI API unless `ASSISTANT_USE_EXTERNAL_AI=true` and `OPENAI_API_KEY` are both configured.

## Files

- `assistant-knowledge.json`: business facts, service areas, content chunks, FAQs, suggested questions, and lead qualification fields.
- `api/lib/site-knowledge.js`: lightweight retrieval, FAQ matching, fallback answers, and lead follow-up prompts.
- `api/assistant.js`: API wrapper for assistant replies. It uses local site knowledge by default.
- `assistant.js`: browser assistant UI, quick actions, lead detail form, and frontend fallback answers.

## Current Architecture

The assistant is an additive widget loaded by existing pages. It stores the current conversation in `sessionStorage`, keeps lead details in the existing optional lead form, posts to `/api/assistant` when available, and falls back to browser-side site answers if the API route is unavailable.

The API route preserves the existing security checks: allowed origin, client IP rate limiting, request IDs, and safe response headers. It now returns local site-knowledge answers by default. External AI is opt-in only and requires both `ASSISTANT_USE_EXTERNAL_AI=true` and `OPENAI_API_KEY`.

The retrieval system is intentionally lightweight. `assistant-knowledge.json` stores readable website chunks and FAQs. `api/lib/site-knowledge.js` tokenizes visitor questions, filters common filler words, scores matching content chunks and FAQs, and builds either a direct answer or a compact context for optional external AI.

## Updating Knowledge

When website content changes:

1. Update the matching `contentChunks` entry in `assistant-knowledge.json`.
2. Add or revise related `faqs` if visitors are likely to ask about it.
3. Keep claims limited to what the website actually says.
4. Run `npm run check` and `npm test`.

Do not add pricing, guarantees, availability, licensing claims, insurance claims, or service areas unless they are published on the site.

## Lead Qualification

The assistant looks for quote intent and asks for one missing detail at a time. Current fields are:

- name
- phone
- email
- propertyType
- city
- serviceRequested
- notes

The assistant should guide visitors toward the quote form without forcing a long chat workflow.
