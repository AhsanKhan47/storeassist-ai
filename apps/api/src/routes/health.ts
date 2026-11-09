import { Hono } from "hono";
import type { HealthResponse } from "@storeassist/shared";

export const health = new Hono();

health.get("/", (c) => {
  const body: HealthResponse = { ok: true };
  return c.json(body);
});
