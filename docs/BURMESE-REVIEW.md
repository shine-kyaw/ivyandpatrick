# Burmese copy review

**Status: draft — needs a native speaker before guests receive the link.**

## Verbatim from the printed card (do not change unless the card changes)

Held in `src/content/wedding.ts` (`couple`, `cardText`):

- Title: စုလျားရစ်ပတ်ထိမ်းမြားမင်္ဂလာဖိတ်ကြားလွှာ
- ပိုင်သာထူး — ဒေါ်ရီရီသာ ၏ သား
- စုမြတ်လင်း — ဦးဖေဝင်း + ဒေါ်လင်းလင်းမြင့် တို့၏ သမီး
- Invitation paragraph, time line, date line

These were transcribed from the card image. Please check them letter by
letter against the printed card — stacked consonants and tone marks are easy
to mistype.

Note: the time line reads နံနက် (၁၁:၀၀)နာရီ မှ (၁:၃၀)နာရီအထိ — the ceremony
ends at 1:30. (An early draft of the site mistyped it as ၁၁:၃၀; fixed.)

## Drafted for the site (please review every line)

Also drafted: the venue address in Burmese (`wedding.ts` → `venue.address.my`)
and the timezone label မြန်မာစံတော်ချိန်.


Everything in `src/content/my.ts` other than the items above: the password
screen, section headings, form labels, options, hints, error messages,
confirmation text, FAQ and footer.

What to check:

1. **Register** — formal and respectful, suitable for elders receiving a
   wedding invitation.
2. **Meaning** — each line says the same as its English twin in `en.ts`.
3. **Encoding** — Unicode only. `npm run check:i18n` flags Zawgyi.
4. **Fit** — view the site on a phone in Burmese; nothing should clip or wrap
   awkwardly.

Mark corrections directly in `my.ts`, or send a list keyed by the English line.
