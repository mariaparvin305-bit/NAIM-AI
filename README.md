# NAIM AI API

Vercel-ready Node.js + Express API using Google's Gemini Developer API.

## Endpoints
- `GET /` — API information.
- `GET /api/status` — service status.
- `POST /api/chat` — send `{"message":"Hello"}` with the `x-api-key` header.

## Vercel environment variables
Set these in Project Settings → Environment Variables:
- `GEMINI_API_KEY`: your own Gemini API key (keep it secret).
- `API_KEY`: a long random secret used by your app clients.
- `GEMINI_MODEL`: `gemini-2.5-flash-lite` (default).

Then redeploy the project. Never commit real API keys or put them in frontend code.
The Gemini API has free-tier limits; availability and quotas can change. Check Google's official pricing page.
