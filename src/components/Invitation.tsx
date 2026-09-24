"use client";

import { useEffect, useState } from "react";
import CardDialog from "./CardDialog";
import Hero from "./Hero";
import LangToggle, { useLang } from "./LangToggle";
import Reveal from "./Reveal";
import RsvpForm from "./RsvpForm";
import { Contact, Details, Faq, Footer } from "./Sections";
import StickyBar from "./StickyBar";
import type { Lang, SiteContent } from "./types";

/** Sections drift up gently as they arrive. Content is never hidden without JS. */
function useRise() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-rise]"));
    const below = els.filter((el) => el.getBoundingClientRect().top > window.innerHeight * 0.92);
    below.forEach((el) => el.classList.add("rise-pending"));
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.classList.add("rise-in");
          e.target.classList.remove("rise-pending");
          io.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    below.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

export default function Invitation({ initialLang, content }: { initialLang: Lang; content: SiteContent }) {
  const [lang, setLang] = useLang(initialLang);
  const [cardOpen, setCardOpen] = useState(false);
  const t = content.dicts[lang];
  useRise();

  return (
    <>
      <Reveal skipLabel={t.reveal.skip} />
      <LangToggle
        lang={lang}
        onChange={setLang}
        labels={{ en: content.dicts.en.meta, my: content.dicts.my.meta }}
      />
      <main className="page" lang={lang}>
        <Hero lang={lang} content={content} onViewCard={() => setCardOpen(true)} />
        <Details lang={lang} content={content} />
        <RsvpForm lang={lang} content={content} />
        <Faq lang={lang} content={content} />
        <Contact lang={lang} content={content} />
      </main>
      <Footer lang={lang} content={content} />
      <StickyBar label={t.sticky.cta} />
      <CardDialog
        open={cardOpen}
        onClose={() => setCardOpen(false)}
        title={t.card.title}
        closeLabel={t.card.close}
        alt={t.card.alt}
      />
    </>
  );
}
