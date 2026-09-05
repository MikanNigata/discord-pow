import { DIFFICULTY_DEFAULT, POW_TTL_SEC_DEFAULT } from "./constants";
import type { Env } from "./env";

export function intFromEnv(value: string | undefined, fallback: number, min: number, max: number): number {
  if (value === undefined || value.trim() === "") return fallback;
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

export function getPowTtlSec(env: Env): number {
  return intFromEnv(env.POW_TTL_SEC, POW_TTL_SEC_DEFAULT, 60, 3600);
}

export function getDifficulty(env: Env): number {
  return intFromEnv(env.POW_DIFFICULTY_DEFAULT, DIFFICULTY_DEFAULT, 1, 30);
}

export function isEnabled(value: string | undefined, defaultValue = false): boolean {
  if (value === undefined) return defaultValue;
  const v = value.trim().toLowerCase();
  return v !== "0" && v !== "false" && v !== "off";
}