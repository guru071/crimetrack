import { Database, Cloud, HardDrive, Loader } from "lucide-react";
import { SOURCE_UI } from "./dataSources";
import { isAppsScriptConfigured } from "./googleAppsScript";
import { sheetIdFromSettings } from "./googleSheetUtils";

const ICONS = {
  local: HardDrive,
  google: Cloud,
  database: Database,
};

export default function DataSourcePanel({
  activeSource,
  onSelectSource,
  onLoad,
  isLoading,
  settings,
  compact = false,
}) {
  const sources = ["local", "google", "database"];

  const canLoad = (id) => {
    if (id === "local") return true;
    if (id === "google") {
      return isAppsScriptConfigured(settings) || (
        !!sheetIdFromSettings(settings) && !!settings.googleApiKey?.trim()
      );
    }
    if (id === "database") return !!settings.dbApiUrl?.trim();
    return false;
  };

  return (
    <div style={{ ...(!compact ? { marginBottom: 16 } : {}) }}>
      {!compact && (
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ct-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>
          Data source (one at a time)
        </div>
      )}
      <div style={{ display: "flex", flexDirection: compact ? "column" : "row", gap: 8 }}>
        {sources.map((id) => {
          const ui = SOURCE_UI[id];
          const Icon = ICONS[id];
          const active = activeSource === id;
          const ready = canLoad(id);
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelectSource(id)}
              style={{
                flex: 1,
                padding: compact ? "12px" : "14px 12px",
                borderRadius: 14,
                border: `2px solid ${active ? ui.color : ui.border}`,
                background: active ? ui.bg : "var(--ct-glass-bg)",
                color: "var(--ct-text)",
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.2s ease",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Icon size={18} color={ui.color} />
                <span style={{ fontWeight: 700, fontSize: 13, color: active ? ui.color : "var(--ct-text)" }}>{ui.label}</span>
              </div>
              {!ready && id !== "local" && (
                <div style={{ fontSize: 10, color: "var(--ct-muted)", marginTop: 6 }}>Set up in Settings</div>
              )}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        disabled={isLoading || !canLoad(activeSource)}
        onClick={() => onLoad(activeSource)}
        style={{
          width: "100%",
          marginTop: 10,
          padding: "12px",
          borderRadius: 12,
          border: "none",
          background: SOURCE_UI[activeSource]?.color || "var(--ct-accent)",
          color: "#fff",
          fontWeight: 700,
          fontSize: 14,
          cursor: isLoading ? "wait" : "pointer",
          opacity: isLoading || !canLoad(activeSource) ? 0.55 : 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
        }}
      >
        {isLoading ? <Loader size={18} className="spin" /> : null}
        {isLoading ? "Loading" : `Load from ${SOURCE_UI[activeSource]?.label}`}
      </button>
    </div>
  );
}
