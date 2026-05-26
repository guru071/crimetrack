# CrimeTrack Google Sheets App Script Setup Guide

This document contains the exact code and step-by-step instructions required to connect your CrimeTrack app to a live Google Sheet using Google Apps Script as your custom API.

## Step 1: Prepare the Google Sheet
1. Open [Google Sheets](https://sheets.google.com) and create a **Blank Spreadsheet**.
2. Name the spreadsheet `CrimeTrack Database`.
3. In **Row 1**, type out your exact exact database column headers (these MUST exactly match the fields you use in the app). 
   - *Example Headers:* `id`, `name`, `age`, `sex`, `crimeType`, `location`, `status`, `photo`, `createdAt`, `updatedAt`, `officerName`.
   - **Crucial:** Row 1 must strictly contain headers. Row 2 and below will contain your data.

## Step 2: Open Google Apps Script
1. On your Google Sheet, click on **Extensions** in the top menu.
2. Select **Apps Script**.
3. A new tab will open showing an empty code editor with `function myFunction() { }`.
4. Delete all the existing code in that editor.

## Step 3: Paste the CrimeTrack API Code
Copy the entire block of code below and paste it into the Apps Script editor:

```javascript
/**
 * CrimeTrack - Google Sheets API
 * Deploy this script as a "Web App" to allow CrimeTrack to read/write to your Sheet.
 */

function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  
  try {
    var data = JSON.parse(e.postData.contents);
    var action = data.action;

    // ACTION: Full Database Sync (Overwrite from App)
    if (action === "sync") {
      var records = data.records;
      
      // Clear all existing data except the Row 1 headers
      var lastRow = Math.max(sheet.getLastRow(), 1);
      if (lastRow > 1) {
        sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
      }
      
      if (!records || records.length === 0) {
        return buildSuccessResponse({ message: "Cleared successfully" });
      }

      // Convert JSON records to a 2D Array matching the Sheet's headers
      var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      var rows = records.map(function(record) {
        return headers.map(function(header) {
          // Convert objects/arrays to strings if necessary, else keep raw value
          var val = record[header];
          if (typeof val === 'object') return JSON.stringify(val);
          return val || "";
        });
      });
      
      // Write the 2D array back to the sheet in bulk
      sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
      return buildSuccessResponse({ message: "Sync complete" });
    }
    
    // ACTION: Append Single Record
    if (action === "append") {
       var record = data.record;
       var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
       var row = headers.map(function(header) { 
          var val = record[header];
          if (typeof val === 'object') return JSON.stringify(val);
          return val || ""; 
       });
       sheet.appendRow(row);
       return buildSuccessResponse({ message: "Record appended" });
    }

    return buildErrorResponse("Unknown action: " + action);

  } catch (error) {
    return buildErrorResponse(error.toString());
  }
}


function doGet(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var lastRow = Math.max(sheet.getLastRow(), 1);
  var lastCol = Math.max(sheet.getLastColumn(), 1);
  
  if (lastRow <= 1) {
     return buildSuccessResponse([]);
  }

  // Read the entire sheet
  var data = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  var headers = data[0];
  var records = [];
  
  // Convert 2D array back into JSON objects
  for (var i = 1; i < data.length; i++) {
    var record = {};
    for (var j = 0; j < headers.length; j++) {
      record[headers[j]] = data[i][j];
    }
    records.push(record);
  }
  
  return buildSuccessResponse(records);
}


// --- Helper Functions for CORS & JSON ---

function buildSuccessResponse(payload) {
  var output = JSON.stringify(payload);
  return ContentService.createTextOutput(output)
    .setMimeType(ContentService.MimeType.JSON);
}

function buildErrorResponse(errorMsg) {
  var output = JSON.stringify({ status: "error", message: errorMsg });
  return ContentService.createTextOutput(output)
    .setMimeType(ContentService.MimeType.JSON);
}

// Handle CORS Preflight Requests from the App
function doOptions(e) {
  return ContentService.createTextOutput("")
    .setMimeType(ContentService.MimeType.TEXT);
}
```

## Step 4: Deploy the API
This is the most important step to get your `App Script URL`:

1. Click the **Save** icon (the floppy disk) at the top.
2. Click the large blue **Deploy** button at the top right, and select **New deployment**.
3. In the popup window, click the **Gear Icon ⚙️** next to "Select type" and choose **Web app**.
4. Fill out the form exactly like this:
   - **Description:** `CrimeTrack API v1`
   - **Execute as:** `Me (your-email@gmail.com)`
   - **Who has access:** `Anyone` *(CRITICAL: Must be "Anyone" so the app can reach it without Google Login walls!)*
5. Click **Deploy**.
6. Google will prompt you to "Authorize access". Click **Authorize access**.
7. Select your Google account.
8. You will see a warning: "Google hasn't verified this app". Click **Advanced**, and then click **Go to Untitled project (unsafe)**.
9. Click **Allow**.
10. You will now see your **Web app URL**. It starts with `https://script.google.com/macros/s/.../exec`.
11. **Copy this Web app URL.**

## Step 5: Connect CrimeTrack
1. Open your CrimeTrack App.
2. Open the **Settings** menu.
3. Paste the URL you just copied into the **Google App Script URL** field.
4. (Optional) Enter your API password if you configured one.
5. Click **Test & Save Connection**. 
6. You are done! Your app is now syncing live with your Google Sheet.
