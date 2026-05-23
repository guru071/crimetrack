# ⚡ QUICK REFERENCE - MANUAL GOOGLE SHEETS API

## 🎯 THREE SIMPLE STEPS

### Step 1️⃣: Get API Key
- Google Cloud Console
- APIs & Services → Credentials
- Create API Key
- Copy it

### Step 2️⃣: Get Sheet ID
- Open your Google Sheet
- Copy from URL between `/d/` and `/edit`
- Example: `1a2b3c4d5e6f7g8h9i0j`

### Step 3️⃣: Enter in CrimeTrack
- Settings → Manual API Entry (toggle ON)
- Paste API Key
- Paste Sheet ID
- Enable Sync (toggle ON)
- Save Configuration

**That's it!** ✨

---

## 📍 EXACT LOCATIONS

### In CrimeTrack App
```
Settings (bottom menu)
  ↓
Google Sheets Configuration
  ↓
Manual API Entry (checkbox)
  ↓
API Key field
Sheet ID field
Enable Sync checkbox
Save button
```

### In Google Cloud
```
console.cloud.google.com
  ↓
Select/Create Project
  ↓
Search "Google Sheets API"
  ↓
Enable
  ↓
APIs & Services → Credentials
  ↓
Create Credentials → API Key
  ↓
Copy the key
```

### In Google Sheets
```
Your spreadsheet URL
  ↓
https://docs.google.com/spreadsheets/d/[COPY_THIS]/edit
                                         ^^^^^^^^^^^^^^
                                         Sheet ID
```

---

## 🔑 FIELD INFO

| Field | Format | Example | Where |
|-------|--------|---------|-------|
| API Key | Alphanumeric | `AIzaSy...` | Google Cloud Console |
| Sheet ID | Alphanumeric | `1a2b3c4d5e6f` | Google Sheets URL |
| Enable Sync | Checkbox | ON/OFF | CrimeTrack Settings |

---

## ✅ VERIFICATION

After entering credentials:
- ✅ API Key is masked (shown as dots)
- ✅ Green checkmark appears
- ✅ "Configuration saved" message
- ✅ Sync button becomes active on Dashboard

---

## 🚀 USE AFTER SETUP

1. Dashboard
2. Click "Sync to Google Sheets"
3. Choose "Append" or "Replace"
4. Click "Sync Now"
5. Done! Data is in Google Sheets ✨

---

## 🆘 QUICK FIXES

| Problem | Fix |
|---------|-----|
| Won't save | Check both fields are filled |
| Sync not working | Verify API Key and Sheet ID |
| "Permission denied" | Enable Google Sheets API |
| Sheet not found | Check Sheet ID from URL |

---

## 📖 DETAILED GUIDE

Read: `GOOGLE_SHEETS_MANUAL_API.md` (complete instructions)

---

**Ready to sync? Let's go!** 🎉
