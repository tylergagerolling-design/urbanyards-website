# Urban Yards Floating Assistant

This site now includes a floating customer-facing assistant on every page.

## What It Does

- Answers questions about Urban Yards Groundskeeping services.
- Helps visitors decide whether a project may be a good fit.
- Gives basic Portland-area groundskeeping and seasonal care guidance.
- Encourages quote requests through the website contact form.
- Collects optional lead details in the chat window.
- Stores conversation history in the visitor's browser during refreshes.

The browser code never contains an OpenAI API key.

## Files

- `assistant.js` builds the floating chat UI and handles browser-side behavior.
- `style.css` contains the assistant styling.
- `api/assistant.js` is a Vercel-style serverless API route.
- `netlify/functions/assistant.js` adapts the same handler for Netlify Functions.

## Environment Variables

Set these on your hosting provider:

```text
OPENAI_API_KEY=your_server_side_key
OPENAI_MODEL=gpt-4.1-mini
```

`OPENAI_MODEL` is optional. Change it later if you prefer a different model.

## Deploying

### Vercel

1. Import the GitHub repository into Vercel.
2. Add `OPENAI_API_KEY` in Project Settings -> Environment Variables.
3. Deploy.
4. The assistant will call `/api/assistant`.

### Netlify

1. Import the GitHub repository into Netlify.
2. Add `OPENAI_API_KEY` in Site configuration -> Environment variables.
3. Deploy.
4. The assistant will call `/.netlify/functions/assistant` if `/api/assistant` is not available.

### GitHub Pages

GitHub Pages cannot run server-side API routes. The assistant UI will still appear and use the built-in Urban Yards fallback answers, but true OpenAI-powered replies require Vercel, Netlify, or another host that can run serverless functions.

## Business Rules Enforced

- No binding quotes.
- No official pricing.
- No guaranteed scheduling.
- No guaranteed outcomes.
- No personal phone numbers, personal email addresses, or personal addresses.
- Direct contact requests point visitors to the website contact form.

## Future Expansion

Good next additions:

- FAQ knowledge base snippets.
- Photo upload before quote submission.
- Service area lookup.
- Appointment request workflow.
- Seasonal maintenance reminder signup.
