# backend-google-maps

Backend ringan berbasis Bun + Hono untuk mengekstrak intent pencarian dari bahasa natural (via OpenAI) dan melakukan pencarian tempat di Google Maps (Places API), lalu mengembalikan hasil yang siap dipakai front-end.

## Tech Stack
- Bun
- Hono
- OpenAI (chat completion, JSON mode)
- Google Maps Places API (Legacy Text Search + v1 fallback)

## Prasyarat
- Bun >= 1.0 (disarankan terbaru)
- OpenAI API Key
- Google Maps API Key (aktifkan Places API)

## Setup Cepat
1) Duplikasi env dan isi kunci
```sh
cp .env.example .env
# Edit .env lalu set:
# PORT=3001               # opsional, default 3000 bila tidak di-set
# OPENAI_API_KEY=...
# GOOGLE_MAPS_API_KEY=...
```

2) Install dependencies
```sh
bun install
```

3) Jalankan dev server (hot reload)
```sh
bun run dev
```

4) Cek healthcheck
- http://localhost:3000/health (atau sesuaikan dengan PORT di .env)

## Environment Variables
- `PORT` — default `3000` (lihat `src/index.ts`), contoh `.env.example` menggunakan `3001`
- `OPENAI_API_KEY` — API key OpenAI
- `GOOGLE_MAPS_API_KEY` — API key Google Maps dengan Places API aktif

## Endpoints
- `GET /health` → `{ message: "OK" }`
- `GET /api/chat` → `{ message: "OK" }` (ping untuk route chat)
- `POST /api/chat`
  - Body (JSON):
    ```json
    { "message": "cari ramen enak di Cimahi yang buka sekarang" }
    ```
  - Response (bentuk umum):
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

### Contoh cURL
```sh
curl -X POST "http://localhost:3000/api/chat" \
  -H "Content-Type: application/json" \
  -d '{"message":"cari cafe cozy di Bandung yang buka sekarang"}'
```

## Alur Kerja (How it works)
- `src/routes/chat.ts`
  - `GET /api/chat` untuk ping.
  - `POST /api/chat` menerima `{ message }`, rate limit sederhana 10 req / 10 detik per IP.
- `src/services/map.ts`
  - `processChat(message)`: panggil LLM → bentuk query → panggil Google Places → kembalikan payload.
- `src/services/llm.ts`
  - `extractMapsIntent()`: gunakan model `gpt-4o-mini` (JSON mode) untuk mengekstrak intent: `query`, `location?`, `radius_km?`, `top_k?`, `filters.open_now?`.
- `src/services/maps.ts`
  - `textSearchPlaces(q, openNow, topK)`: coba Legacy Text Search; bila gagal, fallback ke Places API v1 (`places:searchText`). Hasil dipetakan ke struktur yang konsisten dengan URL navigasi dan embed.
- `src/config/openai.ts`
  - Inisialisasi OpenAI Client dengan `OPENAI_API_KEY`.
- `src/config/middleware.ts`
  - `prettyJSON()` untuk output JSON yang rapi.
- `src/constants/endpoints.ts`
  - Basis route `API.CHAT = "/api/chat"`.
- `src/index.ts`
  - Daftarkan route dan middleware, healthcheck, error handler. Ekspor `{ fetch, port }` untuk Bun.

### Rate Limiting
- In-memory bucket (sederhana): 10 permintaan / 10 detik per IP.
- IP dibaca dari header `cf-connecting-ip` atau `x-forwarded-for` (fallback `local`).

## Struktur Proyek (ringkas)
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

## Catatan
- CORS belum diaktifkan secara eksplisit. Jika diakses dari browser lintas-origin, tambahkan middleware CORS sesuai kebutuhan Hono.
- Pastikan Google Cloud project telah mengaktifkan Places API dan API key diizinkan untuk endpoint yang dipakai.
- Model OpenAI (`gpt-4o-mini`) dapat diganti sesuai kebutuhan/performa/biaya.

## Lisensi
Gunakan sesuai kebutuhan internal Anda. Tambahkan file LICENSE bila diperlukan.
