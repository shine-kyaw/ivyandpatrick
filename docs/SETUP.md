# Launch setup

Guests should not receive the link until every box below is ticked.

## 1. Connect the Google Sheet (replies go nowhere without this)

Do this signed in to the Google account that should own the replies
(suggested: patrickivy.rsvp@gmail.com). About 10 minutes, once.

### A. Create the sheet and paste the script

1. Go to <https://sheets.new>. Name the spreadsheet, e.g. "Patrick & Ivy — RSVPs".
2. Menu **Extensions → Apps Script**. A code editor opens in a new tab.
3. Delete everything in `Code.gs`, then paste the whole of
   `scripts/google-apps-script.gs` from this repo.
4. Near the top, replace `PASTE_A_LONG_RANDOM_SECRET` with a long random
   secret (Aster generates one; never commit it). Keep the quotes.
5. Click **Save** (disk icon). Name the project, e.g. "RSVP receiver".

### B. Deploy it as a web app

6. Top right: **Deploy → New deployment**.
7. Click the gear next to "Select type" → **Web app**.
8. Set **Execute as: Me** and **Who has access: Anyone**. (Anyone only means
   the website can reach it; without the secret it refuses to write, and it
   never returns sheet data.)
9. Click **Deploy** → **Authorize access** → choose the account.
   Google shows "Google hasn't verified this app": click **Advanced** →
   **Go to RSVP receiver (unsafe)** → **Allow**. (It is your own script.)
10. Copy the **Web app URL** (starts `https://script.google.com/macros/s/…`
    and ends `/exec`).

### C. Tell the website

11. Vercel → the `ivyandpatrick` project → **Settings → Environment Variables**.
    Add two variables, Environment **Production** (and Preview if wanted):

    | Name | Value |
    | --- | --- |
    | `RSVP_WEBHOOK_URL` | the `/exec` URL from step 10 |
    | `RSVP_WEBHOOK_SECRET` | the same secret as step 4 |

12. **Deployments** → the latest deployment → **⋯ → Redeploy**
    (environment variables only apply to new deployments).

### D. Test

13. Open the site, enter the password, send a test reply.
14. In the sheet: a **Responses** tab appears with the row, and a **Summary**
    tab with totals. Delete the test row, then use the sheet menu
    **RSVP → Refresh summary** (reload the sheet once for the menu to appear).

If the site says "Replies are not open just yet", a variable is missing or
the redeploy hasn't run. If it says "We couldn't send your reply", the URL
or secret doesn't match, or step 8 wasn't set to **Anyone**.

**Changing the script later:** edit, save, then **Deploy → Manage
deployments → ✏️ → Version: New version → Deploy**. The `/exec` URL stays the
same, so Vercel needs no change.

Optional variables:

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

## 3. Wedding facts

All facts live in `src/content/wedding.ts`; `npm run check:content` lists
anything missing. As of 2026-09-27 everything essential is filled:

- Venue: Lotte Ballroom, LOTTE HOTEL YANGON (address and Google Maps place
  from the hotel's own location page)
- RSVP deadline: 1 November 2026 (placeholder — confirm with the couple)
- Contact: patrickivy.rsvp@gmail.com (shown only past the password)
- Optional, not set: gifts note

Note: the printed card spells the groom's name "Partrick"; the site uses
"Patrick". Only matters if the card is reprinted.

## 4. Burmese review

See `docs/BURMESE-REVIEW.md`.

## 5. Final checks

- [ ] `npm test`, `npm run check:i18n`, `npm run build` all pass
- [ ] Couple approves the site on their own phones, in both languages
- [ ] Test replies (accept + guest, decline) arrive in the Sheet, then deleted
- [ ] Share preview (paste the link in Viber/Messenger) shows names only
