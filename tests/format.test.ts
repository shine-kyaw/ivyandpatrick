import assert from "node:assert/strict";
import { test } from "node:test";
import { fill, formatDate, toMyanmarDigits } from "../src/lib/format.ts";

test("dates render naturally in both languages", () => {
  assert.deepEqual(formatDate("2027-03-28"), { en: "28 March 2027", my: "၂၈ ရက်၊ မတ်လ၊ ၂၀၂၇ ခုနှစ်" });
});

test("Myanmar numerals", () => {
  assert.equal(toMyanmarDigits("11:30"), "၁၁:၃၀");
});

test("fill leaves unknown placeholders visible", () => {
  assert.equal(fill("{a} and {b}", { a: 1 }), "1 and {b}");
});
