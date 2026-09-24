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
    updateSummary(ss);
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

/**
 * The Summary tab, rebuilt after every reply. Every submission stays in
 * Responses (nothing is overwritten); the headline totals use each guest's
 * LATEST reply, matched by phone number, so a changed answer isn't counted twice.
 */
function updateSummary(ss) {
  const responses = ss.getSheetByName("Responses");
  const rows = responses.getLastRow() > 1 ? responses.getRange(2, 1, responses.getLastRow() - 1, HEADERS.length).getValues() : [];
  const col = (name) => HEADERS.indexOf(name);

  const latest = new Map();
  rows.forEach((r) => {
    const key = String(r[col("phone_digits")] || "").replace(/^'/, "") || "name:" + String(r[col("name")]).toLowerCase();
    latest.set(key, r); // rows are in submission order, so the last one wins
  });
  const current = Array.from(latest.values());

  const count = (list, fn) => list.filter(fn).length;
  const yes = (r) => r[col("attending")] === "yes";
  const guest = (r) => yes(r) && r[col("plus_one")] === "yes";
  const diet = (list, opt) => count(list, (r) => yes(r) && String(r[col("dietary")]).split(", ").indexOf(opt) !== -1);

  const table = [
    ["Latest reply per guest (by phone)", ""],
    ["Guests replied", current.length],
    ["Accepting", count(current, yes)],
    ["…bringing a guest", count(current, guest)],
    ["Total people attending", count(current, yes) + count(current, guest)],
    ["Declining", count(current, (r) => r[col("attending")] === "no")],
    ["", ""],
    ["Dietary (people accepting)", ""],
    ["Vegetarian", diet(current, "vegetarian")],
    ["Vegan", diet(current, "vegan")],
    ["No beef", diet(current, "no-beef")],
    ["No pork", diet(current, "no-pork")],
    ["Halal", diet(current, "halal")],
    ["Other notes", count(current, (r) => yes(r) && String(r[col("dietary_other")]).trim() !== "")],
    ["", ""],
    ["All submissions (including changed answers)", rows.length],
    // Sheets may turn "TRUE" into a boolean on append, so compare case-insensitively.
    ["Late replies", count(rows, (r) => String(r[col("late")]).toUpperCase() === "TRUE")],
  ];

  let sheet = ss.getSheetByName("Summary");
  if (!sheet) sheet = ss.insertSheet("Summary");
  sheet.clearContents();
  sheet.getRange(1, 1, table.length, 2).setValues(table);
  sheet.getRange("A1:A").setFontWeight("bold");
  sheet.setColumnWidth(1, 300);
}

/** Never let a guest's text run as a formula. */
function safe(v) {
  const s = v === undefined || v === null ? "" : String(v);
  return /^[=+\-@]/.test(s) && s.charAt(0) !== "'" ? "'" + s : s;
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
