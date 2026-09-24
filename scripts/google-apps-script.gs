/**
 * Patrick & Ivy — RSVP receiver for Google Sheets.
 *
 * SETUP (about 5 minutes, done once by the Sheet's owner):
 *  1. Create a Google Sheet in the account that should own the replies.
 *  2. Extensions → Apps Script. Delete the sample code, paste this whole file.
 *  3. Replace PASTE_A_LONG_RANDOM_SECRET below with a long random string.
 *  4. Deploy → New deployment → type "Web app".
 *       Execute as: Me.   Who has access: Anyone.
 *     Authorise when asked. Copy the Web app URL (ends in /exec).
 *  5. In Vercel → Project → Settings → Environment Variables (Production), add:
 *       RSVP_WEBHOOK_URL     = the /exec URL
 *       RSVP_WEBHOOK_SECRET  = the same secret as step 3
 *     then redeploy. Send one test reply and delete its row.
 *
 * "Anyone" only means the website can reach this script; without the secret it
 * refuses to write, and it never returns sheet data.
 */

const SECRET = "PASTE_A_LONG_RANDOM_SECRET";

const HEADERS = [
  "submitted_at",
  "language",
  "name",
  "attending",
  "plus_one",
  "plus_one_name",
  "phone_raw",
  "phone_digits",
  "email",
  "dietary",
  "dietary_other",
  "message",
  "late",
  "submission_id",
  "device",
];

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    if (!SECRET || SECRET === "PASTE_A_LONG_RANDOM_SECRET" || body.secret !== SECRET) {
      return json({ ok: false, error: "forbidden" });
    }
    const row = body.row || {};
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = responsesSheet(ss);

    const lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      sheet.appendRow(HEADERS.map((h) => safe(row[h])));
    } finally {
      lock.releaseLock();
    }
    ensureSummary(ss);
    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

function doGet() {
  return json({ ok: true, service: "rsvp" });
}

function responsesSheet(ss) {
  let sheet = ss.getSheetByName("Responses");
  if (!sheet) sheet = ss.insertSheet("Responses", 0);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold");
    // Phone numbers stay text, so leading + and zeros survive.
    sheet.getRange("G:H").setNumberFormat("@");
  }
  return sheet;
}

/** A second tab with live totals. Counts raw rows: resolve duplicates by phone_digits. */
function ensureSummary(ss) {
  if (ss.getSheetByName("Summary")) return;
  const s = ss.insertSheet("Summary");
  const rows = [
    ["Replies (all rows)", "=COUNTA(Responses!A2:A)"],
    ["Accepting", '=COUNTIF(Responses!D2:D,"yes")'],
    ["…bringing a guest", '=COUNTIFS(Responses!D2:D,"yes",Responses!E2:E,"yes")'],
    ["Total guests attending", "=B2+B3"],
    ["Declining", '=COUNTIF(Responses!D2:D,"no")'],
    ["Late replies", '=COUNTIF(Responses!M2:M,"TRUE")'],
    ["", ""],
    ["Dietary (per reply)", ""],
    ["Vegetarian", '=COUNTIF(Responses!J2:J,"*vegetarian*")'],
    ["Vegan", '=COUNTIF(Responses!J2:J,"*vegan*")'],
    ["No beef", '=COUNTIF(Responses!J2:J,"*no-beef*")'],
    ["No pork", '=COUNTIF(Responses!J2:J,"*no-pork*")'],
    ["Halal", '=COUNTIF(Responses!J2:J,"*halal*")'],
    ["Other notes", '=COUNTA(Responses!K2:K)'],
    ["", ""],
    ["Possible duplicates (same phone)", "=COUNTA(Responses!H2:H)-COUNTUNIQUE(Responses!H2:H)"],
  ];
  s.getRange(1, 1, rows.length, 2).setValues(rows);
  s.getRange("A1:A").setFontWeight("bold");
  s.setColumnWidth(1, 260);
}

/** Never let a guest's text run as a formula. */
function safe(v) {
  const s = v === undefined || v === null ? "" : String(v);
  return /^[=+\-@]/.test(s) && s.charAt(0) !== "'" ? "'" + s : s;
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
