import { wedding } from "@/content/wedding";
import { isUnlocked } from "@/lib/session";

export const dynamic = "force-dynamic";

const floating = (date: string, time: string) => `${date.replaceAll("-", "")}T${time.replace(":", "")}00`;

/** Venue-local date + time → UTC "YYYYMMDDTHHMMSSZ", so every guest's calendar shows the right local hour. */
const utc = (date: string, time: string, offset: string) =>
  new Date(`${date}T${time}:00${offset}`).toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";

const stamp = (date: string, time: string) =>
  wedding.utcOffset ? utc(date, time, wedding.utcOffset) : floating(date, time);
const esc = (s: string) => s.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");

export async function GET() {
  if (!(await isUnlocked())) return new Response("Not found", { status: 404 });

  const location = [wedding.venue.name, wedding.venue.hotel, wedding.venue.address?.en].filter(Boolean).join(", ");
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Patrick & Ivy//Wedding//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    ...(wedding.venue.mapUrl ? [`URL:${wedding.venue.mapUrl}`] : []),
    "UID:ceremony-20270328@patrick-and-ivy",
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`,
    `DTSTART:${stamp(wedding.date, wedding.ceremony.start)}`,
    `DTEND:${stamp(wedding.date, wedding.ceremony.end)}`,
    `SUMMARY:${esc("Wedding of Patrick & Ivy")}`,
    `LOCATION:${esc(location)}`,
    `DESCRIPTION:${esc("Traditional Myanmar wedding ceremony.\nDress code: Myanmar traditional.")}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="patrick-and-ivy-wedding.ics"',
      "Cache-Control": "private, no-store",
    },
  });
}
