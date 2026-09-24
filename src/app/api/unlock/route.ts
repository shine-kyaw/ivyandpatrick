import { NextResponse } from "next/server";
import { COOKIE_MAX_AGE, COOKIE_NAME, checkPassword } from "@/lib/password";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { isSameOrigin } from "@/lib/same-origin";

export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403, headers: noStore });
  }

  const limit = await rateLimit(`unlock:${clientIp(request.headers)}`, 10, 600);
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, error: "limited" },
      { status: 429, headers: { ...noStore, "Retry-After": String(limit.retryAfter) } },
    );
  }

  let password = "";
  try {
    const body = (await request.json()) as { password?: unknown };
    password = typeof body.password === "string" ? body.password : "";
  } catch {
    // treated as empty
  }
  if (!password.trim()) {
    return NextResponse.json({ ok: false, error: "empty" }, { status: 400, headers: noStore });
  }

  const token = checkPassword(password);
  if (!token) {
    return NextResponse.json({ ok: false, error: "wrong" }, { status: 401, headers: noStore });
  }

  const res = NextResponse.json({ ok: true }, { headers: noStore });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
  return res;
}
