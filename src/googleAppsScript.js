/**
 * Google Sheets via Apps Script Web App  no Google Cloud API key required.
 */

export function normalizeWebAppUrl(url) {
  const u = (url || "").trim();
  if (!u) return "";
  if (!u.startsWith("http")) return "";
  return u.replace(/\/$/, "");
}

export function isAppsScriptConfigured(settings) {
  return !!normalizeWebAppUrl(settings.googleWebAppUrl);
}

export async function callAppsScriptWebApp(webAppUrl, payload) {
  const url = normalizeWebAppUrl(webAppUrl);
  if (!url) throw new Error("Paste your Apps Script Web App URL in Settings");

  const res = await fetch(url, {
    method: "POST",
    mode: "cors",
    redirect: "follow",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(text.slice(0, 200) || `Sheet request failed (${res.status})`);
  }

  if (json.status === "error") throw new Error(json.message || "Apps Script error");
  if (!res.ok && json.status !== "success") {
    throw new Error(json.message || `HTTP ${res.status}`);
  }
  return json;
}

export async function fetchFromAppsScript(webAppUrl, secret) {
  const json = await callAppsScriptWebApp(webAppUrl, { action: "read", secret });
  return (json.records || []).map((r) => {
    let fd = r.faceDescriptor;
    if (typeof fd === "string" && fd) {
      try { fd = JSON.parse(fd); } catch { /* keep original descriptor */ }
    }
    return {
      ...r,
      faceDescriptor: fd,
      id: r.id || String(Date.now() + Math.random()).slice(0, 12),
      createdAt: r.createdAt || new Date().toISOString(),
    };
  });
}

export async function pushToAppsScript(webAppUrl, records, secret) {
  return callAppsScriptWebApp(webAppUrl, { action: "write", records, secret });
}

export const APP_SCRIPT_CODE = `function doPost(e) {
  let res = { status: 'success', message: 'Ok', records: [] };
  try {
    let payload = JSON.parse(e.postData.contents);
    let sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

    if (payload.secret && payload.secret !== "demo") {
       throw new Error("Invalid access secret");
    }

    if (payload.action === 'read') {
      let data = sheet.getDataRange().getValues();
      if (data.length > 1) {
        let headers = data[0];
        for(let i=1; i<data.length; i++) {
          let row = data[i];
          let obj = {};
          headers.forEach((h, j) => obj[h] = row[j]);
          res.records.push(obj);
        }
      }
    } else if (payload.action === 'write') {
      sheet.clear();
      let records = payload.records || [];
      if (records.length > 0) {
        let headers = Object.keys(records[0]);
        sheet.appendRow(headers);
        records.forEach(r => {
          let row = headers.map(h => {
             let val = r[h];
             if (typeof val === 'object') return JSON.stringify(val);
             return val;
          });
          sheet.appendRow(row);
        });
      }
    }
  } catch(err) {
    res.status = 'error';
    res.message = err.toString();
  }
  return ContentService.createTextOutput(JSON.stringify(res)).setMimeType(ContentService.MimeType.JSON);
}`;

export async function fetchLogsFromAppsScript(webAppUrl, secret) {
  const json = await callAppsScriptWebApp(webAppUrl, { action: "read_logs", secret });
  return json.logs || [];
}

export async function sendAuditLogToAppsScript(webAppUrl, secret, payload) {
  return callAppsScriptWebApp(webAppUrl, { action: "log", secret, payload });
}
