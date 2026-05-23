/** Extract spreadsheet ID from a Google Sheets URL or bare ID. */
export function parseGoogleSheetInput(input) {
  const raw = (input || "").trim();
  if (!raw) {
    return { sheetId: "", link: "", error: null };
  }

  const fromUrl = raw.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (fromUrl) {
    const sheetId = fromUrl[1];
    return {
      sheetId,
      link: raw.startsWith("http")
        ? raw.split("#")[0]
        : `https://docs.google.com/spreadsheets/d/${sheetId}/edit`,
      error: null,
    };
  }

  if (/^[a-zA-Z0-9-_]{20,}$/.test(raw)) {
    return {
      sheetId: raw,
      link: `https://docs.google.com/spreadsheets/d/${raw}/edit`,
      error: null,
    };
  }

  return {
    sheetId: "",
    link: raw,
    error: "Paste a valid Google Sheet link (docs.google.com/spreadsheets/d/...)",
  };
}

export function sheetLinkFromSettings(settings) {
  if (settings?.googleSheetLink) return settings.googleSheetLink;
  if (settings?.googleSheetId) {
    return `https://docs.google.com/spreadsheets/d/${settings.googleSheetId}/edit`;
  }
  return "";
}

export function sheetIdFromSettings(settings) {
  if (settings?.googleSheetId) return settings.googleSheetId.trim();
  const parsed = parseGoogleSheetInput(settings?.googleSheetLink);
  return parsed.sheetId;
}
