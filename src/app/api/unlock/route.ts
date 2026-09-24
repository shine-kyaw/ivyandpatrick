import { NextResponse } from "next/server";
import { COOKIE_MAX_AGE, COOKIE_NAME, checkPassword } from "@/lib/password";
import { bump, clientIp, peek } from "@/lib/rate-limit";
import { isSameOrigin } from "@/lib/same-origin";

export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

// Only wrong guesses count, so a group of guests behind one IP never locks itself out.
const MAX_FAILURES = 30;
const WINDOW_SEC = 600;

type Outcome = "ok" | "empty" | "wrong" | "limited" | "forbidden";

/**
 * Accepts JSON from the gate's script, and a plain form post when the page's
 * JavaScript hasn't loaded yet (slow in-app browsers). The form path answers
 * with a redirect, so the password never lands in a URL.
 */
export async function POST(request: Request) {
  const isForm = (request.headers.get("content-type") ?? "").includes("application/x-www-form-urlencoded");
  const respond = (outcome: Outcome, token?: string) => {
    const status = { ok: 200, empty: 400, wrong: 401, limited: 429, forbidden: 403 }[outcome];
    const res = isForm
      ? NextResponse.redirect(new URL(outcome === "ok" ? "/" : `/?gate=${outcome}`, request.url), 303)
      : NextResponse.json(outcome === "ok" ? { ok: true } : { ok: false, error: outcome }, { status });
    res.headers.set("Cache-Control", "no-store");
    if (token) {
      res.cookies.set(COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: COOKIE_MAX_AGE,
      });
    }
    return res;
  };

  if (!isSameOrigin(request)) return respond("forbidden");

  const failKey = `unlock-fail:${clientIp(request.headers)}`;
  if ((await peek(failKey)) >= MAX_FAILURES) return respond("limited");

  let password = "";
  try {
    if (isForm) {
      const value = (await request.formData()).get("password");
      password = typeof value === "string" ? value : "";
    } else {
      const body = (await request.json()) as { password?: unknown };
      password = typeof body.password === "string" ? body.password : "";
    }
  } catch {
    // treated as empty
  }
  if (!password.trim()) return respond("empty");

  const token = checkPassword(password);
  if (!token) {
    await bump(failKey, WINDOW_SEC);
    return respond("wrong");
  }
  return respond("ok", token);
}

export function GET() {
  return NextResponse.json({ ok: false }, { status: 405, headers: noStore });
}
