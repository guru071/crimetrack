import React, { useState, useRef } from "react";
import {
  Cloud, RefreshCw, CheckCircle, AlertTriangle, Loader, ChevronDown, ChevronUp, Download
} from "lucide-react";

const T = {
  bg:      "#07090f",
  surface: "#0d1117",
  card:    "#111827",
  card2:   "#161f2e",
  accent:  "#f59e0b",
  accentD: "#d97706",
  red:     "#ef4444",
  green:   "#10b981",
  purple:  "#8b5cf6",
  blue:    "#3b82f6",
  text:    "#f1f5f9",
  muted:   "#94a3b8",
  border:  "rgba(255,255,255,0.07)",
};

const css = {
  container: {
    padding: "72px 14px 80px",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  title: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 16,
    fontWeight: 700,
    color: T.accent,
  },
  card: {
    background: "rgba(15, 23, 42, 0.45)",
    backdropFilter: "blur(12px)",
    border: `1px solid rgba(255,255,255,0.08)`,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
  },
  statusCard: {
    background: T.card2,
    border: `1px solid ${T.border}`,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  btn: {
    background: "transparent",
    border: `1px solid ${T.border}`,
    borderRadius: 10,
    color: T.text,
    padding: "10px 16px",
    cursor: "pointer",
    fontFamily: "'Courier New',monospace",
    fontSize: 12,
    display: "flex",
    alignItems: "center",
    gap: 6,
    justifyContent: "center",
    transition: "all 0.2s ease",
  },
  btnAccent: {
    background: T.accent,
    border: "none",
    borderRadius: 10,
    color: "#000",
    padding: "10px 16px",
    cursor: "pointer",
    fontFamily: "'Courier New',monospace",
    fontSize: 12,
    fontWeight: 800,
    display: "flex",
    alignItems: "center",
    gap: 6,
    justifyContent: "center",
    transition: "all 0.2s ease",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 12,
    marginBottom: 16,
  },
  th: {
    background: T.card2,
    border: `1px solid ${T.border}`,
    padding: "10px 8px",
    textAlign: "left",
    fontWeight: 700,
    color: T.accent,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  td: {
    border: `1px solid ${T.border}`,
    padding: "10px 8px",
    color: T.text,
  },
  checkbox: {
    width: 18,
    height: 18,
    cursor: "pointer",
  },
  row: {
    background: T.card2,
  },
  rowHover: {
    background: T.card2 + "dd",
  },
  emptyState: {
    textAlign: "center",
    padding: "40px 20px",
    color: T.muted,
  },
  progressBar: {
    width: "100%",
    height: 4,
    background: T.border,
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    background: T.green,
    transition: "width 0.3s ease",
  },
};

const DETAIL_FIELDS = [
  ["fatherName", "Father's Name"],
  ["address", "Address"],
  ["age", "Age"],
  ["sex", "Sex"],
  ["communityReligion", "Community & Religion"],
  ["familyMembers", "Family Members"],
  ["propertiesDetails", "Properties Details"],
  ["policeStation", "Police Station / Jurisdiction"],
  ["hsNo", "H.S No."],
  ["firNumber", "FIR Number"],
  ["firDate", "FIR Date"],
  ["sessionNumber", "Session Number"],
  ["casesPending", "Cases Pending"],
  ["currentDoings", "Current Doings"],
  ["status", "Status"],
  ["caseYear", "Case Year"],
  ["hideouts", "Hideouts"],
  ["areaOfOperation", "Area of Operation"],
  ["gangLeader", "Name of Gang Leader"],
  ["associates", "Name of Associates"],
  ["notes", "Additional Notes"],
];

export default function GoogleSheetsView({ sheetsData, isLoading, lastSyncTime, onRefresh, onImportSelected, toastShow }) {
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const pullStartY = useRef(0);
  const containerRef = useRef(null);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(new Set(sheetsData.map(r => r.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectRow = (id) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleRowExpand = (id) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (onRefresh) {
        await onRefresh();
      }
      toastShow("Data refreshed", "success");
    } catch (err) {
      toastShow("Refresh failed", "danger");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleImport = async () => {
    if (selectedIds.size === 0) {
      toastShow("Please select at least one record", "warning");
      return;
    }
    const selected = sheetsData.filter(r => selectedIds.has(r.id));
    if (onImportSelected) {
      await onImportSelected(selected);
      setSelectedIds(new Set());
    }
  };

  const handlePullToRefresh = (e) => {
    if (e.type === "touchstart") {
      pullStartY.current = e.touches[0].clientY;
    } else if (e.type === "touchmove" && containerRef.current) {
      const pullDistance = e.touches[0].clientY - pullStartY.current;
      if (pullDistance > 100 && containerRef.current.scrollTop === 0) {
        handleRefresh();
        pullStartY.current = 0;
      }
    }
  };

  if (isLoading) {
    return (
      <div style={css.container}>
        <div style={css.emptyState}>
          <Loader size={32} color={T.accent} style={{ margin: "20px auto", animation: "spin 1s linear infinite" }} />
          <div style={{ marginTop: 12, color: T.muted }}>Loading Google Sheets data...</div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={css.container}
      ref={containerRef}
      onTouchStart={handlePullToRefresh}
      onTouchMove={handlePullToRefresh}
    >
      {/* Header */}
      <div style={css.header}>
        <div style={css.title}>
          <Cloud size={18} />
          View from Google Sheets
        </div>
        <button
          style={css.btn}
          onClick={handleRefresh}
          disabled={isRefreshing}
          title="Refresh data from Google Sheets"
        >
          <RefreshCw size={14} style={{ animation: isRefreshing ? "spin 1s linear infinite" : "none" }} />
        </button>
      </div>

      {/* Status Card */}
      {lastSyncTime && (
        <div style={css.statusCard}>
          <CheckCircle size={16} color={T.green} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: T.muted, textTransform: "uppercase" }}>Last Sync</div>
            <div style={{ fontSize: 12, color: T.text, fontWeight: 600 }}>
              {new Date(lastSyncTime).toLocaleString()}
            </div>
          </div>
        </div>
      )}

      {sheetsData.length === 0 ? (
        <div style={css.emptyState}>
          <AlertTriangle size={32} color={T.muted} style={{ margin: "20px auto" }} />
          <div style={{ marginTop: 12 }}>No data from Google Sheets yet</div>
          <div style={{ fontSize: 11, marginTop: 8 }}>Click the refresh button to sync your first data</div>
        </div>
      ) : (
        <>
          {/* Selection Actions */}
          <div style={{ ...css.card, marginBottom: 12 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10 }}>
              <input
                type="checkbox"
                style={css.checkbox}
                checked={selectedIds.size === sheetsData.length && sheetsData.length > 0}
                onChange={handleSelectAll}
                title="Select all records"
              />
              <span style={{ fontSize: 12, color: T.muted }}>
                {selectedIds.size} of {sheetsData.length} selected
              </span>
            </div>
            {selectedIds.size > 0 && (
              <button style={css.btnAccent} onClick={handleImport}>
                <Download size={14} />
                Import {selectedIds.size} Record{selectedIds.size !== 1 ? "s" : ""}
              </button>
            )}
          </div>

          {/* Data Table */}
          <div style={{ overflowX: "auto", marginBottom: 16 }}>
            <table style={css.table}>
              <thead>
                <tr>
                  <th style={css.th}>
                    <input
                      type="checkbox"
                      style={css.checkbox}
                      checked={selectedIds.size === sheetsData.length && sheetsData.length > 0}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th style={css.th}>Name</th>
                  <th style={css.th}>Status</th>
                  <th style={css.th}>Police Station</th>
                  <th style={css.th}>HS No.</th>
                  <th style={css.th}>Details</th>
                </tr>
              </thead>
              <tbody>
                {sheetsData.map((record) => (
                  <React.Fragment key={record.id}>
                    <tr style={css.row}>
                      <td style={css.td}>
                        <input
                          type="checkbox"
                          style={css.checkbox}
                          checked={selectedIds.has(record.id)}
                          onChange={() => handleSelectRow(record.id)}
                        />
                      </td>
                      <td style={{ cursor: "pointer", ...css.td }} onClick={() => toggleRowExpand(record.id)}>
                        <strong>{record.name || "—"}</strong>
                      </td>
                      <td style={css.td}>
                        <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 10, background: T.card, color: T.accent }}>
                          {record.status || "—"}
                        </span>
                      </td>
                      <td style={css.td}>{record.policeStation || "—"}</td>
                      <td style={css.td}>{record.hsNo || "—"}</td>
                      <td style={css.td}>
                        <button
                          style={{ background: "none", border: "none", cursor: "pointer", color: T.accent }}
                          onClick={() => toggleRowExpand(record.id)}
                          title="Show details"
                        >
                          {expandedRows.has(record.id) ? (
                            <ChevronUp size={14} />
                          ) : (
                            <ChevronDown size={14} />
                          )}
                        </button>
                      </td>
                    </tr>
                    {expandedRows.has(record.id) && (
                      <tr style={{ background: T.card2 + "55", borderBottom: `1px solid ${T.border}` }}>
                        <td colSpan="6" style={{ ...css.td, padding: 12 }}>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, fontSize: 11 }}>
                            {DETAIL_FIELDS.map(([key, label]) => {
                              const value = record[key];
                              if (!value) return null;
                              const wide = ["address", "familyMembers", "propertiesDetails", "casesPending", "currentDoings", "hideouts", "associates", "notes"].includes(key);
                              return (
                                <div key={key} style={wide ? { gridColumn: "1 / -1" } : undefined}>
                                  <div style={{ color: T.muted, textTransform: "uppercase", fontSize: 10 }}>{label}</div>
                                  <div style={{ color: T.text, marginTop: 2, whiteSpace: "pre-wrap" }}>{String(value)}</div>
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary */}
          <div style={{ ...css.card, textAlign: "center", color: T.muted, fontSize: 11 }}>
            Showing {sheetsData.length} record{sheetsData.length !== 1 ? "s" : ""} from Google Sheets
          </div>
        </>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
