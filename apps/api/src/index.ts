import { Hono } from "hono";
import { cors } from "hono/cors";
import type { ErrorResponse } from "@storeassist/shared";
import type { Bindings } from "./env.ts";
import { chat } from "./routes/chat.ts";
import { health } from "./routes/health.ts";

const app = new Hono<{ Bindings: Bindings }>();

// CORS: only the frontend origin gets an Access-Control-Allow-Origin header.
app.use("/api/*", (c, next) =>
  cors({
    origin: (origin) => (origin && origin === c.env.ALLOWED_ORIGIN ? origin : null),
    allowMethods: ["POST", "OPTIONS"],
    allowHeaders: ["content-type"],
    maxAge: 600,
  })(c, next),
);

app.route("/health", health);
app.route("/api/chat", chat);

app.notFound((c) => {
  const body: ErrorResponse = { error: { code: "invalid_request", message: "Not found." } };
  return c.json(body, 404);
});

app.onError((err, c) => {
  console.log(
    JSON.stringify({ route: c.req.path, outcome: "error", detail: err.message.slice(0, 200) }),
  );
  const body: ErrorResponse = { error: { code: "internal", message: "Something went wrong." } };
  return c.json(body, 500);
});

export default app;
