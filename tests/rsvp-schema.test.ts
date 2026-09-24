import assert from "node:assert/strict";
import { test } from "node:test";
import { EMPTY_RSVP, normalisePhone, parse, phoneDigits, prune, sheetSafe, validate, type RsvpInput } from "../src/lib/rsvp-schema.ts";

const base: RsvpInput = { ...EMPTY_RSVP, name: "Aung Aung", attending: "no", phone: "+95 9 123 456 789" };

test("a declining guest needs only name, answer and phone", () => {
  assert.deepEqual(validate(base), {});
});

test("an attending guest must answer the +1 question, and name the guest", () => {
  const v = { ...base, attending: "yes" as const };
  assert.equal(validate(v).plusOne, "choose");
  assert.equal(validate({ ...v, plusOne: "yes" }).plusOneName, "required");
  assert.deepEqual(validate({ ...v, plusOne: "yes", plusOneName: "Su Su" }), {});
});

test("hidden answers are dropped, not sent", () => {
  const v = prune({ ...base, plusOne: "yes", plusOneName: "Ghost", dietary: ["vegan"], dietaryOther: "x" });
  assert.equal(v.plusOne, "");
  assert.equal(v.plusOneName, "");
  assert.deepEqual(v.dietary, []);
  assert.equal(v.dietaryOther, "");
});

test("phone numbers: 7–15 digits, Myanmar numerals count", () => {
  assert.equal(phoneDigits("+၉၅ ၉ ၁၂၃"), "959123");
  assert.equal(validate({ ...base, phone: "12345" }).phone, "phone");
  assert.equal(validate({ ...base, phone: "call me" }).phone, "phone");
  assert.equal(validate({ ...base, phone: "+၉၅ ၉ ၁၂၃ ၄၅၆ ၇၈၉" }).phone, undefined);
});

test("names in any script are accepted; one character is not a name", () => {
  assert.equal(validate({ ...base, name: "ပိုင်သာထူး" }).name, undefined);
  assert.equal(validate({ ...base, name: "A" }).name, "tooShort");
  assert.equal(validate({ ...base, name: "x".repeat(81) }).name, "tooLong");
});

test("email is optional but must look like one", () => {
  assert.equal(validate({ ...base, email: "" }).email, undefined);
  assert.equal(validate({ ...base, email: "nope" }).email, "email");
  assert.equal(validate({ ...base, email: "a@b.co" }).email, undefined);
});

test("parse rejects unknown fields and wrong shapes", () => {
  assert.equal(parse({ ...base, admin: true }), null);
  assert.equal(parse([]), null);
  assert.equal(parse({ ...base, dietary: "vegan" }), null);
});

test("parse cleans control characters and keeps only known dietary options", () => {
  const v = parse({ ...base, attending: "yes", name: " Aung\u0000 Aung ", dietary: ["vegan", "bacon", "vegan"] })!;
  assert.equal(v.name, "Aung Aung");
  assert.deepEqual(v.dietary, ["vegan"]);
});

test("spreadsheet formulas are neutralised", () => {
  assert.equal(sheetSafe("=HYPERLINK(1)"), "'=HYPERLINK(1)");
  assert.equal(sheetSafe("@me"), "'@me");
  assert.equal(sheetSafe("Aung"), "Aung");
});

test("pasted numbers with invisible direction marks and typographic dashes are accepted", () => {
  const pasted = String.fromCodePoint(0x202a) + "+95 9" + String.fromCodePoint(0x2011) + "123 456 789" + String.fromCodePoint(0x202c);
  assert.equal(normalisePhone(pasted), "+95 9-123 456 789");
  assert.equal(validate({ ...base, phone: pasted }).phone, undefined);
  assert.equal(parse({ ...base, phone: pasted })!.phone, "+95 9-123 456 789");
});

test("the API accepts elapsedMs and rejects the old startedAt field", () => {
  assert.ok(parse({ ...base, elapsedMs: 5000 }));
  assert.equal(parse({ ...base, startedAt: 1 }), null);
});
