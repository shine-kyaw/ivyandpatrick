import "server-only";
import { cookies, headers } from "next/headers";
import type { Lang } from "./rsvp-schema";

export const LANG_COOKIE = "pi_lang";

/** Saved choice first, then the browser's language (Burmese → my), else English. */
export async function getLang(): Promise<Lang> {
  const saved = (await cookies()).get(LANG_COOKIE)?.value;
  if (saved === "en" || saved === "my") return saved;
  const accept = (await headers()).get("accept-language") ?? "";
  const first = accept.split(",")[0]?.trim().toLowerCase() ?? "";
  return first.startsWith("my") ? "my" : "en";
}
