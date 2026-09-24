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

/**
 * One URL, two states. Wedding facts are rendered only after the password
 * cookie checks out, and they travel as props in this gated response — never
 * inside a public JavaScript bundle.
 */
export default async function Page() {
  const [lang, unlocked] = await Promise.all([getLang(), isUnlocked()]);

  if (!unlocked) {
    return (
      <Gate
        initialLang={lang}
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
