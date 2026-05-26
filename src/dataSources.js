import { sheetIdFromSettings } from "./googleSheetUtils";
import { isAppsScriptConfigured, fetchFromAppsScript, pushToAppsScript, sendAuditLogToAppsScript, fetchLogsFromAppsScript } from "./googleAppsScript";
import { encryptRecord, decryptRecord } from "./cryptoUtils";

/** UI accents per data source */
export const SOURCE_UI = {
  local: { id: "local", label: "Local Storage", color: "#10b981", bg: "rgba(16, 185, 129, 0.15)", border: "rgba(16, 185, 129, 0.45)" },
  google: { id: "google", label: "Google Sheets", color: "#06b6d4", bg: "rgba(6, 182, 212, 0.15)", border: "rgba(6, 182, 212, 0.45)" },
  database: { id: "database", label: "Custom Database", color: "#a855f7", bg: "rgba(168, 85, 247, 0.15)", border: "rgba(168, 85, 247, 0.45)" },
};

/** Column order: photo first for sheet + live grid */
export const GRID_COLUMN_KEYS = [
  "photo", "id", "name", "fatherName", "address", "age", "sex", "communityReligion",
  "familyMembers", "propertiesDetails", "policeStation", "hsNo", "firNumber", "firDate",
  "sessionNumber", "casesPending", "currentDoings", "hideouts", "areaOfOperation",
  "gangLeader", "associates", "status", "caseYear", "notes", "createdAt",
];

const SHEET_RANGE = "Sheet1!A1:Z2000";

function sheetsUrl(sheetId, path, apiKey) {
  return `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}${path}?key=${encodeURIComponent(apiKey)}`;
}

function rowToRecord(headers, cells) {
  const rec = {};
  headers.forEach((h, i) => {
    if (!h) return;
    const key = headerToKey(h);
    if (!key) return;
    const v = cells[i];
    rec[key] = v != null && v !== "" ? String(v) : "";
  });
  if (!rec.id) rec.id = "";
  if (rec.age) rec.age = Number(rec.age) || rec.age;
  if (rec.caseYear) rec.caseYear = Number(rec.caseYear) || rec.caseYear;
  if (rec.photo && rec.photo.startsWith("data:")) { /* keep */ }
  else if (rec.photo && rec.photo.length > 100 && !rec.photo.startsWith("http")) {
    rec.photo = rec.photo.startsWith("/9j") ? `data:image/jpeg;base64,${rec.photo}` : rec.photo;
  }
  return rec;
}

function headerToKey(h) {
  const map = {
    Photo: "photo", ID: "id", Name: "name", "Father Name": "fatherName", Address: "address",
    Age: "age", Sex: "sex", "Community & Religion": "communityReligion", "Police Station": "policeStation",
    "HS No.": "hsNo", "FIR Number": "firNumber", "FIR Date": "firDate", "Cases Pending": "casesPending",
    "Session Number": "sessionNumber", "Family Members": "familyMembers", "Properties Details": "propertiesDetails",
    "Current Doings": "currentDoings", Hideouts: "hideouts", "Area of Operation": "areaOfOperation",
    "Gang Leader": "gangLeader", Associates: "associates", Status: "status", "Case Year": "caseYear",
    Notes: "notes", "Created At": "createdAt", "Updated At": "updatedAt",
    photo: "photo", id: "id", name: "name", fatherName: "fatherName",
  };
  return map[h] || map[h.trim()] || (GRID_COLUMN_KEYS.includes(h) ? h : null);
}

function keyToHeader(key) {
  const labels = {
    photo: "Photo", id: "ID", name: "Name", fatherName: "Father Name", address: "Address",
    age: "Age", sex: "Sex", communityReligion: "Community & Religion", familyMembers: "Family Members",
    propertiesDetails: "Properties Details", policeStation: "Police Station", hsNo: "HS No.",
    firNumber: "FIR Number", firDate: "FIR Date", sessionNumber: "Session Number", casesPending: "Cases Pending",
    currentDoings: "Current Doings", hideouts: "Hideouts", areaOfOperation: "Area of Operation",
    gangLeader: "Gang Leader", associates: "Associates", status: "Status", caseYear: "Case Year",
    notes: "Notes", createdAt: "Created At", updatedAt: "Updated At",
  };
  return labels[key] || key;
}

export function recordsToSheetRows(records) {
  const headers = GRID_COLUMN_KEYS.map(keyToHeader);
  const rows = records.map((r) =>
    GRID_COLUMN_KEYS.map((k) => {
      const v = r[k];
      if (k === "photo" && v && String(v).length > 45000) return String(v).slice(0, 45000);
      return v != null ? String(v) : "";
    })
  );
  return [headers, ...rows];
}

export function isGoogleSheetsConfigured(settings) {
  return isAppsScriptConfigured(settings) || (
    !!sheetIdFromSettings(settings) && !!settings.googleApiKey?.trim()
  );
}

export async function fetchFromGoogleSheets(settings) {
  if (isAppsScriptConfigured(settings)) {
    const raw = await fetchFromAppsScript(settings.googleWebAppUrl, settings.apiSecret);
    return raw.map(r => normalizeRecord(decryptRecord(r, settings.e2eKey)));
  }

  const apiKey = settings.googleApiKey?.trim();
  const sheetId = sheetIdFromSettings(settings);
  if (!apiKey || !sheetId) {
    throw new Error(
      "Add Apps Script Web App URL in Settings (free, no Cloud API), or add Sheet link + API key"
    );
  }

  const url = sheetsUrl(sheetId, `/values/${encodeURIComponent(SHEET_RANGE)}`, apiKey);
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message || "Failed to load Google Sheet");

  const values = json.values || [];
  if (values.length < 2) return [];

  const headers = values[0].map((h) => String(h || "").trim());
  const raw = values.slice(1).map((row) => rowToRecord(headers, row)).filter((r) => r.name || r.id);
  return raw.map(r => normalizeRecord(decryptRecord(r, settings.e2eKey)));
}

export async function pushToGoogleSheets(settings, records) {
  const payloadRecords = records.map(r => encryptRecord(r, settings.e2eKey));
  if (isAppsScriptConfigured(settings)) {
    return pushToAppsScript(settings.googleWebAppUrl, payloadRecords, settings.apiSecret);
  }

  const apiKey = settings.googleApiKey?.trim();
  const sheetId = sheetIdFromSettings(settings);
  if (!apiKey || !sheetId) throw new Error("Google Sheets not configured");

  const url = sheetsUrl(
    sheetId,
    `/values/${encodeURIComponent(SHEET_RANGE)}?valueInputOption=USER_ENTERED`,
    apiKey
  );
  const res = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ values: recordsToSheetRows(payloadRecords) }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message || "Failed to save to Google Sheet");
  return json;
}

export async function fetchFromDatabase(settings) {
  const base = (settings.dbApiUrl || "").trim().replace(/\/$/, "");
  if (!base) throw new Error("Configure Database API URL in Settings");

  const headers = { Accept: "application/json" };
  if (settings.apiSecret) headers["x-api-secret"] = settings.apiSecret;

  const paths = ["/records", "/api/records", ""];
  let lastErr = null;
  for (const p of paths) {
    try {
      const res = await fetch(`${base}${p}`, { headers });
      if (!res.ok) {
        lastErr = new Error(`HTTP ${res.status}`);
        continue;
      }
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.records || data.data || [];
      return list.map(r => normalizeRecord(decryptRecord(r, settings.e2eKey)));
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("Could not load from database API");
}

export async function fetchLogsFromDatabase(settings) {
  const base = (settings.dbApiUrl || "").trim().replace(/\/$/, "");
  if (!base) return [];
  const headers = { Accept: "application/json" };
  if (settings.apiSecret) headers["x-api-secret"] = settings.apiSecret;

  for (const path of ["/api/logs", "/logs"]) {
    try {
      const res = await fetch(`${base}${path}`, { headers });
      if (!res.ok) continue;
      const data = await res.json();
      return data.logs || data.data || [];
    } catch {
      // Try the next common logs endpoint.
    }
  }
  return [];
}

export async function pushToDatabase(settings, records) {
  const base = (settings.dbApiUrl || "").trim().replace(/\/$/, "");
  if (!base) throw new Error("Database API URL not configured");

  const payloadRecords = records.map(r => encryptRecord(r, settings.e2eKey));
  const headers = { "Content-Type": "application/json", Accept: "application/json" };
  if (settings.apiSecret) headers["x-api-secret"] = settings.apiSecret;

  const paths = ["/records", "/api/records", ""];
  let lastStatus = "";
  for (const path of paths) {
    const url = `${base}${path}`;
    try {
      let res = await fetch(url, {
        method: "PUT",
        headers,
        body: JSON.stringify({ records: payloadRecords }),
      });
      if (res.ok) return;

      lastStatus = `${res.status}`;
      res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({ records: payloadRecords }),
      });
      if (res.ok) return;
      lastStatus = `${res.status}`;
    } catch (err) {
      lastStatus = err.message;
    }
  }
  throw new Error(`Database save failed (${lastStatus || "no endpoint accepted records"})`);
}

function normalizeRecord(r) {
  const out = { ...r };
  if (!out.id) out.id = String(Date.now());
  if (!out.createdAt) out.createdAt = new Date().toISOString();
  if (typeof out.faceDescriptor === "string" && out.faceDescriptor) {
    try { out.faceDescriptor = JSON.parse(out.faceDescriptor); } catch { /* keep original descriptor */ }
  }
  return out;
}

export async function loadRecordsForSource(source, settings, loadLocalFn) {
  if (source === "local") return loadLocalFn ? loadLocalFn() : [];
  if (source === "google") return fetchFromGoogleSheets(settings);
  if (source === "database") return fetchFromDatabase(settings);
  throw new Error("Unknown data source");
}

export async function loadLogsForSource(source, settings) {
  if (source === "local") return [];
  if (source === "google") {
    if (isAppsScriptConfigured(settings)) return fetchLogsFromAppsScript(settings.googleWebAppUrl, settings.apiSecret);
    return [];
  }
  if (source === "database") return fetchLogsFromDatabase(settings);
  return [];
}

export async function saveRecordsForSource(source, settings, records) {
  if (source === "google") return pushToGoogleSheets(settings, records);
  if (source === "database") return pushToDatabase(settings, records);
  return null;
}

export async function sendAuditLog(source, settings, event, details) {
  const officerId = settings.officerId || settings.policeProfile?.policeId;
  if (!officerId) return; // Silent if officer identity has not been generated yet.
  const payload = {
    timestamp: new Date().toISOString(),
    officerId,
    officerName: settings.officerName || settings.policeProfile?.name || officerId,
    station: settings.policeProfile?.station || "",
    event,
    details,
    officerPhoto: settings.policeProfile?.photoUrl || ""
  };

  if (source === "google" && isAppsScriptConfigured(settings)) {
    try {
      await sendAuditLogToAppsScript(settings.googleWebAppUrl, settings.apiSecret, payload);
    } catch (e) { console.warn("Audit log to Google Sheets failed", e); }
  } else if (source === "database") {
    const base = (settings.dbApiUrl || "").trim().replace(/\/$/, "");
    if (base) {
      const headers = { "Content-Type": "application/json" };
      if (settings.apiSecret) headers["x-api-secret"] = settings.apiSecret;
      try {
        let res = await fetch(`${base}/logs`, { method: "POST", headers, body: JSON.stringify({ payload }) });
        if (!res.ok) {
          res = await fetch(`${base}/api/logs`, { method: "POST", headers, body: JSON.stringify({ payload }) });
        }
      } catch (e) { console.warn("Audit log to Custom DB failed", e); }
    }
  }
}
