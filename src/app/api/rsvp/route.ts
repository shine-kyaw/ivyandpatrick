import { NextResponse } from "next/server";
import { isLate } from "@/content/wedding";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { parse, validate, type Lang } from "@/lib/rsvp-schema";
import { storeRsvp, toRow } from "@/lib/rsvp-store";
import { isSameOrigin } from "@/lib/same-origin";
import { isUnlocked } from "@/lib/session";

export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };
const fail = (error: string, status: number, extra: Record<string, unknown> = {}) =>
  NextResponse.json({ ok: false, error, ...extra }, { status, headers: noStore });

const MIN_FORM_MS = 3000;
const MAX_BODY_BYTES = 8 * 1024;

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return fail("forbidden", 403);
  if (!(await isUnlocked())) return fail("locked", 401);

  // Generous: several guests may reply from one shared IP (office Wi-Fi, carrier NAT).
  if (!(await rateLimit(`rsvp:${clientIp(request.headers)}`, 40, 600))) return fail("rate_limited", 429);

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return fail("invalid", 413);

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw);
  } catch {
    return fail("invalid", 400);
  }

  // Bots: a filled honeypot or an instant submit is accepted and silently dropped.
  // elapsedMs is measured on the guest's own device (never compared with our
  // clock), and the form itself waits out the minimum, so real guests never
  // land here.
  const elapsedMs = typeof body.elapsedMs === "number" && Number.isFinite(body.elapsedMs) ? body.elapsedMs : 0;
  const honeypot = typeof body.website === "string" && body.website.length > 0;
  if (honeypot || elapsedMs < MIN_FORM_MS) {
    return NextResponse.json({ ok: true }, { headers: noStore });
  }

  const input = parse(body);
  if (!input) return fail("invalid", 400);
  const errors = validate(input);
  if (Object.keys(errors).length > 0) return fail("invalid", 422, { errors });

  const lang: Lang = body.lang === "my" ? "my" : "en";
  const row = toRow(input, { lang, late: isLate(), userAgent: request.headers.get("user-agent") ?? "" });
  const stored = await storeRsvp(row);

  if (!stored.ok) {
    return fail(stored.reason === "not_configured" ? "not_configured" : "network", stored.reason === "not_configured" ? 503 : 502);
  }
  return NextResponse.json({ ok: true }, { headers: noStore });
}
