"use client";

import { useEffect, useState } from "react";

/**
 * Phone-only reply bar. Appears once the hero's own button has scrolled away,
 * and steps aside while the form is on screen or the keyboard is up.
 */
export default function StickyBar({ label }: { label: string }) {
  const [heroVisible, setHeroVisible] = useState(true);
  const [rsvpVisible, setRsvpVisible] = useState(false);
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    const hero = document.getElementById("hero-cta");
    const rsvp = document.getElementById("rsvp");
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.target === hero) setHeroVisible(e.isIntersecting || e.boundingClientRect.top > 0);
          if (e.target === rsvp) setRsvpVisible(e.isIntersecting);
        }
      },
      { threshold: 0 },
    );
    if (hero) io.observe(hero);
    if (rsvp) io.observe(rsvp);

    const onFocus = (e: FocusEvent) => {
      const el = e.target as HTMLElement;
      setTyping(el.matches?.("input:not([type=radio]):not([type=checkbox]), textarea") ?? false);
    };
    const onBlur = () => setTyping(false);
    document.addEventListener("focusin", onFocus);
    document.addEventListener("focusout", onBlur);
    return () => {
      io.disconnect();
      document.removeEventListener("focusin", onFocus);
      document.removeEventListener("focusout", onBlur);
    };
  }, []);

  const show = !heroVisible && !rsvpVisible && !typing;
  return (
    <div className="sticky" data-show={show || undefined} aria-hidden={!show}>
      <a className="btn btn--primary btn--wide" href="#rsvp" tabIndex={show ? 0 : -1}>
        {label}
      </a>
    </div>
  );
}
