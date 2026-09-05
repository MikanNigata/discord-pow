export function hexToU8(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (clean.length % 2 !== 0 || !/^[0-9a-f]*$/i.test(clean)) throw new Error("invalid hex");
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return out;
}

export function u8ToBase64Url(u8: Uint8Array): string {
  let s = "";
  for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
  const b64 = btoa(s);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export async function hmacSha256Base64Url(secret: string, data: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return u8ToBase64Url(new Uint8Array(sig));
}

export async function sha256Utf8(data: string): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(data));
  return new Uint8Array(digest);
}

export async function sha256Base64Url(data: string): Promise<string> {
  return u8ToBase64Url(await sha256Utf8(data));
}

export function hasLeadingZeroBits(buf: Uint8Array, zeroBits: number): boolean {
  let bits = zeroBits;
  for (let i = 0; i < buf.length; i++) {
    if (bits <= 0) return true;
    const b = buf[i];
    if (bits >= 8) {
      if (b !== 0) return false;
      bits -= 8;
    } else {
      const mask = 0xff << (8 - bits);
      return (b & mask) === 0;
    }
  }
  return bits <= 0;
}

export function constantTimeEq(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const ae = new TextEncoder().encode(a);
  const be = new TextEncoder().encode(b);
  let diff = 0;
  for (let i = 0; i < ae.length; i++) diff |= ae[i] ^ be[i];
  return diff === 0;
}