import nacl from "tweetnacl";
import { DISCORD_SIGNATURE_MAX_AGE_SEC } from "./constants";
import { hexToU8 } from "./crypto";
import type { Env } from "./env";

export async function verifyDiscordSig(req: Request, env: Env, bodyText: string): Promise<boolean> {
  const sigHex = req.headers.get("x-signature-ed25519");
  const ts = req.headers.get("x-signature-timestamp");
  if (!sigHex || !ts) return false;
  if (!/^[0-9a-f]{128}$/i.test(sigHex)) return false;
  if (!/^\d+$/.test(ts)) return false;

  const timestamp = Number(ts);
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isSafeInteger(timestamp) || Math.abs(now - timestamp) > DISCORD_SIGNATURE_MAX_AGE_SEC) {
    return false;
  }
  if (!/^[0-9a-f]{64}$/i.test(env.DISCORD_PUBLIC_KEY)) return false;

  try {
    const msg = new TextEncoder().encode(ts + bodyText);
    const sig = hexToU8(sigHex);
    const pub = hexToU8(env.DISCORD_PUBLIC_KEY);
    return nacl.sign.detached.verify(msg, sig, pub);
  } catch {
    return false;
  }
}

export function ephemeral(content: string) {
  return { type: 4, data: { content, flags: 64 } };
}

export function ephemeralWithLink(content: string, url: string) {
  // Link button (style=5)
  return {
    type: 4,
    data: {
      content,
      flags: 64,
      components: [
        {
          type: 1,
          components: [{ type: 2, style: 5, label: "PoW認証を開始", url }],
        },
      ],
    },
  };
}

export function ephemeralWithLinkLabel(content: string, url: string, label: string) {
  return {
    type: 4,
    data: {
      content,
      flags: 64,
      components: [
        {
          type: 1,
          components: [{ type: 2, style: 5, label, url }],
        },
      ],
    },
  };
}

export function parseOptions(interaction: {
  data?: { options?: Array<{ name: string; value: unknown }> | null } | null;
}): Record<string, unknown> {
  const opts = interaction?.data?.options ?? [];
  const out: Record<string, unknown> = {};
  for (const o of opts) out[o.name] = o.value;
  return out;
}

export function isGuildAllowed(env: Env, guildId: string): boolean {
  const raw = env.ALLOWED_GUILD_IDS;
  if (!raw || raw.trim() === "") return true;
  const allowed = raw
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  return allowed.includes(guildId);
}