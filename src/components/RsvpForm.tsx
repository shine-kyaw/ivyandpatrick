"use client";

import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { fill } from "@/lib/format";
import {
  DIETARY_OPTIONS,
  EMPTY_RSVP,
  FIELD_ORDER,
  LIMITS,
  isVisible,
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
  const [showSummary, setShowSummary] = useState(false);
  const [serverErrors, setServerErrors] = useState<Errors>({});
  const startedAt = useRef(0);
  const honeypot = useRef<HTMLInputElement>(null);
  const doneHeading = useRef<HTMLHeadingElement>(null);
  const failRef = useRef<HTMLDivElement>(null);
  const restored = useRef(false);

  useEffect(() => {
    startedAt.current = Date.now();
    const draft = readDraft();
    if (draft) setValues(draft);
    restored.current = true;
  }, []);

  useEffect(() => {
    if (restored.current && status.kind !== "done") writeDraft(values);
  }, [values, status.kind]);

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
      phone: values.phone.trim(),
      email: values.email.trim(),
    });
    const errors = validate(clean);
    const invalid = FIELD_ORDER.filter((f) => errors[f]);
    if (invalid.length) {
      setShown(new Set(FIELD_ORDER));
      setShowSummary(true);
      focusField(invalid[0]);
      return;
    }
    setShowSummary(false);
    setStatus({ kind: "sending" });
    try {
      const res = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...clean,
          website: honeypot.current?.value ?? "",
          startedAt: startedAt.current,
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
        setServerErrors(data.errors);
        setShown(new Set(FIELD_ORDER));
        setShowSummary(true);
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
      el?.focus();
      el?.scrollIntoView({ block: "center", behavior: "smooth" });
    });
  }

  function startAnother() {
    setValues(EMPTY_RSVP);
    setShown(new Set());
    setServerErrors({});
    setShowSummary(false);
    startedAt.current = Date.now();
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
          <form className="form" onSubmit={submit} noValidate aria-describedby={id("req")}>
            <p id={id("req")} className="form__note">
              {t.requiredNote}
            </p>

            {showSummary && FIELD_ORDER.some((f) => errorFor(f)) && (
              <div className="form__summary" role="alert">
                <p className="form__summary-title">{t.summaryTitle}</p>
                <ul>
                  {FIELD_ORDER.filter((f) => errorFor(f)).map((f) => (
                    <li key={f}>
                      <a
                        href={`#${id(f)}`}
                        onClick={(e) => {
                          e.preventDefault();
                          focusField(f);
                        }}
                      >
                        {labelFor(f, t)} — {message(f, errorFor(f)!)}
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
                <fieldset className="field field--group" data-field="dietary">
                  <legend className="field__label">
                    {t.dietary} <span className="field__optional">({t.optional})</span>
                  </legend>
                  <p className="field__hint" id={id("dietary-hint")}>
                    {t.dietaryHint}
                  </p>
                  <div className="choices choices--checks" aria-describedby={id("dietary-hint")}>
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
                  maxLength={LIMITS.dietaryOther + 20}
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
              maxLength={LIMITS.message + 50}
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
              <div className="form__failure" role="alert" tabIndex={-1} ref={failRef}>
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
                disabled={status.kind === "sending"}
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
    <div className="done" role="status">
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
      aria-describedby={error ? errId : undefined}
      aria-required="true"
    >
      <legend className="field__label">{legend}</legend>
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
