import { Hono } from "hono";
import { API } from "@/constants/endpoints";

import middleware from "@/config/middleware";
import chat from "@/routes/chat";

const app = new Hono();

app.get("/", (c) => c.redirect("/health"));
app.get("/health", (c) => c.json({ message: "OK" }));
app.onError((err, c) => c.json({ message: `Custom Error Message: ${err}` }, 500));
app.notFound((c) => c.json({ message: "Custom 404 Not Found" }, 404));

// Routing
app.route(API.CHAT, middleware);
app.route(API.CHAT, chat);

export default {
  port: process.env.PORT || 3000,
  fetch: app.fetch,
};
