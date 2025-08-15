const MAPS_KEY = process.env.GOOGLE_MAPS_API_KEY!;

async function fetchJSON(input: string, ms = 4000, init: RequestInit = {}) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(input, { ...init, signal: ctrl.signal });
    return await res.json();
  } finally { clearTimeout(id); }
}

export type MapsResult = {
  name: string;
  address?: string;
  lat?: number; lng?: number;
  place_id: string;
  rating?: number; user_ratings_total?: number;
  directions_url: string;
  maps_url: string;
  embed_iframe_src?: string;
};

function toResultLegacy(r: any): MapsResult {
  const lat = r?.geometry?.location?.lat;
  const lng = r?.geometry?.location?.lng;
  const pid = r.place_id as string;
  return {
    name: r.name,
    address: r.formatted_address,
    lat, lng,
    place_id: pid,
    rating: r.rating,
    user_ratings_total: r.user_ratings_total,
    directions_url: `https://www.google.com/maps/dir/?api=1&destination=place_id:${pid}`,
    maps_url: `https://www.google.com/maps/place/?q=place_id:${pid}`,
    embed_iframe_src: (lat && lng) ? `https://www.google.com/maps?q=${lat},${lng}&output=embed` : undefined,
  };
}

function toResultV1(p: any): MapsResult {
  const lat = p.location?.latitude;
  const lng = p.location?.longitude;
  const pid = p.id; // place_id
  return {
    name: p.displayName?.text ?? p.name,
    address: p.formattedAddress,
    lat, lng,
    place_id: pid,
    rating: p.rating,
    user_ratings_total: p.userRatingCount,
    directions_url: `https://www.google.com/maps/dir/?api=1&destination=place_id:${pid}`,
    maps_url: `https://www.google.com/maps/place/?q=place_id:${pid}`,
    embed_iframe_src: (lat && lng) ? `https://www.google.com/maps?q=${lat},${lng}&output=embed` : undefined,
  };
}

export async function textSearchPlaces(q: string, openNow?: boolean, topK = 3) {
  // --- 1) Coba endpoint lama (Places Legacy) ---
  const legacyURL = new URL("https://maps.googleapis.com/maps/api/place/textsearch/json");
  legacyURL.searchParams.set("query", q);
  legacyURL.searchParams.set("key", MAPS_KEY);
  legacyURL.searchParams.set("language", "id");
  legacyURL.searchParams.set("region", "ID");
  if (openNow) legacyURL.searchParams.set("opennow", "true");

  const legacy = await fetchJSON(legacyURL.toString());
  if (legacy?.status === "OK") {
    return {
      status: "OK",
      provider: "legacy",
      results: (legacy.results ?? []).slice(0, topK).map(toResultLegacy),
    };
  }

  // --- 2) Fallback ke Places API v1 (New) ---
  const v1 = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": MAPS_KEY,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount",
    },
    body: JSON.stringify({
      textQuery: q,
      openNow: !!openNow,
      maxResultCount: topK,
      languageCode: "id",
      regionCode: "ID",
    }),
  }).then(r => r.json()).catch(e => ({ error: String(e) }));

  if (Array.isArray(v1?.places) && v1.places.length) {
    return {
      status: "OK",
      provider: "v1",
      results: v1.places.slice(0, topK).map(toResultV1),
    };
  }

  // --- 3) Kembalikan detail error untuk debug di client ---
  return {
    status: legacy?.status ?? v1?.error ?? "UNKNOWN",
    error_message: legacy?.error_message ?? v1?.error ?? v1?.status ?? null,
    results: [] as MapsResult[],
  };
}
