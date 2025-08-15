import { Hono } from "hono";
import { prettyJSON } from "hono/pretty-json";

const middleware = new Hono();
middleware.use("*", prettyJSON());

export default middleware;
