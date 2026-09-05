import { getPowTtlSec } from "../../lib/config";
import {
  constantTimeEq,
  hasLeadingZeroBits,
  hmacSha256Base64Url,
  sha256Utf8,
  u8ToBase64Url,
} from "../../lib/crypto";
import { isGuildAllowed } from "../../lib/discord";
import type { Env } from "../../lib/env";
import { grantRolesForVerifiedToken } from "./repository";

type VerifyTokenAndPowResult =
  | {
      ok: true;
      guildId: string;
      userId: string;
      tokenNonce: string;
      expiresAt: number;
    }
  | {
      ok: false;
      msg: string;
      debug?: { diff: number; hash_first4: string };
    };

export type VerifyAndGrantOutcome =
  | { result: "ok" }
  | { result: "verify"; msg: string; debug?: { diff: number; hash_first4: string } }
  | { result: "guild" }
  | { result: "grant"; status: number; msg: string };

export async function issueToken(env: Env, guildId: string, userId: string, difficulty: number): Promise<string> {
  const ts = Math.floor(Date.now() / 1000);
  const exp = ts + getPowTtlSec(env);
  const tokenNonce = crypto.getRandomValues(new Uint8Array(16));
  const nonceB64u = u8ToBase64Url(tokenNonce);

  // pow.v1.nonce.guildId.userId.roleId.exp.diff.sig
  const payload = `pow.v1.${nonceB64u}.${guildId}.${userId}.${env.VERIFIED_ROLE_ID}.${exp}.${difficulty}`;
  const sig = await hmacSha256Base64Url(env.POW_SECRET, payload);
  return `${payload}.${sig}`;
}

function parseToken(token: string) {
  const parts = token.split(".");
  if (parts.length !== 9 || parts[0] !== "pow" || parts[1] !== "v1") return null;
  if (parts.slice(2).some((part) => !part)) return null;
  const payload = parts.slice(0, 8).join(".");
  return {
    nonce: parts[2],
    guildId: parts[3],
    userId: parts[4],
    roleId: parts[5],
    exp: Number(parts[6]),
    diff: Number(parts[7]),
    sig: parts[8],
    payload,
  };
}

async function verifyTokenAndPow(
  env: Env,
  tokenRaw: string,
  nonceRaw: string,
  expected?: { userId?: string; guildId?: string }
): Promise<VerifyTokenAndPowResult> {
  const token = tokenRaw.trim();
  const nonce = nonceRaw.trim();

  const parsed = parseToken(token);
  if (!parsed) return { ok: false, msg: "token形式が不正です。" as const };
  if (!parsed.nonce) return { ok: false, msg: "invalid token nonce" as const };

  if (!Number.isFinite(parsed.exp) || !Number.isFinite(parsed.diff)) {
    return { ok: false, msg: "tokenが壊れています。" as const };
  }

  const now = Math.floor(Date.now() / 1000);
  if (now >= parsed.exp) {
    return { ok: false, msg: "期限切れです。Discordで /pow からやり直してください。" as const };
  }

  if (parsed.roleId !== env.VERIFIED_ROLE_ID) {
    return { ok: false, msg: "role mismatch" as const };
  }

  if (expected?.userId && expected.userId !== parsed.userId) {
    return { ok: false, msg: "user mismatch" as const };
  }

  if (expected?.guildId && expected.guildId !== parsed.guildId) {
    return { ok: false, msg: "guild mismatch" as const };
  }

  const expectedSig = await hmacSha256Base64Url(env.POW_SECRET, parsed.payload);
  if (!constantTimeEq(expectedSig, parsed.sig)) {
    return { ok: false, msg: "署名が不正です。" as const };
  }

  const h = await sha256Utf8(`${token}.${nonce}`);
  if (!hasLeadingZeroBits(h, parsed.diff)) {
    const hex4 = Array.from(h.slice(0, 4))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return {
      ok: false,
      msg: "PoWが不正です（条件未達）。" as const,
      debug: { diff: parsed.diff, hash_first4: hex4 },
    };
  }

  return {
    ok: true as const,
    guildId: parsed.guildId,
    userId: parsed.userId,
    tokenNonce: parsed.nonce,
    expiresAt: parsed.exp,
  };
}

export async function verifyAndGrantRoles(
  env: Env,
  token: string,
  nonce: string,
  expected?: { userId?: string; guildId?: string }
): Promise<VerifyAndGrantOutcome> {
  const v = await verifyTokenAndPow(env, token, nonce, expected);
  if (!v.ok) return { result: "verify", msg: v.msg, debug: v.debug };

  if (!isGuildAllowed(env, v.guildId)) return { result: "guild" };

  const res = await grantRolesForVerifiedToken(env, v.tokenNonce, v.expiresAt, v.guildId, v.userId);
  if (!res.ok) return { result: "grant", status: res.status, msg: res.msg };
  return { result: "ok" };
}