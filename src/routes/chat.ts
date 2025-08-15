import { Hono } from "hono";
import { processChat } from "@/services/map";

const chat = new Hono();
chat.get("/", (c) => c.json({ message: "OK" }));

// Simple rate limit (optional, in-memory)
const BUCKET = new Map<string, { count: number; ts: number }>();
function limited(ip: string, limit = 10, windowMs = 10_000) {
  const now = Date.now();
  const b = BUCKET.get(ip) ?? { count: 0, ts: now };
  if (now - b.ts > windowMs) { b.count = 0; b.ts = now; }
  b.count += 1; BUCKET.set(ip, b);
  return b.count > limit;
}

chat.post("/", async (c) => {
  const ip = c.req.header("cf-connecting-ip") || c.req.header("x-forwarded-for") || "local";
  if (limited(ip)) return c.json({ error: "Too Many Requests" }, 429);

  try {
    const body = await c.req.json().catch(() => ({}));
    const message = (body?.message ?? "").toString().trim();
    if (!message) return c.json({ error: "message is required" }, 400);

    const payload = await processChat(message);
    return c.json(payload); // <- { query, resolved_location, results: [...] }
  } catch (err: any) {
    return c.json({ error: "Internal Error", detail: String(err?.message ?? err) }, 500);
  }
});

export default chat;
