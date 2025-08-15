import { extractMapsIntent } from "@/services/llm";
import { textSearchPlaces } from "@/services/maps";

export async function processChat(message: string) {
  const intent = await extractMapsIntent(message);
  const topK = intent.top_k ?? 3;
  const q = intent.location ? `${intent.query} in ${intent.location}` : intent.query;

  const { status, error_message, results, provider } =
    await textSearchPlaces(q, intent.filters?.open_now, topK);

  return {
    query: message,
    resolved_location: intent.location ?? null,
    provider, status, error_message,
    results,
  };
}
