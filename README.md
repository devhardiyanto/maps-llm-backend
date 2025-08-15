# backend-google-maps

Lightweight backend built with Bun + Hono to extract search intent from natural language (via OpenAI) and perform place search on Google Maps (Places API), then return front-end ready results.

## Tech Stack
- Bun
- Hono
- OpenAI (chat completion, JSON mode)
- Google Maps Places API (Legacy Text Search + v1 fallback)

## Prerequisites
- Bun >= 1.0 (latest recommended)
- OpenAI API Key
- Google Maps API Key (enable Places API)

## Quick Setup
1) Copy env and set keys
```sh
cp .env.example .env
# Edit .env then set:
# PORT=3001               # optional, default 3000 if not set
# OPENAI_API_KEY=...
# GOOGLE_MAPS_API_KEY=...
```

2) Install dependencies
```sh
bun install
```

3) Start dev server (hot reload)
```sh
bun run dev
```

4) Check health endpoint
- http://localhost:3000/health (or match PORT in .env)

## Environment Variables
- `PORT` — default `3000` (see `src/index.ts`), `.env.example` uses `3001`
- `OPENAI_API_KEY` — OpenAI API key
- `GOOGLE_MAPS_API_KEY` — Google Maps API key with Places API enabled

## Endpoints
- `GET /health` → `{ message: "OK" }`
- `GET /api/chat` → `{ message: "OK" }` (route ping)
- `POST /api/chat`
  - Body (JSON):
    ```json
    { "message": "find good ramen in Cimahi open now" }
    ```
  - Response (general shape):
    ```json
    {
      "query": "...",
      "resolved_location": "Cimahi" ,
      "provider": "legacy",
      "status": "OK",
      "error_message": null,
      "results": [
        {
          "name": "...",
          "address": "...",
          "lat": -6.9,
          "lng": 107.6,
          "place_id": "ChIJ...",
          "rating": 4.5,
          "user_ratings_total": 1234,
          "directions_url": "https://www.google.com/maps/dir/?api=1&destination=place_id:ChIJ...",
          "maps_url": "https://www.google.com/maps/place/?q=place_id:ChIJ...",
          "embed_iframe_src": "https://www.google.com/maps?q=-6.9,107.6&output=embed"
        }
      ]
    }
    ```

### cURL example
```sh
curl -X POST "http://localhost:3000/api/chat" \
  -H "Content-Type: application/json" \
  -d '{"message":"find a cozy cafe in Bandung open now"}'
```

## How it works
- `src/routes/chat.ts`
  - `GET /api/chat` for ping.
  - `POST /api/chat` accepts `{ message }`, simple in-memory rate limit: 10 req / 10s per IP.
- `src/services/map.ts`
  - `processChat(message)`: call LLM → build query → call Google Places → return payload.
- `src/services/llm.ts`
  - `extractMapsIntent()`: uses `gpt-4o-mini` (JSON mode) to extract intent: `query`, `location?`, `radius_km?`, `top_k?`, `filters.open_now?`.
- `src/services/maps.ts`
  - `textSearchPlaces(q, openNow, topK)`: first tries Legacy Text Search; if it fails, falls back to Places API v1 (`places:searchText`). Maps to a consistent structure with navigation and embed URLs.
- `src/config/openai.ts`
  - Initializes OpenAI Client with `OPENAI_API_KEY`.
- `src/config/middleware.ts`
  - `prettyJSON()` to pretty-print JSON output.
- `src/constants/endpoints.ts`
  - Base route `API.CHAT = "/api/chat"`.
- `src/index.ts`
  - Registers routes and middleware, healthcheck, error handler. Exports `{ fetch, port }` for Bun.

### Rate Limiting
- In-memory bucket (simple): 10 requests / 10 seconds per IP.
- IP is read from `cf-connecting-ip` or `x-forwarded-for` headers (fallback `local`).

## Project Structure (brief)
```
src/
  config/
    middleware.ts
    openai.ts
  constants/
    endpoints.ts
  routes/
    chat.ts
  services/
    llm.ts
    map.ts
    maps.ts
  index.ts
```

## Notes
- CORS is not explicitly enabled. If accessing from browsers cross-origin, add CORS middleware as needed for Hono.
- Ensure your Google Cloud project has Places API enabled and the API key is allowed for the endpoints used.
- The OpenAI model (`gpt-4o-mini`) can be changed depending on needs/perf/cost.

## License
Use for internal needs. Add a LICENSE file if needed.
