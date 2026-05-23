# 🔑 GOOGLE SHEETS API - MANUAL CONFIGURATION GUIDE

## ✅ WHAT'S NEW

You can now manually enter your Google Sheets API credentials in Settings without OAuth authentication!

---

## 📍 WHERE TO FIND IT

1. Open the app: `npm run dev`
2. Go to: **Settings** (bottom menu)
3. Look for: **Google Sheets Configuration**
4. Toggle: **Manual API Entry** (checkbox)

---

## 🎯 HOW TO SET UP

### Step 1: Get Your API Key from Google Cloud

1. Go to: [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Enable the **Google Sheets API**:
   - Search for "Google Sheets API"
   - Click "Enable"
4. Create credentials:
   - Go to **APIs & Services** → **Credentials**
   - Click **Create Credentials** → **API Key**
   - Copy the API key

### Step 2: Get Your Google Sheet ID

1. Open your Google Sheet
2. Look at the URL:
   ```
   https://docs.google.com/spreadsheets/d/[SHEET_ID]/edit
   ```
3. Copy the `[SHEET_ID]` part
4. Example: `1a2b3c4d5e6f7g8h9i0j`

### Step 3: Enter in CrimeTrack Settings

1. Open CrimeTrack → **Settings**
2. Toggle **Manual API Entry** ON
3. Paste your **API Key** in the first field
4. Paste your **Sheet ID** in the second field
5. Toggle **Enable Sync** ON
6. Click **Save Manual API Configuration**

---

## 🚀 READY TO USE

Once configured, you can:
- ✅ Sync records to Google Sheets
- ✅ Auto-embed images
- ✅ Append or replace data
- ✅ View sync progress

Just use the **Sync to Google Sheets** button on the Dashboard!

---

## 📋 FIELD EXPLANATIONS

### API Key
- **What it is**: Authentication token for Google Sheets API
- **Where to get**: Google Cloud Console → Credentials
- **Format**: Long alphanumeric string
- **Password**: Shown as dots for security
- **Storage**: Saved in localStorage

### Sheet ID
- **What it is**: Unique identifier for your spreadsheet
- **Where to get**: Google Sheets URL
- **Format**: Alphanumeric string like `1a2b3c4d5e6f`
- **How to find**: Between `/d/` and `/edit` in URL

### Enable Sync
- **What it is**: Toggle to enable/disable syncing
- **When to use**: Only when API key and Sheet ID are set
- **Effect**: Enables sync button on dashboard

---

## ✨ CONFIGURATION TIPS

### Tip 1: Keep API Key Secure
- Don't share your API key
- Keep it private in settings
- Regenerate if compromised

### Tip 2: Create Dedicated Sheet
- Create a new sheet for CrimeTrack data
- Don't use existing important sheets
- Easier to manage and backup

### Tip 3: Test the Sync
1. Add a test record in CrimeTrack
2. Click "Sync to Google Sheets"
3. Check if data appears in your sheet
4. Verify with Append mode first

### Tip 4: Use API Key with Restrictions
In Google Cloud Console:
- Go to Credentials → Click your API key
- Set Application restrictions to "HTTP referrers"
- Restrict to your app's domain for security

---

## 🔧 TROUBLESHOOTING

### Issue: "Invalid API Key"
**Solution**: 
- Copy the API key exactly (including all characters)
- Check if the Google Sheets API is enabled
- Try regenerating the key

### Issue: "Sheet not found"
**Solution**:
- Verify Sheet ID is correct
- Check the URL: `docs.google.com/spreadsheets/d/[ID]/edit`
- Make sure the sheet is shared (if needed)

### Issue: "Permission denied"
**Solution**:
- Make sure API key has Google Sheets API enabled
- Check if Sheet is accessible
- Try creating a new test sheet

### Issue: "Sync not working"
**Solution**:
- Verify both fields are filled correctly
- Check Enable Sync is toggled ON
- Try clicking "Save Configuration" again
- Check browser console (F12) for errors

---

## 🎨 SETTINGS UI

### OAuth Mode (Default)
- Uses Google Account authentication
- Shows authenticated email
- More secure for shared accounts
- Best for: Teams using their own Google accounts

### Manual API Entry (New)
- Allows direct API key entry
- No OAuth needed
- Better for: Quick setup, one-time sync
- Fields: API Key, Sheet ID, Enable Sync

---

## 📊 WHAT GETS SYNCED

When you sync, the following data is sent to Google Sheets:
- Record name, age, sex
- Father's name, address
- Police station, H.S. number
- FIR details, session number
- Cases pending, current doings
- Hideouts, area of operation
- Gang leader, associates
- Status, year, creation date
- **Images**: Automatically compressed and embedded!

---

## 🔐 SECURITY NOTES

✅ **What's Secure:**
- API key is stored in localStorage
- Displayed as password field (dots)
- Data encrypted before sync
- No data sent to third parties

⚠️ **What to Watch:**
- Don't share your API key
- Don't use in public environments
- Regenerate key if needed
- Use API key restrictions in Google Cloud

---

## 🌐 MULTIPLE SHEETS

You can switch between different sheets:
1. Go to Settings
2. Change the **Sheet ID**
3. Save the new configuration
4. Sync will use the new sheet

---

## 📱 MOBILE & DESKTOP

✅ **Works on:**
- Desktop browsers
- Mobile browsers
- Tablets
- Any device with a browser

---

## 🧪 TEST IT

### Quick Test Steps
1. Open CrimeTrack
2. Create a test record
3. Go to Settings
4. Enter your API Key and Sheet ID
5. Enable Sync
6. Go to Dashboard
7. Click "Sync to Google Sheets"
8. Choose "Append" mode
9. Click "Sync Now"
10. Check your Google Sheet!

---

## 📚 USEFUL LINKS

- [Google Sheets API Docs](https://developers.google.com/sheets/api)
- [Google Cloud Console](https://console.cloud.google.com/)
- [Enable API Guide](https://support.google.com/cloud/answer/6158841)
- [Create API Key](https://cloud.google.com/docs/authentication/api-keys)

---

## ✅ SUMMARY

With manual Google Sheets API configuration:
✅ No OAuth needed
✅ Direct API key entry
✅ Quick setup
✅ Full sync capability
✅ Auto-image embedding
✅ Secure storage

**Ready to sync!** 🚀

---

## 🎯 NEXT STEPS

1. Get Google Sheets API key from Google Cloud
2. Get your Sheet ID from Google Sheets URL
3. Open CrimeTrack Settings
4. Enable "Manual API Entry"
5. Enter your credentials
6. Start syncing! ✨

---

**Version 2.0.2 | Manual Google Sheets API Support | Production Ready**
