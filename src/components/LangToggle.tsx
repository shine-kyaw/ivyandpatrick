"use client";

import { useCallback, useEffect, useState } from "react";
import type { Lang } from "./types";

const COOKIE = "pi_lang";

/** Language state shared by the gate and the invitation. */
export function useLang(initial: Lang) {
  const [lang, setLangState] = useState<Lang>(initial);
  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    document.documentElement.lang = next;
    document.cookie = `${COOKIE}=${next}; Path=/; Max-Age=31536000; SameSite=Lax`;
  }, []);
  return [lang, setLang] as const;
}

type Props = {
  lang: Lang;
  onChange: (lang: Lang) => void;
  labels: Record<Lang, { langName: string; switchTo: string }>;
};

/** Tucks away while reading down the page, returns as soon as the guest scrolls up. */
function useTucked() {
  const [tucked, setTucked] = useState(false);
  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (Math.abs(y - last) < 8) return;
      setTucked(y > 160 && y > last);
      last = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return tucked;
}

export default function LangToggle({ lang, onChange, labels }: Props) {
  const tucked = useTucked();
  return (
    <div className="lang-toggle" role="group" aria-label="Language / ဘာသာစကား" data-tucked={tucked || undefined}>
      {(["en", "my"] as const).map((l) => (
        <button
          key={l}
          type="button"
          lang={l}
          className="lang-toggle__btn"
          aria-pressed={lang === l}
          title={lang === l ? undefined : labels[l].switchTo}
          onClick={() => lang !== l && onChange(l)}
        >
          {labels[l].langName}
        </button>
      ))}
    </div>
  );
}
