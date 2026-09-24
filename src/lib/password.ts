import { createHash, scryptSync, timingSafeEqual } from "node:crypto";

/**
 * Shared-password gate, designed so no secret has to live in the repo or the
 * browser:
 *
 *   token    = scrypt(normalised password)   — set as the HttpOnly cookie
 *   verifier = sha256(token)                 — the only value the server stores
 *
 * Checking a cookie is one sha256; forging one means cracking the password.
 * Changing the password (npm run password -- "new") changes the verifier, which
 * signs every guest out at once.
 */

const SALT = "patrick-ivy-mingala/gate/v1";
const SCRYPT = { N: 2 ** 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 } as const;

// Verifier for the current shared password. Override with SITE_PASSWORD_VERIFIER.
const DEFAULT_VERIFIER = "d8664292c5a3fd28810a80e547fc40b79a56736b1b7f22465c5215ef30f145cc";

export const COOKIE_NAME = "pi_gate";
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export function normalisePassword(input: string): string {
  return input.normalize("NFKC").replace(/\s+/g, "").toLowerCase();
}

export function deriveToken(password: string): string {
  return scryptSync(normalisePassword(password), SALT, 32, SCRYPT).toString("base64url");
}

export function verifierFor(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function currentVerifier(): string {
  return (process.env.SITE_PASSWORD_VERIFIER || DEFAULT_VERIFIER).trim().toLowerCase();
}

function safeEqualHex(a: string, b: string): boolean {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/** Returns the cookie token when the password is right, otherwise null. */
export function checkPassword(password: string): string | null {
  if (!password || password.length > 200) return null;
  const token = deriveToken(password);
  return safeEqualHex(verifierFor(token), currentVerifier()) ? token : null;
}

export function isValidToken(token: string | undefined | null): boolean {
  if (!token || token.length > 100) return false;
  return safeEqualHex(verifierFor(token), currentVerifier());
}
