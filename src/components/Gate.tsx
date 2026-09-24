"use client";

import { useRouter } from "next/navigation";
import { useId, useRef, useState, type FormEvent } from "react";
import LangToggle, { useLang } from "./LangToggle";
import { REVEAL_KEY } from "./keys";
import type { GateStrings, Lang } from "./types";

type Props = {
  initialLang: Lang;
  strings: Record<Lang, GateStrings>;
  initialError?: "empty" | "wrong" | "limited" | "forbidden";
};
type Status = "idle" | "sending" | "opening" | "empty" | "wrong" | "limited" | "error";

export default function Gate({ initialLang, strings, initialError }: Props) {
  const [lang, setLang] = useLang(initialLang);
  const [status, setStatus] = useState<Status>(
    initialError === "forbidden" ? "error" : (initialError ?? "idle"),
  );
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();
  const t = strings[lang];

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "sending" || status === "opening") return;
    const password = inputRef.current?.value ?? "";
    if (!password.trim()) {
      setStatus("empty");
      inputRef.current?.focus();
      return;
    }
    setStatus("sending");
    try {
      const res = await fetch("/api/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        setStatus("opening");
        try {
          sessionStorage.setItem(REVEAL_KEY, "1");
        } catch {
          // private mode: the reveal simply doesn't play
        }
        // A no-JS attempt may have left ?gate=… in the address bar.
        if (window.location.search) router.replace("/");
        else router.refresh();
        return;
      }
      const next: Status = res.status === 429 ? "limited" : res.status === 401 ? "wrong" : res.status === 400 ? "empty" : "error";
      setStatus(next);
      inputRef.current?.select();
    } catch {
      setStatus("error");
    }
  }

  const error =
    status === "empty" ? t.empty : status === "wrong" ? t.wrong : status === "limited" ? t.limited : status === "error" ? t.error : "";
  const busy = status === "sending" || status === "opening";

  return (
    <main className="gate" lang={lang}>
      <LangToggle
        lang={lang}
        onChange={setLang}
        labels={{ en: strings.en, my: strings.my }}
      />
      <div className="gate__card">
        <img
          className="gate__art"
          src="/art/gate-card.webp"
          width={860}
          height={1185}
          alt=""
          fetchPriority="high"
          decoding="async"
        />
        <div className="gate__panel">
          <p className="gate__kicker">{t.kicker}</p>
          <h1 className="gate__names">
            Patrick <span className="gate__amp">&amp;</span> Ivy
          </h1>
          <p className="gate__invited">{t.invited}</p>

          <form className="gate__form" method="post" action="/api/unlock" onSubmit={onSubmit} noValidate>
            <label className="gate__label" htmlFor={`${id}-pw`}>
              {t.label}
            </label>
            <input
              ref={inputRef}
              id={`${id}-pw`}
              className="gate__input"
              type="password"
              name="password"
              autoComplete="current-password"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="go"
              required
              aria-invalid={error ? true : undefined}
              aria-describedby={`${id}-hint ${id}-err`}
              onInput={() => status !== "idle" && !busy && setStatus("idle")}
            />
            <p id={`${id}-hint`} className="gate__hint">
              {t.hint}
            </p>
            <p id={`${id}-err`} className="gate__error" role="alert">
              {error}
            </p>
            <button className="btn btn--primary gate__submit" type="submit" disabled={busy} aria-busy={busy}>
              {busy ? t.opening : t.submit}
            </button>
          </form>
        </div>
      </div>
      <p className="gate__lost">{t.lost}</p>
    </main>
  );
}
