/**
 * Sets the shared guest password.
 *
 *   npm run password -- "new password"            print the verifier
 *   npm run password -- "new password" --write    also save it as the default in src/lib/password.ts
 *
 * The verifier can instead go in the Vercel env var SITE_PASSWORD_VERIFIER,
 * which overrides the default without a code change. Either way, every guest
 * is signed out and needs the new password.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { deriveToken, normalisePassword, verifierFor } from "../src/lib/password.ts";

const args = process.argv.slice(2);
const password = args.find((a) => !a.startsWith("--"));
if (!password) {
  console.error('Usage: npm run password -- "new password" [--write]');
  process.exit(1);
}

const verifier = verifierFor(deriveToken(password));
console.log(`Guests type:   ${password}   (matched as "${normalisePassword(password)}" — case and spaces ignored)`);
console.log(`Verifier:      ${verifier}`);

if (args.includes("--write")) {
  const file = new URL("../src/lib/password.ts", import.meta.url);
  const src = readFileSync(file, "utf8");
  const next = src.replace(/const DEFAULT_VERIFIER = "[^"]*";/, `const DEFAULT_VERIFIER = "${verifier}";`);
  writeFileSync(file, next);
  console.log("Saved as the default in src/lib/password.ts");
}
