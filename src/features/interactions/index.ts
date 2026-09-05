import { Hono } from "hono";
import { intFromEnv } from "../../lib/config";
import { INTERACTIONS_RATE_LIMIT_PER_MIN_DEFAULT } from "../../lib/constants";
import type { Env } from "../../lib/env";
import { rateLimit } from "../../lib/rate-limit";
import type { Interaction } from "./schema";
import { handleInteraction, requireVerifiedInteraction } from "./service";

const interactions = new Hono<{
  Bindings: Env;
  Variables: { interaction: Interaction };
}>().post(
  "/",
  rateLimit("interactions", (env) =>
    intFromEnv(env.INTERACTIONS_RATE_LIMIT_PER_MIN, INTERACTIONS_RATE_LIMIT_PER_MIN_DEFAULT, 0, 600)
  ),
  requireVerifiedInteraction,
  (c) => handleInteraction(c, c.get("interaction"))
);

export default interactions;
export type InteractionsAppType = typeof interactions;