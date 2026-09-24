# Patrick & Ivy — Wedding RSVP

A password-protected, bilingual (English / Burmese) RSVP site for Patrick and
Ivy's traditional Myanmar wedding ceremony, 28 March 2027, Lotte Ballroom.
Built by Aster. Entirely separate from the Phuket site (patrickandivy.com):
no shared code, domain, data or design.

The design is drawn from the couple's own printed cards — the arched gold
window frame and the chinoiserie blossom card — cut into web assets by
`design/build-art.py`.

## How it works

| Piece | Where |
| --- | --- |
| Every wedding fact | `src/content/wedding.ts` (only source; `null` = not confirmed, hidden on the site) |
| English / Burmese copy | `src/content/en.ts`, `src/content/my.ts` (same keys, checked by `npm run check:i18n`) |
| Password gate | `src/lib/password.ts`, `src/app/api/unlock` — scrypt-derived HttpOnly cookie, no secret in the browser |
| RSVP | `src/components/RsvpForm.tsx` → `src/app/api/rsvp` → Google Sheet via Apps Script (`scripts/google-apps-script.gs`) |
| Security headers / CSP | `next.config.ts`, `src/proxy.ts` (per-request nonce) |
| Artwork | `design/source/` → `npm run art` → `public/art/`, `private/` |

Wedding details are rendered only after the password is accepted and never
appear in public JavaScript bundles. The printed card (`/invitation-card`) and
calendar file (`/calendar.ics`) are gated too.

## Commands

```bash
npm install
npm run dev              # http://localhost:3000 — RSVPs go to .data/rsvp-dev.jsonl
npm test                 # validation, password, formatting
npm run check:i18n       # English/Burmese key parity + Zawgyi guard
npm run check:content    # which wedding facts / env vars are still missing
npm run password -- "new password" --write   # change the guest password
npm run build
```

Node 22+ (the repo's scripts run TypeScript directly).

## Going live

See `docs/SETUP.md`. In short: connect the Apps Script webhook
(`RSVP_WEBHOOK_URL`, `RSVP_WEBHOOK_SECRET`), fill the missing facts, have the
Burmese reviewed (`docs/BURMESE-REVIEW.md`), then send guests the link.
