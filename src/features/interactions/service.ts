import type { Context, MiddlewareHandler } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { getDifficulty, getPowTtlSec, isEnabled } from "../../lib/config";
import { DISCORD_SIGNATURE_MAX_AGE_SEC } from "../../lib/constants";
import {
  ephemeral,
  ephemeralWithLink,
  ephemeralWithLinkLabel,
  isGuildAllowed,
  parseOptions,
  verifyDiscordSig,
} from "../../lib/discord";
import type { Env } from "../../lib/env";
import { markInteraction } from "../../nonce-store";
import { issueToken, verifyAndGrantRoles } from "../pow/service";
import { interactionSchema, type Interaction } from "./schema";

export const requireVerifiedInteraction: MiddlewareHandler<{
  Bindings: Env;
  Variables: { interaction: Interaction };
}> = async (c, next) => {
  const env = c.env;

  const bodyText = await c.req.text();
  if (!(await verifyDiscordSig(c.req.raw, env, bodyText))) {
    return c.text("invalid signature", 401);
  }

  let raw: unknown;
  try {
    raw = JSON.parse(bodyText);
  } catch {
    return c.text("invalid JSON", 400);
  }

  const parsed = interactionSchema.safeParse(raw);
  if (!parsed.success) return c.text("invalid interaction", 400);

  const check = await markInteraction(
    env,
    parsed.data.id,
    Math.floor(Date.now() / 1000) + DISCORD_SIGNATURE_MAX_AGE_SEC
  );
  if (!check.ok) return c.text(check.msg, check.status as ContentfulStatusCode);

  c.set("interaction", parsed.data);
  await next();
};

export async function handleInteraction(
  c: Context<{ Bindings: Env; Variables: { interaction: Interaction } }>,
  interaction: Interaction
): Promise<Response> {
  const env = c.env;
  const origin = new URL(c.req.url).origin;
  const difficulty = getDifficulty(env);

  // PING
  if (interaction.type === 1) return c.json({ type: 1 });

  // Message Component (button)
  if (interaction.type === 3) {
    if (!isEnabled(env.ENABLE_VERIFY_BUTTON, true)) {
      return c.json(ephemeral("現在この認証ボタンは無効です。"));
    }

    const customId = interaction.data?.custom_id;
    if (customId !== "pow_start") return c.json(ephemeral("未対応のボタンです。"));

    const guildId = interaction.guild_id ?? interaction.guild?.id;
    const userId = interaction.member?.user?.id ?? interaction.user?.id;
    if (!guildId || !userId) return c.json(ephemeral("サーバー内で実行してください。"));

    if (!isGuildAllowed(env, guildId)) return c.json(ephemeral("このサーバーでは利用できません。"));

    const token = await issueToken(env, guildId, userId, difficulty);
    const verifyUrl = `${origin}/verify#token=${encodeURIComponent(token)}`;
    const content = "リンクを開いてPoWを完了してください（完了後に自動でロールが付きます）。";

    return c.json(ephemeralWithLinkLabel(content, verifyUrl, "PoWを解く"));
  }

  // Slash command
  if (interaction.type === 2) {
    const name = interaction.data?.name;
    const guildId = interaction.guild_id;
    const userId = interaction.member?.user?.id;
    const cmd = env.POW_COMMAND_NAME ?? "pow";

    if (!guildId || !userId) return c.json(ephemeral("このコマンドはサーバー内で実行してください。"));

    if (!isGuildAllowed(env, guildId)) return c.json(ephemeral("このサーバーでは利用できません。"));

    if (name === cmd) {
      const token = await issueToken(env, guildId, userId, difficulty);
      // tokenは#（フラグメント）へ。
      const verifyUrl = `${origin}/verify#token=${encodeURIComponent(token)}`;

      const content =
        `PoW認証URLを発行しました（有効 ${getPowTtlSec(env)}s / difficulty=${difficulty}）。\n` +
        `ボタンから開いて計算すると自動でロールが付与されます。`;

      return c.json(ephemeralWithLink(content, verifyUrl));
    }

    // 互換: 手動提出用（コマンドが残っていても壊れない）
    if (name === "pow_submit") {
      if (!isEnabled(env.ENABLE_POW_SUBMIT)) {
        return c.json(ephemeral("pow_submit is disabled."));
      }
      const opts = parseOptions(interaction);
      const token = String((opts.token ?? opts.challenge ?? "")).trim();
      const nonce = String((opts.nonce ?? "")).trim();
      if (!token || !nonce) return c.json(ephemeral("token(challenge) と nonce を指定してください。"));

      const res = await verifyAndGrantRoles(env, token, nonce, { userId, guildId });
      if (res.result === "ok") return c.json(ephemeral("Role granted."));
      if (res.result === "verify") return c.json(ephemeral(res.msg));
      if (res.result === "guild") return c.json(ephemeral("このサーバーでは利用できません。"));
      return c.json(ephemeral("Failed to add role. status=" + res.status));
    }

    return c.json(ephemeral("未対応のコマンドです。"));
  }

  return c.json(ephemeral("未対応のリクエストです。"));
}