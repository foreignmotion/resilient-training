# Email list → Google Sheet

The site's email list adapter (`functions/_lib/list.ts`) posts each signup to a Google
Apps Script web app, which appends a row to a Google Sheet. Home-page signups and
registrations that tick "Add me to the email list" both land here.

## Set up (about 5 minutes)

1. Create a Google Sheet, e.g. "Email list". Put these headers in row 1:
   `Date | Email | Source | Name | Phone`
2. In the sheet: **Extensions → Apps Script**. Replace the code with the script below.
3. In Apps Script: **Project Settings → Script properties → Add property**
   `LIST_SECRET` = a long random string (save it; you'll paste it into Cloudflare too).
4. **Deploy → New deployment → Web app**. Execute as: **Me**. Who has access: **Anyone**.
   Copy the web app URL.
5. In Cloudflare Pages → your project → Settings → Environment variables, add:
   - `LIST_WEBHOOK_URL` = the web app URL
   - `LIST_WEBHOOK_SECRET` = the same random string from step 3

```js
function doPost(e) {
  var data = JSON.parse(e.postData.contents || '{}');
  var secret = PropertiesService.getScriptProperties().getProperty('LIST_SECRET');
  if (!secret || data.secret !== secret) return out({ ok: false, error: 'unauthorized' });
  var email = String(data.email || '').trim().toLowerCase();
  if (!email) return out({ ok: false, error: 'missing email' });
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  // Skip duplicates.
  var existing = sheet.getRange(2, 2, Math.max(sheet.getLastRow() - 1, 1), 1).getValues().flat();
  if (existing.indexOf(email) === -1) {
    sheet.appendRow([new Date(), email, data.source || '', data.name || '', data.phone || '']);
  }
  return out({ ok: true });
}
function out(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
```

When you later move to Kit, Mailchimp or ActiveCampaign, only `addToList()` in
`functions/_lib/list.ts` changes; you can import the sheet as a CSV.
