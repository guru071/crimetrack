/** Column index → Excel letter (A, B, … Z, AA) */
export function colToLetter(col) {
  let s = "";
  let n = col + 1;
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

export function cellAddress(row, col) {
  return `${colToLetter(col)}${row + 1}`;
}

const norm = (v) => String(v ?? "").trim().toLowerCase();

export const DUPLICATE_KEYS = [
  { id: "name", label: "Name", fn: (r) => norm(r.name) },
  { id: "id", label: "Record ID", fn: (r) => norm(r.id) },
  { id: "firNumber", label: "FIR Number", fn: (r) => norm(r.firNumber) },
  { id: "name_father", label: "Name + Father", fn: (r) => `${norm(r.name)}|${norm(r.fatherName)}` },
  { id: "hsNo", label: "HS No.", fn: (r) => norm(r.hsNo) },
];

export function getDuplicateRowIndices(rows, keyId = "name") {
  const def = DUPLICATE_KEYS.find((d) => d.id === keyId) || DUPLICATE_KEYS[0];
  const groups = new Map();
  rows.forEach((r, i) => {
    const k = def.fn(r);
    if (!k || k === "|") return;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(i);
  });
  const dupes = new Set();
  groups.forEach((indices) => {
    if (indices.length > 1) indices.forEach((i) => dupes.add(i));
  });
  return { indices: dupes, groupCount: [...groups.values()].filter((g) => g.length > 1).length };
}

export function removeDuplicates(rows, keyId, keep = "first") {
  const def = DUPLICATE_KEYS.find((d) => d.id === keyId) || DUPLICATE_KEYS[0];
  const seen = new Set();
  const out = [];
  const list = keep === "last" ? [...rows].reverse() : rows;
  list.forEach((r) => {
    const k = def.fn(r);
    if (!k || k === "|") {
      out.push(r);
      return;
    }
    if (seen.has(k)) return;
    seen.add(k);
    out.push(r);
  });
  return keep === "last" ? out.reverse() : out;
}

export function sortRows(rows, colKey, dir = "asc") {
  const mult = dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const va = a[colKey] ?? "";
    const vb = b[colKey] ?? "";
    const na = Number(va);
    const nb = Number(vb);
    if (!Number.isNaN(na) && !Number.isNaN(nb) && String(va).trim() !== "" && String(vb).trim() !== "") {
      return (na - nb) * mult;
    }
    return String(va).localeCompare(String(vb)) * mult;
  });
}

export function rowsToTsv(rows, keys) {
  const header = keys.join("\t");
  const body = rows.map((r) => keys.map((k) => String(r[k] ?? "").replace(/\t/g, " ").replace(/\n/g, " ")).join("\t"));
  return [header, ...body].join("\n");
}

export function parseTsvPaste(text, keys, startRow, startCol, existingRows) {
  const lines = text.trim().split(/\r?\n/);
  const next = existingRows.map((r) => ({ ...r }));
  lines.forEach((line, dr) => {
    const cells = line.split("\t");
    const ri = startRow + dr;
    if (!next[ri]) next[ri] = { id: `paste_${Date.now()}_${ri}`, isNew: true };
    cells.forEach((val, dc) => {
      const ki = startCol + dc;
      if (ki < keys.length) next[ri][keys[ki]] = val;
    });
  });
  return next;
}

export function filterRows(rows, query) {
  const q = query.trim().toLowerCase();
  if (!q) return rows.map((r, i) => ({ row: r, index: i }));
  return rows
    .map((r, i) => ({ row: r, index: i }))
    .filter(({ row }) => Object.values(row).some((v) => String(v ?? "").toLowerCase().includes(q)));
}
