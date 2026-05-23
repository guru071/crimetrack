/**
 * Google Sheets via Apps Script Web App — no Google Cloud API key required.
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
      try { fd = JSON.parse(fd); } catch(e) {}
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

export async function fetchLogsFromAppsScript(webAppUrl, secret) {
  const json = await callAppsScriptWebApp(webAppUrl, { action: "read_logs", secret });
  return json.logs || [];
}

export async function sendAuditLogToAppsScript(webAppUrl, secret, payload) {
  return callAppsScriptWebApp(webAppUrl, { action: "log", secret, payload });
}
