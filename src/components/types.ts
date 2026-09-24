import type { Dict } from "@/content/en";
import type { couple, Wedding } from "@/content/wedding";
import type { Lang } from "@/lib/rsvp-schema";

export type { Lang };

export type GateStrings = Dict["gate"] & Dict["meta"];

export type SiteContent = {
  dicts: Record<Lang, Dict>;
  wedding: Wedding;
  couple: typeof couple;
  cardTitle: string;
  deadline: { en: string; my: string } | null;
  late: boolean;
};
