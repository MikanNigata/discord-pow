import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { intFromEnv } from "../../lib/config";
import { SUBMIT_RATE_LIMIT_PER_MIN_DEFAULT } from "../../lib/constants";
import type { Env } from "../../lib/env";
import { rateLimit } from "../../lib/rate-limit";
import { submitSchema } from "./schema";
import { verifyAndGrantRoles } from "./service";

const pow = new Hono<{ Bindings: Env }>().post(
  "/submit",
  rateLimit("submit", (env) =>
    intFromEnv(env.SUBMIT_RATE_LIMIT_PER_MIN, SUBMIT_RATE_LIMIT_PER_MIN_DEFAULT, 0, 600)
  ),
  zValidator("json", submitSchema),
  async (c) => {
    const body = c.req.valid("json");
    const token = body.token.trim();
    const nonce = body.nonce.trim();
    const submitUserId = body.user_id.trim();
    const submitGuildId = body.guild_id.trim();
    if (!token || !nonce || !submitUserId || !submitGuildId) {
      return c.json({ ok: false, error: "missing token/nonce/user_id/guild_id" }, 400);
    }

    const outcome = await verifyAndGrantRoles(c.env, token, nonce, {
      userId: submitUserId,
      guildId: submitGuildId,
    });

    if (outcome.result === "ok") return c.json({ ok: true });
    if (outcome.result === "verify") {
      return c.json({ ok: false, error: outcome.msg, debug: outcome.debug }, 400);
    }
    if (outcome.result === "guild") {
      return c.json({ ok: false, error: "guild not allowed" }, 403);
    }
    return c.json(
      { ok: false, error: outcome.msg, status: outcome.status },
      outcome.status as ContentfulStatusCode
    );
  }
);

export default pow;
export type PowAppType = typeof pow;