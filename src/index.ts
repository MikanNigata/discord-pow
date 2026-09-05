import { Hono } from "hono";
import interactions from "./features/interactions";
import pow from "./features/pow";
import verify from "./features/verify";
import type { Env } from "./lib/env";
import { NonceStore } from "./nonce-store";

const app = new Hono<{ Bindings: Env }>();

// Shared security headers for every response.
app.use("*", async (c, next) => {
  await next();
  const res = c.res;
  res.headers.set("referrer-policy", "no-referrer");
  res.headers.set("x-content-type-options", "nosniff");
  res.headers.set("permissions-policy", "camera=(), microphone=(), geolocation=(), payment=()");
  res.headers.set("cross-origin-opener-policy", "same-origin");
  res.headers.set("cross-origin-resource-policy", "same-origin");
  res.headers.set("cache-control", "no-store");
});
app.notFound((c) => c.text("not found", 404));

const routes = app
  .route("/interactions", interactions)
  .route("/api", pow)
  .route("/", verify);

export default app;
export type AppType = typeof routes;
export { NonceStore };