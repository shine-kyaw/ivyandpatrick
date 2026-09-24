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
      try {
        updateSummary(ss);
      } catch (summaryErr) {
        // The reply is saved; a summary hiccup must not report it as failed.
        console.error("summary failed: " + summaryErr);
      }
    } finally {
      lock.releaseLock();
    }
    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

/** Adds "RSVP → Refresh summary" to the sheet menu, for after manual edits. */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("RSVP")
    .addItem("Refresh summary", "refreshSummary")
    .addToUi();
}

function refreshSummary() {
  updateSummary(SpreadsheetApp.getActiveSpreadsheet());
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

  // One person = same phone AND same name, so a household replying for each
  // member from one phone is still counted per person. "Latest" is by
  // submitted_at, so sorting the Responses tab never changes the totals.
  const norm = (v) => String(v || "").replace(/^'/, "").toLowerCase().replace(/\s+/g, " ").trim();
  const stamp = (r) => {
    const v = r[col("submitted_at")];
    return v instanceof Date ? v.toISOString() : String(v);
  };
  const latest = new Map();
  const namesByPhone = new Map();
  rows.forEach((r) => {
    const phone = norm(r[col("phone_digits")]);
    const name = norm(r[col("name")]);
    const key = phone + "|" + name;
    const prev = latest.get(key);
    if (!prev || stamp(r) >= stamp(prev)) latest.set(key, r);
    if (phone) namesByPhone.set(phone, (namesByPhone.get(phone) || new Set()).add(name));
  });
  const current = Array.from(latest.values());
  const sharedPhones = Array.from(namesByPhone.values()).filter((names) => names.size > 1).length;

  const count = (list, fn) => list.filter(fn).length;
  const yes = (r) => r[col("attending")] === "yes";
  const guest = (r) => yes(r) && r[col("plus_one")] === "yes";
  const diet = (list, opt) => count(list, (r) => yes(r) && String(r[col("dietary")]).split(", ").indexOf(opt) !== -1);

  const table = [
    ["Latest reply per guest (same phone + name)", ""],
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
    ["Phones used by more than one name (check)", sharedPhones],
    // Sheets may turn "TRUE" into a boolean on append, so compare case-insensitively.
    ["Late replies", count(rows, (r) => String(r[col("late")]).toUpperCase() === "TRUE")],
  ];

  let sheet = ss.getSheetByName("Summary");
  if (!sheet) sheet = ss.insertSheet("Summary");
  // Only columns A:B belong to this summary; notes elsewhere on the tab survive.
  sheet.getRange(1, 1, Math.max(sheet.getLastRow(), table.length), 2).clearContent();
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
