import { readFile } from "node:fs/promises";
import path from "node:path";
import { isUnlocked } from "@/lib/session";

export const dynamic = "force-dynamic";

/** The printed card carries the date and venue, so it is served only past the gate. */
export async function GET() {
  if (!(await isUnlocked())) return new Response("Not found", { status: 404 });
  const file = await readFile(path.join(process.cwd(), "private", "invitation-card.webp"));
  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "private, max-age=86400",
    },
  });
}
