import "server-only";
import { randomUUID } from "node:crypto";
import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { phoneDigits, sheetSafe, type Lang, type RsvpInput } from "./rsvp-schema";

/** One spreadsheet row. Column order is defined in scripts/google-apps-script.gs. */
export type RsvpRow = {
  submitted_at: string;
  language: Lang;
  name: string;
  attending: "yes" | "no";
  plus_one: "yes" | "no" | "";
  plus_one_name: string;
  phone_raw: string;
  phone_digits: string;
  email: string;
  dietary: string;
  dietary_other: string;
  message: string;
  late: "TRUE" | "FALSE" | "";
  submission_id: string;
  device: "mobile" | "desktop";
};

export function toRow(v: RsvpInput, meta: { lang: Lang; late: boolean | null; userAgent: string }): RsvpRow {
  const s = (x: string) => sheetSafe(x);
  return {
    submitted_at: new Date().toISOString(),
    language: meta.lang,
    name: s(v.name),
    attending: v.attending as "yes" | "no",
    plus_one: v.plusOne,
    plus_one_name: s(v.plusOneName),
    phone_raw: s(v.phone),
    phone_digits: phoneDigits(v.phone),
    email: s(v.email),
    dietary: v.dietary.join(", "),
    dietary_other: s(v.dietaryOther),
    message: s(v.message),
    late: meta.late === null ? "" : meta.late ? "TRUE" : "FALSE",
    submission_id: randomUUID(),
    device: /Mobi|Android|iPhone|iPad/i.test(meta.userAgent) ? "mobile" : "desktop",
  };
}

export type StoreResult = { ok: true } | { ok: false; reason: "not_configured" | "upstream" };

/**
 * Writes a row to the couple's Google Sheet through their Apps Script web app
 * (RSVP_WEBHOOK_URL + RSVP_WEBHOOK_SECRET). In local development without a
 * webhook, rows go to .data/rsvp-dev.jsonl so the whole flow can be tested.
 */
export async function storeRsvp(row: RsvpRow): Promise<StoreResult> {
  const url = process.env.RSVP_WEBHOOK_URL;
  const secret = process.env.RSVP_WEBHOOK_SECRET;

  if (url && secret) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret, row }),
        redirect: "follow",
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
      });
      const text = await res.text();
      let data: { ok?: boolean } = {};
      try {
        data = JSON.parse(text);
      } catch {
        // Apps Script returns HTML when the deployment is wrong (e.g. not "Anyone").
      }
      if (res.ok && data.ok === true) return { ok: true };
      console.error("rsvp webhook rejected", res.status, text.slice(0, 200));
      return { ok: false, reason: "upstream" };
    } catch (err) {
      console.error("rsvp webhook failed", (err as Error).name);
      return { ok: false, reason: "upstream" };
    }
  }

  if (process.env.NODE_ENV !== "production") {
    const dir = path.join(process.cwd(), ".data");
    await mkdir(dir, { recursive: true });
    await appendFile(path.join(dir, "rsvp-dev.jsonl"), JSON.stringify(row) + "\n", "utf8");
    return { ok: true };
  }

  return { ok: false, reason: "not_configured" };
}
