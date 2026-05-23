import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  Save, PlusCircle, Camera, RefreshCw, Copy, ClipboardPaste, Scissors,
  Trash2, ArrowDown, ArrowUp, SortAsc, SortDesc, Search, CopyPlus,
  AlertTriangle, Download, Upload, Undo2, Redo2, Filter, ArrowLeft, Mic
} from "lucide-react";
import "./excel-spreadsheet.css";
import { GRID_COLUMN_KEYS, SOURCE_UI } from "./dataSources";
import { compressImage } from "./AdvancedUtils";
import {
  colToLetter, cellAddress, DUPLICATE_KEYS, getDuplicateRowIndices,
  removeDuplicates, rowsToTsv, parseTsvPaste,
} from "./excelGridUtils";
import PhotoUploaderModal from "./PhotoUploaderModal";

const LABELS = {
  photo: "Photo", id: "ID", name: "Name", fatherName: "Father", address: "Address",
  age: "Age", sex: "Sex", communityReligion: "Community", familyMembers: "Family", propertiesDetails: "Properties",
  policeStation: "PS", hsNo: "HS", firNumber: "FIR", firDate: "FIR Date", sessionNumber: "Session No", casesPending: "Cases",
  currentDoings: "Current", hideouts: "Hideouts", areaOfOperation: "Area",
  gangLeader: "Leader", associates: "Associates", status: "Status", caseYear: "Year",
  notes: "Notes", createdAt: "Created",
};

const MAX_UNDO = 40;

export default function ExcelSpreadsheet({
  records,
  fields,
  dataSource,
  onSave,
  onRefresh,
  isSaving,
  css,
  onExportExcel,
  onImportExcel,
  toastShow,
  goBack,
}) {
  const fileRefs = useRef({});
  const gridKeys = useMemo(
    () => GRID_COLUMN_KEYS.filter((k) => k === "photo" || fields.some((f) => f.key === k)),
    [fields]
  );

  const createEmpty = () => ({
    id: `new_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    isNew: true,
    createdAt: new Date().toISOString(),
  });

  const [rows, setRows] = useState(() => {
    const list = records.length ? records.map((r) => ({ ...r })) : [];
    const targetSize = Math.max(list.length + 15, 20);
    while (list.length < targetSize) list.push(createEmpty());
    return list;
  });
  const [active, setActive] = useState({ row: 0, col: 1 });
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState("asc");
  const [filterText, setFilterText] = useState("");
  const [dupKey, setDupKey] = useState("name");
  const [showDupOnly, setShowDupOnly] = useState(false);
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [photoModalState, setPhotoModalState] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  const activeRef = useRef(active);
  useEffect(() => { activeRef.current = active; }, [active]);

  useEffect(() => {
    const list = records.length ? records.map((r) => ({ ...r })) : [];
    const targetSize = Math.max(list.length + 15, 20);
    while (list.length < targetSize) list.push(createEmpty());
    setRows(list);
    setUndoStack([]);
    setRedoStack([]);
  }, [records]);

  const pushHistory = useCallback((prev) => {
    setUndoStack((u) => [...u.slice(-MAX_UNDO + 1), prev]);
    setRedoStack([]);
  }, []);

  const setRowsHist = useCallback((updater) => {
    setRows((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      pushHistory(prev);
      return next;
    });
  }, [pushHistory]);

  const undo = () => {
    if (!undoStack.length) return;
    const prev = undoStack[undoStack.length - 1];
    setRedoStack((r) => [...r, rows]);
    setUndoStack((u) => u.slice(0, -1));
    setRows(prev);
    toastShow?.("Undo");
  };

  const redo = () => {
    if (!redoStack.length) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack((u) => [...u, rows]);
    setRedoStack((r) => r.slice(0, -1));
    setRows(next);
    toastShow?.("Redo");
  };

  const { indices: duplicateIndices, groupCount: dupGroups } = useMemo(
    () => getDuplicateRowIndices(rows, dupKey),
    [rows, dupKey]
  );

  const displayList = useMemo(() => {
    let list = rows.map((row, index) => ({ row, index }));
    const q = filterText.trim().toLowerCase();
    if (q) {
      list = list.filter(({ row }) =>
        Object.values(row).some((v) => String(v ?? "").toLowerCase().includes(q))
      );
    }
    if (showDupOnly) list = list.filter(({ index }) => duplicateIndices.has(index));
    if (sortCol != null) {
      const mult = sortDir === "asc" ? 1 : -1;
      list = [...list].sort((a, b) => {
        const va = a.row[sortCol] ?? "";
        const vb = b.row[sortCol] ?? "";
        const na = Number(va);
        const nb = Number(vb);
        if (!Number.isNaN(na) && !Number.isNaN(nb) && String(va).trim() && String(vb).trim()) {
          return (na - nb) * mult;
        }
        return String(va).localeCompare(String(vb)) * mult;
      });
    }
    return list;
  }, [rows, filterText, showDupOnly, duplicateIndices, sortCol, sortDir]);

  const ui = SOURCE_UI[dataSource] || SOURCE_UI.local;
  const activeKey = gridKeys[active.col];
  const activeRow = rows[active.row];
  const formulaValue = activeRow && activeKey != null ? String(activeRow[activeKey] ?? "") : "";

  const handleChange = (rowIndex, key, val) => {
    setRowsHist((prev) => {
      const next = [...prev];
      next[rowIndex] = { ...next[rowIndex], [key]: val };
      return next;
    });
  };

  const toggleMic = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toastShow?.("Speech recognition not supported in this browser.", "danger");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    
    recognition.onresult = (event) => {
      let finalTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      if (finalTranscript) {
        const curActive = activeRef.current;
        const curActiveKey = gridKeys[curActive.col];
        if (curActive.row >= 0 && curActiveKey && curActiveKey !== "photo") {
          setRowsHist((prev) => {
            const next = [...prev];
            const currentVal = next[curActive.row][curActiveKey] || "";
            const newVal = (currentVal ? currentVal + " " : "") + finalTranscript.trim();
            next[curActive.row] = { ...next[curActive.row], [curActiveKey]: newVal, isNew: false, updatedAt: new Date().toISOString() };
            return next;
          });
        }
      }
    };
    
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setIsListening(true);
    } catch(e) {
      setIsListening(false);
    }
  };

  const setFormulaBar = (val) => {
    if (activeKey == null || active.row < 0) return;
    handleChange(active.row, activeKey, val);
  };

  const handlePhoto = async (rowIndex, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const compressed = await compressImage(reader.result, 0.65);
        handleChange(rowIndex, "photo", compressed);
      } catch {
        handleChange(rowIndex, "photo", reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const insertRow = (afterIndex = rows.length - 1) => {
    const nr = createEmpty();
    const pos = afterIndex < 0 ? 0 : afterIndex + 1;
    setRowsHist((prev) => {
      const next = [...prev];
      next.splice(pos, 0, nr);
      return next;
    });
    setActive({ row: pos, col: active.col });
  };

  const deleteSelectedRows = () => {
    const toDel = selectedRows.size ? selectedRows : new Set([active.row]);
    if (toDel.size >= rows.length) {
      toastShow?.("Keep at least one row", "warning");
      return;
    }
    setRowsHist((prev) => prev.filter((_, i) => !toDel.has(i)));
    setSelectedRows(new Set());
    setActive({ row: 0, col: active.col });
    toastShow?.(`Deleted ${toDel.size} row(s)`);
  };

  const duplicateSelectedRows = () => {
    const toDup = selectedRows.size ? [...selectedRows].sort((a, b) => a - b) : [active.row];
    setRowsHist((prev) => {
      const next = [...prev];
      let offset = 0;
      toDup.forEach((i) => {
        const copy = { ...next[i + offset], id: `dup_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`, isNew: true };
        delete copy.isNew;
        copy.isNew = true;
        next.splice(i + offset + 1, 0, copy);
        offset += 1;
      });
      return next;
    });
    toastShow?.(`Duplicated ${toDup.length} row(s)`);
  };

  const copySelection = async () => {
    const indices = selectedRows.size ? [...selectedRows].sort((a, b) => a - b) : [active.row];
    const subset = indices.map((i) => rows[i]);
    const tsv = rowsToTsv(subset, gridKeys);
    try {
      await navigator.clipboard.writeText(tsv);
      toastShow?.(`Copied ${subset.length} row(s)`);
    } catch {
      toastShow?.("Copy failed", "danger");
    }
  };

  const pasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) return;
      setRowsHist((prev) => parseTsvPaste(text, gridKeys, active.row, active.col, prev));
      toastShow?.("Pasted");
    } catch {
      toastShow?.("Allow clipboard paste in browser", "warning");
    }
  };

  const cutSelection = async () => {
    await copySelection();
    deleteSelectedRows();
  };

  const toggleRowSelect = (i, shift) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (shift && prev.size) {
        const anchor = Math.min(...prev);
        const lo = Math.min(anchor, i);
        const hi = Math.max(anchor, i);
        for (let j = lo; j <= hi; j++) next.add(j);
      } else if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const sortByColumn = (key) => {
    if (sortCol === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortCol(key);
      setSortDir("asc");
    }
  };

  const removeDupes = (keep) => {
    const before = rows.length;
    const cleaned = removeDuplicates(rows, dupKey, keep);
    pushHistory(rows);
    setRows(cleaned);
    toastShow?.(`Removed ${before - cleaned.length} duplicate row(s) (kept ${keep})`);
  };

  const saveAll = () => {
    const valid = rows.filter((r) => {
      if (!r.isNew) return true;
      return gridKeys.some(k => k !== 'id' && k !== 'isNew' && k !== 'createdAt' && r[k] != null && String(r[k]).trim() !== "");
    });
    const final = valid.map((r) => {
      const rec = { ...r };
      delete rec.isNew;
      if (!rec.id || String(rec.id).startsWith("new_") || String(rec.id).startsWith("dup_")) {
        rec.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
      }
      if (!rec.createdAt) rec.createdAt = new Date().toISOString();
      rec.updatedAt = new Date().toISOString();
      return rec;
    });
    onSave(final);
  };

  const onKeyDown = (e, rowIndex, colIndex) => {
    const maxR = rows.length - 1;
    const maxC = gridKeys.length - 1;
    if (e.key === "ArrowDown") { e.preventDefault(); setActive({ row: Math.min(maxR, rowIndex + 1), col: colIndex }); }
    if (e.key === "ArrowUp") { e.preventDefault(); setActive({ row: Math.max(0, rowIndex - 1), col: colIndex }); }
    if (e.key === "ArrowRight") { e.preventDefault(); setActive({ row: rowIndex, col: Math.min(maxC, colIndex + 1) }); }
    if (e.key === "ArrowLeft") { e.preventDefault(); setActive({ row: rowIndex, col: Math.max(0, colIndex - 1) }); }
    if (e.key === "Delete" && !e.target.matches("input,select,textarea")) {
      handleChange(rowIndex, gridKeys[colIndex], "");
    }
  };

  useEffect(() => {
    const onGlobalKey = (e) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.target.matches("input,textarea") && !e.ctrlKey) return;
      if (e.key === "c" || e.key === "C") { e.preventDefault(); copySelection(); }
      if (e.key === "v" || e.key === "V") { e.preventDefault(); pasteClipboard(); }
      if (e.key === "x" || e.key === "X") { e.preventDefault(); cutSelection(); }
      if (e.key === "z" || e.key === "Z") { e.preventDefault(); undo(); }
      if (e.key === "y" || e.key === "Y") { e.preventDefault(); redo(); }
    };
    window.addEventListener("keydown", onGlobalKey);
    return () => window.removeEventListener("keydown", onGlobalKey);
  });

  return (
    <div className="excel-app">
      <div style={{ padding: "8px 14px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800, color: "var(--ct-text)" }}>Excel Workbook</div>
          <div style={{ fontSize: 11, color: ui.color, fontWeight: 600 }}>{ui.label} · {rows.length} rows</div>
        </div>
        <button type="button" className="excel-tool-btn" onClick={onRefresh}>
          <RefreshCw size={14} /> Reload
        </button>
      </div>

      {/* Ribbon */}
      <div className="excel-ribbon" style={{ marginTop: 8 }}>
        <div className="excel-ribbon-group">
          {goBack && (
            <button type="button" className="excel-tool-btn" onClick={goBack} title="Back to Dashboard">
              <ArrowLeft size={14} /> Back
            </button>
          )}
        </div>
        <div className="excel-ribbon-group">
          <span className="excel-ribbon-label">Clipboard</span>
          <button type="button" className="excel-tool-btn" onClick={copySelection} title="Ctrl+C"><Copy size={14} /> Copy</button>
          <button type="button" className="excel-tool-btn" onClick={pasteClipboard} title="Ctrl+V"><ClipboardPaste size={14} /> Paste</button>
          <button type="button" className="excel-tool-btn" onClick={cutSelection}><Scissors size={14} /> Cut</button>
          <button type="button" className="excel-tool-btn" onClick={undo} disabled={!undoStack.length}><Undo2 size={14} /> Undo</button>
          <button type="button" className="excel-tool-btn" onClick={redo} disabled={!redoStack.length}><Redo2 size={14} /> Redo</button>
        </div>
        <div className="excel-ribbon-group">
          <span className="excel-ribbon-label">Rows</span>
          <button type="button" className="excel-tool-btn" onClick={() => insertRow(active.row)}><ArrowDown size={14} /> Insert below</button>
          <button type="button" className="excel-tool-btn" onClick={() => insertRow(rows.length - 1)}><PlusCircle size={14} /> Insert at end</button>
          <button type="button" className="excel-tool-btn" onClick={() => insertRow(-1)}><ArrowUp size={14} /> Insert at top</button>
          <button type="button" className="excel-tool-btn" onClick={duplicateSelectedRows}><CopyPlus size={14} /> Duplicate row</button>
          <button type="button" className="excel-tool-btn danger" onClick={deleteSelectedRows}><Trash2 size={14} /> Delete</button>
        </div>
        <div className="excel-ribbon-group">
          <span className="excel-ribbon-label">Sort & filter</span>
          <button type="button" className="excel-tool-btn" onClick={() => sortCol && sortByColumn(sortCol)}><SortAsc size={14} /> Sort</button>
          <button type="button" className="excel-tool-btn" onClick={() => setFilterText("")}><Filter size={14} /> Clear filter</button>
        </div>
        <div className="excel-ribbon-group">
          <span className="excel-ribbon-label">Duplicates</span>
          <select
            className="excel-tool-btn"
            value={dupKey}
            onChange={(e) => setDupKey(e.target.value)}
            style={{ padding: "6px 8px" }}
          >
            {DUPLICATE_KEYS.map((d) => (
              <option key={d.id} value={d.id}>{d.label}</option>
            ))}
          </select>
          <button type="button" className="excel-tool-btn danger" onClick={() => removeDupes("first")}>Remove dupes (keep first)</button>
          <button type="button" className="excel-tool-btn danger" onClick={() => removeDupes("last")}>Keep last</button>
          <button type="button" className="excel-tool-btn" onClick={() => setShowDupOnly((v) => !v)}>
            {showDupOnly ? "Show all" : "Show duplicates only"}
          </button>
        </div>
        <div className="excel-ribbon-group">
          <span className="excel-ribbon-label">File</span>
          {onExportExcel && <button type="button" className="excel-tool-btn" onClick={onExportExcel}><Download size={14} /> Export .xlsx</button>}
          {onImportExcel && (
            <>
              <button type="button" className="excel-tool-btn" onClick={() => document.getElementById("excel-grid-import")?.click()}><Upload size={14} /> Import</button>
              <input id="excel-grid-import" type="file" accept=".xlsx" style={{ display: "none" }} onChange={onImportExcel} />
            </>
          )}
          <button type="button" className="excel-tool-btn primary" onClick={saveAll} disabled={isSaving}>
            <Save size={14} /> {isSaving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {/* Formula bar */}
      <div className="excel-formula-bar">
        <span className="excel-cell-ref">{cellAddress(active.row, active.col)}</span>
        <button 
          type="button" 
          className="excel-tool-btn" 
          onClick={toggleMic}
          style={{ padding: "0 4px", color: isListening ? "#ef4444" : "var(--ct-muted)" }}
          title="Dictate text into cell"
        >
          <Mic size={14} style={{ animation: isListening ? "pulse 1.5s infinite" : "none" }} />
        </button>
        <span style={{ color: "var(--ct-muted)", fontSize: 11 }}>fx</span>
        <input
          className="excel-formula-input"
          value={activeKey === "photo" ? (formulaValue ? "(image)" : "") : formulaValue}
          disabled={activeKey === "photo"}
          onChange={(e) => setFormulaBar(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && e.target.blur()}
        />
      </div>

      <div style={{ margin: "0 10px", display: "flex", gap: 8, alignItems: "center" }}>
        <Search size={14} color="var(--ct-muted)" />
        <input
          placeholder="Search all columns…"
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          style={{ flex: 1, ...css.input, padding: "8px 12px" }}
        />
      </div>

      {duplicateIndices.size > 0 && (
        <div className="excel-dup-banner">
          <AlertTriangle size={16} />
          <span><strong>{duplicateIndices.size}</strong> duplicate rows in <strong>{dupGroups}</strong> groups (by {DUPLICATE_KEYS.find((d) => d.id === dupKey)?.label})</span>
        </div>
      )}

      <div className="excel-sheet-wrap">
        <table className="excel-sheet">
          <thead>
            <tr>
              <th className="excel-corner" />
              <th className="excel-row-head" title="Select row">☑</th>
              {gridKeys.map((k, ci) => (
                <th
                  key={k}
                  className={`excel-col-head ${sortCol === k ? "sorted" : ""}`}
                  onClick={() => sortByColumn(k)}
                  title="Click to sort"
                >
                  <div>{colToLetter(ci)}</div>
                  <div style={{ fontSize: 10, opacity: 0.85 }}>{LABELS[k] || k}</div>
                  {sortCol === k && (sortDir === "asc" ? " ▲" : " ▼")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayList.map(({ row, index: rowIndex }) => (
              <tr key={row.id || rowIndex}>
                <td className="excel-row-head">{rowIndex + 1}</td>
                <td className="excel-row-head">
                  <input
                    type="checkbox"
                    checked={selectedRows.has(rowIndex)}
                    onChange={() => toggleRowSelect(rowIndex, false)}
                    style={{ width: 14, height: 14, cursor: "pointer" }}
                  />
                </td>
                {gridKeys.map((k, colIndex) => {
                  const isActive = active.row === rowIndex && active.col === colIndex;
                  const isDup = duplicateIndices.has(rowIndex);
                  const isSel = selectedRows.has(rowIndex);
                  return (
                    <td
                      key={k}
                      className={`excel-cell ${isActive ? "active" : ""} ${isDup ? "duplicate" : ""} ${isSel ? "selected-row" : ""}`}
                      onClick={() => setActive({ row: rowIndex, col: colIndex })}
                      onKeyDown={(e) => onKeyDown(e, rowIndex, colIndex)}
                    >
                      {k === "photo" ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: 4, minHeight: 52 }}>
                          {row.photo ? (
                            <img src={row.photo} alt="" style={{ width: 44, height: 44, objectFit: "cover", borderRadius: 4 }} />
                          ) : (
                            <span style={{ fontSize: 10, color: "#94a3b8", width: 44, textAlign: "center" }}>—</span>
                          )}
                          <button
                            type="button"
                            className="excel-tool-btn"
                            style={{ padding: "2px 6px", fontSize: 10 }}
                            onClick={(e) => { e.stopPropagation(); setPhotoModalState({ rowIndex, mode: 'upload' }); }}
                            title="Upload from computer"
                          >
                            <Upload size={12} />
                          </button>
                          <button
                            type="button"
                            className="excel-tool-btn"
                            style={{ padding: "2px 6px", fontSize: 10 }}
                            onClick={(e) => { e.stopPropagation(); setPhotoModalState({ rowIndex, mode: 'camera' }); }}
                            title="Take live photo"
                          >
                            <Camera size={12} />
                          </button>
                        </div>
                      ) : k === "sex" || k === "status" ? (
                        <select
                          value={row[k] || ""}
                          onChange={(e) => handleChange(rowIndex, k, e.target.value)}
                          onFocus={() => setActive({ row: rowIndex, col: colIndex })}
                        >
                          <option value="">—</option>
                          {(k === "sex" ? ["Male", "Female", "Other"] : ["Active", "Arrested", "Acquitted", "Absconding", "Deceased"]).map((o) => (
                            <option key={o} value={o}>{o}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          value={row[k] ?? ""}
                          onChange={(e) => handleChange(rowIndex, k, e.target.value)}
                          onFocus={() => setActive({ row: rowIndex, col: colIndex })}
                        />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="excel-status-bar">
        <span>Rows: <strong>{rows.length}</strong></span>
        <span>Selected: <strong>{selectedRows.size || 1}</strong></span>
        <span>Cell: <strong>{cellAddress(active.row, active.col)}</strong></span>
        <span>Duplicates: <strong style={{ color: duplicateIndices.size ? "#fca5a5" : "inherit" }}>{duplicateIndices.size}</strong></span>
        <span>Source: <strong style={{ color: ui.color }}>{ui.label}</strong></span>
      </div>

      {photoModalState && (
        <PhotoUploaderModal
          initialMode={photoModalState.mode}
          onPhotoCapture={(photo) => {
            handleChange(photoModalState.rowIndex, "photo", photo);
            setPhotoModalState(null);
          }}
          onClose={() => setPhotoModalState(null)}
          T={{ text: "#fff", accent: ui.color || "#3b82f6", card2: "#1e293b", red: "#ef4444" }}
          css={css}
        />
      )}
    </div>
  );
}
