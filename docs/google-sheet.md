# Wednesday Class Signup Sheet (Google Sheets)

The site writes to the **Wednesday Class Signup Sheet** through a small Google Apps Script
bound to that sheet:

- **Registrations** tab: one row per student, added when a registration is **paid**
  (from the Stripe webhook). Includes class date, allergies, guardian, emergency contact,
  signature and amount paid.
- **Email list** tab: one row per email, from the home-page signup and from registrants
  who tick "Add me to the email list". Duplicates are skipped.

Both tabs are created automatically with headers on the first write.

> **Privacy:** the Registrations tab holds minors' names, allergies and emergency contacts.
> Set the sheet's sharing to **Restricted** (only people you add), not "Anyone with the link".

## Set up (about 5 minutes)

1. Open the sheet → **Extensions → Apps Script**. Delete the starter code, paste the script
   below, and **Save**.
2. **Project Settings** (gear) → **Script properties → Add script property**:
   `SHEET_SECRET` = a long random string. Keep a copy.
3. **Deploy → New deployment** → gear → **Web app**. Execute as: **Me**. Who has access:
   **Anyone**. **Deploy**, approve permissions (on "unverified app": **Advanced → Go to …**).
   Copy the web app URL (ends in `/exec`).
4. Add two Cloudflare secrets, then redeploy:

```bash
npx wrangler pages secret put SHEET_WEBHOOK_URL --project-name resilient-training
npx wrangler pages secret put SHEET_WEBHOOK_SECRET --project-name resilient-training
```

"Anyone" access only means the URL can be called; every request must carry the secret,
and the script never returns sheet data.

If you later edit the script, use **Deploy → Manage deployments → Edit → New version** so
the URL stays the same.

## Script

```js
var TABS = {
  registration: {
    name: 'Registrations',
    headers: ['Paid at', 'Class date', 'Student', 'Age', 'Parent or guardian', 'Food allergies',
      'Medication allergies', 'Other allergies', 'Signed by', 'Contact phone', 'Contact email',
      'Emergency contact', 'Emergency phone', 'Photo release', 'Amount paid (registration)',
      'Registration ID'],
  },
  list: {
    name: 'Email list',
    headers: ['Date', 'Email', 'Source', 'Name', 'Phone'],
  },
};

function doPost(e) {
  var data;
  try { data = JSON.parse(e.postData.contents || '{}'); } catch (err) { return out({ ok: false, error: 'bad json' }); }
  var secret = PropertiesService.getScriptProperties().getProperty('SHEET_SECRET');
  if (!secret || data.secret !== secret) return out({ ok: false, error: 'unauthorized' });
  var tab = TABS[data.type];
  if (!tab) return out({ ok: false, error: 'unknown type' });

  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sheet = getTab(tab);
    if (data.type === 'registration') addRegistration(sheet, data);
    else addListEmail(sheet, data);
  } finally {
    lock.releaseLock();
  }
  return out({ ok: true });
}

function addRegistration(sheet, d) {
  var idCol = TABS.registration.headers.length;
  if (columnValues(sheet, idCol).indexOf(String(d.registrationId).toLowerCase()) !== -1) return; // Stripe retry
  var rows = (d.students || []).map(function (s) {
    return [new Date(d.paidAt), d.classDate, s.name, s.age, s.guardian, s.food || 'None',
      s.meds || 'None', s.other || 'None', s.signature, d.contactPhone, d.contactEmail,
      d.emergencyName, d.emergencyPhone, d.photoRelease ? 'Yes' : 'No', d.amountPaid,
      d.registrationId].map(safe);
  });
  if (rows.length) sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
}

function addListEmail(sheet, d) {
  var email = String(d.email || '').trim().toLowerCase();
  if (!email) return;
  if (columnValues(sheet, 2).indexOf(email) !== -1) return;
  sheet.appendRow([new Date(), email, d.source || '', d.name || '', d.phone || ''].map(safe));
}

function getTab(tab) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(tab.name);
  if (!sheet) {
    // Reuse an empty first tab instead of leaving "Sheet1" behind.
    var first = ss.getSheets()[0];
    sheet = (first.getLastRow() === 0 && first.getName() === 'Sheet1') ? first.setName(tab.name) : ss.insertSheet(tab.name);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(tab.headers);
    sheet.getRange(1, 1, 1, tab.headers.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function columnValues(sheet, col) {
  var n = sheet.getLastRow() - 1;
  if (n < 1) return [];
  return sheet.getRange(2, col, n, 1).getValues().map(function (r) { return String(r[0]).toLowerCase(); });
}

// Text starting with = + - @ would run as a formula; store it as plain text.
function safe(v) {
  return (typeof v === 'string' && /^[=+\-@]/.test(v)) ? "'" + v : v;
}

function out(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
```

To move the email list to Kit, Mailchimp or ActiveCampaign later, only `addToList()` in
`functions/_lib/list.ts` changes.
