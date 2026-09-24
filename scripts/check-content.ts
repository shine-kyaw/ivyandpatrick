/**
 * Lists the wedding facts still missing from src/content/wedding.ts.
 * The site hides anything that is null, so nothing breaks — but guests
 * should not receive the link until the items marked ESSENTIAL are filled.
 */
import { wedding } from "../src/content/wedding.ts";

const missing: [string, boolean][] = [];
if (!wedding.venue.address) missing.push(["Venue full address (EN + Burmese)", true]);
if (!wedding.venue.mapUrl) missing.push(["Google Maps link for the venue", true]);
if (!wedding.rsvpDeadline) missing.push(["RSVP deadline date", true]);
if (!wedding.contact) missing.push(["Contact person: name + phone (Viber/WhatsApp?)", true]);
if (!wedding.timezoneLabel) missing.push(["Timezone label shown next to the time", false]);
if (!wedding.gifts) missing.push(["Gifts note (EN + Burmese) — optional", false]);

const env = [
  ["RSVP_WEBHOOK_URL", "Google Apps Script web app URL (replies go nowhere without it)"],
  ["RSVP_WEBHOOK_SECRET", "shared secret, identical in Apps Script"],
] as const;

if (!missing.length) console.log("All wedding facts are filled in.");
else {
  console.log("Still to confirm with the couple:");
  for (const [item, essential] of missing) console.log(`  ${essential ? "ESSENTIAL " : "optional  "} ${item}`);
}
console.log("\nProduction environment variables (Vercel → Settings → Environment Variables):");
for (const [key, what] of env) console.log(`  ${process.env[key] ? "set    " : "MISSING"}  ${key} — ${what}`);

if (process.argv.includes("--strict") && missing.some(([, e]) => e)) process.exit(1);
