/** Fails when English and Burmese copy drift apart: missing keys or empty strings. */
import en from "../src/content/en.ts";
import my from "../src/content/my.ts";

// Deliberately empty in Burmese: the card's own title already says "invitation".
const ALLOWED_EMPTY = new Set(["my:hero.subtitle"]);

const problems: string[] = [];

function walk(a: unknown, b: unknown, path: string) {
  if (typeof a === "string" || typeof b === "string") {
    for (const [lang, v] of [["en", a], ["my", b]] as const) {
      if (typeof v !== "string") problems.push(`${lang}:${path} is missing`);
      else if (!v.trim() && !ALLOWED_EMPTY.has(`${lang}:${path}`)) problems.push(`${lang}:${path} is empty`);
    }
    return;
  }
  if (Array.isArray(a) || Array.isArray(b)) {
    const la = Array.isArray(a) ? a.length : -1;
    const lb = Array.isArray(b) ? b.length : -1;
    if (la !== lb) problems.push(`${path}: en has ${la} items, my has ${lb}`);
    for (let i = 0; i < Math.max(la, lb); i++) walk((a as unknown[])?.[i], (b as unknown[])?.[i], `${path}[${i}]`);
    return;
  }
  const keys = new Set([...Object.keys(a ?? {}), ...Object.keys(b ?? {})]);
  for (const k of keys) walk((a as Record<string, unknown>)?.[k], (b as Record<string, unknown>)?.[k], path ? `${path}.${k}` : k);
}

walk(en, my, "");

// Zawgyi-encoded Burmese renders as garbage on Unicode phones. Its tell-tale
// code points (e.g. U+1060–U+1097 used as glyph variants) must never appear.
const zawgyi = /[\u1060-\u1097]/;
(function scan(o: unknown, path: string) {
  if (typeof o === "string") {
    if (zawgyi.test(o)) problems.push(`my:${path} looks Zawgyi-encoded`);
  } else if (o && typeof o === "object") {
    for (const [k, v] of Object.entries(o)) scan(v, path ? `${path}.${k}` : k);
  }
})(my, "");

if (problems.length) {
  console.error(`i18n check failed:\n  ${problems.join("\n  ")}`);
  process.exit(1);
}
console.log("i18n check passed: English and Burmese carry the same keys.");
