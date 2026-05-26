import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  Save, PlusCircle, Camera, RefreshCw, Copy, ClipboardPaste, Scissors,
  Trash2, ArrowDown, ArrowUp, SortAsc, Search, CopyPlus,
  AlertTriangle, Download, Upload, Undo2, Redo2, Filter, ArrowLeft, Mic, User, X
} from "lucide-react";
import "./excel-spreadsheet.css";
import { GRID_COLUMN_KEYS, SOURCE_UI } from "./dataSources";
import {
  colToLetter, cellAddress, DUPLICATE_KEYS, getDuplicateRowIndices,
  removeDuplicates, rowsToTsv, parseTsvPaste,
} from "./excelGridUtils";
import PhotoUploaderModal from "./PhotoUploaderModal";
import DocumentScannerModal from "./DocumentScannerModal";
import { Capacitor } from "@capacitor/core";
import { SpeechRecognition } from "@capacitor-community/speech-recognition";
import { AISearchBar } from "./features/DatabaseAI";

const LABELS = {
  photo: "Photo", id: "ID", name: "Name", fatherName: "Father", address: "Address",
  age: "Age", sex: "Sex", communityReligion: "Community", familyMembers: "Family", propertiesDetails: "Properties",
  policeStation: "PS", hsNo: "HS", firNumber: "FIR", firDate: "FIR Date", sessionNumber: "Session No", casesPending: "Cases",
  currentDoings: "Current", hideouts: "Hideouts", areaOfOperation: "Area",
  gangLeader: "Leader", associates: "Associates", status: "Status", caseYear: "Year",
  notes: "Notes", createdAt: "Created",
};

const MAX_UNDO = 40;

async function ensureNativeSpeechReady() {
  const availability = await SpeechRecognition.available();
  if (!availability?.available) {
    throw new Error("Speech recognition is not available on this device.");
  }

  let permission = await SpeechRecognition.checkPermissions();
  if (permission.speechRecognition !== "granted") {
    permission = await SpeechRecognition.requestPermissions();
  }
  if (permission.speechRecognition !== "granted") {
    throw new Error("Microphone permission was not granted.");
  }
}

function getWebSpeechRecognition() {
  return window.SpeechRecognition || window.webkitSpeechRecognition;
}

export default function ExcelSpreadsheet({
  records, fields, dataSource, onSave, onRefresh, isSaving, 
  onExportExcel, onImportExcel, toastShow, goBack, css, T
}) {
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
  const [showFaceScanner, setShowFaceScanner] = useState(null); // stores rowIndex
  const [imageViewerState, setImageViewerState] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [colWidths, setColWidths] = useState({});
  const resizingRef = useRef(null);
  const recognitionRef = useRef(null);
  const [panelHeight, setPanelHeight] = useState(null);
  const panelResizingRef = useRef(null);

  // Panel (window) vertical resize
  useEffect(() => {
    const onMove = (e) => {
      if (!panelResizingRef.current) return;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const delta = clientY - panelResizingRef.current.startY;
      const newH = Math.max(200, panelResizingRef.current.startH + delta);
      setPanelHeight(newH);
    };
    const onUp = () => { panelResizingRef.current = null; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };
  }, []);

  const activeRef = useRef(active);
  useEffect(() => { activeRef.current = active; }, [active]);

  useEffect(() => {
    const list = records.length ? records.map((r) => ({ ...r })) : [];
    const targetSize = Math.max(list.length + 15, 20);
    while (list.length < targetSize) list.push(createEmpty());
    queueMicrotask(() => {
      setRows(list);
      setUndoStack([]);
      setRedoStack([]);
    });
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

    // Check if we have an active AI search result override
    if (window._aiSearchResults && window._aiSearchResults.length > 0 && q) {
      const matchedIds = new Set(window._aiSearchResults.map(r => r.id));
      list = list.filter(({ row }) => matchedIds.has(row.id));
    } else if (q) {
      list = list.filter(({ row }) =>
        Object.values(row).some((v) => String(v || "").toLowerCase().includes(q))
      );
    }

    if (showDupOnly) list = list.filter(({ index }) => duplicateIndices.has(index));
    if (sortCol != null) {
      const mult = sortDir === "asc" ? 1 : -1;
      list = [...list].sort((a, b) => {
        const va = a.row[sortCol] - "";
        const vb = b.row[sortCol] - "";
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
  const formulaValue = activeRow && activeKey != null ? String(activeRow[activeKey] || "") : "";

  const handleChange = (rowIndex, key, val) => {
    setRowsHist((prev) => {
      const next = [...prev];
      next[rowIndex] = { ...next[rowIndex], [key]: val };
      return next;
    });
  };

  const toggleMic = async () => {
    if (isListening) {
      if (Capacitor.isNativePlatform()) {
        await SpeechRecognition.stop();
      } else {
        recognitionRef.current?.stop();
      }
      setIsListening(false);
      return;
    }

    if (Capacitor.isNativePlatform()) {
      try {
        await ensureNativeSpeechReady();
        setIsListening(true);
        const result = await SpeechRecognition.start({
          language: "en-US",
          maxResults: 2,
          prompt: "Say something",
          partialResults: false,
          popup: true,
        });
        const finalTranscript = result?.matches?.[0] || "";
        const curActive = activeRef.current;
        const curActiveKey = gridKeys[curActive.col];
        if (finalTranscript.trim() && curActive.row >= 0 && curActiveKey && curActiveKey !== "photo") {
          setRowsHist((prev) => {
            const next = [...prev];
            const currentVal = next[curActive.row][curActiveKey] || "";
            const newVal = (currentVal ? currentVal + " " : "") + finalTranscript.trim();
            next[curActive.row] = { ...next[curActive.row], [curActiveKey]: newVal, isNew: false, updatedAt: new Date().toISOString() };
            return next;
          });
        }
      } catch (err) {
        toastShow?.(err.message || "Mic permission denied or speech recognition error.", "danger");
      } finally {
        setIsListening(false);
      }
      return;
    }

    const SR = getWebSpeechRecognition();
    if (!SR) {
      toastShow?.("Speech recognition is not supported in this desktop runtime. Use the APK for native dictation.", "warning");
      return;
    }
    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    // Track what was already committed so we only append new finals
    let committedText = "";

    recognition.onresult = (event) => {
      let interimTranscript = "";
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += t;
        } else {
          interimTranscript += t;
        }
      }

      const curActive = activeRef.current;
      const curActiveKey = gridKeys[curActive.col];
      if (curActive.row >= 0 && curActiveKey && curActiveKey !== "photo") {
        setRowsHist((prev) => {
          const next = [...prev];
          const baseVal = committedText;
          // Show interim text live in cell
          const displayVal = baseVal + (interimTranscript || finalTranscript);
          next[curActive.row] = { ...next[curActive.row], [curActiveKey]: displayVal, isNew: false, updatedAt: new Date().toISOString() };
          return next;
        });
        if (finalTranscript) {
          committedText = committedText + finalTranscript;
        }
      }
    };

    recognition.onerror = (e) => {
      if (e.error === 'network') {
        alert("Network error: Your browser's speech recognition engine cannot connect to the cloud. Try Chrome or build the Android APK to use native speech.");
      }
      setIsListening(false);
    };
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setIsListening(true);
    } catch {
      setIsListening(false);
    }
  };

  const setFormulaBar = (val) => {
    if (activeKey == null || active.row < 0) return;
    handleChange(active.row, activeKey, val);
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

  const selectAllRows = () => {
    const visibleIndices = displayList.map(({ index }) => index);
    const allVisibleSelected = visibleIndices.length > 0 && visibleIndices.every((index) => selectedRows.has(index));
    setSelectedRows(allVisibleSelected ? new Set() : new Set(visibleIndices));
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

  const handleResizeStart = (e, colKey) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = colWidths[colKey] || 90;
    resizingRef.current = { colKey, startX, startWidth };

    const onMouseMove = (moveEvent) => {
      if (!resizingRef.current) return;
      const diff = moveEvent.clientX - resizingRef.current.startX;
      const newWidth = Math.max(40, resizingRef.current.startWidth + diff);
      setColWidths(prev => ({ ...prev, [resizingRef.current.colKey]: newWidth }));
    };

    const onMouseUp = () => {
      resizingRef.current = null;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
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
    <div
      className="excel-app"
      style={panelHeight ? { height: panelHeight, minHeight: 200 } : {}}
    >
      {/* HEADER */}
      <div style={{ padding: "72px 14px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800, color: "var(--ct-text)" }}>Excel Workbook</div>
          <div style={{ fontSize: 11, color: ui.color, fontWeight: 600 }}>{ui.label}  {rows.length} rows</div>
        </div>
      </div>

      {/* Top Bar (Google Sheets Style) */}
      <div className="excel-top-bar">
        <div className="excel-top-bar-left">
          {goBack && (
            <button type="button" className="excel-top-btn" onClick={goBack} title="Back">
              <ArrowLeft size={18} />
            </button>
          )}
          <button type="button" className="excel-top-btn" onClick={undo} disabled={!undoStack.length} title="Undo">
            <Undo2 size={18} />
          </button>
          <button type="button" className="excel-top-btn" onClick={redo} disabled={!redoStack.length} title="Redo">
            <Redo2 size={18} />
          </button>
        </div>
        <div className="excel-top-bar-right">
          {onExportExcel && (
            <button type="button" className="excel-top-btn" onClick={onExportExcel} title="Export">
              <Download size={18} />
            </button>
          )}
          {onImportExcel && (
            <>
              <button type="button" className="excel-top-btn" onClick={() => document.getElementById("excel-grid-import")?.click()} title="Import .xlsx">
                <Upload size={18} />
              </button>
              <input id="excel-grid-import" type="file" accept=".xlsx" style={{ display: "none" }} onChange={onImportExcel} />
            </>
          )}
          <button type="button" className="excel-top-btn" onClick={onRefresh} title="Reload">
            <RefreshCw size={18} />
          </button>
          <button type="button" className="excel-top-btn primary-save" onClick={saveAll} disabled={isSaving}>
            <Save size={16} style={{ marginRight: 4 }} /> {isSaving ? "..." : "Save"}
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
          style={{ padding: "0 4px", color: isListening ? "var(--ct-red)" : "var(--ct-muted)", border: "none", background: "transparent" }}
          title="Dictate"
        >
          <Mic size={16} style={{ animation: isListening ? "pulse 1.5s infinite" : "none" }} />
        </button>
        <button
          type="button"
          className="excel-tool-btn"
          onClick={() => setShowFaceScanner(active.row)}
          style={{ padding: "0 4px", color: "var(--ct-accent)", border: "none", background: "transparent" }}
          title="AI Scan Document/Face"
        >
          <Camera size={16} /> AI Scan
        </button>
        <span style={{ color: "var(--ct-muted)", fontSize: 13, fontWeight: 700, margin: "0 4px" }}>fx</span>
        <input
          className="excel-formula-input"
          value={activeKey === "photo" ? (formulaValue ? "(image)" : "") : formulaValue}
          disabled={activeKey === "photo"}
          onChange={(e) => setFormulaBar(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && e.target.blur()}
          placeholder="Enter text or formula"
        />
      </div>

      {/* Grid */}


      <div style={{ padding: "0 10px", marginBottom: 12 }}>
        <AISearchBar records={rows} onResults={(matched, q) => {
          if (matched.length > 0) {
            setFilterText(q); // For display
            // We set displayList based on AI search
            window._aiSearchResults = matched;
          }
        }} />
      </div>

      <div style={{ margin: "0 10px", display: "flex", gap: 8, alignItems: "center" }}>
        <Search size={14} color="var(--ct-muted)" />
        <input
          placeholder="Regular Text Search..."
          value={filterText}
          onChange={(e) => {
            setFilterText(e.target.value);
            window._aiSearchResults = null;
          }}
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
          <colgroup>
            <col style={{ width: 36, minWidth: 36 }} />
            <col style={{ width: 36, minWidth: 36 }} />
            {gridKeys.map(k => <col key={k} style={{ width: colWidths[k] || 90, minWidth: colWidths[k] || 90 }} />)}
          </colgroup>
          <thead>
            <tr>
              <th className="excel-corner" />
              <th className="excel-row-head" title="Select visible rows">
                <input
                  type="checkbox"
                  checked={displayList.length > 0 && displayList.every(({ index }) => selectedRows.has(index))}
                  onChange={selectAllRows}
                  style={{ width: 14, height: 14, cursor: "pointer" }}
                />
              </th>
              {gridKeys.map((k, ci) => (
                <th
                  key={k}
                  className={`excel-col-head ${sortCol === k ? "sorted" : ""}`}
                  style={{ position: "relative" }}
                >
                  <div onClick={() => sortByColumn(k)} style={{ cursor: "pointer", width: "100%", padding: "6px 4px" }} title="Click to sort">
                    <div>{colToLetter(ci)}</div>
                    <div style={{ fontSize: 10, opacity: 0.85 }}>{LABELS[k] || k}</div>
                    {sortCol === k && (sortDir === "asc" ? " " : " ")}
                  </div>
                  <div
                    onMouseDown={(e) => handleResizeStart(e, k)}
                    onTouchStart={(e) => handleResizeStart({ ...e, clientX: e.touches[0].clientX, preventDefault: () => e.preventDefault(), stopPropagation: () => e.stopPropagation() }, k)}
                    style={{
                      position: "absolute", right: 0, top: 0, bottom: 0, width: 8,
                      cursor: "col-resize", zIndex: 10, background: "transparent"
                    }}
                  />
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
                        <div style={{ display: "flex", gap: 4 }}>
                          {row.photo ? (
                            <img
                              src={row.photo}
                              style={{ width: 24, height: 24, objectFit: "cover", borderRadius: 4, cursor: "pointer" }}
                              onClick={(e) => { e.stopPropagation(); setImageViewerState(row.photo); }}
                            />
                          ) : (
                            <div style={{ width: 24, height: 24, background: "var(--ct-card2)", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 4 }}>
                              <User size={14} color="var(--ct-muted)" />
                            </div>
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
                          <option value=""></option>
                          {(k === "sex" ? ["Male", "Female", "Other"] : ["Active", "Arrested", "Acquitted", "Absconding", "Deceased"]).map((o) => (
                            <option key={o} value={o}>{o}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          value={row[k] || ""}
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
        <span>Duplicates: <strong style={{ color: duplicateIndices.size ? "var(--ct-red)" : "inherit" }}>{duplicateIndices.size}</strong></span>
        <span>Source: <strong style={{ color: ui.color }}>{ui.label}</strong></span>
      </div>

      {/* Bottom Bar (Google Sheets Style - Mobile tools) */}
      <div className="excel-bottom-bar">
        <button type="button" className="excel-tool-btn" onClick={copySelection} title="Ctrl+C"><Copy size={14} /> Copy</button>
        <button type="button" className="excel-tool-btn" onClick={pasteClipboard} title="Ctrl+V"><ClipboardPaste size={14} /> Paste</button>
        <button type="button" className="excel-tool-btn" onClick={cutSelection}><Scissors size={14} /> Cut</button>
        <div className="excel-divider" />
        <button type="button" className="excel-tool-btn" onClick={() => insertRow(active.row)}><ArrowDown size={14} /> Row Below</button>
        <button type="button" className="excel-tool-btn" onClick={() => insertRow(rows.length - 1)}><PlusCircle size={14} /> Row End</button>
        <button type="button" className="excel-tool-btn" onClick={() => insertRow(-1)}><ArrowUp size={14} /> Row Top</button>
        <button type="button" className="excel-tool-btn danger" onClick={deleteSelectedRows}><Trash2 size={14} /> Delete</button>
        <div className="excel-divider" />
        <button type="button" className="excel-tool-btn" onClick={() => sortCol && sortByColumn(sortCol)}><SortAsc size={14} /> Sort</button>
        <button type="button" className="excel-tool-btn" onClick={() => setFilterText("")}><Filter size={14} /> Filter</button>
        <div className="excel-divider" />
        <button type="button" className="excel-tool-btn" onClick={duplicateSelectedRows}><CopyPlus size={14} /> Duplicate</button>
        <div className="excel-divider" />
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
        <button type="button" className="excel-tool-btn danger" onClick={() => removeDupes("first")}>Remove dupes</button>
        <button type="button" className="excel-tool-btn" onClick={() => setShowDupOnly((v) => !v)}>
          {showDupOnly ? "Show all" : "Show duplicates"}
        </button>
      </div>

      {photoModalState && (
        <PhotoUploaderModal
          initialMode={photoModalState.mode}
          onClose={() => setPhotoModalState(null)}
          onPhotoCapture={(dataUrl) => {
            handleChange(photoModalState.rowIndex, "photo", dataUrl);
            setPhotoModalState(null);
          }}
          T={{ text: "var(--ct-text)", accent: ui.color || "var(--ct-accent)", card2: "var(--ct-card)", red: "var(--ct-red)" }}
          css={css}
        />
      )}

      {showFaceScanner !== null && (
        <DocumentScannerModal
          records={records}
          onClose={() => setShowFaceScanner(null)}
          onScanResult={(extractedData) => {
            setRowsHist(prev => {
              const next = [...prev];
              next[showFaceScanner] = { ...next[showFaceScanner], ...extractedData, isNew: false, updatedAt: new Date().toISOString() };
              return next;
            });
            setShowFaceScanner(null);
            toastShow?.("Data extracted and filled");
          }}
        />
      )}

      {imageViewerState && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.85)", zIndex: 10000,
          display: "flex", alignItems: "center", justifyContent: "center"
        }} onClick={() => setImageViewerState(null)}>
          <button
            style={{ position: "absolute", top: 16, right: 16, background: "var(--ct-card)", border: "1px solid var(--ct-glass-border)", borderRadius: 8, padding: 8, cursor: "pointer", color: "var(--ct-text)" }}
            onClick={(e) => { e.stopPropagation(); setImageViewerState(null); }}
          >
            <X size={24} />
          </button>
          <img src={imageViewerState} style={{ maxWidth: "90%", maxHeight: "90%", objectFit: "contain", borderRadius: 8, boxShadow: "0 10px 30px rgba(0,0,0,0.5)" }} onClick={(e) => e.stopPropagation()} />
        </div>
      )}
      {/* Panel Resize Handle */}
      <div
        title="Drag to resize panel"
        onMouseDown={(e) => {
          const el = e.currentTarget.parentElement;
          panelResizingRef.current = { startY: e.clientY, startH: el.getBoundingClientRect().height };
          e.preventDefault();
        }}
        onTouchStart={(e) => {
          const el = e.currentTarget.parentElement;
          panelResizingRef.current = { startY: e.touches[0].clientY, startH: el.getBoundingClientRect().height };
        }}
        style={{
          width: "100%", height: 10, cursor: "row-resize",
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "transparent", flexShrink: 0, userSelect: "none"
        }}
      >
        <div style={{ width: 40, height: 4, borderRadius: 2, background: "var(--ct-glass-border)", opacity: 0.75 }} />
      </div>
    </div>
  );
}
