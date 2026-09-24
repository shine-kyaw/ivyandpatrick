/**
 * English copy. my.ts must carry exactly the same keys (npm run check:i18n).
 * Wedding facts never live here — they come from wedding.ts.
 */
const en = {
  meta: {
    langName: "English",
    switchTo: "Switch to English",
  },
  gate: {
    kicker: "Wedding Invitation",
    invited: "You are warmly invited",
    label: "Invitation password",
    hint: "Please enter the password shared with your invitation.",
    submit: "Open the invitation",
    opening: "Opening…",
    empty: "Please enter the password.",
    wrong: "That password doesn’t match. Please check it and try again.",
    limited: "Too many attempts. Please wait a few minutes and try again.",
    error: "Something went wrong. Please try again.",
    lost: "Can’t find the password? Please ask the person who shared this link with you.",
  },
  reveal: {
    skip: "Skip",
  },
  hero: {
    subtitle: "Wedding Invitation",
    sonOf: "Son of {parents}",
    daughterOf: "Daughter of {parents}",
    and: "and",
    body: "As is the cherished duty of both families, their parents will hold the traditional Myanmar wedding ceremony, and cordially request the honour of your presence and blessing.",
    dateLabel: "Date",
    timeLabel: "Time",
    venueLabel: "Venue",
    dressLabel: "Dress code",
    dress: "Myanmar traditional",
    cta: "Reply to the invitation",
    viewCard: "View the printed invitation",
  },
  date: {
    long: "Sunday, 28 March 2027",
    time: "11:00 am – 1:30 pm",
  },
  details: {
    heading: "The Ceremony",
    whenTitle: "When",
    whereTitle: "Where",
    wearTitle: "What to wear",
    wear: "Myanmar traditional attire",
    wearNote: "We would be delighted to see you in traditional Myanmar dress.",
    addressPending: "The full address will follow.",
    map: "Open in Google Maps",
    calendar: "Add to calendar",
    giftsTitle: "Gifts",
  },
  card: {
    title: "The printed invitation",
    close: "Close",
    alt: "The printed wedding invitation card of Patrick and Ivy, in Burmese and English, framed in gold with pink blossoms.",
  },
  rsvp: {
    heading: "Kindly Reply",
    intro: "Please let us know whether you will be able to join us. Each invitation includes one guest.",
    deadline: "Kindly reply by {date}.",
    late: "The reply date has passed, but we would still love to hear from you.",
    requiredNote: "All fields are required unless marked optional.",
    optional: "optional",
    name: "Your full name",
    attending: "Will you attend?",
    yes: "Joyfully accepts",
    no: "Regretfully declines",
    plusOne: "Will you bring a guest?",
    plusOneYes: "Yes, one guest",
    plusOneNo: "No, just me",
    plusOneName: "Your guest’s full name",
    phone: "Phone (Viber / WhatsApp)",
    phoneHint: "Including your country code helps us reach you.",
    email: "Email",
    dietary: "Dietary requirements",
    dietaryHint: "For you and your guest. Tick any that apply.",
    dietaryOptions: {
      vegetarian: "Vegetarian",
      vegan: "Vegan",
      "no-beef": "No beef",
      "no-pork": "No pork",
      halal: "Halal",
    },
    dietaryOther: "Allergies or anything else",
    dietaryOtherHint: "Please say who it is for.",
    message: "A message for Patrick & Ivy",
    counter: "{n} / {max}",
    privacy: "Your details are used only to plan the wedding and are never shared with anyone else.",
    submit: "Send reply",
    sending: "Sending…",
    summaryTitle: "Please check the following:",
    errors: {
      required: "Please fill this in.",
      choose: "Please choose one.",
      tooShort: "Please enter the full name.",
      tooLong: "Please shorten this to {max} characters.",
      phone: "Please enter a valid phone number (7–15 digits).",
      email: "Please enter a valid email address, or leave it blank.",
    },
    failure: {
      network: "We couldn’t send your reply just now. Your answers are still here — please try again.",
      not_configured: "Replies are not open just yet. Please try again a little later.",
      rate_limited: "Several replies were sent in a short time. Please wait a few minutes and try again.",
      locked: "Your visit has timed out. Please reload the page and enter the password again.",
      invalid: "Some answers need another look. Please check the form.",
    },
    retry: "Try again",
    contactFallback: "If this keeps happening, please contact {name} on {phone}.",
    thanksYes: "Thank you. We look forward to celebrating with you.",
    thanksNo: "Thank you for letting us know. You will be dearly missed.",
    summaryName: "Name",
    summaryAttending: "Attending",
    summaryGuest: "Guest",
    summaryDietary: "Dietary",
    summaryYes: "Yes",
    summaryNo: "No",
    summaryNone: "None",
    another: "Send another reply",
    anotherHint: "Replying for someone else, or changing your answer? Send a new reply and the couple will see the latest.",
  },
  faq: {
    heading: "Questions",
    items: [
      {
        q: "What should I wear?",
        a: "Myanmar traditional attire, as noted on the invitation.",
      },
      {
        q: "Can I bring a guest?",
        a: "Yes — each invitation includes one guest. Please add their full name when you reply.",
      },
      {
        q: "What time is the ceremony?",
        a: "The ceremony is from 11:00 in the morning until 1:30 in the afternoon.",
      },
      {
        q: "Can I change my reply?",
        a: "Of course. Simply send a new reply and the couple will see your latest answer.",
      },
    ],
  },
  contact: {
    heading: "Questions about the day?",
    body: "Please contact {name}.",
    call: "Call",
    viber: "Viber",
    whatsapp: "WhatsApp",
  },
  sticky: {
    cta: "Reply to the invitation",
  },
  footer: {
    date: "28 · 03 · 2027",
  },
};

export default en;

type Widen<T> = T extends string
  ? string
  : T extends readonly (infer U)[]
    ? Widen<U>[]
    : { [K in keyof T]: Widen<T[K]> };

export type Dict = Widen<typeof en>;
