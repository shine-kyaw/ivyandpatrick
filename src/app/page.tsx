import Gate from "@/components/Gate";
import Invitation from "@/components/Invitation";
import en from "@/content/en";
import my from "@/content/my";
import { cardText, couple, isLate, wedding } from "@/content/wedding";
import { formatDate } from "@/lib/format";
import { getLang } from "@/lib/lang";
import { isUnlocked } from "@/lib/session";
import type { SiteContent } from "@/components/types";

export const dynamic = "force-dynamic";

const GATE_ERRORS = ["empty", "wrong", "limited", "forbidden"] as const;
type GateError = (typeof GATE_ERRORS)[number];

/**
 * One URL, two states. Wedding facts are rendered only after the password
 * cookie checks out, and they travel as props in this gated response — never
 * inside a public JavaScript bundle.
 */
export default async function Page({ searchParams }: { searchParams: Promise<{ gate?: string }> }) {
  const [lang, unlocked, params] = await Promise.all([getLang(), isUnlocked(), searchParams]);

  if (!unlocked) {
    // Set by /api/unlock when the password form was posted without JavaScript.
    const gateError = GATE_ERRORS.find((e) => e === params.gate) as GateError | undefined;
    return (
      <Gate
        initialLang={lang}
        initialError={gateError}
        strings={{
          en: { ...en.gate, ...en.meta },
          my: { ...my.gate, ...my.meta },
        }}
      />
    );
  }

  const content: SiteContent = {
    dicts: { en, my },
    wedding,
    couple,
    cardTitle: cardText.title,
    deadline: wedding.rsvpDeadline ? formatDate(wedding.rsvpDeadline) : null,
    late: isLate() === true,
  };
  return <Invitation initialLang={lang} content={content} />;
}
