import client from "@/config/openai";

export type MapsIntent = {
  query: string;                 // e.g. "ramen"
  location?: string;             // e.g. "Cimahi, West Java"
  radius_km?: number;            // default 5
  top_k?: number;                // default 3
  filters?: {
    open_now?: boolean;
    min_rating?: number;
    price_level?: 0 | 1 | 2 | 3 | 4;
  };
};

export async function extractMapsIntent(message: string): Promise<MapsIntent> {
  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.2,
    response_format: { type: "json_object" }, // JSON mode
    messages: [
      {
        role: "system",
        content: [
          "Extract Google-Maps-friendly intent from casual Indonesian/English queries.",
          "Return ONLY JSON with schema:",
          "{ query: string, location?: string, radius_km?: number, top_k?: number,",
          "  filters?: { open_now?: boolean, min_rating?: number, price_level?: 0|1|2|3|4 } }",
          "Defaults: top_k=3, radius_km=5. If user implies 'now', set open_now=true.",
          "Do not include any text outside the JSON."
        ].join("\n")
      },
      { role: "user", content: message }
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  const intent = JSON.parse(raw);
  // defaults
  return {
    top_k: 3,
    radius_km: 5,
    ...intent,
  };
}
