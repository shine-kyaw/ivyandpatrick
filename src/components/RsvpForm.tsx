"use client";

import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { fill } from "@/lib/format";
import {
  DIETARY_OPTIONS,
  EMPTY_RSVP,
  FIELD_ORDER,
  LIMITS,
  isVisible,
  normalisePhone,
  prune,
  validate,
  validateField,
  type DietaryOption,
  type ErrorCode,
  type Errors,
  type Field,
  type RsvpInput,
} from "@/lib/rsvp-schema";
import { Divider, Sprig } from "./Ornament";
import type { Lang, SiteContent } from "./types";

const DRAFT_KEY = "pi:rsvp-draft";
const MIN_FORM_MS = 3000; // must match the API's bot threshold
const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
type FailureCode = "network" | "not_configured" | "rate_limited" | "locked" | "invalid";
type Status = { kind: "idle" } | { kind: "sending" } | { kind: "failed"; code: FailureCode } | { kind: "done"; sent: RsvpInput };

const MAX: Partial<Record<Field, number>> = {
  name: LIMITS.name.max,
  plusOneName: LIMITS.name.max,
  email: LIMITS.email,
  dietaryOther: LIMITS.dietaryOther,
  message: LIMITS.message,
};

function readDraft(): RsvpInput | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as Partial<RsvpInput>;
    return { ...EMPTY_RSVP, ...d, dietary: Array.isArray(d.dietary) ? d.dietary : [] };
  } catch {
    return null;
  }
}

function writeDraft(v: RsvpInput | null) {
  try {
    if (v) sessionStorage.setItem(DRAFT_KEY, JSON.stringify(v));
    else sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    // storage unavailable: the form still works, it just won't survive a reload
  }
}

export default function RsvpForm({ lang, content }: { lang: Lang; content: SiteContent }) {
  const t = content.dicts[lang].rsvp;
  const uid = useId();
  const [values, setValues] = useState<RsvpInput>(EMPTY_RSVP);
  const [shown, setShown] = useState<Set<Field>>(new Set());
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  // Errors as they stood at the last submit: the summary only changes on submit,
  // so screen readers don't re-read the whole alert while a guest types a fix.
  const [summary, setSummary] = useState<{ field: Field; code: ErrorCode }[]>([]);
  const [serverErrors, setServerErrors] = useState<Errors>({});
  // False until the form has hydrated and restored any draft. Until then the
  // submit button stays disabled, so an early tap can't fall back to a native
  // submission.
  const [ready, setReady] = useState(false);
  // Time on the form, measured on this device only (performance.now), so a
  // phone with a wrong clock can never be mistaken for a bot.
  const mountedAt = useRef(0);
  const honeypot = useRef<HTMLInputElement>(null);
  const doneHeading = useRef<HTMLHeadingElement>(null);
  const failRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    mountedAt.current = performance.now();
    const draft = readDraft();
    if (draft) setValues(draft);
    setReady(true);
  }, []);

  useEffect(() => {
    // Skips the first commit, which still holds the empty form, so a saved
    // draft is never overwritten before it has been restored.
    if (ready && status.kind !== "done") writeDraft(values);
  }, [ready, values, status.kind]);

  useEffect(() => {
    if (status.kind === "done") doneHeading.current?.focus();
    if (status.kind === "failed") failRef.current?.focus();
  }, [status.kind]);

  const id = (f: string) => `${uid}-${f}`;
  const errorFor = (f: Field): ErrorCode | undefined => {
    if (!isVisible(f, values)) return undefined;
    if (serverErrors[f]) return serverErrors[f];
    return shown.has(f) ? validateField(f, values) : undefined;
  };
  const message = (f: Field, code: ErrorCode) => fill(t.errors[code], { max: MAX[f] ?? "" });

  function update<K extends Field>(field: K, value: RsvpInput[K]) {
    setValues((v) => ({ ...v, [field]: value }));
    if (serverErrors[field]) setServerErrors((e) => ({ ...e, [field]: undefined }));
    if (status.kind === "failed") setStatus({ kind: "idle" });
  }
  const reveal = (f: Field) => setShown((s) => (s.has(f) ? s : new Set(s).add(f)));

  function toggleDiet(opt: DietaryOption, on: boolean) {
    update("dietary", on ? [...values.dietary, opt] : values.dietary.filter((d) => d !== opt));
  }

  async function submit(e?: FormEvent) {
    e?.preventDefault();
    if (status.kind === "sending") return;
    const clean = prune({
      ...values,
      name: values.name.trim(),
      plusOneName: values.plusOneName.trim(),
      phone: normalisePhone(values.phone),
      email: values.email.trim(),
    });
    const errors = validate(clean);
    const invalid = FIELD_ORDER.filter((f) => errors[f]);
    if (invalid.length) {
      setShown(new Set(FIELD_ORDER));
      setSummary(invalid.map((f) => ({ field: f, code: errors[f]! })));
      focusField(invalid[0]);
      return;
    }
    setSummary([]);
    setStatus({ kind: "sending" });
    try {
      // Someone replying within 3 s of the page loading (e.g. a restored draft)
      // just waits a moment under "Sending…" instead of tripping the bot check.
      const elapsed = performance.now() - mountedAt.current;
      if (elapsed < MIN_FORM_MS) await wait(MIN_FORM_MS - elapsed + 50);
      const res = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...clean,
          website: honeypot.current?.value ?? "",
          elapsedMs: Math.round(performance.now() - mountedAt.current),
          lang,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; errors?: Errors };
      if (res.ok && data.ok) {
        writeDraft(null);
        setStatus({ kind: "done", sent: clean });
        return;
      }
      if (res.status === 422 && data.errors) {
        const server = data.errors;
        setServerErrors(server);
        setShown(new Set(FIELD_ORDER));
        setSummary(FIELD_ORDER.filter((f) => server[f]).map((f) => ({ field: f, code: server[f]! })));
        setStatus({ kind: "idle" });
        const first = FIELD_ORDER.find((f) => data.errors?.[f]);
        if (first) focusField(first);
        return;
      }
      const known: FailureCode[] = ["not_configured", "rate_limited", "locked", "invalid"];
      setStatus({ kind: "failed", code: known.includes(data.error as FailureCode) ? (data.error as FailureCode) : "network" });
    } catch {
      setStatus({ kind: "failed", code: "network" });
    }
  }

  function focusField(f: Field) {
    requestAnimationFrame(() => {
      const el =
        document.getElementById(id(f)) ??
        (document.querySelector(`[data-field="${f}"] input`) as HTMLElement | null);
      el?.focus({ preventScroll: true });
      el?.scrollIntoView({ block: "center", behavior: prefersReducedMotion() ? "auto" : "smooth" });
    });
  }

  function startAnother() {
    setValues(EMPTY_RSVP);
    setShown(new Set());
    setServerErrors({});
    setSummary([]);
    mountedAt.current = performance.now();
    setStatus({ kind: "idle" });
    requestAnimationFrame(() => document.getElementById(id("name"))?.focus());
  }

  const contact = content.wedding.contact;

  return (
    <section id="rsvp" className="rsvp" aria-labelledby="rsvp-title">
      <Sprig name="b" className="rsvp__sprig rsvp__sprig--l" />
      <Sprig name="c" className="rsvp__sprig rsvp__sprig--r" />

      <div className="rsvp__panel" data-rise>
        <header className="rsvp__head">
          <h2 id="rsvp-title" className="section-title">
            {t.heading}
          </h2>
          <Divider />
          {status.kind !== "done" && (
            <>
              <p className="rsvp__intro">{t.intro}</p>
              {content.deadline && <p className="rsvp__deadline">{fill(t.deadline, { date: content.deadline[lang] })}</p>}
              {content.late && <p className="rsvp__late">{t.late}</p>}
            </>
          )}
        </header>

        {status.kind === "done" ? (
          <Done
            t={t}
            sent={status.sent}
            headingRef={doneHeading}
            onAnother={startAnother}
          />
        ) : (
          <form className="form" method="post" onSubmit={submit} noValidate aria-describedby={id("req")}>
            <p id={id("req")} className="form__note">
              {t.requiredNote}
            </p>

            {summary.some((x) => errorFor(x.field)) && (
              <div className="form__summary" role="alert">
                <p className="form__summary-title">{t.summaryTitle}</p>
                <ul>
                  {summary
                    .filter((x) => errorFor(x.field))
                    .map((x) => (
                      <li key={x.field}>
                        <a
                          href={`#${id(x.field)}`}
                          onClick={(e) => {
                            e.preventDefault();
                            focusField(x.field);
                          }}
                        >
                          {labelFor(x.field, t)}
                          {errorFor(x.field) === x.code && <> — {message(x.field, x.code)}</>}
                        </a>
                      </li>
                    ))}
                </ul>
              </div>
            )}

            <TextField
              id={id("name")}
              label={t.name}
              value={values.name}
              error={errorFor("name") && message("name", errorFor("name")!)}
              onChange={(v) => update("name", v)}
              onBlur={() => reveal("name")}
              autoComplete="name"
              maxLength={LIMITS.name.max + 20}
              required
            />

            <ChoiceGroup
              field="attending"
              legend={t.attending}
              name={id("attending")}
              value={values.attending}
              options={[
                { value: "yes", label: t.yes, mark: "yes" },
                { value: "no", label: t.no, mark: "no" },
              ]}
              error={errorFor("attending") && message("attending", errorFor("attending")!)}
              onChange={(v) => {
                update("attending", v as RsvpInput["attending"]);
                reveal("attending");
              }}
              large
            />

            {values.attending === "yes" && (
              <div className="form__reveal">
                <ChoiceGroup
                  field="plusOne"
                  legend={t.plusOne}
                  name={id("plusOne")}
                  value={values.plusOne}
                  options={[
                    { value: "yes", label: t.plusOneYes },
                    { value: "no", label: t.plusOneNo },
                  ]}
                  error={errorFor("plusOne") && message("plusOne", errorFor("plusOne")!)}
                  onChange={(v) => {
                    update("plusOne", v as RsvpInput["plusOne"]);
                    reveal("plusOne");
                  }}
                />
                {values.plusOne === "yes" && (
                  <div className="form__reveal">
                    <TextField
                      id={id("plusOneName")}
                      label={t.plusOneName}
                      value={values.plusOneName}
                      error={errorFor("plusOneName") && message("plusOneName", errorFor("plusOneName")!)}
                      onChange={(v) => update("plusOneName", v)}
                      onBlur={() => reveal("plusOneName")}
                      autoComplete="off"
                      maxLength={LIMITS.name.max + 20}
                      required
                    />
                  </div>
                )}
              </div>
            )}

            <TextField
              id={id("phone")}
              label={t.phone}
              hint={t.phoneHint}
              value={values.phone}
              error={errorFor("phone") && message("phone", errorFor("phone")!)}
              onChange={(v) => update("phone", v)}
              onBlur={() => reveal("phone")}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              maxLength={LIMITS.phoneRaw}
              required
            />

            <TextField
              id={id("email")}
              label={t.email}
              optional={t.optional}
              value={values.email}
              error={errorFor("email") && message("email", errorFor("email")!)}
              onChange={(v) => update("email", v)}
              onBlur={() => reveal("email")}
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              maxLength={LIMITS.email}
            />

            {values.attending === "yes" && (
              <div className="form__reveal">
                <fieldset className="field field--group" data-field="dietary" aria-describedby={id("dietary-hint")}>
                  <legend className="field__label">
                    {t.dietary} <span className="field__optional">({t.optional})</span>
                  </legend>
                  <p className="field__hint" id={id("dietary-hint")}>
                    {t.dietaryHint}
                  </p>
                  <div className="choices choices--checks">
                    {DIETARY_OPTIONS.map((opt) => (
                      <label key={opt} className="choice choice--check" data-checked={values.dietary.includes(opt) || undefined}>
                        <input
                          className="choice__input"
                          type="checkbox"
                          name="dietary"
                          value={opt}
                          checked={values.dietary.includes(opt)}
                          onChange={(e) => toggleDiet(opt, e.target.checked)}
                        />
                        <span className="choice__mark" aria-hidden="true" />
                        <span className="choice__text">{t.dietaryOptions[opt]}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <TextField
                  id={id("dietaryOther")}
                  label={t.dietaryOther}
                  optional={t.optional}
                  hint={t.dietaryOtherHint}
                  value={values.dietaryOther}
                  error={errorFor("dietaryOther") && message("dietaryOther", errorFor("dietaryOther")!)}
                  onChange={(v) => update("dietaryOther", v)}
                  onBlur={() => reveal("dietaryOther")}
                  autoComplete="off"
                  maxLength={LIMITS.dietaryOther * 5}
                  counter={fill(t.counter, { n: [...values.dietaryOther].length, max: LIMITS.dietaryOther })}
                  counterOver={[...values.dietaryOther].length > LIMITS.dietaryOther}
                />
              </div>
            )}

            <TextField
              id={id("message")}
              label={t.message}
              optional={t.optional}
              value={values.message}
              error={errorFor("message") && message("message", errorFor("message")!)}
              onChange={(v) => update("message", v)}
              onBlur={() => reveal("message")}
              multiline
              maxLength={LIMITS.message * 5}
              counter={fill(t.counter, { n: [...values.message].length, max: LIMITS.message })}
              counterOver={[...values.message].length > LIMITS.message}
            />

            {/* Honeypot: invisible to people, irresistible to bots. */}
            <div className="hp" aria-hidden="true">
              <label>
                Website
                <input ref={honeypot} type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
              </label>
            </div>

            {status.kind === "failed" && (
              <div className="form__failure" tabIndex={-1} ref={failRef}>
                <p>{t.failure[status.code]}</p>
                {contact && status.code !== "locked" && (
                  <p className="form__failure-contact">{fill(t.contactFallback, { name: contact.name, phone: contact.phone })}</p>
                )}
                {status.code === "locked" ? null : (
                  <button type="button" className="btn btn--ghost" onClick={() => submit()}>
                    {t.retry}
                  </button>
                )}
              </div>
            )}

            <div className="form__submit">
              <button
                type="submit"
                className="btn btn--primary btn--wide"
                disabled={!ready || status.kind === "sending"}
                aria-busy={status.kind === "sending"}
              >
                {status.kind === "sending" ? t.sending : t.submit}
              </button>
              <p className="form__privacy">{t.privacy}</p>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}

type T = SiteContent["dicts"]["en"]["rsvp"];

function labelFor(f: Field, t: T): string {
  const map: Record<Field, string> = {
    name: t.name,
    attending: t.attending,
    plusOne: t.plusOne,
    plusOneName: t.plusOneName,
    phone: t.phone,
    email: t.email,
    dietary: t.dietary,
    dietaryOther: t.dietaryOther,
    message: t.message,
  };
  return map[f];
}

function Done({
  t,
  sent,
  headingRef,
  onAnother,
}: {
  t: T;
  sent: RsvpInput;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
  onAnother: () => void;
}) {
  const yes = sent.attending === "yes";
  const diet = [...sent.dietary.map((d) => t.dietaryOptions[d]), sent.dietaryOther].filter(Boolean).join(", ");
  return (
    <div className="done">
      <h3 className="done__title" tabIndex={-1} ref={headingRef}>
        {yes ? t.thanksYes : t.thanksNo}
      </h3>
      <dl className="done__summary">
        <div>
          <dt>{t.summaryName}</dt>
          <dd>{sent.name}</dd>
        </div>
        <div>
          <dt>{t.summaryAttending}</dt>
          <dd>{yes ? t.summaryYes : t.summaryNo}</dd>
        </div>
        {yes && (
          <div>
            <dt>{t.summaryGuest}</dt>
            <dd>{sent.plusOne === "yes" ? sent.plusOneName : t.summaryNone}</dd>
          </div>
        )}
        {yes && (
          <div>
            <dt>{t.summaryDietary}</dt>
            <dd>{diet || t.summaryNone}</dd>
          </div>
        )}
      </dl>
      <div className="done__actions">
        <button type="button" className="btn btn--link" onClick={onAnother}>
          {t.another}
        </button>
        <p className="done__hint">{t.anotherHint}</p>
      </div>
    </div>
  );
}

type TextFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
  error?: string | false;
  hint?: string;
  optional?: string;
  required?: boolean;
  multiline?: boolean;
  counter?: string;
  counterOver?: boolean;
  type?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  autoComplete?: string;
  autoCapitalize?: string;
  maxLength?: number;
};

/** Enter on a single-line field moves on, as its "next" key promises, instead of submitting. */
function focusNextField(from: HTMLElement) {
  const form = (from as HTMLInputElement).form;
  if (!form) return;
  const fields = Array.from(form.elements).filter((el): el is HTMLElement => {
    if (!(el instanceof HTMLElement) || el.tabIndex < 0 || el.getClientRects().length === 0) return false;
    if (el instanceof HTMLInputElement) {
      if (el.disabled || el.type === "hidden") return false;
      // In a radio group, only the checked radio (or the first, if none) is a tab stop.
      if (el.type === "radio") {
        const group = Array.from(form.querySelectorAll<HTMLInputElement>(`input[type=radio][name="${CSS.escape(el.name)}"]`));
        const stop = group.find((r) => r.checked) ?? group[0];
        return el === stop;
      }
    }
    return !(el as HTMLButtonElement).disabled;
  });
  fields[fields.indexOf(from) + 1]?.focus();
}

function TextField(p: TextFieldProps) {
  const describedBy = [p.hint && `${p.id}-hint`, p.counter && `${p.id}-count`, p.error && `${p.id}-err`]
    .filter(Boolean)
    .join(" ");
  const common = {
    id: p.id,
    name: p.id,
    className: "field__input",
    value: p.value,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => p.onChange(e.target.value),
    onBlur: p.onBlur,
    "aria-invalid": p.error ? true : undefined,
    "aria-required": p.required || undefined,
    "aria-describedby": describedBy || undefined,
    maxLength: p.maxLength,
    autoComplete: p.autoComplete,
  };
  return (
    <div className={`field${p.error ? " field--error" : ""}`} data-field={p.id}>
      <label className="field__label" htmlFor={p.id}>
        {p.label}
        {p.optional && <span className="field__optional"> ({p.optional})</span>}
      </label>
      {p.hint && (
        <p className="field__hint" id={`${p.id}-hint`}>
          {p.hint}
        </p>
      )}
      {p.multiline ? (
        <textarea {...common} rows={4} />
      ) : (
        <input
          {...common}
          type={p.type ?? "text"}
          inputMode={p.inputMode}
          autoCapitalize={p.autoCapitalize}
          spellCheck={p.type === "email" || p.type === "tel" ? false : undefined}
          enterKeyHint="next"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing) {
              e.preventDefault();
              focusNextField(e.currentTarget);
            }
          }}
        />
      )}
      {p.counter && (
        <p className={`field__count${p.counterOver ? " field__count--over" : ""}`} id={`${p.id}-count`}>
          {p.counter}
        </p>
      )}
      <FieldError id={`${p.id}-err`}>{p.error}</FieldError>
    </div>
  );
}

function FieldError({ id, children }: { id: string; children: ReactNode }) {
  if (!children) return null;
  return (
    <p className="field__error" id={id}>
      <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
        <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <path d="M8 4.2v4.6M8 10.9v.9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      <span>{children}</span>
    </p>
  );
}

type ChoiceGroupProps = {
  field: Field;
  legend: string;
  name: string;
  value: string;
  options: { value: string; label: string; mark?: "yes" | "no" }[];
  error?: string | false;
  onChange: (v: string) => void;
  large?: boolean;
};

function ChoiceGroup({ field, legend, name, value, options, error, onChange, large }: ChoiceGroupProps) {
  const errId = `${name}-err`;
  return (
    <fieldset
      className={`field field--group${error ? " field--error" : ""}`}
      data-field={field}
      role="radiogroup"
      aria-labelledby={`${name}-legend`}
      aria-describedby={error ? errId : undefined}
      aria-required="true"
      aria-invalid={error ? true : undefined}
    >
      <legend className="field__label" id={`${name}-legend`}>
        {legend}
      </legend>
      <div className={`choices${large ? " choices--large" : ""}`}>
        {options.map((o, i) => (
          <label key={o.value} className="choice" data-checked={value === o.value || undefined}>
            <input
              className="choice__input"
              type="radio"
              name={name}
              id={i === 0 ? name : undefined}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
            />
            <span className={`choice__mark${o.mark ? ` choice__mark--${o.mark}` : ""}`} aria-hidden="true" />
            <span className="choice__text">{o.label}</span>
          </label>
        ))}
      </div>
      <FieldError id={errId}>{error}</FieldError>
    </fieldset>
  );
}
