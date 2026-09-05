import type { MiddlewareHandler } from "hono";
import type { Env } from "./env";
import { getClientKey } from "./http";
import { checkRateLimit } from "../nonce-store";

export function rateLimit(
  keyPrefix: string,
  getLimit: (env: Env) => number
): MiddlewareHandler<{ Bindings: Env }> {
  return async (c, next) => {
    const env = c.env;
    const rate = await checkRateLimit(env, `${keyPrefix}:${getClientKey(c.req.raw)}`, getLimit(env));
    if (!rate.ok) {
      const res = c.json({ ok: false, error: "rate limited" }, 429);
      res.headers.set("retry-after", String(rate.retryAfterSec));
      return res;
    }
    await next();
  };
}