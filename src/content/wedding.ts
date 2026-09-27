/**
 * Every wedding fact on the site lives here and nowhere else.
 *
 * Sources: the couple's printed invitation card (design/source/invitation-card.jpg);
 * the venue address and map from LOTTE HOTEL YANGON's own location page
 * (lottehotel.com/yangon-hotel/en/about/location); deadline and contact email
 * from Aster (2026-09-27).
 * A fact that is not on the card and not yet confirmed by the couple stays
 * `null` — the site then leaves it out rather than guessing. Run
 * `npm run check:content` to list what is still missing.
 */

export type Contact = {
  email: string;
  name?: string;
  /** International format, e.g. "+95 9 123 456 789". Optional. */
  phone?: string;
  viber?: boolean;
  whatsapp?: boolean;
};

export type Wedding = {
  /** ISO date of the ceremony. */
  date: string;
  ceremony: { start: string; end: string };
  venue: {
    /** As printed on the card. */
    name: string;
    hotel: string | null;
    address: { en: string; my: string } | null;
    mapUrl: string | null;
  };
  /** e.g. "Myanmar time (MMT)". Shown beside the time once known. */
  timezoneLabel: { en: string; my: string } | null;
  /** Offset of the venue's local time from UTC, for the calendar file. */
  utcOffset: string | null;
  /** ISO date; replies after this day are flagged as late (the form stays open). */
  rsvpDeadline: string | null;
  contact: Contact | null;
  gifts: { en: string; my: string } | null;
};

export const wedding: Wedding = {
  date: "2027-03-28",
  ceremony: { start: "11:00", end: "13:30" },
  venue: {
    name: "Lotte Ballroom",
    hotel: "LOTTE HOTEL YANGON",
    address: {
      en: "No. 82, Sin Phyu Shin Avenue, Pyay Road, 6½ Mile, Ward 11, Hlaing Township, Yangon, Myanmar",
      // Draft Burmese rendering — for the native reviewer.
      my: "အမှတ် ၈၂၊ ဆင်ဖြူရှင်လမ်း၊ ပြည်လမ်း၊ ၆ မိုင်ခွဲ၊ (၁၁) ရပ်ကွက်၊ လှိုင်မြို့နယ်၊ ရန်ကုန်မြို့",
    },
    // The hotel's Google Maps place (CID), which opens in each guest's own language.
    mapUrl: "https://www.google.com/maps?cid=2080895687428039804",
  },
  timezoneLabel: { en: "Myanmar time", my: "မြန်မာစံတော်ချိန်" },
  utcOffset: "+06:30",
  rsvpDeadline: "2026-11-01",
  contact: { email: "patrickivy.rsvp@gmail.com" },
  gifts: null,
};

/** The couple as printed on the card. Burmese text is verbatim from the card. */
export const couple = {
  groom: {
    name: "Patrick",
    nameMy: "ပိုင်သာထူး",
    parentsMy: "ဒေါ်ရီရီသာ",
    credentials: [
      "Director and CEO of Wynn and Htoo Group Company Limited",
      "Master of Science in Applied Economics, University of Maryland College Park",
    ],
  },
  bride: {
    name: "Ivy",
    nameMy: "စုမြတ်လင်း",
    parentsMy: "ဦးဖေဝင်း + ဒေါ်လင်းလင်းမြင့်",
    credentials: [
      "Director at Strong Group of Companies",
      "Bachelor of Science in Business Administration with minor in Real Estate Development",
    ],
  },
} as const;

/** Burmese invitation text, verbatim from the card. */
export const cardText = {
  title: "စုလျားရစ်ပတ်ထိမ်းမြားမင်္ဂလာဖိတ်ကြားလွှာ",
  body: "တို့ကိုနှစ်ဖက်မိဘတို့၏ ဝတ္တရားရှိသည်နှင့်အညီ “စုလျားရစ်ပတ် ထိမ်းမြားမင်္ဂလာ” ဆောင်နှင်းမည်ဖြစ်ပါ၍ ကြွရောက်ချီးမြှင့်ပေးပါရန် ခင်မင်လေးစားစွာဖြင့် ဖိတ်ကြားအပ်ပါသည်။",
  time: "နံနက် (၁၁:၀၀)နာရီ မှ (၁:၃၀)နာရီအထိ",
  date: "၂၈ရက်၊ မတ်လ၊ ၂၀၂၇ခုနှစ်",
} as const;

export function isLate(now = new Date()): boolean | null {
  if (!wedding.rsvpDeadline) return null;
  // The deadline day counts in full, in the latest timezone on Earth.
  return now.getTime() > new Date(`${wedding.rsvpDeadline}T23:59:59-12:00`).getTime();
}
