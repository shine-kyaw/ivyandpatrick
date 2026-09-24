/**
 * The RSVP contract, shared by the form (instant feedback) and the API (the
 * real gate). Errors are codes, not sentences, so each language renders its
 * own message.
 */

export const DIETARY_OPTIONS = ["vegetarian", "vegan", "no-beef", "no-pork", "halal"] as const;
export type DietaryOption = (typeof DIETARY_OPTIONS)[number];

export const LIMITS = {
  name: { min: 2, max: 80 },
  phoneDigits: { min: 7, max: 15 },
  phoneRaw: 32,
  email: 120,
  dietaryOther: 200,
  message: 500,
} as const;

export type Lang = "en" | "my";

export type RsvpInput = {
  name: string;
  attending: "" | "yes" | "no";
  plusOne: "" | "yes" | "no";
  plusOneName: string;
  phone: string;
  email: string;
  dietary: DietaryOption[];
  dietaryOther: string;
  message: string;
};

export type Field = keyof RsvpInput;
export type ErrorCode = "required" | "choose" | "tooShort" | "tooLong" | "phone" | "email";
export type Errors = Partial<Record<Field, ErrorCode>>;

export const EMPTY_RSVP: RsvpInput = {
  name: "",
  attending: "",
  plusOne: "",
  plusOneName: "",
  phone: "",
  email: "",
  dietary: [],
  dietaryOther: "",
  message: "",
};

/** Fields in the order they appear, for focus-the-first-error and the summary. */
export const FIELD_ORDER: Field[] = [
  "name",
  "attending",
  "plusOne",
  "plusOneName",
  "phone",
  "email",
  "dietary",
  "dietaryOther",
  "message",
];

// Control characters (except tab/newline in the message) never belong in a reply.
function stripControl(s: string): string {
  let out = "";
  for (const ch of s) {
    const c = ch.codePointAt(0)!;
    const control = (c < 32 && c !== 9 && c !== 10 && c !== 13) || (c >= 127 && c <= 159);
    const invisible = c === 0x200b || c === 0x2028 || c === 0x2029;
    if (!control && !invisible) out += ch;
  }
  return out;
}

export function clean(value: unknown, multiline = false): string {
  if (typeof value !== "string") return "";
  let v = stripControl(value.normalize("NFC"));
  v = multiline ? v.replace(/\r\n?/g, "\n").replace(/\n{3,}/g, "\n\n") : v.replace(/\s+/g, " ");
  return v.trim();
}

export function phoneDigits(phone: string): string {
  // Myanmar numerals typed on a Burmese keyboard count as digits too.
  const western = phone.replace(/[၀-၉]/g, (d) => String(d.charCodeAt(0) - 0x1040));
  return western.replace(/\D/g, "");
}

const EMAIL = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;
const PHONE_CHARS = /^[+\d၀-၉\s().-]*$/;

export function isVisible(field: Field, v: RsvpInput): boolean {
  switch (field) {
    case "plusOne":
    case "dietary":
    case "dietaryOther":
      return v.attending === "yes";
    case "plusOneName":
      return v.attending === "yes" && v.plusOne === "yes";
    default:
      return true;
  }
}

/** Drops answers to questions the guest can no longer see. */
export function prune(v: RsvpInput): RsvpInput {
  const out = { ...v };
  if (!isVisible("plusOne", v)) out.plusOne = "";
  if (!isVisible("plusOneName", v)) out.plusOneName = "";
  if (!isVisible("dietary", v)) out.dietary = [];
  if (!isVisible("dietaryOther", v)) out.dietaryOther = "";
  return out;
}

export function validateField(field: Field, v: RsvpInput): ErrorCode | undefined {
  if (!isVisible(field, v)) return undefined;
  switch (field) {
    case "name":
    case "plusOneName": {
      const s = v[field];
      if (!s) return "required";
      if ([...s].length < LIMITS.name.min) return "tooShort";
      if ([...s].length > LIMITS.name.max) return "tooLong";
      return undefined;
    }
    case "attending":
      return v.attending === "yes" || v.attending === "no" ? undefined : "choose";
    case "plusOne":
      return v.plusOne === "yes" || v.plusOne === "no" ? undefined : "choose";
    case "phone": {
      if (!v.phone) return "required";
      if (v.phone.length > LIMITS.phoneRaw || !PHONE_CHARS.test(v.phone)) return "phone";
      const n = phoneDigits(v.phone).length;
      return n < LIMITS.phoneDigits.min || n > LIMITS.phoneDigits.max ? "phone" : undefined;
    }
    case "email":
      if (!v.email) return undefined;
      if (v.email.length > LIMITS.email) return "tooLong";
      return EMAIL.test(v.email) ? undefined : "email";
    case "dietary":
      return v.dietary.every((d) => (DIETARY_OPTIONS as readonly string[]).includes(d)) ? undefined : "choose";
    case "dietaryOther":
      return [...v.dietaryOther].length > LIMITS.dietaryOther ? "tooLong" : undefined;
    case "message":
      return [...v.message].length > LIMITS.message ? "tooLong" : undefined;
  }
}

export function validate(v: RsvpInput): Errors {
  const errors: Errors = {};
  for (const f of FIELD_ORDER) {
    const e = validateField(f, v);
    if (e) errors[f] = e;
  }
  return errors;
}

/** Turns untrusted JSON into a clean RsvpInput, or null if its shape is wrong. */
export function parse(body: unknown): RsvpInput | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const b = body as Record<string, unknown>;
  const allowed = new Set<string>([...FIELD_ORDER, "website", "startedAt", "lang"]);
  if (Object.keys(b).some((k) => !allowed.has(k))) return null;

  const pick = <T extends string>(x: unknown, opts: readonly T[]): T | "" =>
    typeof x === "string" && (opts as readonly string[]).includes(x) ? (x as T) : "";

  if (b.dietary !== undefined && !Array.isArray(b.dietary)) return null;
  const dietary = ((b.dietary as unknown[]) ?? []).filter(
    (d): d is DietaryOption => typeof d === "string" && (DIETARY_OPTIONS as readonly string[]).includes(d),
  );

  return prune({
    name: clean(b.name),
    attending: pick(b.attending, ["yes", "no"] as const),
    plusOne: pick(b.plusOne, ["yes", "no"] as const),
    plusOneName: clean(b.plusOneName),
    phone: clean(b.phone),
    email: clean(b.email).toLowerCase(),
    dietary: [...new Set(dietary)],
    dietaryOther: clean(b.dietaryOther),
    message: clean(b.message, true),
  });
}

/** Spreadsheet cells starting with these are evaluated as formulas. */
export function sheetSafe(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}
