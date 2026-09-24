"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { REVEAL_KEY } from "./keys";

const DURATION = 2000;
const REDUCED = 300;

/**
 * The signature moment: straight after the password, the chinoiserie card the
 * guest just unlocked opens like a pair of garden doors onto the invitation.
 * Plays once per unlock, can be skipped, and collapses to a short fade when the
 * guest prefers reduced motion.
 */
export default function Reveal({ skipLabel }: { skipLabel: string }) {
  const [phase, setPhase] = useState<"off" | "on" | "leaving">("off");
  const timers = useRef<number[]>([]);

  const finish = useCallback(() => {
    timers.current.forEach(clearTimeout);
    setPhase("leaving");
    document.documentElement.classList.remove("is-revealing");
    timers.current = [window.setTimeout(() => setPhase("off"), 320)];
  }, []);

  useLayoutEffect(() => {
    let play = false;
    try {
      play = sessionStorage.getItem(REVEAL_KEY) === "1";
      sessionStorage.removeItem(REVEAL_KEY);
    } catch {
      play = false;
    }
    if (!play) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo(0, 0);
    document.documentElement.classList.add("is-revealing");
    setPhase("on");
    timers.current.push(window.setTimeout(finish, reduce ? REDUCED : DURATION));
    const t = timers.current;
    return () => t.forEach(clearTimeout);
  }, [finish]);

  if (phase === "off") return null;

  return (
    <div className="reveal" data-phase={phase} aria-hidden={phase === "leaving" ? true : undefined}>
      <div className="reveal__stage">
        <div className="reveal__door reveal__door--l">
          <img src="/art/gate-card.webp" width={860} height={1185} alt="" />
        </div>
        <div className="reveal__door reveal__door--r">
          <img src="/art/gate-card.webp" width={860} height={1185} alt="" />
        </div>
        <p className="reveal__names" aria-hidden="true">
          Patrick <span>&amp;</span> Ivy
        </p>
      </div>
      <button type="button" className="reveal__skip" onClick={finish}>
        {skipLabel}
      </button>
    </div>
  );
}
