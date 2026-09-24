import assert from "node:assert/strict";
import { test } from "node:test";
import { checkPassword, deriveToken, isValidToken, normalisePassword, verifierFor } from "../src/lib/password.ts";

// Tests use their own password via the env override, never the real one.
process.env.SITE_PASSWORD_VERIFIER = verifierFor(deriveToken("garden doors 2027"));

test("guests can type the password loosely: case and spaces are ignored", () => {
  assert.equal(normalisePassword("  Garden Doors 2027 "), "gardendoors2027");
});

test("the right password yields a token the server accepts", () => {
  const token = checkPassword("GARDEN DOORS 2027");
  assert.ok(token);
  assert.equal(isValidToken(token), true);
  assert.equal(token, deriveToken("gardendoors2027"));
});

test("wrong or empty passwords and forged cookies are refused", () => {
  assert.equal(checkPassword("garden doors 2026"), null);
  assert.equal(checkPassword(""), null);
  assert.equal(isValidToken("forged"), false);
  assert.equal(isValidToken(undefined), false);
});
