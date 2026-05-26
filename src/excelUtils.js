/** Parse data-URL photo for ExcelJS embed */
export function parsePhotoDataUrl(photo) {
  if (!photo || typeof photo !== "string") return null;
  const m = photo.match(/^data:image\/(\w+);base64,(.+)$/s);
  if (!m) return null;
  let ext = m[1].toLowerCase();
  if (ext === "jpg") ext = "jpeg";
  if (!["png", "jpeg", "gif"].includes(ext)) ext = "jpeg";
  return { extension: ext, base64: m[2] };
}

/** Embed photo in column A (0); rowIndex0 = 0-based sheet row (0 = header). */
export function embedPhotoInSheet(workbook, sheet, rowIndex0, photo) {
  const parsed = parsePhotoDataUrl(photo);
  if (!parsed) return;
  try {
    const imageId = workbook.addImage({
      base64: parsed.base64,
      extension: parsed.extension,
    });
    sheet.addImage(imageId, {
      tl: { col: 0.15, row: rowIndex0 + 0.1 },
      ext: { width: 88, height: 88 },
      editAs: "oneCell",
    });
  } catch (e) {
    console.error("Excel image embed failed", e);
  }
}

export const EXCEL_COLUMNS = [
  { header: "Photo", key: "photo", width: 14 },
  { header: "ID", key: "id", width: 14 },
  { header: "Name", key: "name", width: 22 },
  { header: "Father Name", key: "fatherName", width: 22 },
  { header: "Address", key: "address", width: 28 },
  { header: "Age", key: "age", width: 8 },
  { header: "Sex", key: "sex", width: 10 },
  { header: "Status", key: "status", width: 12 },
  { header: "Police Station", key: "policeStation", width: 18 },
  { header: "HS No.", key: "hsNo", width: 14 },
  { header: "FIR Number", key: "firNumber", width: 18 },
  { header: "FIR Date", key: "firDate", width: 14 },
  { header: "Cases Pending", key: "casesPending", width: 26 },
  { header: "Current Doings", key: "currentDoings", width: 20 },
  { header: "Area of Operation", key: "areaOfOperation", width: 18 },
  { header: "Associates", key: "associates", width: 22 },
  { header: "Gang Leader", key: "gangLeader", width: 18 },
  { header: "Case Year", key: "caseYear", width: 10 },
  { header: "Created At", key: "createdAt", width: 22 },
];

export function recordToExcelRow(record) {
  const row = {};
  EXCEL_COLUMNS.forEach((c) => {
    if (c.key === "photo") row[c.key] = "";
    else row[c.key] = record[c.key]  -  "";
  });
  return row;
}

export function buildExcelImageMap(workbook, sheet) {
  const imageMap = {};
  if (!sheet.getImages) return imageMap;
  for (const image of sheet.getImages()) {
    const imgData = workbook.getImage(image.imageId);
    let base64 = null;
    if (imgData?.buffer) {
      const u8 = new Uint8Array(imgData.buffer);
      const binary = u8.reduce((acc, byte) => acc + String.fromCharCode(byte), "");
      base64 = `data:image/${imgData.extension || "jpeg"};base64,${btoa(binary)}`;
    } else if (imgData?.base64) {
      base64 = `data:image/${imgData.extension || "jpeg"};base64,${imgData.base64}`;
    }
    if (base64 && image.range?.tl) {
      imageMap[image.range.tl.row] = base64;
    }
  }
  return imageMap;
}
