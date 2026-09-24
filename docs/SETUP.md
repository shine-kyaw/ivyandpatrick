# Launch setup

Guests should not receive the link until every box below is ticked.

## 1. Connect the Google Sheet (replies go nowhere without this)

Follow the steps at the top of `scripts/google-apps-script.gs`. Then in
Vercel → Project → Settings → Environment Variables (Production):

| Variable | Value |
| --- | --- |
| `RSVP_WEBHOOK_URL` | the Apps Script web-app URL ending in `/exec` |
| `RSVP_WEBHOOK_SECRET` | the same long random secret pasted into the script |

Redeploy, send one test reply, confirm the row, delete it.

Until these are set the live form answers "Replies are not open just yet" —
it never pretends a reply was saved.

Optional:

| Variable | Purpose |
| --- | --- |
| `SITE_PASSWORD_VERIFIER` | Overrides the password without a code change (`npm run password -- "new"` prints it) |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Rate limits shared across serverless instances (otherwise per instance) |

## 2. Guest password

A placeholder password was set at build time and shared with Aster privately
(case and spaces are ignored when guests type it). Change it before sending
invitations:

```bash
npm run password -- "the couple's choice" --write
```

Commit and push. Every guest is then signed out and needs the new password.

## 3. Facts still to confirm with the couple

Run `npm run check:content`. As of the first build:

- [ ] Venue full address (English + Burmese) and Google Maps link
- [ ] RSVP deadline date
- [ ] Contact person: name, phone, Viber/WhatsApp
- [ ] (optional) Timezone label, gifts note
- [ ] Spelling: the printed card says "Partrick"; the site uses "Patrick"

Enter them in `src/content/wedding.ts`. Anything left `null` is simply not shown.

## 4. Burmese review

See `docs/BURMESE-REVIEW.md`.

## 5. Final checks

- [ ] `npm test`, `npm run check:i18n`, `npm run build` all pass
- [ ] Couple approves the site on their own phones, in both languages
- [ ] Test replies (accept + guest, decline) arrive in the Sheet, then deleted
- [ ] Share preview (paste the link in Viber/Messenger) shows names only
