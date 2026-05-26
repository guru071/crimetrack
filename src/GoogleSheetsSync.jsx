import { useState, useEffect } from "react";
import {
  X, Cloud, CheckCircle, AlertTriangle, Loader, ExternalLink
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
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.7)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: 20,
  },
  modal: {
    background: T.card,
    border: `1px solid ${T.border}`,
    borderRadius: 16,
    padding: 24,
    maxWidth: 420,
    width: "100%",
    maxHeight: "90vh",
    overflowY: "auto",
    backdropFilter: "blur(12px)",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
    color: T.accent,
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  closeBtn: {
    background: "none",
    border: "none",
    color: T.muted,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
  },
  section: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 11,
    color: T.accent,
    textTransform: "uppercase",
    letterSpacing: "0.12em",
    marginBottom: 12,
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  card: {
    background: T.card2,
    border: `1px solid ${T.border}`,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  input: {
    background: T.card2,
    border: `1px solid ${T.border}`,
    borderRadius: 8,
    color: T.text,
    padding: "10px 12px",
    fontFamily: "'Courier New',monospace",
    fontSize: 13,
    width: "100%",
    boxSizing: "border-box",
    outline: "none",
    marginBottom: 10,
  },
  label: {
    fontSize: 11,
    color: T.muted,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    marginBottom: 6,
    display: "block",
  },
  btn: {
    background: "transparent",
    border: `1px solid ${T.border}`,
    borderRadius: 10,
    color: T.text,
    padding: "10px 16px",
    cursor: "pointer",
    fontFamily: "'Courier New',monospace",
    fontSize: 13,
    display: "flex",
    alignItems: "center",
    gap: 6,
    justifyContent: "center",
    transition: "all 0.2s ease",
    width: "100%",
  },
  btnAccent: {
    background: T.accent,
    border: "none",
    borderRadius: 10,
    color: "#000",
    padding: "12px 16px",
    cursor: "pointer",
    fontFamily: "'Courier New',monospace",
    fontSize: 13,
    fontWeight: 800,
    display: "flex",
    alignItems: "center",
    gap: 6,
    justifyContent: "center",
    transition: "all 0.2s ease",
    width: "100%",
    boxShadow: `0 0 15px ${T.accent}66`,
  },
  syncOption: {
    padding: 10,
    borderRadius: 8,
    border: `1px solid ${T.border}`,
    marginBottom: 8,
    cursor: "pointer",
    transition: "all 0.2s",
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  syncOptionActive: {
    background: T.accent + "22",
    borderColor: T.accent,
  },
  radio: {
    width: 16,
    height: 16,
    borderRadius: "50%",
    border: `2px solid ${T.border}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  radioChecked: {
    borderColor: T.accent,
    background: T.accent,
  },
  status: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: 12,
    background: T.card2,
    borderRadius: 8,
    marginBottom: 12,
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
  divider: {
    height: 1,
    background: T.border,
    margin: "16px 0",
  },
};

export default function GoogleSheetsSync({ isOpen, onClose, isAuthenticated, authEmail, sheetsId, recordCount, onSync, onAuthClick, onDisconnect, isSyncing, syncMode, setSyncMode, toastShow }) {
  const [previewExpanded, setPreviewExpanded] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);

  useEffect(() => {
    if (isSyncing) {
      const interval = setInterval(() => {
        setSyncProgress(p => Math.min(p + Math.random() * 30, 95));
      }, 200);
      return () => clearInterval(interval);
    } else {
      setSyncProgress(0);
    }
  }, [isSyncing]);

  if (!isOpen) return null;

  const handleSyncClick = async () => {
    if (!isAuthenticated) {
      toastShow("Please authenticate with Google first", "warning");
      return;
    }
    if (onSync) {
      await onSync(syncMode);
      setSyncProgress(100);
      setTimeout(() => setSyncProgress(0), 1000);
    }
  };

  return (
    <div style={css.overlay}>
      <div style={css.modal}>
        {/* Header */}
        <div style={css.header}>
          <div style={css.title}>
            <Cloud size={20} />
            Sheets Sync
          </div>
          <button style={css.closeBtn} onClick={onClose} title="Close">
            <X size={20} />
          </button>
        </div>

        {/* Authentication Status */}
        <div style={css.section}>
          <div style={css.sectionLabel}>
            <AlertTriangle size={12} />
            Authentication
          </div>
          {isAuthenticated ? (
            <div style={{ ...css.card, borderColor: T.green + "44", background: T.green + "11" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <CheckCircle size={16} color={T.green} />
                <span style={{ fontSize: 12, color: T.green, fontWeight: 600 }}>Connected</span>
              </div>
              <div style={{ fontSize: 12, color: T.text, marginBottom: 10 }}>
                <strong>Account:</strong> {authEmail || "Authenticated"}
              </div>
              <button style={{ ...css.btn, fontSize: 11, borderColor: T.red + "44", color: T.red }} onClick={onDisconnect}>
                Disconnect Google Account
              </button>
            </div>
          ) : (
            <div style={{ ...css.card, borderColor: T.red + "44", background: T.red + "11" }}>
              <div style={{ fontSize: 12, color: T.red, marginBottom: 10, fontWeight: 600 }}>Not authenticated</div>
              <button style={css.btnAccent} onClick={onAuthClick}>
                <Cloud size={14} />
                Authenticate with Google
              </button>
            </div>
          )}
        </div>

        {isAuthenticated && (
          <>
            {/* Sheet link */}
            <div style={css.section}>
              <div style={css.sectionLabel}>Sheet Configuration</div>
              <label style={css.label}>Google Sheet link</label>
              <div style={{ ...css.card, fontSize: 11, color: T.muted, wordBreak: "break-all", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ flex: 1 }}>{sheetsId || "Not configured"}</span>
                {sheetsId && (
                  <a href={sheetsId.startsWith("http") ? sheetsId : `https://docs.google.com/spreadsheets/d/${sheetsId}/edit`} target="_blank" rel="noopener noreferrer" style={{ color: T.accent, display: "flex" }}>
                    <ExternalLink size={14} />
                  </a>
                )}
              </div>
            </div>

            {/* Sync Options */}
            <div style={css.section}>
              <div style={css.sectionLabel}>Sync Mode</div>
              {[
                { id: "append", label: "Append New Records", desc: "Add records to existing data" },
                { id: "replace", label: "Replace All Data", desc: "Replace entire sheet content" },
              ].map(opt => (
                <div
                  key={opt.id}
                  style={{ ...css.syncOption, ...(syncMode === opt.id ? css.syncOptionActive : {}) }}
                  onClick={() => setSyncMode(opt.id)}
                >
                  <div style={{ ...css.radio, ...(syncMode === opt.id ? css.radioChecked : {}) }}>
                    {syncMode === opt.id && <div style={{ width: 6, height: 6, background: "#000", borderRadius: "50%" }} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{opt.label}</div>
                    <div style={{ fontSize: 10, color: T.muted, marginTop: 2 }}>{opt.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Preview */}
            <div style={css.section}>
              <button
                style={{ ...css.btn, justifyContent: "space-between" }}
                onClick={() => setPreviewExpanded(!previewExpanded)}
              >
                <span>Preview ({recordCount} records)</span>
                <span style={{ transform: previewExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}></span>
              </button>
              {previewExpanded && (
                <div style={{ ...css.card, marginTop: 8, fontSize: 11, color: T.muted, maxHeight: 150, overflow: "auto" }}>
                  <div style={{ color: T.accent, fontWeight: 600, marginBottom: 8 }}>
                    Records to sync: {recordCount}
                  </div>
                  <div style={{ fontSize: 10, lineHeight: 1.6 }}>
                    {syncMode === "replace"
                      ? " This will replace all data in your Google Sheet with the local database."
                      : " New records will be appended to your existing Google Sheet."}
                  </div>
                </div>
              )}
            </div>

            <div style={css.divider} />

            {/* Progress */}
            {isSyncing && (
              <div style={css.section}>
                <div style={css.sectionLabel}>
                  <Loader size={12} style={{ animation: "spin 1s linear infinite" }} />
                  Syncing...
                </div>
                <div style={css.progressBar}>
                  <div style={{ ...css.progressFill, width: `${syncProgress}%` }} />
                </div>
                <div style={{ fontSize: 10, color: T.muted, textAlign: "center" }}>
                  {Math.round(syncProgress)}%
                </div>
              </div>
            )}

            {/* Sync Button */}
            <button
              style={{ ...css.btnAccent, opacity: isSyncing ? 0.6 : 1 }}
              onClick={handleSyncClick}
              disabled={isSyncing}
            >
              {isSyncing ? (
                <>
                  <Loader size={14} style={{ animation: "spin 1s linear infinite" }} />
                  Syncing...
                </>
              ) : (
                <>
                  <Cloud size={14} />
                  Sync Now ({recordCount} records)
                </>
              )}
            </button>
          </>
        )}

        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}
