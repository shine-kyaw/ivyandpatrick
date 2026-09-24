const MY_DIGITS = "၀၁၂၃၄၅၆၇၈၉";
const MY_MONTHS = [
  "ဇန်နဝါရီ",
  "ဖေဖော်ဝါရီ",
  "မတ်",
  "ဧပြီ",
  "မေ",
  "ဇွန်",
  "ဇူလိုင်",
  "ဩဂုတ်",
  "စက်တင်ဘာ",
  "အောက်တိုဘာ",
  "နိုဝင်ဘာ",
  "ဒီဇင်ဘာ",
];

export const toMyanmarDigits = (s: string | number) =>
  String(s).replace(/\d/g, (d) => MY_DIGITS[Number(d)]);

/** "2027-03-28" → { en: "28 March 2027", my: "၂၈ ရက်၊ မတ်လ၊ ၂၀၂၇ ခုနှစ်" } */
export function formatDate(iso: string): { en: string; my: string } {
  const [y, m, d] = iso.split("-").map(Number);
  const en = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)));
  const my = `${toMyanmarDigits(d)} ရက်၊ ${MY_MONTHS[m - 1]}လ၊ ${toMyanmarDigits(y)} ခုနှစ်`;
  return { en, my };
}

/** Replaces {key} placeholders. */
export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
}
