import "server-only";

/**
 * Fixed-window counters. Uses Upstash Redis over REST when
 * UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are set, so limits hold
 * across serverless instances; otherwise falls back to per-instance memory,
 * which still blunts a single noisy client.
 *
 * Limits are generous on purpose: a family Viber group or an office Wi-Fi puts
 * many real guests behind one public IP.
 */

const memory = new Map<string, { count: number; resetAt: number }>();

function upstash(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

async function redis(commands: string[][]): Promise<{ result: unknown }[] | null> {
  const cfg = upstash();
  if (!cfg) return null;
  try {
    const res = await fetch(`${cfg.url}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${cfg.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(commands),
      cache: "no-store",
    });
    return res.ok ? ((await res.json()) as { result: unknown }[]) : null;
  } catch {
    return null;
  }
}

/** Current count in the window, without adding to it. */
export async function peek(key: string): Promise<number> {
  const r = await redis([["GET", `rl:${key}`]]);
  if (r) return Number(r[0]?.result ?? 0) || 0;
  const entry = memory.get(key);
  return entry && entry.resetAt > Date.now() ? entry.count : 0;
}

/** Adds one to the window's count and returns the new total. */
export async function bump(key: string, windowSec: number): Promise<number> {
  const r = await redis([
    ["INCR", `rl:${key}`],
    ["EXPIRE", `rl:${key}`, String(windowSec), "NX"],
  ]);
  if (r) return Number(r[0]?.result ?? 1) || 1;

  const now = Date.now();
  const entry = memory.get(key);
  if (!entry || entry.resetAt <= now) {
    memory.set(key, { count: 1, resetAt: now + windowSec * 1000 });
    if (memory.size > 5000) {
      for (const [k, v] of memory) if (v.resetAt <= now) memory.delete(k);
    }
    return 1;
  }
  entry.count += 1;
  return entry.count;
}

/** Counts this request and reports whether it is still within the limit. */
export async function rateLimit(key: string, limit: number, windowSec: number): Promise<boolean> {
  return (await bump(key, windowSec)) <= limit;
}

export function clientIp(headers: Headers): string {
  return (
    headers.get("x-real-ip") ||
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}
