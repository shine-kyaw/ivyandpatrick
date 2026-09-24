"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { REVEAL_KEY } from "./keys";

const DURATION = 2000;

function focusInvitation() {
  document.getElementById("hero-title")?.focus({ preventScroll: true });
}

/**
 * The signature moment: straight after the password, the chinoiserie card the
 * guest just unlocked opens like a pair of garden doors onto the invitation.
 * Plays once per unlock and can be skipped. Guests who prefer reduced motion
 * skip it entirely. Either way, focus lands on the invitation's heading so a
 * screen reader announces where the guest now is.
 */
export default function Reveal({ skipLabel }: { skipLabel: string }) {
  const [phase, setPhase] = useState<"off" | "on" | "leaving">("off");
  const timers = useRef<number[]>([]);
  const skipRef = useRef<HTMLButtonElement>(null);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  const finish = useCallback(() => {
    clearTimers();
    try {
      sessionStorage.removeItem(REVEAL_KEY);
    } catch {
      // storage unavailable
    }
    document.documentElement.classList.remove("is-revealing");
    setPhase("leaving");
    timers.current.push(window.setTimeout(focusInvitation, 40));
    timers.current.push(window.setTimeout(() => setPhase("off"), 320));
  }, []);

  useLayoutEffect(() => {
    let play = false;
    try {
      play = sessionStorage.getItem(REVEAL_KEY) === "1";
    } catch {
      play = false;
    }
    if (!play) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      try {
        sessionStorage.removeItem(REVEAL_KEY);
      } catch {
        // storage unavailable
      }
      focusInvitation();
      return;
    }

    window.scrollTo(0, 0);
    document.documentElement.classList.add("is-revealing");
    setPhase("on");
    timers.current.push(window.setTimeout(finish, DURATION));
    // The flag is only cleared in finish(), so a re-run of this effect (React
    // Strict Mode, a fast refresh) starts cleanly instead of stranding the overlay.
    return () => {
      clearTimers();
      document.documentElement.classList.remove("is-revealing");
      setPhase("off");
    };
  }, [finish]);

  const rootRef = useRef<HTMLDivElement>(null);

  // While the doors are closed, the invitation behind them can't be tabbed into.
  useLayoutEffect(() => {
    if (phase !== "on") return;
    const root = rootRef.current;
    const siblings = root?.parentElement
      ? Array.from(root.parentElement.children).filter((el): el is HTMLElement => el !== root && el instanceof HTMLElement)
      : [];
    siblings.forEach((el) => (el.inert = true));
    skipRef.current?.focus({ preventScroll: true });
    return () => siblings.forEach((el) => (el.inert = false));
  }, [phase]);

  if (phase === "off") return null;

  return (
    <div ref={rootRef} className="reveal" data-phase={phase}>
      <div className="reveal__stage" aria-hidden="true">
        <div className="reveal__door reveal__door--l">
          <img src="/art/gate-card.webp" width={860} height={1185} alt="" />
        </div>
        <div className="reveal__door reveal__door--r">
          <img src="/art/gate-card.webp" width={860} height={1185} alt="" />
        </div>
        <div className="reveal__wash" />
      </div>
      <button ref={skipRef} type="button" className="reveal__skip" onClick={finish}>
        {skipLabel}
      </button>
    </div>
  );
}
