# Google Sheets — FREE (no Google Cloud API key)

CrimeTrack can sync with Google Sheets **without** Google Cloud Console or an API key.

Use **Google Apps Script Web App** (runs inside your sheet).

---

## Setup (5 minutes)

### 1. Open your Google Sheet
Create or open the spreadsheet you want to use.

### 2. Add the script
1. **Extensions** → **Apps Script**
2. Delete any code in the editor
3. Copy all of `scripts/CrimeTrackGoogleWebApp.gs` from this project and paste it
4. **Save** (disk icon)

### 3. Deploy as Web App
1. Click **Deploy** → **New deployment**
2. Gear icon → type: **Web app**
3. **Execute as:** Me  
4. **Who has access:** **Anyone** (required for CrimeTrack to call it)
5. **Deploy** → authorize when asked
6. **Copy the Web App URL** (starts with `https://script.google.com/macros/...`)

### 4. CrimeTrack Settings
1. Open app → **Settings**
2. Under **Google Sheets (free — no Cloud API)** paste the **Web App URL**
3. Optionally paste **Sheet link** to open the sheet in browser
4. **Save**
5. On **Home** → select **Google Sheets** → **Load from Google Sheets**

### 5. Excel workbook
**Home** → **Open Excel workbook** → edit rows, photo in column A → **Save**  
Data saves to your active source (Google Sheets when that source is selected).

---

## What works without Cloud API

| Feature | Works |
|--------|--------|
| Load all records from sheet | Yes |
| Save / overwrite sheet from app | Yes |
| Photo in column A | Yes (base64 in cell) |
| Excel workbook edit + save | Yes |
| Duplicate handling | Yes (in app) |

---

## Optional: Google Cloud API key

Only if you **cannot** use Apps Script.  
Settings → **Advanced** → API key + Sheet link.

Standard Sheets API use is free within quotas:  
https://developers.google.com/sheets/api/limits

---

## Troubleshooting

- **CORS / failed to fetch** — Redeploy Web App with **Anyone** access; use a new deployment URL.
- **Authorization required** — Run script once from Apps Script editor (Run → `handleRead_`) and approve permissions.
- **Empty sheet** — First save from CrimeTrack writes headers (Photo, ID, Name, …).

Script file in repo: `scripts/CrimeTrackGoogleWebApp.gs`
