import { useState, useEffect, useRef } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import {
  Home, ClipboardList, PlusCircle, BarChart3, Search, X, Settings,
  AlertTriangle, Shield, User, Save, Share2, FileText, Trash2,
  ChevronRight, DownloadCloud, UploadCloud, FolderOpen, Activity, Lock, Users, Info, ScanFace, Camera, Mic, GitCompare, Cloud, Bell, Wifi, WifiOff, Database
} from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { App as CapApp } from "@capacitor/app";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { Capacitor } from "@capacitor/core";
import { NativeBiometric } from "@capgo/capacitor-native-biometric";
import JSZip from "jszip";
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Human } from '@vladmandic/human';
import CryptoJS from "crypto-js";
import ExcelJS from 'exceljs';
import nlp from 'compromise';
import GoogleSheetsSync from './GoogleSheetsSync';
import GoogleSheetsView from './GoogleSheetsView';
import { getTimeBasedTheme, themeToCssVars } from './TimeBasedTheme';
import { parseGoogleSheetInput, sheetIdFromSettings, sheetLinkFromSettings } from './googleSheetUtils';
import {
  EXCEL_COLUMNS, recordToExcelRow, embedPhotoInSheet, buildExcelImageMap,
} from './excelUtils';
import {
  SOURCE_UI, loadRecordsForSource, saveRecordsForSource, isGoogleSheetsConfigured, sendAuditLog
} from './dataSources';
import { isAppsScriptConfigured } from './googleAppsScript';
import DataSourcePanel from './DataSourcePanel';
import ExcelSpreadsheet from './ExcelSpreadsheet';
import {
  CHART_COLORS,
  CHART_TOOLTIP_PROPS,
  ChartLegendList,
  AXIS_TICK,
  GRID_STROKE,
  sliceColor,
  SEX_SLICE_COLORS,
} from './chartTheme';
import { auditLog, calculateRiskScore, getHotspots, compressImage } from './AdvancedUtils';
import { AdvancedAnalyticsDashboard } from './AdvancedAnalytics';

function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);
  return isOnline;
}

const SECRET_KEY = "crimetrack-aes-256-military-grade-key";

const encryptData = (data) => CryptoJS.AES.encrypt(JSON.stringify(data), SECRET_KEY).toString();
const decryptData = (ciphertext) => {
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET_KEY);
    return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
  } catch (e) { return []; }
};

const getThreatLevel = (r) => {
  if (!r) return { level: "UNKNOWN", color: T.muted };
  const cases = Number(r.casesPending || 0);
  const gangLeader = !!r.gangLeader?.trim();
  const hsNo = !!r.hsNo?.trim();

  if (gangLeader && cases > 2) return { level: "EXTREME", color: "#991b1b", text: "#fca5a5" };
  if (hsNo || cases > 5 || gangLeader) return { level: "HIGH", color: "#ef4444", text: "#fecaca" };
  if (cases > 1) return { level: "MEDIUM", color: "#f59e0b", text: "#fef3c7" };
  return { level: "LOW", color: "#10b981", text: "#d1fae5" };
};
const humanConfig = {
  modelBasePath: '/models',
  face: {
    enabled: true,
    detector: { return: true, rotation: true },
    iris: { enabled: false },
    mesh: { enabled: false },
    emotion: { enabled: false },
    description: { enabled: true }
  },
  body: { enabled: false },
  hand: { enabled: false },
  object: { enabled: false }
};
const human = new Human(humanConfig);

/* ─── Constants ─────────────────────────────────────────────── */
const FIELDS = [
  { key: "name", label: "Name of Accused", type: "text", required: true },
  { key: "fatherName", label: "Father's Name", type: "text" },
  { key: "address", label: "Address", type: "textarea" },
  { key: "age", label: "Age", type: "number" },
  { key: "sex", label: "Sex", type: "select", opts: ["Male", "Female", "Other"] },
  { key: "communityReligion", label: "Community & Religion", type: "text" },
  { key: "familyMembers", label: "Family Members", type: "textarea" },
  { key: "propertiesDetails", label: "Properties Details", type: "textarea" },
  { key: "policeStation", label: "Police Station / Jurisdiction", type: "text" },
  { key: "hsNo", label: "H.S No.", type: "text" },
  { key: "firNumber", label: "FIR Number", type: "text" },
  { key: "firDate", label: "FIR Date", type: "date" },
  { key: "sessionNumber", label: "Session Number", type: "text" },
  { key: "casesPending", label: "Cases Pending", type: "textarea" },
  { key: "currentDoings", label: "Current Doings", type: "text" },
  { key: "hideouts", label: "Hideouts", type: "textarea" },
  { key: "areaOfOperation", label: "Area of Operation", type: "text" },
  { key: "gangLeader", label: "Name of Gang Leader", type: "text" },
  { key: "associates", label: "Name of Associates", type: "textarea" },
  { key: "status", label: "Status", type: "select", opts: ["Active", "Arrested", "Acquitted", "Absconding", "Deceased"] },
  { key: "caseYear", label: "Case Year", type: "number" },
  { key: "notes", label: "Additional Notes", type: "textarea" },
];

const STATUS_CFG = {
  Active: { bg: "#7f1d1d", color: "#fca5a5", dot: "#ef4444" },
  Arrested: { bg: "#78350f", color: "#fcd34d", dot: "#f59e0b" },
  Acquitted: { bg: "#064e3b", color: "#6ee7b7", dot: "#10b981" },
  Absconding: { bg: "#4c1d95", color: "#c4b5fd", dot: "#8b5cf6" },
  Deceased: { bg: "#1f2937", color: "#9ca3af", dot: "#6b7280" },
};


/* ─── Styles (CSS variables set on app root from sunrise/sunset theme) ── */
const T = {
  bg: "var(--ct-bg)",
  surface: "var(--ct-surface)",
  card: "var(--ct-card)",
  card2: "var(--ct-input-bg)",
  accent: "var(--ct-accent)",
  accentD: "var(--ct-accent-light)",
  accentFg: "var(--ct-accent-fg)",
  red: "var(--ct-red)",
  green: "var(--ct-green)",
  purple: "var(--ct-purple)",
  blue: "var(--ct-blue)",
  text: "var(--ct-text)",
  muted: "var(--ct-muted)",
  border: "var(--ct-border)",
  borderM: "var(--ct-border-m)",
};

const glassSurface = {
  background: "var(--ct-glass-bg)",
  backdropFilter: "blur(var(--ct-glass-blur)) saturate(1.35)",
  WebkitBackdropFilter: "blur(var(--ct-glass-blur)) saturate(1.35)",
  border: "1px solid var(--ct-glass-border)",
  boxShadow: "var(--ct-glass-shadow)",
  color: "var(--ct-text)",
};

const css = {
  page: { minHeight: "100vh", color: "var(--ct-text)", paddingBottom: 80 },
  header: { position: "fixed", top: 0, left: 0, right: 0, height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", zIndex: 100, transition: "all 0.5s ease" },
  bottomNav: { position: "fixed", bottom: 0, left: 0, right: 0, height: 68, display: "flex", alignItems: "center", zIndex: 100, transition: "all 0.5s ease" },
  card: { ...glassSurface, borderRadius: 20, padding: "18px", marginBottom: 14 },
  statCard: { ...glassSurface, borderRadius: 20, padding: "20px 18px", flex: 1 },
  btn: { ...glassSurface, background: "var(--ct-glass-bg)", borderRadius: 12, padding: "10px 16px", cursor: "pointer", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 8, justifyContent: "center", transition: "all 0.2s ease" },
  btnAccent: { background: "var(--ct-accent)", border: "1px solid color-mix(in srgb, var(--ct-accent) 80%, white)", borderRadius: 12, color: "var(--ct-accent-fg)", padding: "12px 20px", cursor: "pointer", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 8, justifyContent: "center", transition: "all 0.2s ease", boxShadow: "0 4px 24px color-mix(in srgb, var(--ct-accent) 45%, transparent), inset 0 1px 0 rgba(255,255,255,0.25)" },
  input: { background: "var(--ct-input-bg)", border: "1px solid var(--ct-glass-border)", borderRadius: 12, color: "var(--ct-text)", padding: "12px 14px", fontSize: 14, width: "100%", boxSizing: "border-box", outline: "none", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" },
  label: { fontSize: 11, color: "var(--ct-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6, fontWeight: 600 },
  sectionTitle: { fontSize: 12, color: "var(--ct-accent)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 12, fontWeight: 700, textShadow: "var(--ct-text-shadow)" },
  tag: (status) => ({ display: "inline-flex", alignItems: "center", gap: 5, background: STATUS_CFG[status]?.bg || "var(--ct-input-bg)", color: STATUS_CFG[status]?.color || "var(--ct-text)", fontSize: 11, padding: "4px 10px", borderRadius: 999, fontWeight: 600, border: "1px solid rgba(255,255,255,0.12)" }),
  divider: { height: 1, background: "var(--ct-glass-border)", margin: "16px 0", opacity: 0.8 },
};

/* ─── Utilities ──────────────────────────────────────────────── */
const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const initials = (name) => (name || "??").split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
const avatarColor = (name) => {
  const colors = ["#f59e0b", "#3b82f6", "#10b981", "#8b5cf6", "#ef4444", "#06b6d4"];
  let h = 0; for (let c of (name || "")) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff;
  return colors[Math.abs(h) % colors.length];
};

/* ─── Sub-components ─────────────────────────────────────────── */
function StatusDot({ status }) {
  return <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: "50%", background: STATUS_CFG[status]?.dot || T.muted }} />;
}

function Avatar({ record, size = 42 }) {
  if (record?.photo) return <img src={record.photo} alt="avatar" style={{ width: size, height: size, borderRadius: size / 2, objectFit: "cover", border: `2px solid ${T.border}` }} />;
  const ac = avatarColor(record?.name);
  return (
    <div style={{ width: size, height: size, borderRadius: size / 2, background: ac + "22", border: `2px solid ${ac}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.35, fontWeight: 700, color: ac }}>
      {initials(record?.name)}
    </div>
  );
}

function Toast({ msg, type }) {
  const bg = type === "danger" ? "#7f1d1d" : type === "warning" ? "#78350f" : "#064e3b";
  const col = type === "danger" ? "#fca5a5" : type === "warning" ? "#fcd34d" : "#6ee7b7";
  return (
    <div style={{ position: "fixed", bottom: 88, left: "50%", transform: "translateX(-50%)", background: bg, color: col, padding: "12px 22px", borderRadius: 14, fontSize: 13, fontWeight: 600, zIndex: 999, border: `1px solid ${col}44`, boxShadow: "0 8px 32px rgba(0,0,0,0.4)", backdropFilter: "blur(16px)", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 8 }}>
      <AlertTriangle size={16} /> {msg}
    </div>
  );
}

/* Inject mic pulse animation */
if (typeof document !== "undefined" && !document.getElementById("mic-pulse-style")) {
  const s = document.createElement("style");
  s.id = "mic-pulse-style";
  s.textContent = `
    @keyframes micPulse {
      0%   { box-shadow: 0 0 0 0 rgba(239,68,68,0.7); transform: scale(1); }
      50%  { box-shadow: 0 0 0 16px rgba(239,68,68,0); transform: scale(1.1); }
      100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); transform: scale(1); }
    }
    .mic-active { animation: micPulse 1s ease-in-out infinite !important; }
  `;
  document.head.appendChild(s);
}

function ConfirmDialog({ msg, onConfirm, onCancel }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 500, padding: 20 }}>
      <div style={{ ...css.card, maxWidth: 320, width: "100%", textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}><AlertTriangle size={32} color={T.accent} /></div>
        <div style={{ marginBottom: 18, fontSize: 14, color: T.muted }}>{msg}</div>
        <div style={{ display: "flex", gap: 10 }}>
          <button style={{ ...css.btn, flex: 1 }} onClick={onCancel}>Cancel</button>
          <button style={{ ...css.btnAccent, flex: 1, background: T.red, color: "#fff" }} onClick={onConfirm}>Confirm</button>
        </div>
      </div>
    </div>
  );
}

function Header({ view, goBack, navStack, title, timeTheme, isOnline, navigate }) {
  const hasBack = navStack.length > 0 && view !== "dashboard";
  return (
    <div className="ct-glass-header" style={css.header}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {hasBack
          ? <button type="button" className="ct-glass-btn" onClick={goBack} style={{ ...css.btn, padding: "8px 12px" }}>
            <ChevronRight size={18} style={{ transform: "rotate(180deg)" }} /> Back
          </button>
          : <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Shield size={22} color={timeTheme?.accentColor} />
            <span className="ct-title" style={{ fontWeight: 800, color: "var(--ct-text)", fontSize: 15, letterSpacing: "-0.02em" }}>CrimeTrack</span>
          </div>
        }
      </div>
      {title && <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ct-text)", position: "absolute", left: "50%", transform: "translateX(-50%)", textShadow: "var(--ct-text-shadow)" }}>{title}</div>}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {timeTheme?.label && <span className="ct-period-pill">{timeTheme.label}</span>}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginRight: 4 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: isOnline ? "#22c55e" : "#ef4444", boxShadow: isOnline ? "0 0 8px rgba(34, 197, 94, 0.6)" : "0 0 8px rgba(239, 68, 68, 0.6)" }}></div>
          <span style={{ fontSize: 11, fontWeight: 700, color: isOnline ? "#22c55e" : "#ef4444" }}>{isOnline ? "LIVE" : "OFFLINE"}</span>
        </div>
        <button onClick={() => navigate && navigate("notifications")} style={{ background: "transparent", border: "none", cursor: "pointer", display: "flex", color: T.text, position: "relative" }}>
          <Bell size={18} />
          <span style={{ position: "absolute", top: -2, right: -2, width: 8, height: 8, background: T.red, borderRadius: "50%" }} />
        </button>
      </div>
    </div>
  );
}

function BottomNav({ view, navTo, navigate, onImportExcel, isGoogleSheetsAuthenticated }) {
  const [showAddSheet, setShowAddSheet] = useState(false);
  const importRef = useRef();

  const tabs = [
    { id: "dashboard", icon: <Home size={20} />, label: "Home" },
    { id: "list", icon: <ClipboardList size={20} />, label: "Records" },
    { id: "__add__", icon: <PlusCircle size={28} />, label: "Add", isAdd: true },
    { id: "about", icon: <Info size={20} />, label: "Info" },
    ...(isGoogleSheetsAuthenticated ? [{ id: "sheets", icon: <Cloud size={20} />, label: "Sheets" }] : []),
    { id: "settings", icon: <Settings size={20} />, label: "Settings" },
  ];

  return (
    <>
      {/* Add Options Bottom Sheet (Removed, direct to form now) */}
      <div className="ct-glass-nav" style={css.bottomNav}>
        {tabs.map(t => {
          const active = view === t.id;
          const tabColor = t.isAdd || active ? "var(--ct-accent)" : "var(--ct-muted)";
          return (
            <button key={t.id} type="button"
              onClick={t.isAdd ? () => navigate("form", { record: null }) : () => navTo(t.id)}
              style={{ flex: 1, background: "transparent", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "10px 4px" }}>
              <span style={{
                color: tabColor,
                ...(t.isAdd ? {
                  background: "var(--ct-accent)",
                  color: "var(--ct-accent-fg)",
                  borderRadius: "50%",
                  padding: 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 16px color-mix(in srgb, var(--ct-accent) 50%, transparent)",
                } : active ? {
                  background: "color-mix(in srgb, var(--ct-accent) 22%, transparent)",
                  borderRadius: 12,
                  padding: 6,
                  display: "flex",
                } : { display: "flex", padding: 6 }),
              }}>{t.icon}</span>
              <span style={{ fontSize: 10, color: tabColor, fontWeight: (active || t.isAdd) ? 700 : 500 }}>{t.label}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}


/* ─── Dashboard ──────────────────────────────────────────────── */
function Dashboard({ records, navigate, getAnalytics, onExport, onImport, onExportExcel, onImportExcel, activeDataSource, settings, onLoadSource, sourceLoading, onSelectSource }) {
  const analytics = getAnalytics();
  const total = records.length;
  const active = records.filter(r => r.status === "Active").length;
  const arrested = records.filter(r => r.status === "Arrested").length;
  const absconding = records.filter(r => r.status === "Absconding").length;
  const recent = [...records].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);

  return (
    <div style={{ padding: "72px 14px 14px" }}>
      {/* Hero */}
      <div style={{ marginBottom: 18, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div className="ct-muted" style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 600 }}>Local Database</div>
          <div className="ct-title" style={{ fontSize: 26, fontWeight: 800, color: "var(--ct-text)", marginTop: 4, letterSpacing: "-0.03em" }}>Accused Records</div>
          <div className="ct-muted" style={{ fontSize: 13, marginTop: 4 }}>{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}</div>
        </div>
      </div>
      {/* Automated Alert Center */}
      {(() => {
        const alerts = records
          .filter(r => r.status === "Active" || getThreatLevel(r).level === "EXTREME" || getThreatLevel(r).level === "HIGH")
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 3)
          .map(r => `⚠️ ${r.name} (${r.areaOfOperation || "Unknown Area"}) - ${getThreatLevel(r).level} Threat`);

        if (alerts.length === 0) return null;
        return (
          <div style={{ ...css.card, padding: "8px 12px", marginBottom: 16, borderColor: "color-mix(in srgb, var(--ct-red) 35%, transparent)", background: "color-mix(in srgb, var(--ct-red) 12%, transparent)", display: "flex", alignItems: "center", gap: 10, overflow: "hidden" }}>
            <AlertTriangle size={16} color={T.red} style={{ flexShrink: 0 }} />
            <div style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden" }}>
              <marquee scrollamount="4" style={{ fontSize: 13, color: T.red, fontWeight: 600 }}>
                {alerts.join("   |   ")}
              </marquee>
            </div>
          </div>
        );
      })()}

      {/* System Status / Connection Hub */}
      <div style={{ ...css.card, marginBottom: 16 }}>
        <div style={css.sectionTitle}>▸ Connection Hub</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          <div style={{ background: T.card2, padding: "10px", borderRadius: 12, border: `1px solid ${T.border}`, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <Save size={18} color={T.green} />
            <span style={{ fontSize: 10, color: T.muted, textTransform: "uppercase" }}>Local DB</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: T.green }}>Connected</span>
          </div>
          <div style={{ background: T.card2, padding: "10px", borderRadius: 12, border: `1px solid ${T.border}`, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <Cloud size={18} color={isGoogleSheetsConfigured(settings) ? T.blue : T.muted} />
            <span style={{ fontSize: 10, color: T.muted, textTransform: "uppercase" }}>Google</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: isGoogleSheetsConfigured(settings) ? T.blue : T.muted }}>
              {isGoogleSheetsConfigured(settings) ? "Connected" : "Not Config"}
            </span>
          </div>
          <div style={{ background: T.card2, padding: "10px", borderRadius: 12, border: `1px solid ${T.border}`, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <Database size={18} color={settings.enableDbSync ? T.purple : T.muted} />
            <span style={{ fontSize: 10, color: T.muted, textTransform: "uppercase" }}>Master API</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: settings.enableDbSync ? T.purple : T.muted }}>
              {settings.enableDbSync ? "Connected" : "Not Config"}
            </span>
          </div>
        </div>
      </div>

      {/* Data source: local | Google Sheets | Database */}
      <div style={{ ...css.card, marginBottom: 16, borderColor: SOURCE_UI[activeDataSource]?.border, background: SOURCE_UI[activeDataSource]?.bg }}>
        <DataSourcePanel
          activeSource={activeDataSource}
          onSelectSource={onSelectSource}
          onLoad={onLoadSource}
          isLoading={sourceLoading}
          settings={settings}
        />
        <div style={{ fontSize: 11, color: "var(--ct-muted)", marginTop: 8 }}>
          Active: <strong style={{ color: SOURCE_UI[activeDataSource]?.color }}>{SOURCE_UI[activeDataSource]?.label}</strong>
          {" · "}{records.length} records
        </div>
        <button
          style={{ ...css.btn, width: "100%", marginTop: 10, borderColor: "#f472b6", color: "#f472b6" }}
          onClick={() => navigate("grid")}
        >
          <FileText size={14} /> Open Excel workbook
        </button>
      </div>

      {/* Offline Tools */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <button style={{ ...css.btn, flex: 1, fontSize: 11 }} onClick={onExport}><DownloadCloud size={14} /> Backup ZIP</button>
        <button style={{ ...css.btn, flex: 1, fontSize: 11 }} onClick={() => document.getElementById('import-file').click()}><UploadCloud size={14} /> Restore ZIP</button>
        <input id="import-file" type="file" accept=".json,.zip" style={{ display: "none" }} onChange={onImport} />
      </div>

      {/* Excel Tools */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <button style={{ ...css.btn, flex: 1, fontSize: 11, borderColor: SOURCE_UI[activeDataSource]?.color, color: SOURCE_UI[activeDataSource]?.color }} onClick={() => navigate("grid")}>
          <FileText size={14} /> Excel workbook
        </button>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <button style={{ ...css.btn, flex: 1, fontSize: 11, borderColor: "#10b981", color: "#10b981" }} onClick={onExportExcel}><DownloadCloud size={14} /> Export Excel</button>
        <button style={{ ...css.btn, flex: 1, fontSize: 11, borderColor: "#10b981", color: "#10b981" }} onClick={() => document.getElementById('import-excel').click()}><UploadCloud size={14} /> Import Excel</button>
        <input id="import-excel" type="file" accept=".xlsx" style={{ display: "none" }} onChange={onImportExcel} />
      </div>

      <div style={{ marginBottom: 16 }}>
        <button style={{ ...css.btnAccent, width: "100%", padding: "16px", fontSize: 16, display: "flex", justifyContent: "center", alignItems: "center", gap: 12 }} onClick={() => navigate("facesearch")}>
          <Search size={20} />
          Scan Face to Search
        </button>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        {[
          { label: "Total Records", val: total, color: "#f59e0b", icon: <FolderOpen size={24} color="#f59e0b" /> },
          { label: "Active", val: active, color: "#ef4444", icon: <Activity size={24} color="#ef4444" /> },
          { label: "Arrested", val: arrested, color: "#f59e0b", icon: <Lock size={24} color="#f59e0b" /> },
          { label: "Absconding", val: absconding, color: "#8b5cf6", icon: <Users size={24} color="#8b5cf6" /> },
        ].map(s => (
          <div key={s.label} style={{ ...css.statCard }}>
            <div>{s.icon}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: s.color, marginTop: 4 }}>{s.val}</div>
            <div style={{ fontSize: 10, color: T.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Chart */}
      {analytics.byStatus.length > 0 && (
        <div style={{ ...css.card, marginBottom: 16 }}>
          <div style={css.sectionTitle}>▸ Status Breakdown</div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={analytics.byStatus}
                cx="50%"
                cy="42%"
                innerRadius={36}
                outerRadius={58}
                dataKey="value"
                nameKey="name"
                paddingAngle={3}
                stroke="rgba(255,255,255,0.25)"
                strokeWidth={2}
              >
                {analytics.byStatus.map((e, i) => (
                  <Cell key={i} fill={sliceColor(e.name, i)} />
                ))}
              </Pie>
              <Tooltip {...CHART_TOOLTIP_PROPS} />
              <Legend content={(props) => <ChartLegendList payload={props.payload} />} />
            </PieChart>
          </ResponsiveContainer>
          <button style={{ ...css.btn, width: "100%", marginTop: 12, borderColor: T.accent2, color: T.accent2 }} onClick={() => navigate("analytics")}>
            View Full Analytics Dashboard <ChevronRight size={14} />
          </button>
        </div>
      )}

      {/* Recent records */}
      <div style={css.sectionTitle}>▸ Recent Records</div>
      {recent.map(r => (
        <RecordRow key={r.id} record={r} onClick={() => navigate("detail", { id: r.id })} />
      ))}
      {records.length > 5 && (
        <button style={{ ...css.btn, width: "100%", marginTop: 4 }} onClick={() => navigate("list")}>
          View All {records.length} Records <ChevronRight size={14} />
        </button>
      )}
      {records.length === 0 && (
        <div style={{ textAlign: "center", padding: "30px 0", color: T.muted, fontSize: 13 }}>
          No records yet. Tap Add to create the first profile.
        </div>
      )}
    </div>
  );
}

/* ─── Record Row ─────────────────────────────────────────────── */
function RecordRow({ record, onClick }) {
  const threat = getThreatLevel(record);
  return (
    <div onClick={onClick} style={{ ...css.card, display: "flex", alignItems: "center", gap: 12, cursor: "pointer", transition: "border-color 0.15s" }}
      onMouseEnter={e => e.currentTarget.style.borderColor = T.borderM}
      onMouseLeave={e => e.currentTarget.style.borderColor = T.border}>
      <Avatar record={record} size={44} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{record.name}</div>
        <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>
          {record.hsNo} · {record.policeStation || "—"}
        </div>
        <div style={{ marginTop: 4 }}>
          <span style={css.tag(record.status)}>
            <StatusDot status={record.status} /> {record.status || "Unknown"}
          </span>
        </div>
      </div>
      <div style={{ textAlign: "right", fontSize: 11, color: T.muted, display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
        <div>{record.caseYear || "—"}</div>
        <ChevronRight size={16} style={{ marginTop: 8, color: T.muted }} />
      </div>
    </div>
  );
}

/* ─── Accused List ───────────────────────────────────────────── */
function AccusedList({ records, allRecords, navigate, searchQuery, setSearchQuery, filters, setFilters, showFilters, setShowFilters }) {
  const years = [...new Set(allRecords.map(r => r.caseYear).filter(Boolean))].sort((a, b) => b - a);
  const areas = [...new Set(allRecords.map(r => r.areaOfOperation?.split(",")[0]?.trim()).filter(Boolean))];

  return (
    <div style={{ padding: "72px 14px 14px" }}>
      {/* Search bar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <div style={{ flex: 1, position: "relative" }}>
          <Search size={16} color={T.muted} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
          <input
            style={{ ...css.input, paddingLeft: 34, paddingRight: 60 }}
            placeholder="Search name, H.S No., case..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          <div style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", display: "flex", alignItems: "center", gap: 10 }}>
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} style={{ background: "none", border: "none", color: T.muted, cursor: "pointer", display: "flex" }}>
                <X size={16} />
              </button>
            )}
            <button
              onClick={() => navigate("facesearch")}
              style={{ background: "none", border: "none", cursor: "pointer", color: T.accent, display: "flex" }}
              title="AI Face Scan"
            >
              <ScanFace size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Filter toggle and Actions */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
        <button style={{ ...css.btn, fontSize: 12, padding: "6px 12px", color: showFilters ? T.accent : T.muted, borderColor: showFilters ? T.accent : T.border }} onClick={() => setShowFilters(s => !s)}>
          <Settings size={14} /> Filters {Object.values(filters).some(v => v) ? "●" : ""}
        </button>
        <button style={{ ...css.btn, fontSize: 12, padding: "6px 12px", color: T.accent, borderColor: T.border }} onClick={() => navigate("compare")}>
          <GitCompare size={14} /> Compare Records
        </button>
        {Object.entries(filters).map(([k, v]) => v ? (
          <button key={k} onClick={() => setFilters(f => ({ ...f, [k]: "" }))} style={{ ...css.btn, fontSize: 11, padding: "4px 10px", background: "#78350f22", borderColor: "#f59e0b44", color: T.accent }}>
            {v} <X size={12} />
          </button>
        ) : null)}
      </div>

      {showFilters && (
        <div style={{ ...css.card, marginBottom: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <div style={css.label}>Year</div>
              <select style={css.input} value={filters.year} onChange={e => setFilters(f => ({ ...f, year: e.target.value }))}>
                <option value="">All Years</option>
                {years.map(y => <option key={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <div style={css.label}>Sex</div>
              <select style={css.input} value={filters.sex} onChange={e => setFilters(f => ({ ...f, sex: e.target.value }))}>
                <option value="">All</option>
                {["Male", "Female", "Other"].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <div style={css.label}>Status</div>
              <select style={css.input} value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
                <option value="">All Status</option>
                {["Active", "Arrested", "Acquitted", "Absconding", "Deceased"].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <div style={css.label}>Area</div>
              <select style={css.input} value={filters.area} onChange={e => setFilters(f => ({ ...f, area: e.target.value }))}>
                <option value="">All Areas</option>
                {areas.map(a => <option key={a}>{a}</option>)}
              </select>
            </div>
          </div>
          <button style={{ ...css.btn, marginTop: 10, fontSize: 12, color: T.red, borderColor: "color-mix(in srgb, var(--ct-red) 30%, transparent)" }} onClick={() => setFilters({ year: "", sex: "", status: "", area: "" })}>
            Clear All Filters
          </button>
        </div>
      )}

      {/* Count */}
      <div style={{ fontSize: 11, color: T.muted, marginBottom: 10, letterSpacing: "0.06em" }}>
        {records.length} OF {allRecords.length} RECORDS
      </div>

      {records.length === 0
        ? <div style={{ textAlign: "center", padding: "40px 0", color: T.muted, fontSize: 13 }}>No records match your search.</div>
        : records.map(r => <RecordRow key={r.id} record={r} onClick={() => navigate("detail", { id: r.id })} />)
      }
    </div>
  );
}

/* ─── Accused Detail ─────────────────────────────────────────── */
function AccusedDetail({ record, records, navigate, onDelete, onSharePDF, onQuickUpdate }) {
  const [fullScreenImage, setFullScreenImage] = useState(null);
  const [showPdfOptions, setShowPdfOptions] = useState(false);
  const threat = getThreatLevel(record);

  const Field = ({ field }) => {
    const val = record[field.key];
    if (!val) return null;

    if (field.key === "associates") {
      const lines = String(val).split('\n');
      return (
        <div style={{ marginBottom: 14, paddingBottom: 14, borderBottom: `1px solid ${T.borderM}`, display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 11, color: T.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{field.label}</div>
          <div style={{ fontSize: 14, color: T.text, lineHeight: 1.5, fontWeight: 500 }}>
            {lines.map((line, idx) => {
              const match = records.find(r => r.name.toLowerCase() === line.trim().toLowerCase());
              if (match) {
                return <div key={idx}><span onClick={() => navigate("detail", { id: match.id })} style={{ color: T.accent, textDecoration: "underline", cursor: "pointer" }}>{line}</span> <span style={{ fontSize: 10, color: T.muted }}>(Linked)</span></div>;
              }
              return <div key={idx}>{line}</div>;
            })}
          </div>
        </div>
      );
    }

    return (
      <div style={{ marginBottom: 14, paddingBottom: 14, borderBottom: `1px solid ${T.borderM}`, display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 11, color: T.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{field.label}</div>
        <div style={{ fontSize: 14, color: T.text, lineHeight: 1.5, whiteSpace: "pre-wrap", fontWeight: 500 }}>{String(val)}</div>
      </div>
    );
  };

  return (
    <div style={{ padding: "72px 14px 14px" }}>
      {/* Hero */}
      <div style={{ ...css.card, display: "flex", gap: 16, alignItems: "flex-start", marginBottom: 16 }}>
        <div onClick={() => record?.photo && setFullScreenImage(record.photo)} style={{ cursor: record?.photo ? "pointer" : "default" }}>
          <Avatar record={record} size={70} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: T.text }}>{record.name}</div>
          <div style={{ fontSize: 12, color: T.accent, fontFamily: "monospace", marginTop: 2 }}>REC-{record.id}</div>
          <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ ...css.tag(record.status), paddingRight: 4 }}>
              <StatusDot status={record.status} />
              <select
                value={record.status || ""}
                onChange={(e) => onQuickUpdate && onQuickUpdate({ ...record, status: e.target.value })}
                style={{ background: "transparent", border: "none", outline: "none", color: "inherit", fontWeight: "inherit", fontSize: "inherit", cursor: "pointer", paddingLeft: 4 }}
              >
                <option value="" disabled>Unknown</option>
                <option value="Active">Active</option>
                <option value="Arrested">Arrested</option>
                <option value="Acquitted">Acquitted</option>
                <option value="Absconding">Absconding</option>
                <option value="Deceased">Deceased</option>
              </select>
            </span>
            <span style={{ padding: "2px 8px", borderRadius: 12, fontSize: 10, fontWeight: 700, backgroundColor: threat.color, color: threat.text }}>
              {threat.level} THREAT
            </span>
          </div>
          <div style={{ fontSize: 11, color: T.muted, marginTop: 6 }}>Added {fmtDate(record.createdAt)}</div>
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <button style={{ ...css.btn, flex: 1, fontSize: 12 }} onClick={() => navigate("form", { record })}>
          <Save size={14} /> Edit
        </button>
        <button style={{ ...css.btnAccent, flex: 2, fontSize: 12, color: "#000", background: "#f59e0b" }} onClick={() => setShowPdfOptions(true)}>
          <FileText size={14} /> Export Dossier
        </button>
        <button style={{ ...css.btn, flex: 1, fontSize: 12, color: T.red, borderColor: "color-mix(in srgb, var(--ct-red) 30%, transparent)" }} onClick={() => onDelete(record.id)}>
          <Trash2 size={14} /> Delete
        </button>
      </div>

      {/* Personal Info */}
      <div style={css.sectionTitle}>▸ Personal Information</div>
      <div style={css.card}>
        {["name", "fatherName", "address", "age", "sex", "communityReligion", "familyMembers", "propertiesDetails"].map(k => (
          <Field key={k} field={FIELDS.find(f => f.key === k)} />
        ))}
      </div>

      {/* Legal Info */}
      <div style={css.sectionTitle}>▸ Legal Details</div>
      <div style={css.card}>
        {["policeStation", "hsNo", "casesPending", "currentDoings", "caseYear"].map(k => (
          <Field key={k} field={FIELDS.find(f => f.key === k)} />
        ))}
      </div>

      {/* Criminal Profile */}
      <div style={css.sectionTitle}>▸ Criminal Profile</div>
      <div style={css.card}>
        {["hideouts", "areaOfOperation", "gangLeader", "associates", "notes"].map(k => (
          <Field key={k} field={FIELDS.find(f => f.key === k)} />
        ))}
      </div>

      {fullScreenImage && (
        <div
          onClick={() => setFullScreenImage(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <img src={fullScreenImage} alt="Full screen" style={{ maxWidth: "90%", maxHeight: "90%", objectFit: "contain", borderRadius: 16 }} />
          <button
            style={{ position: "absolute", top: 20, right: 20, background: "rgba(255,255,255,0.2)", color: "#fff", border: "none", borderRadius: "50%", width: 40, height: 40, fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
            onClick={(e) => { e.stopPropagation(); setFullScreenImage(null); }}
          >
            ✕
          </button>
        </div>
      )}

      {showPdfOptions && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 20 }}>
          <div style={{ ...css.card, maxWidth: 320, width: "100%", textAlign: "center" }}>
            <div style={{ marginBottom: 18, fontSize: 16, color: T.text, fontWeight: 600 }}>PDF Export Options</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button style={{ ...css.btnAccent, width: "100%" }} onClick={() => { setShowPdfOptions(false); onSharePDF(record, 'download'); }}>
                Download to Device
              </button>
              <button style={{ ...css.btn, width: "100%" }} onClick={() => { setShowPdfOptions(false); onSharePDF(record, 'share'); }}>
                Share via App...
              </button>
              <button style={{ ...css.btn, width: "100%", borderColor: "color-mix(in srgb, var(--ct-red) 30%, transparent)", color: T.red }} onClick={() => setShowPdfOptions(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Speech Correction ──────────────────────────────────────── */
const SPEECH_CORRECTIONS = {
  // Common Indian name / legal mishearings
  "fir": "FIR", "f.i.r": "FIR", "first information report": "FIR",
  "ipc": "IPC", "i.p.c": "IPC",
  "ndps": "NDPS", "n.d.p.s": "NDPS",
  "hs number": "H.S No.", "history sheeter": "History Sheeter",
  "absconding": "Absconding", "arrested": "Arrested", "acquitted": "Acquitted",
  "police station": "Police Station",
  // Common word corrections
  "two": "2", "too": "to",
  "hear": "here", "there": "their",
  "write": "right", "no": "No.",
  "comma": ",", "full stop": ".", "new line": "\n",
  "question mark": "?",
};

const correctSpeech = (text) => {
  if (!text || !text.trim()) return text;

  // Apply custom correction dictionary (case-insensitive)
  let corrected = text;
  for (const [wrong, right] of Object.entries(SPEECH_CORRECTIONS)) {
    const regex = new RegExp(`\\b${wrong}\\b`, 'gi');
    corrected = corrected.replace(regex, right);
  }

  // Use compromise NLP for smarter text processing
  try {
    const doc = nlp(corrected);
    // Fix capitalization of proper nouns and sentence starts
    doc.sentences().toTitleCase();
    corrected = doc.text();
  } catch (e) { /* fallback to uncorrected */ }

  // Capitalize first letter of the entire text
  corrected = corrected.charAt(0).toUpperCase() + corrected.slice(1);

  // Fix multiple spaces
  corrected = corrected.replace(/\s{2,}/g, ' ').trim();

  return corrected;
};

/* ─── Accused Form ───────────────────────────────────────────── */
function AccusedForm({ record, onSave, goBack, activeDataSource, settings }) {
  const isEdit = !!record;
  const [form, setForm] = useState(record || {});
  const [saving, setSaving] = useState(false);
  const [saveDest, setSaveDest] = useState(activeDataSource || "local");
  const [errors, setErrors] = useState({});
  const [dictatingKey, setDictatingKey] = useState(null);
  const [interimText, setInterimText] = useState("");
  const recognitionRef = useRef(null);

  const stopDictation = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setDictatingKey(null);
    setInterimText("");
  };

  const toggleDictation = (k) => {
    if (dictatingKey === k) {
      stopDictation();
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice dictation is not supported in your browser. Try Chrome.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-IN';
    recognitionRef.current = recognition;

    recognition.onstart = () => { setDictatingKey(k); setInterimText(""); };
    recognition.onresult = (event) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        // Pick the best alternative based on confidence
        let bestTranscript = event.results[i][0].transcript;
        let bestConfidence = event.results[i][0].confidence;
        for (let j = 1; j < event.results[i].length; j++) {
          if (event.results[i][j].confidence > bestConfidence) {
            bestTranscript = event.results[i][j].transcript;
            bestConfidence = event.results[i][j].confidence;
          }
        }
        if (event.results[i].isFinal) final += bestTranscript + " ";
        else interim += bestTranscript;
      }
      if (final) {
        const corrected = correctSpeech(final);
        setForm(f => ({ ...f, [k]: (f[k] ? f[k].trimEnd() + " " : "") + corrected }));
      }
      setInterimText(interim);
    };
    recognition.onerror = (e) => {
      if (e.error !== 'no-speech') console.error("Speech recognition error", e);
      stopDictation();
    };
    recognition.onend = () => { setDictatingKey(null); setInterimText(""); };
    recognition.start();
  };
  const photoRef = useRef();
  const ocrRef = useRef();

  const handleOcrUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSaving(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("http://localhost:8000/api/ocr", { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok && data.success) {
        const { name, age, firNumber, address } = data.extracted;
        setForm(f => ({
          ...f,
          ...(name && { name }),
          ...(age && { age }),
          ...(firNumber && { firNumber }),
          ...(address && { address }),
        }));
        alert("Document scanned successfully! Form auto-filled.");
      } else {
        alert("OCR Error: " + (data.detail || "Failed to extract text."));
      }
    } catch (err) {
      alert("Could not connect to Python AI Engine. Ensure the Python backend is running on port 8000.");
    }
    setSaving(false);
    if (ocrRef.current) ocrRef.current.value = "";
  };

  const [cropSrc, setCropSrc] = useState(null);
  const [crop, setCrop] = useState({ unit: '%', x: 25, y: 25, width: 50, height: 50, aspect: 1 });
  const [completedCrop, setCompletedCrop] = useState(null);
  const imgRef = useRef(null);
  const videoRef = useRef(null);
  const [useCamera, setUseCamera] = useState(false);

  const startCamera = async () => {
    setUseCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (e) {
      alert("Camera access denied or unavailable.");
      setUseCamera(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    setUseCamera(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext("2d").drawImage(videoRef.current, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg");
    stopCamera();
    setCropSrc(dataUrl);
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCropSrc(reader.result);
    reader.readAsDataURL(file);
  };

  const applyCrop = async () => {
    if (!completedCrop || !imgRef.current) return;
    const image = imgRef.current;
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    const MAX_DIM = 600;
    let targetW = completedCrop.width * scaleX;
    let targetH = completedCrop.height * scaleY;

    if (targetW > MAX_DIM || targetH > MAX_DIM) {
      const ratio = Math.min(MAX_DIM / targetW, MAX_DIM / targetH);
      targetW *= ratio;
      targetH *= ratio;
    }

    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');

    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0, 0, targetW, targetH
    );

    const base64Image = canvas.toDataURL('image/jpeg', 0.8);
    set("photo", base64Image);

    try {
      const result = await human.detect(canvas);
      if (result && result.face && result.face.length > 0 && result.face[0].embedding) {
        set("faceDescriptor", Array.from(result.face[0].embedding));
      } else {
        alert("Warning: No clear face detected in the photo. Facial recognition search will not work for this record.");
      }
    } catch (e) {
      console.log("Human API error during descriptor extraction", e);
    }

    setCropSrc(null);
    if (photoRef.current) photoRef.current.value = "";
  };

  const validate = () => {
    const e = {};
    if (!form.name?.trim()) e.name = "Name is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    await onSave(form, saveDest);
    setSaving(false);
  };

  const sections = [
    { title: "Personal Information", keys: ["name", "fatherName", "address", "age", "sex", "communityReligion", "familyMembers", "propertiesDetails", "policeStation"] },
    { title: "Legal Details", keys: ["hsNo", "firNumber", "firDate", "sessionNumber", "casesPending", "currentDoings", "status", "caseYear"] },
    { title: "Criminal Profile", keys: ["hideouts", "areaOfOperation", "gangLeader", "associates", "notes"] },
  ];

  return (
    <div style={{ padding: "72px 14px 14px" }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: T.accent, marginBottom: 16 }}>
        {isEdit ? "Edit Record" : "New Accused Record"}
      </div>

      {cropSrc && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", zIndex: 9999, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ color: "#fff", marginBottom: 16, fontSize: 16, fontWeight: 600 }}>Crop Photo</div>
          <div style={{ maxHeight: "60vh", overflow: "auto" }}>
            <ReactCrop crop={crop} onChange={c => setCrop(c)} onComplete={c => setCompletedCrop(c)} aspect={1}>
              <img ref={imgRef} src={cropSrc} style={{ maxHeight: "60vh" }} alt="Crop me" />
            </ReactCrop>
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 24, width: "100%", maxWidth: 300 }}>
            <button style={{ ...css.btn, flex: 1 }} onClick={() => { setCropSrc(null); if (photoRef.current) photoRef.current.value = ""; }}>Cancel</button>
            <button style={{ ...css.btnAccent, flex: 1 }} onClick={applyCrop}>Apply</button>
          </div>
        </div>
      )}

      {useCamera && (
        <div style={{ position: "fixed", inset: 0, background: "#000", zIndex: 9999, display: "flex", flexDirection: "column", alignItems: "center", justifyItems: "center", justifyContent: "center" }}>
          <div style={{ color: "#fff", fontSize: 16, marginBottom: 20, fontWeight: 600 }}>Take Suspect Photo</div>
          <video ref={videoRef} autoPlay playsInline style={{ width: "100%", maxHeight: "60vh", objectFit: "cover", border: `2px solid ${T.accent}` }} />
          <div style={{ display: "flex", gap: 16, width: "100%", maxWidth: 300, marginTop: 30 }}>
            <button style={{ ...css.btnAccent, flex: 2, padding: 16, fontSize: 16, background: "#4ade80", color: "#000" }} onClick={capturePhoto}>
              📸 Capture
            </button>
            <button style={{ ...css.btn, flex: 1, borderColor: T.red, color: T.red }} onClick={stopCamera}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* OCR Document Scanner */}
      <div style={{ ...css.card, display: "flex", alignItems: "center", gap: 14, marginBottom: 16, borderColor: T.accent2 }}>
        <div style={{ width: 48, height: 48, borderRadius: 24, background: T.accent2 + "22", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <ScanFace size={24} color={T.accent2} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>AI Document Scanner</div>
          <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>Auto-fill form from ID Card or FIR</div>
        </div>
        <button style={{ ...css.btn, fontSize: 12, borderColor: T.accent2, color: T.accent2 }} onClick={() => ocrRef.current?.click()} disabled={saving}>
          {saving ? "..." : "Scan"}
        </button>
        <input ref={ocrRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleOcrUpload} />
      </div>

      {/* Photo */}
      <div style={{ ...css.card, display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
        <div onClick={() => photoRef.current?.click()} style={{ cursor: "pointer" }}>
          {form.photo
            ? <img src={form.photo} alt="Upload" style={{ width: 72, height: 72, borderRadius: 36, objectFit: "cover", border: `2px solid ${T.accent}` }} />
            : <div style={{ width: 72, height: 72, borderRadius: 36, background: T.card2, border: `2px dashed ${T.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}><User size={28} color={T.muted} /></div>
          }
        </div>
        <div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button style={{ ...css.btn, fontSize: 12 }} onClick={() => photoRef.current?.click()}><UploadCloud size={14} /> Upload</button>
            <button style={{ ...css.btn, fontSize: 12 }} onClick={startCamera}><Camera size={14} /> Camera</button>
          </div>
          {form.photo && <button style={{ ...css.btn, fontSize: 12, color: T.red, borderColor: "color-mix(in srgb, var(--ct-red) 30%, transparent)", marginTop: 6 }} onClick={() => set("photo", null)}><Trash2 size={14} /> Remove</button>}
          <div style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>Auto-compresses high quality images</div>
          <div style={{ fontSize: 11, color: T.red, marginTop: 6, fontWeight: 600, background: "color-mix(in srgb, var(--ct-red) 12%, transparent)", padding: 6, borderRadius: 6 }}>
            ⚠️ For powerful use cases (Twin Matcher), registered photo must be perfectly lit and looking directly at camera.
          </div>
        </div>
        <input ref={photoRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhoto} />
      </div>

      {/* Floating Mic Recording Overlay */}
      {dictatingKey && (
        <div style={{ position: "fixed", bottom: 120, left: "50%", transform: "translateX(-50%)", background: "rgba(0,0,0,0.92)", border: `1.5px solid ${T.red}`, borderRadius: 16, padding: "14px 22px", zIndex: 9999, display: "flex", flexDirection: "column", alignItems: "center", gap: 10, minWidth: 260, maxWidth: 320, boxShadow: "0 4px 32px rgba(239,68,68,0.3)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              className="mic-active"
              style={{ background: T.red, border: "none", borderRadius: "50%", width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}
              onClick={stopDictation}
            >
              <Mic size={22} color="#fff" />
            </button>
            <div>
              <div style={{ color: T.red, fontWeight: 700, fontSize: 13 }}>Listening…</div>
              <div style={{ color: T.muted, fontSize: 11 }}>Tap mic to stop</div>
            </div>
          </div>
          {interimText && (
            <div style={{ color: "#a3a3a3", fontSize: 13, fontStyle: "italic", textAlign: "center", borderTop: `1px solid ${T.border}`, paddingTop: 8, width: "100%" }}>
              {interimText}
            </div>
          )}
        </div>
      )}

      {/* Sections */}
      {sections.map(sec => (
        <div key={sec.title}>
          <div style={css.sectionTitle}>▸ {sec.title}</div>
          <div style={{ ...css.card, marginBottom: 16 }}>
            {sec.keys.map(k => {
              const field = FIELDS.find(f => f.key === k);
              if (!field) return null;
              return (
                <div key={k} style={{ marginBottom: 14 }}>
                  <div style={{ ...css.label, color: errors[k] ? T.red : undefined }}>
                    {field.label}{field.required ? " *" : ""}
                  </div>
                  {field.type === "textarea"
                    ? (
                      <div style={{ position: "relative" }}>
                        <textarea style={{ ...css.input, minHeight: 70, resize: "vertical", paddingRight: 44 }} value={form[k] || ""} onChange={e => set(k, e.target.value)} />
                        <button
                          className={dictatingKey === k ? "mic-active" : ""}
                          onClick={(e) => { e.preventDefault(); toggleDictation(k); }}
                          style={{ position: "absolute", bottom: 8, right: 8, background: dictatingKey === k ? T.red : T.card2, border: `1px solid ${dictatingKey === k ? T.red : T.border}`, borderRadius: "50%", width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                        >
                          <Mic size={15} color={dictatingKey === k ? "#fff" : T.muted} />
                        </button>
                      </div>
                    )
                    : field.type === "select"
                      ? <select style={css.input} value={form[k] || ""} onChange={e => set(k, e.target.value)}>
                        <option value="">Select…</option>
                        {field.opts.map(o => <option key={o}>{o}</option>)}
                      </select>
                      : <input type={field.type} style={css.input} value={form[k] || ""} onChange={e => set(k, field.type === "number" ? e.target.value : e.target.value)} />
                  }
                  {errors[k] && <div style={{ fontSize: 11, color: T.red, marginTop: 4 }}>{errors[k]}</div>}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {!isEdit && (
        <div style={{ ...css.card, marginBottom: 16 }}>
          <div style={css.label}>Save Destination</div>
          <select style={css.input} value={saveDest} onChange={e => setSaveDest(e.target.value)}>
            <option value="local">Local Storage (Offline)</option>
            {settings?.googleSheetLink && <option value="google">Google Sheets</option>}
            {settings?.dbApiUrl && <option value="database">Custom Database</option>}
          </select>
        </div>
      )}

      {/* Save button */}
      <button style={{ ...css.btnAccent, width: "100%", padding: "14px", fontSize: 14 }} onClick={handleSave} disabled={saving}>
        <Save size={18} /> {saving ? "Saving…" : isEdit ? "Update Record" : "Save Record"}
      </button>
      <button style={{ ...css.btn, width: "100%", padding: "12px", fontSize: 13, marginTop: 10 }} onClick={goBack}>
        Cancel
      </button>
    </div>
  );
}

/* ─── Database Excel Grid View ──────────────────────────────────────── */
function DatabaseGridView({ records, onUpdateDatabase, goBack }) {
  // Use fields except photo and notes for clean text grid
  const gridFields = FIELDS.filter(f => !["photo", "notes"].includes(f.key));

  const createEmptyRow = () => {
    const row = { id: genId(), isNew: true };
    gridFields.forEach(f => row[f.key] = "");
    return row;
  };

  const [rows, setRows] = useState(records.length > 0 ? [...records] : [createEmptyRow()]);

  const handleChange = (index, key, val) => {
    const newRows = [...rows];
    newRows[index] = { ...newRows[index], [key]: val };
    setRows(newRows);
  };

  const handleAddRow = () => {
    setRows([...rows, createEmptyRow()]);
  };

  const saveAll = () => {
    // Filter out completely blank new rows
    const validRows = rows.filter(r => {
      // If it's an existing record (not marked isNew), keep it even if fields are empty
      if (!r.isNew) return true;
      // If it's new, check if at least one grid field is filled
      return gridFields.some(f => r[f.key] && String(r[f.key]).trim() !== "");
    });

    // Add createdAt if missing
    const finalRecords = validRows.map(r => {
      const rec = { ...r };
      delete rec.isNew;
      if (!rec.createdAt) rec.createdAt = new Date().toISOString();
      return rec;
    });

    onUpdateDatabase(finalRecords);
  };

  return (
    <div style={{ padding: "72px 14px 80px", overflowX: "auto" }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: T.accent, marginBottom: 8 }}>Database Excel View</div>
      <div style={{ fontSize: 12, color: T.muted, marginBottom: 16 }}>View and edit all existing records instantly. Add new rows at the bottom.</div>

      <div style={{ overflowX: "auto", background: "#1f2937", borderRadius: 8, border: `1px solid ${T.border}`, maxHeight: "65vh" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 1400 }}>
          <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
            <tr>
              <th style={{ padding: 8, borderBottom: `1px solid ${T.border}`, borderRight: `1px solid ${T.border}`, background: "#111827", color: T.muted, fontWeight: 600, width: 40, textAlign: "center" }}>#</th>
              {gridFields.map(f => (
                <th key={f.key} style={{ padding: 8, borderBottom: `1px solid ${T.border}`, borderRight: `1px solid ${T.border}`, background: "#111827", color: T.muted, fontWeight: 600, textAlign: "left", minWidth: 120 }}>
                  {f.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.id}>
                <td style={{ padding: 8, borderBottom: `1px solid ${T.border}`, borderRight: `1px solid ${T.border}`, color: T.muted, textAlign: "center", background: "#111827" }}>
                  {i + 1}
                </td>
                {gridFields.map(f => (
                  <td key={f.key} style={{ padding: 0, borderBottom: `1px solid ${T.border}`, borderRight: `1px solid ${T.border}` }}>
                    {f.type === "select" ? (
                      <select
                        value={row[f.key] || ""}
                        onChange={e => handleChange(i, f.key, e.target.value)}
                        style={{ width: "100%", border: "none", background: "transparent", color: T.text, padding: "8px", outline: "none", fontFamily: "inherit", appearance: "none" }}
                      >
                        <option value="" style={{ color: "#000" }}>Select...</option>
                        {f.opts.map(o => <option key={o} value={o} style={{ color: "#000" }}>{o}</option>)}
                      </select>
                    ) : (
                      <input
                        value={row[f.key] || ""}
                        onChange={e => handleChange(i, f.key, e.target.value)}
                        style={{ width: "100%", border: "none", background: "transparent", color: T.text, padding: "8px", outline: "none", fontFamily: "inherit" }}
                        placeholder="..."
                      />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", gap: 16, marginTop: 16 }}>
        <button style={{ ...css.btn, flex: 1 }} onClick={handleAddRow}>
          <PlusCircle size={16} /> Add Blank Row
        </button>
        <button style={{ ...css.btnAccent, flex: 2 }} onClick={saveAll}>
          <Save size={16} /> Save All Changes
        </button>
      </div>
    </div>
  );
}

/* ─── Analytics ──────────────────────────────────────────────── */
function Analytics({ getAnalytics, records }) {
  const { byYear, byStatus, bySex, byArea } = getAnalytics();
  const total = records.length;

  const gangMap = {};
  records.forEach(r => { if (r.gangLeader) gangMap[r.gangLeader] = (gangMap[r.gangLeader] || 0) + 1; });
  const topGangs = Object.entries(gangMap).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([g, c]) => ({ gang: g, count: c }));

  const Section = ({ title, children }) => (
    <div style={{ ...css.card, marginBottom: 16 }}>
      <div style={{ ...css.sectionTitle, color: "var(--ct-accent)", fontSize: 13 }}>▸ {title}</div>
      {children}
    </div>
  );

  return (
    <div style={{ padding: "72px 14px 14px" }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: T.accent, marginBottom: 16 }}>Analytics Dashboard</div>

      {/* Summary row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 10, marginBottom: 16 }}>
        {Object.entries(
          records.reduce((acc, r) => { acc[r.status || "Unknown"] = (acc[r.status || "Unknown"] || 0) + 1; return acc; }, {})
        ).map(([s, c]) => (
          <div key={s} style={{ ...css.statCard, borderLeft: `3px solid ${STATUS_CFG[s]?.dot || T.muted}` }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: STATUS_CFG[s]?.dot || "var(--ct-text)" }}>{c}</div>
            <div style={{ fontSize: 11, color: "var(--ct-text)", fontWeight: 600, textTransform: "uppercase", marginTop: 4 }}>{s}</div>
            <div style={{ fontSize: 12, color: "var(--ct-accent)", fontWeight: 700, marginTop: 2 }}>{total ? Math.round(c / total * 100) : 0}%</div>
          </div>
        ))}
      </div>

      <Section title="Cases by Year">
        {byYear.length ? (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={byYear} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
              <XAxis dataKey="year" tick={AXIS_TICK} />
              <YAxis tick={AXIS_TICK} allowDecimals={false} />
              <Tooltip {...CHART_TOOLTIP_PROPS} />
              <Bar dataKey="count" fill="var(--ct-accent)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : <div style={{ color: "var(--ct-muted)", fontSize: 13 }}>No data</div>}
      </Section>

      <Section title="Status Distribution">
        {byStatus.length ? (
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={byStatus}
                cx="50%"
                cy="42%"
                outerRadius={62}
                dataKey="value"
                nameKey="name"
                paddingAngle={2}
                stroke="rgba(255,255,255,0.25)"
                strokeWidth={2}
              >
                {byStatus.map((entry, i) => (
                  <Cell key={i} fill={sliceColor(entry.name, i)} />
                ))}
              </Pie>
              <Tooltip {...CHART_TOOLTIP_PROPS} />
              <Legend content={(props) => <ChartLegendList payload={props.payload} />} />
            </PieChart>
          </ResponsiveContainer>
        ) : <div style={{ color: "var(--ct-muted)", fontSize: 13 }}>No data</div>}
      </Section>

      <Section title="Demographics (Sex)">
        {bySex.length ? (
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={bySex}
                cx="50%"
                cy="42%"
                innerRadius={34}
                outerRadius={62}
                dataKey="value"
                nameKey="name"
                paddingAngle={2}
                stroke="rgba(255,255,255,0.25)"
                strokeWidth={2}
              >
                {bySex.map((entry, i) => (
                  <Cell key={i} fill={sliceColor(entry.name, i, SEX_SLICE_COLORS)} />
                ))}
              </Pie>
              <Tooltip {...CHART_TOOLTIP_PROPS} />
              <Legend content={(props) => <ChartLegendList payload={props.payload} />} />
            </PieChart>
          </ResponsiveContainer>
        ) : <div style={{ color: "var(--ct-muted)", fontSize: 13 }}>No data</div>}
      </Section>

      <Section title="Top Hotspots (Areas)">
        {byArea.length ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={byArea} layout="vertical" margin={{ top: 5, right: 5, bottom: 5, left: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
              <XAxis type="number" tick={AXIS_TICK} allowDecimals={false} />
              <YAxis dataKey="area" type="category" tick={AXIS_TICK} width={80} />
              <Tooltip {...CHART_TOOLTIP_PROPS} />
              <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : <div style={{ color: "var(--ct-muted)", fontSize: 13 }}>No data</div>}
      </Section>
    </div>
  );
}

/* ─── Main App ───────────────────────────────────────────────── */
function About() {
  return (
    <div style={{ padding: "80px 24px 24px", textAlign: "center", color: T.text, minHeight: "100vh" }}>
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "center" }}>
        <img src="/goatech-logo.jpg" alt="GOAT'ECH Logo" style={{ width: 80, height: 80, borderRadius: 16, border: `1px solid ${T.border}`, boxShadow: `0 0 30px rgba(108,60,255,0.2)` }} />
      </div>
      <h2 style={{ color: T.accent, fontSize: 24, marginBottom: 12 }}>CRIMETRACK PRO</h2>
      <p style={{ color: T.muted, fontSize: 14, marginBottom: 32, lineHeight: 1.6 }}>
        Offline, highly-secure accused tracking database for Law Enforcement.
      </p>
      <div style={{ ...css.card, textAlign: "left", padding: 24 }}>
        <div style={{ fontSize: 11, color: T.accent, letterSpacing: "2px", textTransform: "uppercase", marginBottom: 8 }}>Founded By</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: T.text, marginBottom: 8 }}>GOAT'ECH</div>
        <p style={{ fontSize: 13, color: T.muted, lineHeight: 1.6, marginBottom: 12 }}>
          Founded by Magh's, GOAT'ECH is a technology company with a singular vision - to revolutionize daily digital utilities and build tools that genuinely improve people's lives.
        </p>
        <p style={{ fontSize: 13, color: T.muted, lineHeight: 1.6, marginBottom: 16 }}>
          We believe in shipping fast, thinking boldly, and building things that last. From civic tech to social tools, our portfolio spans diverse domains with one constant: quality.
        </p>
        <div style={{ fontSize: 12, fontWeight: 600, color: T.accent2, marginBottom: 8, marginTop: 12 }}>PRODUCTS</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: 24 }}>
          {['TN Voting', 'AquaDet', 'Toocs', 'Flames', 'Management'].map((prod, i) => (
            <span key={i} style={{ background: 'rgba(108,60,255,0.1)', border: `1px solid ${T.accent}`, color: T.text, fontSize: 11, padding: "4px 10px", borderRadius: 100 }}>
              {prod}
            </span>
          ))}
        </div>
        <button
          onClick={() => window.open("https://goatech.tech", "_blank")}
          style={{ ...css.btnAccent, width: "100%", textDecoration: "none", fontSize: 13, display: "block", textAlign: "center" }}
        >
          Visit goatech.tech
        </button>
      </div>
    </div>
  );
}

function NotificationsView({ goBack, notifications, clearNotifications }) {
  return (
    <div style={{ padding: "72px 14px 14px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: T.accent }}>Notifications</div>
        {notifications.length > 0 && (
          <button style={{ ...css.btn, padding: "6px 12px", fontSize: 12 }} onClick={clearNotifications}>
            <Trash2 size={14} /> Clear All
          </button>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {notifications.length === 0 ? (
          <div style={{ color: T.muted, textAlign: "center", padding: 40, background: T.card2, borderRadius: 12 }}>No new notifications</div>
        ) : (
          notifications.map(n => (
            <div key={n.id} style={{ ...css.card, padding: 16, borderLeft: `4px solid ${n.type === 'alert' ? T.red : n.type === 'sync' ? T.blue : T.green}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: T.text }}>{n.title}</div>
                <div style={{ fontSize: 10, color: T.muted }}>{n.time}</div>
              </div>
              <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.5 }}>{n.text}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function DocsView() {
  return (
    <div style={{ height: "100vh", paddingTop: 60, paddingBottom: 68, boxSizing: "border-box" }}>
      <iframe src={`/docs.html?v=${Date.now()}`} style={{ width: "100%", height: "100%", border: "none", background: "var(--ct-bg)", display: "block" }} title="Documentation" />
    </div>
  );
}

function FaceSearch({ records, navigate, goBack, modelsLoaded }) {
  const [photoSrc, setPhotoSrc] = useState(null);
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const scanLoopRef = useRef(null);
  const liveErrorRef = useRef(null);
  const [useCamera, setUseCamera] = useState(false);
  const [facingMode, setFacingMode] = useState("environment");
  const [strictMode, setStrictMode] = useState(false);
  const strictModeRef = useRef(false);

  const toggleStrictMode = () => {
    const newVal = !strictMode;
    setStrictMode(newVal);
    strictModeRef.current = newVal;
  };

  const startCamera = async (mode = facingMode) => {
    if (useCamera) stopCamera();
    setFacingMode(mode);
    setUseCamera(true);
    setPhotoSrc(null);
    setResult(null);
    let captured = false;
    let scanStartTime = null;
    let consecutiveFrames = 0;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: mode } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onplay = () => {
          const scan = async () => {
            if (captured) return;
            if (videoRef.current && !videoRef.current.paused) {
              const res = await human.detect(videoRef.current);

              if (res.face && res.face.length === 1 && res.face[0].score > 0.4 && res.face[0].embedding) {
                if (!scanStartTime) scanStartTime = Date.now();
                consecutiveFrames++;
                const pitch = Math.abs(res.face[0].rotation?.angle?.pitch || 0);
                const yaw = Math.abs(res.face[0].rotation?.angle?.yaw || 0);

                const queryEmbedding = res.face[0].embedding;
                let bestMatch = null;
                let bestSimilarity = 0;

                for (const record of records) {
                  if (record.faceDescriptor) {
                    let dotProduct = 0;
                    let normA = 0;
                    let normB = 0;
                    const a = queryEmbedding;
                    const b = record.faceDescriptor;
                    for (let i = 0; i < a.length; i++) {
                      dotProduct += a[i] * b[i];
                      normA += a[i] * a[i];
                      normB += b[i] * b[i];
                    }
                    const sim = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
                    if (sim > bestSimilarity) {
                      bestSimilarity = sim;
                      bestMatch = record;
                    }
                  }
                }

                const threshold = strictModeRef.current ? 0.85 : 0.60;

                if (bestSimilarity >= threshold && bestMatch) {
                  captured = true;
                  if (liveErrorRef.current) {
                    liveErrorRef.current.innerText = "Match Found! Unlocking...";
                    liveErrorRef.current.style.color = "#4ade80";
                  }
                  if (activeDataSource !== "local") {
                    sendAuditLog(activeDataSource, settings, "FACE_MATCH", `Matched Suspect: ${bestMatch.name} (ID: ${bestMatch.id}) with ${(bestSimilarity * 100).toFixed(1)}% confidence`);
                  }
                  setTimeout(() => {
                    stopCamera();
                    setUseCamera(false);
                    navigate("detail", { id: bestMatch.id });
                  }, 600);
                  return;
                } else {
                  if (liveErrorRef.current) {
                    if (pitch > 0.4 || yaw > 0.4) {
                      liveErrorRef.current.innerText = "Look directly at the camera...";
                      liveErrorRef.current.style.color = T.text;
                    } else {
                      liveErrorRef.current.innerText = "Scanning database for matches...";
                      liveErrorRef.current.style.color = T.text;
                    }
                  }

                  if (Date.now() - scanStartTime > 4000 && consecutiveFrames > 15) {
                    captured = true;
                    if (liveErrorRef.current) {
                      liveErrorRef.current.innerText = "No match found in database.";
                      liveErrorRef.current.style.color = T.red;
                    }
                    setTimeout(() => {
                      stopCamera();
                      setUseCamera(false);
                    }, 2000);
                    return;
                  }
                }
              } else {
                scanStartTime = null;
                consecutiveFrames = 0;
                if (liveErrorRef.current) {
                  liveErrorRef.current.innerText = "Make sure your face is clearly visible";
                  liveErrorRef.current.style.color = T.muted;
                }
              }

              if (!captured) {
                scanLoopRef.current = requestAnimationFrame(scan);
              }
            }
          };
          scan();
        };
      }
    } catch (e) {
      alert("Camera access denied or unavailable.");
      setUseCamera(false);
    }
  };

  const stopCamera = () => {
    if (scanLoopRef.current) cancelAnimationFrame(scanLoopRef.current);
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
  };

  useEffect(() => { return stopCamera; }, []);

  const handleCapture = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext("2d").drawImage(videoRef.current, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg");
    stopCamera();
    setUseCamera(false);
    setPhotoSrc(dataUrl);
    runSearch(dataUrl);
  };

  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPhotoSrc(reader.result);
      runSearch(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const runSearch = async (imgSrc) => {
    setSearching(true);
    setResult(null);

    const img = new Image();
    img.src = imgSrc;
    img.onload = async () => {
      try {
        const result = await human.detect(img);
        if (!result || !result.face || result.face.length === 0 || !result.face[0].embedding) {
          setSearching(false);
          setResult({ error: "No face detected in the image. Please try a clearer photo." });
          return;
        }

        const queryEmbedding = result.face[0].embedding;

        let bestMatch = null;
        let bestSimilarity = 0;
        let missingFingerprints = true;

        for (const record of records) {
          if (record.faceDescriptor) {
            missingFingerprints = false;

            // Calculate Cosine Similarity manually for robust matching
            let dotProduct = 0;
            let normA = 0;
            let normB = 0;
            const a = queryEmbedding;
            const b = record.faceDescriptor;
            for (let i = 0; i < a.length; i++) {
              dotProduct += a[i] * b[i];
              normA += a[i] * a[i];
              normB += b[i] * b[i];
            }
            const sim = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));

            if (sim > bestSimilarity) {
              bestSimilarity = sim;
              bestMatch = record;
            }
          }
        }

        setSearching(false);
        const similarityScore = (bestSimilarity * 100).toFixed(0);
        const threshold = strictModeRef.current ? 0.85 : 0.60;

        if (bestSimilarity >= threshold && bestMatch) {
          setResult({ match: bestMatch, distance: 1 - bestSimilarity });
          // Auto-navigate after a short delay like Samsung Face ID
          setTimeout(() => {
            navigate("detail", { id: bestMatch.id });
          }, 1500);
        } else {
          if (missingFingerprints) {
            setResult({ error: "No Database Fingerprints! Please Edit existing records and re-save their photos first." });
          } else {
            setResult({ error: `No Record Found. (Similarity score: ${similarityScore}% - requires ${threshold * 100}%)` });
          }
        }
      } catch (e) {
        setSearching(false);
        setResult({ error: "An error occurred during facial recognition analysis." });
      }
    };
  };

  return (
    <div style={{ padding: "72px 14px 14px", display: "flex", flexDirection: "column", alignItems: "center", minHeight: "80vh" }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: T.accent, marginBottom: 24 }}>Facial Recognition Search</div>

      {!modelsLoaded && (
        <div style={{ color: T.muted, padding: 16, textAlign: "center", border: `1px solid ${T.border}`, borderRadius: 12, width: "100%" }}>
          <div style={{ marginBottom: 8 }}>Loading Neural Network...</div>
          <div style={{ fontSize: 12 }}>Initialising offline AI models.</div>
        </div>
      )}

      {modelsLoaded && !useCamera && !photoSrc && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16, width: "100%", maxWidth: 300 }}>
          <button style={{ ...css.btnAccent, padding: 16, fontSize: 16, display: "flex", justifyContent: "center", gap: 10 }} onClick={startCamera}>
            <Search size={18} /> Open Camera
          </button>

          <div style={{ position: "relative" }}>
            <button style={{ ...css.btn, padding: 16, fontSize: 16, width: "100%" }} onClick={() => document.getElementById("face-upload").click()}>
              Upload Photo
            </button>
            <input id="face-upload" type="file" accept="image/*" style={{ display: "none" }} onChange={handleUpload} />
          </div>

          <label style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, cursor: "pointer", marginTop: 8, padding: 12, border: `1px solid ${strictMode ? T.red : T.border}`, borderRadius: 12, background: strictMode ? "color-mix(in srgb, var(--ct-red) 12%, transparent)" : "transparent" }}>
            <input type="checkbox" checked={strictMode} onChange={toggleStrictMode} style={{ width: 18, height: 18, cursor: "pointer" }} />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: strictMode ? T.red : T.text }}>Strict Mode (Twin Matcher)</span>
              <span style={{ fontSize: 11, color: T.muted }}>Raises AI threshold to 85% to differentiate identical twins</span>
            </div>
          </label>
        </div>
      )}

      {useCamera && (
        <div style={{ position: "fixed", inset: 0, background: "#fff", zIndex: 999, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <style>{`
            @keyframes scan-pulse {
              0% { box-shadow: 0 0 0 0 rgba(108,60,255,0.4); }
              70% { box-shadow: 0 0 0 30px rgba(108,60,255,0); }
              100% { box-shadow: 0 0 0 0 rgba(108,60,255,0); }
            }
          `}</style>

          <div style={{ color: "#000", fontSize: 18, marginBottom: 40, fontWeight: 700 }}>
            Face Recognition
          </div>

          <div style={{
            position: "relative",
            width: "280px",
            height: "280px",
            borderRadius: "50%",
            overflow: "hidden",
            border: `6px solid ${T.accent}`,
            animation: "scan-pulse 2s infinite",
            background: "#000"
          }}>
            <video ref={videoRef} autoPlay playsInline style={{ position: "absolute", top: "-10%", left: "-10%", width: "120%", height: "120%", objectFit: "cover", display: "block", transform: "scaleX(-1) scale(1.3)" }} />
          </div>

          <div ref={liveErrorRef} style={{ color: "#444", fontSize: 14, marginTop: 40, fontWeight: 600, minHeight: 24, textAlign: "center" }}>
            Make sure your face is clearly visible
          </div>

          <div style={{ display: "flex", gap: 12, width: "100%", maxWidth: 280, marginTop: 40 }}>
            <button style={{ ...css.btn, flex: 1, padding: 12, fontSize: 14, borderColor: "#000", color: "#000" }} onClick={() => startCamera(facingMode === "environment" ? "user" : "environment")}>
              Flip Camera
            </button>
            <button style={{ ...css.btn, flex: 1, padding: 12, fontSize: 14, borderColor: T.red, color: T.red }} onClick={() => { stopCamera(); setUseCamera(false); }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {photoSrc && (
        <div style={{ width: "100%", maxWidth: 400, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <img src={photoSrc} style={{ width: "100%", borderRadius: 12, border: `2px solid ${T.accent}`, marginBottom: 16 }} />

          {searching && (
            <div style={{ color: T.accent, fontWeight: 600, padding: 16, textAlign: "center" }}>
              Scanning Neural Network... Please wait.
            </div>
          )}

          {result && result.error && (
            <div style={{ ...css.card, background: "#450a0a", borderColor: T.red, color: "#fca5a5", textAlign: "center", padding: 16, width: "100%" }}>
              {result.error}
              <button style={{ ...css.btn, marginTop: 16, width: "100%" }} onClick={() => setPhotoSrc(null)}>Try Again</button>
            </div>
          )}

          {result && result.match && (
            <div style={{ ...css.card, background: "#064e3b", borderColor: T.green, color: "#6ee7b7", textAlign: "center", padding: 16, width: "100%" }}>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Match Found!</div>
              <div style={{ fontSize: 22, color: "#fff", fontWeight: 700 }}>{result.match.name}</div>
              <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 16 }}>REC-{result.match.id} (Confidence: {((1 - result.distance) * 100).toFixed(1)}%)</div>
              <button style={{ ...css.btnAccent, width: "100%", marginBottom: 8 }} onClick={() => navigate("detail", { id: result.match.id })}>
                View Full Record
              </button>
              <button style={{ ...css.btn, width: "100%" }} onClick={() => setPhotoSrc(null)}>Search Another</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── CompareView ────────────────────────────────────────────── */
function CompareView({ records, goBack }) {
  const [suspect1Id, setSuspect1Id] = useState("");
  const [suspect2Id, setSuspect2Id] = useState("");

  const s1 = records.find(r => r.id === suspect1Id);
  const s2 = records.find(r => r.id === suspect2Id);

  const renderSuspect = (s, setS) => (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10, ...css.card, padding: 10, overflow: "hidden" }}>
      <select style={{ ...css.input, padding: "8px" }} value={s ? s.id : ""} onChange={e => setS(e.target.value)}>
        <option value="">Select Suspect...</option>
        {records.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
      </select>
      {s && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10, alignItems: "center" }}>
          {s.photo ? (
            <img src={s.photo} style={{ width: 100, height: 100, objectFit: "cover", borderRadius: 50, border: `2px solid ${T.accent}` }} />
          ) : (
            <div style={{ width: 100, height: 100, background: T.card2, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 50, border: `2px solid ${T.muted}` }}>
              <User size={40} color={T.muted} />
            </div>
          )}
          <div style={{ fontSize: 16, fontWeight: 700, color: T.text, textAlign: "center" }}>{s.name}</div>

          <div style={{ width: "100%", background: T.card2, padding: 8, borderRadius: 8, marginTop: 8 }}>
            <div style={{ fontSize: 11, color: T.muted, textTransform: "uppercase" }}>Threat Level</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: getThreatLevel(s).color }}>{getThreatLevel(s).level}</div>
          </div>

          <div style={{ width: "100%", background: T.card2, padding: 8, borderRadius: 8 }}>
            <div style={{ fontSize: 11, color: T.muted, textTransform: "uppercase" }}>Pending Cases</div>
            <div style={{ fontSize: 13, color: T.text }}>{s.casesPending || "None"}</div>
          </div>

          <div style={{ width: "100%", background: T.card2, padding: 8, borderRadius: 8 }}>
            <div style={{ fontSize: 11, color: T.muted, textTransform: "uppercase" }}>Associates</div>
            <div style={{ fontSize: 13, color: T.text }}>{s.associates || "None"}</div>
          </div>

          <div style={{ width: "100%", background: T.card2, padding: 8, borderRadius: 8 }}>
            <div style={{ fontSize: 11, color: T.muted, textTransform: "uppercase" }}>Area</div>
            <div style={{ fontSize: 13, color: T.text }}>{s.areaOfOperation || "Unknown"}</div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div style={{ padding: "72px 14px 14px" }}>
      <div style={{ fontSize: 16, fontWeight: 700, color: T.accent, marginBottom: 16 }}>Suspect Comparison</div>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        {renderSuspect(s1, setSuspect1Id)}
        {renderSuspect(s2, setSuspect2Id)}
      </div>
    </div>
  );
}

/* ─── SettingsView ───────────────────────────────────────────── */
function SettingsView({ settings, saveSettings, timeTheme, toastShow, onSelectSource, onMigrateData, navigate }) {
  const [s, setS] = useState(() => ({
    ...settings,
    googleApiKey: settings.googleApiKey || settings.googleAPIKey || "",
    googleSheetLink: sheetLinkFromSettings(settings),
    googleWebAppUrl: settings.googleWebAppUrl || "",
    officerId: settings.officerId || "",
    apiSecret: settings.apiSecret || "",
    e2eKey: settings.e2eKey || "",
  }));
  const [linkError, setLinkError] = useState("");
  const [showCloudApi, setShowCloudApi] = useState(!!(settings.googleApiKey && !settings.googleWebAppUrl));
  const [migrateFrom, setMigrateFrom] = useState("local");
  const [migrateTo, setMigrateTo] = useState("");
  const [migrating, setMigrating] = useState(false);

  const parsedLink = parseGoogleSheetInput(s.googleSheetLink);
  const webAppReady = !!(s.googleWebAppUrl || "").trim().startsWith("http");

  const [isTestingGoogle, setIsTestingGoogle] = useState(false);

  const saveGoogleSettings = async () => {
    const webUrl = (s.googleWebAppUrl || "").trim();
    const { sheetId, link, error } = parseGoogleSheetInput(s.googleSheetLink);
    if (!webUrl && (error || !sheetId)) {
      setLinkError(error || "Add Web App URL or a valid Sheet link");
      toastShow?.("Add Apps Script Web App URL (recommended) or Sheet link", "warning");
      return;
    }
    setLinkError("");

    if (webUrl) {
      try {
        setIsTestingGoogle(true);
        toastShow?.("Testing Google connection...", "warning");
        const res = await fetch(webUrl, {
          method: "POST", mode: "cors", redirect: "follow",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({ action: "read" })
        });
        const text = await res.text();
        const json = JSON.parse(text);
        if (json.status === "error") throw new Error(json.message);
      } catch (err) {
        setIsTestingGoogle(false);
        toastShow?.("Connection Failed! Check CORS or URL in Documentation.", "error");
        return; // Halt save!
      }
    }
    setIsTestingGoogle(false);

    const next = {
      ...s,
      googleWebAppUrl: webUrl,
      googleApiKey: (s.googleApiKey || "").trim(),
      googleSheetLink: link || s.googleSheetLink,
      googleSheetId: sheetId || settings.googleSheetId,
      useManualGoogleAPI: true,
      enableGoogleSync: !!s.enableGoogleSync,
    };
    delete next.googleAPIKey;
    saveSettings(next);
    setS(next);
    toastShow?.(webUrl ? "Google Sheets Connected & Saved!" : "Google Sheet settings saved", "success");
  };

  const sheetsReady = webAppReady || !!parsedLink.sheetId;

  return (
    <div style={{ padding: "72px 14px 80px" }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: T.accent, marginBottom: 8 }}>Settings</div>
      <div style={{ fontSize: 11, color: T.muted, marginBottom: 20 }}>
        Theme: {timeTheme?.label || "Auto"} ({timeTheme?.period || "—"})
      </div>

      <button 
        style={{ ...css.btnAccent, width: "100%", marginBottom: 20, padding: "14px", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 14 }}
        onClick={() => navigate && navigate("docs")}
      >
        <FileText size={18} /> Open User Manual & Documentation
      </button>

      <div style={{ ...css.card, marginBottom: 16, padding: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.accent, marginBottom: 12 }}>Active data source</div>
        <DataSourcePanel
          compact
          activeSource={settings.activeDataSource || "local"}
          onSelectSource={(id) => {
            onSelectSource?.(id);
            saveSettings({ ...settings, activeDataSource: id });
          }}
          onLoad={() => toastShow?.("Use Load on Home screen", "warning")}
          isLoading={false}
          settings={settings}
        />
      </div>

      {/* Cross-Database Migration */}
      <div style={{ ...css.card, display: "flex", flexDirection: "column", gap: 16, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.accent, display: "flex", alignItems: "center", gap: 8 }}>
          <Database size={14} />
          Cross-Database Migration
        </div>
        <div style={{ fontSize: 12, color: T.muted }}>Move your entire database from one source to another. This will OVERWRITE the destination database.</div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ flex: 1 }}>
            <div style={css.label}>Migrate From</div>
            <select style={css.input} value={migrateFrom} onChange={e => setMigrateFrom(e.target.value)}>
              <option value="local">Local Storage</option>
              <option value="google" disabled={!isGoogleSheetsConfigured(settings)}>Google Sheets {isGoogleSheetsConfigured(settings) ? "" : "(Not Setup)"}</option>
              <option value="database" disabled={!(settings?.dbApiUrl)}>Custom Database {(settings?.dbApiUrl) ? "" : "(Not Setup)"}</option>
            </select>
          </div>
          <div style={{ color: T.muted, marginTop: 20 }}>→</div>
          <div style={{ flex: 1 }}>
            <div style={css.label}>Migrate To</div>
            <select style={css.input} value={migrateTo} onChange={e => setMigrateTo(e.target.value)}>
              <option value="">Select Target...</option>
              {migrateFrom !== "local" && <option value="local">Local Storage</option>}
              {migrateFrom !== "google" && <option value="google" disabled={!isGoogleSheetsConfigured(settings)}>Google Sheets {isGoogleSheetsConfigured(settings) ? "" : "(Not Setup)"}</option>}
              {migrateFrom !== "database" && <option value="database" disabled={!(settings?.dbApiUrl)}>Custom Database {(settings?.dbApiUrl) ? "" : "(Not Setup)"}</option>}
            </select>
          </div>
        </div>
        <button style={{ ...css.btnAccent, width: "100%", padding: "12px", opacity: (!migrateTo || migrating) ? 0.5 : 1, pointerEvents: (!migrateTo || migrating) ? "none" : "auto" }} onClick={async () => {
            if (!migrateTo || migrateTo === migrateFrom) return;
            if (!confirm(`Are you sure you want to overwrite ${migrateTo} with data from ${migrateFrom}?`)) return;
            setMigrating(true);
            try { await onMigrateData(migrateFrom, migrateTo); toastShow("Migration successful!"); }
            catch (e) { toastShow(e.message || "Migration failed", "danger"); }
            setMigrating(false);
        }}>
          {migrating ? "Migrating Data..." : "Start Migration"}
        </button>
      </div>

      {/* Google Sheets */}
      <div style={{ ...css.card, display: "flex", flexDirection: "column", gap: 16, padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.accent, display: "flex", alignItems: "center", gap: 8 }}>
          <Cloud size={14} />
          Google Sheets
        </div>

        <div style={{ background: "rgba(16, 185, 129, 0.12)", padding: 12, borderRadius: 10, border: "1px solid rgba(16, 185, 129, 0.35)", marginBottom: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#6ee7b7", marginBottom: 6 }}>Free — no Google Cloud API</div>
          <div style={{ fontSize: 11, color: T.muted, lineHeight: 1.55 }}>
            1. Open your sheet → <strong>Extensions → Apps Script</strong><br />
            2. Paste code from <code style={{ color: "#6ee7b7" }}>scripts/CrimeTrackGoogleWebApp.gs</code><br />
            3. <strong>Deploy → Web app</strong> → access: <strong>Anyone</strong><br />
            4. Paste the Web App URL below
          </div>
        </div>

        <div>
          <label style={{ fontSize: 11, color: T.muted, textTransform: "uppercase", display: "block", marginBottom: 6 }}>Apps Script Web App URL (recommended)</label>
          <input
            style={css.input}
            placeholder="https://script.google.com/macros/s/.../exec"
            value={s.googleWebAppUrl || ""}
            onChange={e => setS({ ...s, googleWebAppUrl: e.target.value })}
            type="url"
            autoComplete="off"
          />
          {webAppReady && (
            <div style={{ fontSize: 10, color: "var(--ct-green)", marginTop: 6 }}>Web App URL ready — no API key needed</div>
          )}
        </div>

        <div>
          <label style={{ fontSize: 11, color: T.muted, textTransform: "uppercase", display: "block", marginBottom: 6 }}>Google Sheet link (optional — open in browser)</label>
          <input
            style={{ ...css.input, borderColor: linkError ? "var(--ct-red)" : undefined }}
            placeholder="https://docs.google.com/spreadsheets/d/..."
            value={s.googleSheetLink || ""}
            onChange={e => {
              setS({ ...s, googleSheetLink: e.target.value });
              setLinkError("");
            }}
            type="url"
            autoComplete="off"
          />
          {linkError && <div style={{ fontSize: 11, color: "var(--ct-red)", marginTop: 6 }}>{linkError}</div>}
          {parsedLink.sheetId && !linkError && (
            <div style={{ fontSize: 10, color: "var(--ct-green)", marginTop: 6 }}>Sheet recognized</div>
          )}
          <div style={{ fontSize: 9, color: T.muted, marginTop: 4 }}>Example: https://docs.google.com/spreadsheets/d/abc123.../edit</div>
        </div>

        {parsedLink.link && (
          <a
            href={parsedLink.link}
            target="_blank"
            rel="noopener noreferrer"
            style={{ ...css.btn, fontSize: 12, textDecoration: "none" }}
          >
            Open sheet in browser
          </a>
        )}

        <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
          <input type="checkbox" checked={showCloudApi} onChange={e => setShowCloudApi(e.target.checked)} />
          <span style={{ fontSize: 11, color: T.muted }}>Advanced: use Google Cloud API key instead</span>
        </label>

        {showCloudApi && (
          <div>
            <label style={{ fontSize: 11, color: T.muted, textTransform: "uppercase", display: "block", marginBottom: 6 }}>Google Cloud API key</label>
            <input
              style={css.input}
              placeholder="AIza... (Google Cloud Console)"
              value={s.googleApiKey || ""}
              onChange={e => setS({ ...s, googleApiKey: e.target.value })}
              type="password"
              autoComplete="off"
            />
            <div style={{ fontSize: 9, color: T.muted, marginTop: 4 }}>Enable Sheets API in Cloud Console. Free within quotas. Web App method above is easier.</div>
          </div>
        )}

        <label style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <input type="checkbox" checked={!!s.enableGoogleSync} onChange={e => setS({ ...s, enableGoogleSync: e.target.checked })} style={{ marginTop: 3 }} />
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: T.text }}>Enable auto sync</div>
            <div style={{ fontSize: 10, color: T.muted }}>Push local records to the sheet when data changes</div>
          </div>
        </label>

        <button style={{ ...css.btnAccent, opacity: sheetsReady ? 1 : 0.55 }} disabled={!sheetsReady} onClick={saveGoogleSettings}>
          <Cloud size={14} />
          Save Google Sheets setup
        </button>

        {isGoogleSheetsConfigured(settings) && (
          <div style={{ background: "var(--ct-input-bg)", padding: 10, borderRadius: 8, borderLeft: `3px solid ${T.green}`, fontSize: 11, color: T.text }}>
            {isAppsScriptConfigured(settings)
              ? "Connected via Apps Script (no Cloud API)"
              : "Connected via Cloud API key"}
            {settings.enableGoogleSync ? " — auto sync on" : ""}
          </div>
        )}
      </div>

      {/* Custom Database Sync */}
      <div style={{ ...css.card, display: "flex", flexDirection: "column", gap: 16, padding: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.accent }}>Custom Database API</div>
        
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 11, color: T.muted, textTransform: "uppercase", display: "block", marginBottom: 6 }}>Database Type</label>
            <select style={css.input} value={s.dbType || "rest"} onChange={e => setS({ ...s, dbType: e.target.value })}>
              <option value="rest">Generic REST API</option>
              <option value="mysql">MySQL Database</option>
              <option value="mongo">MongoDB</option>
            </select>
          </div>
        </div>

        {s.dbType === 'mysql' && (
          <div style={{ background: "rgba(88, 166, 255, 0.12)", padding: 12, borderRadius: 10, border: "1px solid rgba(88, 166, 255, 0.35)", marginBottom: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ct-accent)", marginBottom: 6 }}>MySQL Auto-Setup Available</div>
            <div style={{ fontSize: 11, color: T.muted, lineHeight: 1.55 }}>
              React cannot connect directly to MySQL for security. We've provided a Node.js server script that auto-creates the DB and tables!
              <br/><br/>
              1. Grab <code>backend-mysql.js</code> from the app's public folder.<br/>
              2. Run <code>node backend-mysql.js</code> on your server.<br/>
              3. Paste the server URL below.
            </div>
          </div>
        )}

        {s.dbType === 'mongo' && (
          <div style={{ background: "rgba(16, 185, 129, 0.12)", padding: 12, borderRadius: 10, border: "1px solid rgba(16, 185, 129, 0.35)", marginBottom: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ct-green)", marginBottom: 6 }}>MongoDB Auto-Setup Available</div>
            <div style={{ fontSize: 11, color: T.muted, lineHeight: 1.55 }}>
              React cannot connect directly to MongoDB. We've provided a Node.js server script that auto-creates the collection!
              <br/><br/>
              1. Grab <code>backend-mongo.js</code> from the app's public folder.<br/>
              2. Run <code>node backend-mongo.js</code> on your server.<br/>
              3. Paste the server URL below.
            </div>
          </div>
        )}

        <div>
          <label style={{ fontSize: 11, color: T.muted, textTransform: "uppercase", display: "block", marginBottom: 6 }}>Server API URL</label>
          <input style={css.input} placeholder="http://localhost:3000/api/records" value={s.dbApiUrl || ""} onChange={e => setS({ ...s, dbApiUrl: e.target.value })} />
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <input type="checkbox" checked={s.enableDbSync || false} onChange={e => setS({ ...s, enableDbSync: e.target.checked })} />
          <span style={{ fontSize: 12 }}>Enable Background Sync</span>
        </label>

        <button 
          style={{ ...css.btnAccent, opacity: (s.dbApiUrl || "").trim() ? 1 : 0.5 }} 
          disabled={!(s.dbApiUrl || "").trim()} 
          onClick={async () => {
            const url = (s.dbApiUrl || "").trim();
            if (!url) return;
            try {
              toastShow?.("Testing DB connection...", "warning");
              let success = false;
              for (const p of ["/records", "/api/records", ""]) {
                try {
                  const r = await fetch(`${url.replace(/\/$/, "")}${p}`);
                  if (r.ok) { success = true; break; }
                } catch (e) {}
              }
              if (!success) {
                toastShow?.("Connection Failed! Is your server running?", "error");
                return; // Halt save!
              }
              saveSettings(s);
              toastShow?.("Database Connected & Saved!", "success");
            } catch (err) {
              toastShow?.("Error testing connection.", "error");
            }
          }}
        >
          <Database size={14} style={{ display: "inline-block", marginRight: 8, verticalAlign: "middle" }}/>
          Save Configuration
        </button>
      </div>

      {/* Enterprise Security */}
      <div style={{ ...css.card, display: "flex", flexDirection: "column", gap: 16, padding: 16, marginTop: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.accent }}>Enterprise Security</div>
        
        <div>
          <label style={{ fontSize: 11, color: T.muted, textTransform: "uppercase", display: "block", marginBottom: 6 }}>Officer ID / Badge Number (For Audit Logs)</label>
          <input style={css.input} placeholder="e.g. Officer 405" value={s.officerId || ""} onChange={e => setS({ ...s, officerId: e.target.value })} autoComplete="off" />
        </div>

        <div>
          <label style={{ fontSize: 11, color: T.muted, textTransform: "uppercase", display: "block", marginBottom: 6 }}>API Secret Key (Protection)</label>
          <input style={css.input} type="password" placeholder="Must match API_SECRET in backend" value={s.apiSecret || ""} onChange={e => setS({ ...s, apiSecret: e.target.value })} autoComplete="off" />
        </div>

        <div>
          <label style={{ fontSize: 11, color: T.muted, textTransform: "uppercase", display: "block", marginBottom: 6 }}>End-to-End Encryption Key</label>
          <input style={css.input} type="password" placeholder="Leave blank to disable encryption" value={s.e2eKey || ""} onChange={e => setS({ ...s, e2eKey: e.target.value })} autoComplete="off" />
          <div style={{ fontSize: 10, color: "var(--ct-red)", marginTop: 6 }}>WARNING: Changing this key will render existing encrypted databases unreadable!</div>
        </div>

        <button 
          style={css.btnAccent} 
          onClick={() => {
            saveSettings(s);
            toastShow?.("Security Settings Saved!", "success");
          }}
        >
          Save Security Settings
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [records, setRecords] = useState([]);
  const [settings, setSettings] = useState(() => {
    const raw = localStorage.getItem("crimetrack_settings");
    const defaults = {
      dbApiUrl: "",
      enableDbSync: false,
      googleSheetId: "",
      googleSheetLink: "",
      googleWebAppUrl: "",
      googleApiKey: "",
      enableGoogleSync: false,
      useManualGoogleAPI: true,
      activeDataSource: "local",
      officerId: "",
      apiSecret: "",
      e2eKey: "",
    };
    if (!raw) return defaults;
    try {
      const parsed = JSON.parse(raw);
      if (parsed.googleAPIKey && !parsed.googleApiKey) parsed.googleApiKey = parsed.googleAPIKey;
      delete parsed.googleAPIKey;
      if (!parsed.googleSheetLink && parsed.googleSheetId) {
        parsed.googleSheetLink = `https://docs.google.com/spreadsheets/d/${parsed.googleSheetId}/edit`;
      }
      return { ...defaults, ...parsed, useManualGoogleAPI: true };
    } catch {
      return defaults;
    }
  });

  const saveSettings = (newSettings) => {
    setSettings(newSettings);
    localStorage.setItem("crimetrack_settings", JSON.stringify(newSettings));
    toast_show("Settings saved!");
  };

  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("dashboard");
  const [navStack, setNavStack] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [editingRecord, setEditingRecord] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({ year: "", sex: "", status: "", area: "" });
  const [showFilters, setShowFilters] = useState(false);
  const [toast, setToast] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState("");
  const [pinMode, setPinMode] = useState("none");
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [timeTheme, setTimeTheme] = useState(() => {
    const t = getTimeBasedTheme();
    if (typeof document !== "undefined") {
      Object.entries(themeToCssVars(t)).forEach(([key, value]) => {
        document.documentElement.style.setProperty(key, value);
      });
    }
    return t;
  });

  useEffect(() => {
    Object.entries(themeToCssVars(timeTheme)).forEach(([key, value]) => {
      document.documentElement.style.setProperty(key, value);
    });
  }, [timeTheme]);
  const [showGoogleSync, setShowGoogleSync] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMode, setSyncMode] = useState('append');
  const [sourceLoading, setSourceLoading] = useState(false);
  const [gridSaving, setGridSaving] = useState(false);
  const isOnline = useNetworkStatus();

  const [notifications, setNotifications] = useState(() => {
    const saved = localStorage.getItem("crimetrack_notifications");
    return saved ? JSON.parse(saved) : [];
  });

  const addNotification = (title, text, type = "system") => {
    setNotifications(prev => {
      const newNotifs = [{ id: Date.now(), title, text, type, time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }, ...prev].slice(0, 50);
      localStorage.setItem("crimetrack_notifications", JSON.stringify(newNotifs));
      return newNotifs;
    });

    if (window.Notification) {
      if (Notification.permission === "granted") {
        new Notification(title, { body: text, icon: "/icon.png" });
      } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then(permission => {
          if (permission === "granted") new Notification(title, { body: text, icon: "/icon.png" });
        });
      }
    }
  };

  const clearNotifications = () => {
    setNotifications([]);
    localStorage.removeItem("crimetrack_notifications");
  };

  const activeDataSource = settings.activeDataSource || "local";

  const readLocalRecords = () => {
    const r = localStorage.getItem("crimetrack_v3");
    if (!r) return [];
    if (r.startsWith("[")) return JSON.parse(r);
    return decryptData(r) || [];
  };

  const lastSeenLogRef = useRef(new Date().toISOString());

  useEffect(() => {
    if (!settings.backgroundSync || activeDataSource === SOURCES.LOCAL || !isOnline) return;
    const intervalId = setInterval(async () => {
      try {
        const freshRecords = await loadRecordsForSource(activeDataSource, settings);
        if (freshRecords && Array.isArray(freshRecords)) {
          setRecords((currentRecords) => {
            if (currentRecords.length > 0) {
              const oldSig = currentRecords.map(r => r.id + (r.updatedAt || "")).sort().join(",");
              const newSig = freshRecords.map(r => r.id + (r.updatedAt || "")).sort().join(",");
              if (oldSig !== newSig) {
                const msg = `Database updated remotely. Fetched ${freshRecords.length} records.`;
                addNotification("Remote Sync", msg, "system");
                if ("Notification" in window && Notification.permission === "granted") {
                  new Notification("CrimeTrack Alert", { body: msg, icon: "/icon.png" });
                }
              }
            }
            return freshRecords;
          });
        }
        
        const freshLogs = await loadLogsForSource(activeDataSource, settings);
        if (freshLogs && Array.isArray(freshLogs) && freshLogs.length > 0) {
          const newLogs = freshLogs.filter(l => l.timestamp > lastSeenLogRef.current);
          if (newLogs.length > 0) {
            const maxTimestamp = newLogs.reduce((max, l) => l.timestamp > max ? l.timestamp : max, lastSeenLogRef.current);
            lastSeenLogRef.current = maxTimestamp;

            newLogs.forEach(log => {
              if (log.officerId === settings.officerId) return; // Don't notify self
              const msg = `${log.officerId || "An Officer"} performed: ${log.event}\n${log.details}`;
              addNotification("Audit Log Alert", msg, "system");
              if ("Notification" in window && Notification.permission === "granted") {
                new Notification("CrimeTrack Alert", { body: msg, icon: "/icon.png" });
              }
            });
          }
        }
      } catch(e) {
        // Silently fail for background sync to avoid spamming toasts
        console.warn("Background sync failed:", e);
      }
    }, 15000); // 15 second interval
    return () => clearInterval(intervalId);
  }, [settings.backgroundSync, activeDataSource, settings.googleWebAppUrl, settings.dbApiUrl, isOnline]);

  useEffect(() => {
    loadData();
    performBiometricAuth();
    if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
      Notification.requestPermission();
    }

    // Update time-based theme every minute
    const themeInterval = setInterval(() => setTimeTheme(getTimeBasedTheme()), 60000);

    const loadModels = async () => {
      try {
        await human.load();
        await human.warmup();
        setModelsLoaded(true);
      } catch (e) {
        console.error("Failed to load Human AI models", e);
      }
    };
    loadModels();
    if (Capacitor.isNativePlatform()) {
      CapApp.addListener('backButton', ({ canGoBack }) => {
        setNavStack(currentStack => {
          if (currentStack.length > 0) {
            const prev = currentStack[currentStack.length - 1];
            setView(prev.view);
            setSelectedId(prev.selectedId);
            setEditingRecord(prev.editingRecord);
            return currentStack.slice(0, -1);
          } else {
            CapApp.exitApp();
            return currentStack;
          }
        });
      });
    }
    return () => {
      clearInterval(themeInterval);
      if (Capacitor.isNativePlatform()) {
        CapApp.removeAllListeners();
      }
    };
  }, []);

  const loadData = () => {
    try {
      const parsed = readLocalRecords();
      if (parsed?.length) setRecords(parsed);
      else setRecords([]);
    } catch {
      setRecords([]);
    }
    setLoading(false);
  };

  const handleMigrateData = async (fromSource, toSource) => {
    if (fromSource === toSource) throw new Error("Cannot migrate to the same source");
    let data;
    if (fromSource === "local") {
      data = readLocalRecords();
    } else {
      data = await loadRecordsForSource(fromSource, settings, readLocalRecords);
    }
    if (!data || data.length === 0) throw new Error("Source database is empty");

    if (toSource === "local") {
      localStorage.setItem("crimetrack_v3", encryptData(data));
      if (activeDataSource === "local") setRecords(data);
    } else {
      await saveRecordsForSource(toSource, settings, data);
      if (activeDataSource === toSource) setRecords(data);
    }
    
    addNotification("Data Migration", `Migrated ${data.length} records from ${SOURCE_UI[fromSource]?.label || fromSource} to ${SOURCE_UI[toSource]?.label || toSource}.`, "sync");
  };

  const handleSelectSource = (source) => {
    if (source !== "local") {
      setRecords([]);
    } else {
      setRecords(readLocalRecords());
    }
    const next = { ...settings, activeDataSource: source };
    setSettings(next);
    localStorage.setItem("crimetrack_settings", JSON.stringify(next));
  };

  const handleLoadSource = async (source) => {
    setSourceLoading(true);
    try {
      let data;
      if (source === "local") {
        data = readLocalRecords();
      } else {
        data = await loadRecordsForSource(source, settings, readLocalRecords);
      }
      setRecords(data);
      localStorage.setItem("crimetrack_v3", encryptData(data));
      const next = { ...settings, activeDataSource: source };
      setSettings(next);
      localStorage.setItem("crimetrack_settings", JSON.stringify(next));
      toast_show(`Loaded ${data.length} records from ${SOURCE_UI[source].label}`);
      addNotification("Data Synced", `Successfully loaded ${data.length} records from ${SOURCE_UI[source].label}.`, "sync");
    } catch (err) {
      console.error(err);
      toast_show(err.message || "Load failed", "danger");
      if (source !== "local") setRecords([]);
    } finally {
      setSourceLoading(false);
    }
  };

  const persist = async (recs) => {
    setRecords(recs);
    try {
      localStorage.setItem("crimetrack_v3", encryptData(recs));
    } catch {
      toast_show("Storage quota exceeded. Reduce photo sizes.", "danger");
      return;
    }
    const source = settings.activeDataSource || "local";
    if (source === "local") return;
    try {
      await saveRecordsForSource(source, settings, recs);
    } catch (err) {
      console.error(err);
      toast_show(`Saved locally; cloud: ${err.message}`, "warning");
    }
  };

  const saveGridToSource = async (recs) => {
    setGridSaving(true);
    try {
      await persist(recs);
      if (activeDataSource !== "local") {
        sendAuditLog(activeDataSource, settings, "BULK_EDIT", "Saved Excel spreadsheet changes to database");
      }
      toast_show(`Saved ${recs.length} rows to ${SOURCE_UI[activeDataSource]?.label}`);
    } catch (e) {
      toast_show(e.message || "Save failed", "danger");
    } finally {
      setGridSaving(false);
    }
  };

  const performBiometricAuth = async () => {
    if (!Capacitor.isNativePlatform()) {
      const savedPin = localStorage.getItem("crimetrack_pin");
      if (savedPin) setPinMode("verify");
      else setPinMode("setup");
      return;
    }
    try {
      setAuthError("");
      await NativeBiometric.verifyIdentity({
        reason: "Unlock CrimeTrack Pro",
        title: "App Locked",
        subtitle: "Authenticate to access records",
        description: "Please authenticate with your Face ID, Fingerprint, or PIN.",
        useFallback: true
      });
      setIsAuthenticated(true);
    } catch (err) {
      console.error("Auth failed:", err);
      if (settings.appPin) {
        setAuthError("");
        setPinMode("verify");
      } else {
        setAuthError("Authentication failed or was canceled.");
      }
    }
  };

  const handlePinSubmit = () => {
    if (pinMode === "setup") {
      if (pinInput.length < 4) {
        setPinError("PIN must be at least 4 characters.");
        return;
      }
      localStorage.setItem("crimetrack_pin", pinInput);
      setPinMode("none");
      setIsAuthenticated(true);
    } else if (pinMode === "verify") {
      const savedPin = localStorage.getItem("crimetrack_pin");
      if (pinInput === savedPin) {
        setPinMode("none");
        setIsAuthenticated(true);
      } else {
        setPinError("Incorrect PIN.");
        setPinInput("");
      }
    }
  };

  const navigate = (newView, params = {}) => {
    setNavStack(s => [...s, { view, selectedId, editingRecord }]);
    setView(newView);
    if (params.id !== undefined) setSelectedId(params.id);
    if ("record" in params) setEditingRecord(params.record);
  };

  const goBack = () => {
    if (!navStack.length) { setView("dashboard"); return; }
    const prev = navStack[navStack.length - 1];
    setNavStack(s => s.slice(0, -1));
    setView(prev.view);
    setSelectedId(prev.selectedId);
    setEditingRecord(prev.editingRecord);
  };

  const navTo = (tab) => {
    setNavStack([]); setView(tab); setSelectedId(null); setEditingRecord(null);
    setSearchQuery("");
  };

  const toast_show = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const addRecord = async (r, targetSource = activeDataSource) => { 
    const rec = { ...r, id: genId(), createdAt: new Date().toISOString() }; 
    if (targetSource === activeDataSource) {
      await persist([...records, rec]); 
      toast_show("Record added"); 
      goBack(); 
    } else {
      setSourceLoading(true);
      try {
        let targetData = [];
        if (targetSource === "local") {
          targetData = readLocalRecords();
        } else {
          targetData = await loadRecordsForSource(targetSource, settings, readLocalRecords);
        }
        targetData.push(rec);
        if (targetSource === "local") {
          localStorage.setItem("crimetrack_v3", encryptData(targetData));
        } else {
          await saveRecordsForSource(targetSource, settings, targetData);
        }
        if (targetSource !== "local") {
          sendAuditLog(targetSource, settings, "RECORD_EDIT", `Saved record: ${rec.name || "Unknown"} (ID: ${rec.id})`);
        }
        toast_show(`Record added to ${SOURCE_UI[targetSource]?.label || targetSource}`);
        addNotification("Record Added", `Successfully saved ${rec.name} to ${SOURCE_UI[targetSource]?.label || targetSource}.`, "system");
        goBack();
      } catch (err) {
        toast_show(err.message || "Save failed", "danger");
      } finally {
        setSourceLoading(false);
      }
    }
  };
  const updateEntireDatabase = async (newRecs) => { await persist(newRecs); toast_show("Database updated!"); addNotification("Database Updated", "Bulk update successful.", "system"); goBack(); };
  const updateRecord = async (r) => { await persist(records.map(x => x.id === r.id ? { ...r, updatedAt: new Date().toISOString() } : x)); toast_show("Record updated"); addNotification("Record Updated", `Successfully updated ${r.name}.`, "system"); goBack(); };
  const quickUpdateRecord = async (r) => { await persist(records.map(x => x.id === r.id ? { ...r, updatedAt: new Date().toISOString() } : x)); toast_show("Status updated"); addNotification("Status Updated", `Successfully updated status for ${r.name}.`, "system"); };
  const deleteRecord = async (id) => { 
    setDeleteConfirm(null); 
    if (view === "detail") goBack(); 
    await persist(records.filter(r => r.id !== id)); 
    toast_show("Record deleted", "danger"); 
    addNotification("Record Deleted", `Successfully deleted a record.`, "alert"); 
  };

  // Replaced broken AI search with robust local multi-term matching
  const getFiltered = () => {
    let f = [...records];
    if (searchQuery.trim()) {
      const terms = searchQuery.toLowerCase().split(" ").filter(Boolean);
      f = f.filter(r => {
        const fullString = ["name", "fatherName", "hsNo", "address", "areaOfOperation", "casesPending", "gangLeader", "associates", "policeStation"]
          .map(k => (r[k] || "")).join(" ").toLowerCase();
        return terms.every(term => fullString.includes(term));
      });
    }
    if (filters.year) f = f.filter(r => String(r.caseYear) === filters.year);
    if (filters.sex) f = f.filter(r => r.sex === filters.sex);
    if (filters.status) f = f.filter(r => r.status === filters.status);
    if (filters.area) f = f.filter(r => (r.areaOfOperation || "").toLowerCase().includes(filters.area.toLowerCase()));
    return f;
  };

  // Offline Backup Capabilities
  const handleExportData = async () => {
    toast_show("Generating backup ZIP...");
    try {
      if (Capacitor.isNativePlatform()) {
        const perm = await Filesystem.requestPermissions();
        if (perm.publicStorage !== 'granted') {
          toast_show("Permission denied to save backup.", "danger");
          return;
        }
      }
      const zip = new JSZip();
      const recordsWithoutImages = records.map(r => {
        const { photo, ...rest } = r;
        if (photo) {
          const base64Data = photo.split(',')[1];
          if (base64Data) {
            zip.folder("images").file(`${r.id}.jpg`, base64Data, { base64: true });
          }
        }
        return rest;
      });
      zip.file("data.json", JSON.stringify(recordsWithoutImages, null, 2));
      const zipBase64 = await zip.generateAsync({ type: "base64" });
      const fileName = `CrimeTrack_Backup_${new Date().getTime()}.zip`;

      if (Capacitor.isNativePlatform()) {
        await Filesystem.writeFile({
          path: fileName,
          data: zipBase64,
          directory: Directory.Documents
        });
        toast_show(`Backup ZIP saved to Documents/${fileName}`, "success");
      } else {
        const blob = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
        toast_show("Backup ZIP downloaded.", "success");
      }
    } catch (err) {
      console.error(err);
      toast_show("Backup failed: " + err.message, "danger");
    }
  };

  const handleImportData = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      toast_show("Restoring from backup...");

      // Fallback for old JSON backups
      if (file.name.endsWith('.json')) {
        const text = await file.text();
        const imported = JSON.parse(text);
        if (Array.isArray(imported)) {
          await persist(imported);
          toast_show("Database restored successfully.");
        }
        return;
      }

      // Process new ZIP backups
      const zip = new JSZip();
      const zipContent = await zip.loadAsync(file);

      const dataFile = zipContent.file("data.json");
      if (!dataFile) throw new Error("No data.json found in ZIP.");

      const jsonText = await dataFile.async("text");
      const importedRecords = JSON.parse(jsonText);

      // Re-attach images
      for (const record of importedRecords) {
        const imageFile = zipContent.file(`images/${record.id}.jpg`);
        if (imageFile) {
          const base64Data = await imageFile.async("base64");
          record.photo = `data:image/jpeg;base64,${base64Data}`;
        }
      }

      if (Array.isArray(importedRecords)) {
        await persist(importedRecords);
        toast_show("Database restored successfully from ZIP.");
      }
    } catch (err) {
      console.error("Restore failed:", err);
      toast_show("Invalid backup file: " + err.message, "danger");
    }
  };

  const handleExportExcel = async () => {
    toast_show("Generating Excel file...");
    try {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Records");
      sheet.columns = EXCEL_COLUMNS;

      records.forEach((r, idx) => {
        const row = sheet.addRow(recordToExcelRow(r));
        row.height = 72;
        if (r.photo) embedPhotoInSheet(workbook, sheet, idx + 1, r.photo);
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const fileName = `CrimeTrack_Export_${new Date().getTime()}.xlsx`;

      if (Capacitor.isNativePlatform()) {
        const base64Str = btoa(new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));
        await Filesystem.writeFile({
          path: fileName,
          data: base64Str,
          directory: Directory.Documents
        });
        toast_show(`Excel Export saved to Documents/${fileName}`, "success");
      } else {
        const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
        toast_show("Excel Export downloaded.", "success");
      }
    } catch (err) {
      console.error(err);
      toast_show("Excel Export failed: " + err.message, "danger");
    }
  };

  const handleImportExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      toast_show("Importing from Excel...");
      const buffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);

      const sheet = workbook.getWorksheet(1);
      const newRecords = [];

      const imageMap = buildExcelImageMap(workbook, sheet);

      const headers = [];
      sheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) {
          row.eachCell((cell, colNumber) => {
            headers[colNumber] = cell.value?.toString().trim();
          });
        } else {
          const rec = {};
          row.eachCell((cell, colNumber) => {
            const h = headers[colNumber];
            if (h === 'ID') rec.id = cell.value?.toString();
            else if (h === 'Name') rec.name = cell.value?.toString();
            else if (h === 'Father Name') rec.fatherName = cell.value?.toString();
            else if (h === 'Age') rec.age = Number(cell.value) || null;
            else if (h === 'Sex') rec.sex = cell.value?.toString();
            else if (h === 'Status') rec.status = cell.value?.toString();
            else if (h === 'Police Station') rec.policeStation = cell.value?.toString();
            else if (h === 'HS No.') rec.hsNo = cell.value?.toString();
            else if (h === 'FIR Number') rec.firNumber = cell.value?.toString();
            else if (h === 'Cases Pending') rec.casesPending = cell.value?.toString();
            else if (h === 'Current Doings') rec.currentDoings = cell.value?.toString();
            else if (h === 'Area of Operation') rec.areaOfOperation = cell.value?.toString();
            else if (h === 'Associates') rec.associates = cell.value?.toString();
            else if (h === 'Gang Leader') rec.gangLeader = cell.value?.toString();
            else if (h === 'Created At') rec.createdAt = cell.value?.toString();
            else if (h === 'Photo' || h === 'photo') rec.photo = cell.value?.toString() || rec.photo;
            else if (h === 'Address') rec.address = cell.value?.toString();
            else if (h === 'FIR Date') rec.firDate = cell.value?.toString();
            else if (h === 'Case Year') rec.caseYear = Number(cell.value) || cell.value;
          });

          if (!rec.id) rec.id = genId();
          if (!rec.createdAt) rec.createdAt = new Date().toISOString();

          const imgRow = rowNumber - 1;
          if (imageMap[imgRow] != null) rec.photo = imageMap[imgRow];
          else if (imageMap[rowNumber] != null) rec.photo = imageMap[rowNumber];

          newRecords.push(rec);
        }
      });

      if (newRecords.length > 0) {
        await persist(newRecords);
        toast_show(`Excel Import successful! Loaded ${newRecords.length} records.`);
      } else {
        toast_show("No records found in Excel file.");
      }
    } catch (err) {
      console.error(err);
      toast_show("Excel Import failed: " + err.message, "danger");
    }
  };

  const generateAndSharePDF = async (record, actionType = 'share') => {
    toast_show("Generating PDF...");
    try {
      const doc = new jsPDF();
      doc.setFontSize(22);
      doc.setTextColor(245, 158, 11);
      doc.text(record.name || "Unknown", 14, 22);

      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Record ID: REC-${record.id}`, 14, 30);

      doc.setFontSize(14);
      doc.setTextColor(220, 38, 38);
      const threat = getThreatLevel(record);
      doc.text(`STATUS: ${(record.status || "Unknown").toUpperCase()} | THREAT: ${threat.level}`, 14, 38);

      let yPos = 48;

      if (record.photo) {
        try {
          const isPNG = record.photo.startsWith("data:image/png");
          const format = isPNG ? "PNG" : "JPEG";
          // Render photo small (45x45 mm) but showing the full image properly
          doc.addImage(record.photo, format, 15, yPos, 45, 45);
          yPos += 55;
        } catch (e) {
          console.error("Failed to add image to PDF", e);
        }
      }

      ["Personal Information", "Legal Details", "Criminal Profile"].forEach((sec, si) => {
        const keys = [
          ["name", "fatherName", "address", "age", "sex", "communityReligion", "familyMembers", "propertiesDetails", "policeStation"],
          ["hsNo", "firNumber", "firDate", "sessionNumber", "casesPending", "currentDoings", "caseYear", "status"],
          ["hideouts", "areaOfOperation", "gangLeader", "associates", "notes"]
        ][si];

        const body = keys.map(k => {
          const f = FIELDS.find(x => x.key === k);
          const v = record[k];
          return v && f ? [f.label, String(v)] : null;
        }).filter(Boolean);

        if (body.length > 0) {
          autoTable(doc, {
            startY: yPos,
            head: [[sec, ""]],
            body: body,
            theme: 'plain',
            headStyles: { fillColor: [245, 158, 11], textColor: [0, 0, 0], fontStyle: 'bold' },
            styles: { fontSize: 10, cellPadding: 4, lineColor: [220, 220, 220], lineWidth: 0.1 },
            columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60, textColor: [80, 80, 80] } }
          });
          yPos = doc.lastAutoTable.finalY + 10;
        }
      });

      if (Capacitor.isNativePlatform()) {
        const perm = await Filesystem.requestPermissions();
        if (perm.publicStorage !== 'granted') {
          toast_show("Permission denied to save PDF.", "danger");
          return;
        }
        const base64 = doc.output('datauristring').split(',')[1];
        const fileName = `CrimeTrack_${record.name.replace(/\s+/g, '_')}_${record.id}.pdf`;

        if (actionType === 'download') {
          await Filesystem.writeFile({
            path: fileName,
            data: base64,
            directory: Directory.Documents
          });
          toast_show(`PDF saved to Documents/${fileName}`);
        } else {
          const savedFile = await Filesystem.writeFile({
            path: fileName,
            data: base64,
            directory: Directory.Cache
          });
          try {
            await Share.share({
              title: `Accused Record - ${record.name}`,
              text: `Here is the record for ${record.name}.`,
              url: savedFile.uri,
              dialogTitle: 'Share PDF Record'
            });
          } catch (e) {
            console.log("Share sheet closed or failed:", e);
          }
        }
      } else {
        doc.save(`CrimeTrack_${record.name.replace(/\s+/g, '_')}.pdf`);
        toast_show("PDF downloaded.");
      }
    } catch (err) {
      console.error(err);
      toast_show("Failed to generate or share PDF.", "danger");
    }
  };

  const selectedRecord = records.find(r => r.id == selectedId);

  const getAnalytics = () => {
    const byYear = {}, byStatus = {}, bySex = {}, byArea = {};
    records.forEach(r => {
      if (r.caseYear) byYear[r.caseYear] = (byYear[r.caseYear] || 0) + 1;
      if (r.status) byStatus[r.status] = (byStatus[r.status] || 0) + 1;
      if (r.sex) bySex[r.sex] = (bySex[r.sex] || 0) + 1;
      if (r.areaOfOperation) { const a = r.areaOfOperation.split(",")[0].trim(); byArea[a] = (byArea[a] || 0) + 1; }
    });
    return {
      byYear: Object.entries(byYear).sort().map(([y, c]) => ({ year: y, count: c })),
      byStatus: Object.entries(byStatus).map(([s, c]) => ({ name: s, value: c })),
      bySex: Object.entries(bySex).map(([s, c]) => ({ name: s, value: c })),
      byArea: Object.entries(byArea).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([a, c]) => ({ area: a, count: c })),
    };
  };

  const shellBg = {
    className: "ct-app",
    style: {
      ...themeToCssVars(timeTheme),
      minHeight: "100vh",
      backgroundColor: timeTheme.bgColor,
      backgroundImage: timeTheme.gradient,
      backgroundSize: "cover",
      backgroundAttachment: "fixed",
    },
  };

  if (loading) return (
    <div {...shellBg}>
      <div className="ct-ambient" aria-hidden />
      <div className="ct-scrim" aria-hidden />
      <div style={{ position: "relative", zIndex: 1, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div className="ct-glass" style={{ ...css.card, textAlign: "center", maxWidth: 320, width: "100%" }}>
          <Shield size={48} color={timeTheme.accentColor} />
          <div className="ct-title" style={{ fontSize: 18, fontWeight: 800, marginTop: 12 }}>CrimeTrack</div>
          <div className="ct-muted" style={{ fontSize: 13, marginTop: 8 }}>Loading offline database…</div>
        </div>
      </div>
    </div>
  );

  if (!isAuthenticated && pinMode !== "none") return (
    <div {...shellBg}>
      <div className="ct-ambient" aria-hidden />
      <div className="ct-scrim" aria-hidden />
      <div style={{ position: "relative", zIndex: 1, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div className="ct-glass" style={{ ...css.card, textAlign: "center", maxWidth: 360, width: "100%" }}>
          <Shield size={56} color={timeTheme.accentColor} />
          <div className="ct-title" style={{ fontSize: 20, fontWeight: 800, marginTop: 12 }}>CrimeTrack</div>
          <div style={{ color: "var(--ct-text)", fontSize: 14, marginTop: 8 }}>
            {pinMode === "setup" ? "Set a 4-digit security PIN" : "Enter your security PIN"}
          </div>
          <input
            type="password"
            value={pinInput}
            onChange={e => setPinInput(e.target.value)}
            maxLength={8}
            style={{ ...css.input, textAlign: "center", fontSize: 24, letterSpacing: 8, width: "100%", maxWidth: 200, margin: "16px auto 0" }}
            placeholder="••••"
          />
          {pinError && <div style={{ color: "var(--ct-red)", fontSize: 13, marginTop: 8 }}>{pinError}</div>}
          <button style={{ ...css.btnAccent, width: "100%", marginTop: 16 }} onClick={handlePinSubmit}>
            <Lock size={18} /> {pinMode === "setup" ? "Set PIN" : "Unlock App"}
          </button>
        </div>
      </div>
    </div>
  );

  if (!isAuthenticated) return (
    <div {...shellBg}>
      <div className="ct-ambient" aria-hidden />
      <div className="ct-scrim" aria-hidden />
      <div style={{ position: "relative", zIndex: 1, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div className="ct-glass" style={{ ...css.card, textAlign: "center", maxWidth: 360, width: "100%" }}>
          <Shield size={56} color={timeTheme.accentColor} />
          <div className="ct-title" style={{ fontSize: 20, fontWeight: 800, marginTop: 12 }}>CrimeTrack</div>
          <div style={{ color: "var(--ct-text)", fontSize: 14, marginTop: 8 }}>App is locked for security.</div>
          {authError && <div style={{ color: "var(--ct-red)", fontSize: 13, marginTop: 8 }}>{authError}</div>}
          <button style={{ ...css.btnAccent, width: "100%", marginTop: 20 }} onClick={performBiometricAuth}>
            <Lock size={18} /> Unlock App
          </button>
        </div>
      </div>
    </div>
  );

  const renderView = () => {
    switch (view) {
      case "dashboard": return (
        <Dashboard
          records={records}
          navigate={navigate}
          getAnalytics={getAnalytics}
          onExport={handleExportData}
          onImport={handleImportData}
          onExportExcel={handleExportExcel}
          onImportExcel={handleImportExcel}
          activeDataSource={activeDataSource}
          settings={settings}
          onLoadSource={handleLoadSource}
          sourceLoading={sourceLoading}
          onSelectSource={handleSelectSource}
        />
      );
      case "facesearch": return <FaceSearch records={records} navigate={navigate} goBack={goBack} modelsLoaded={modelsLoaded} />;
      case "notifications": return <NotificationsView goBack={goBack} notifications={notifications} clearNotifications={clearNotifications} />;
      case "list": return <AccusedList records={getFiltered()} allRecords={records} navigate={navigate} searchQuery={searchQuery} setSearchQuery={setSearchQuery} filters={filters} setFilters={setFilters} showFilters={showFilters} setShowFilters={setShowFilters} />;
      case "compare": return <CompareView records={records} goBack={goBack} />;
      case "detail": return selectedRecord ? <AccusedDetail record={selectedRecord} records={records} navigate={navigate} onDelete={id => setDeleteConfirm(id)} onSharePDF={generateAndSharePDF} onQuickUpdate={quickUpdateRecord} /> : <div style={{ padding: 80, textAlign: "center", color: T.muted }}>Record not found</div>;
      case "form": return <AccusedForm record={editingRecord} onSave={editingRecord ? updateRecord : addRecord} goBack={goBack} activeDataSource={activeDataSource} settings={settings} />;
      case "grid":
      case "livegrid": return (
        <ExcelSpreadsheet
          records={records}
          fields={FIELDS}
          dataSource={activeDataSource}
          onSave={saveGridToSource}
          onRefresh={() => handleLoadSource(activeDataSource)}
          isSaving={gridSaving}
          css={css}
          onExportExcel={handleExportExcel}
          onImportExcel={handleImportExcel}
          toastShow={toast_show}
          goBack={goBack}
        />
      );
      case "analytics": return <Analytics getAnalytics={getAnalytics} records={records} />;
      case "advanced-analytics": return <AdvancedAnalyticsDashboard records={records} theme={timeTheme} css={css} />;
      case "docs": return <DocsView />;
      case "sheets": return <GoogleSheetsView sheetsData={records} isLoading={false} lastSyncTime={Date.now()} onRefresh={async () => { const r = await loadRecordsForSource(activeDataSource, settings); if (r) setRecords(r); }} toastShow={toast_show} />;
      case "settings": return (
        <SettingsView
          settings={settings}
          saveSettings={saveSettings}
          timeTheme={timeTheme}
          toastShow={toast_show}
          onSelectSource={handleSelectSource}
          onMigrateData={handleMigrateData}
          navigate={navigate}
        />
      );
      case "about": return <About />;
      default: return null;
    }
  };

  const headerTitle = { dashboard: "", docs: "User Manual", facesearch: "Face Scan", notifications: "Notifications", list: "Records", compare: "Compare Suspects", detail: selectedRecord?.name || "Detail", form: editingRecord ? "Edit Record" : "New Record", grid: "Excel Workbook", settings: "Settings", analytics: "Analytics", about: "About Us" }[view];

  return (
    <div
      className="ct-app"
      data-theme={timeTheme.period}
      style={{
        ...themeToCssVars(timeTheme),
        backgroundColor: timeTheme.bgColor,
        backgroundImage: timeTheme.gradient,
        backgroundAttachment: "fixed",
        backgroundSize: "cover",
        color: timeTheme.text,
        transition: "background-color 0.8s ease, background-image 0.8s ease",
      }}
    >
      <div className="ct-ambient" aria-hidden />
      <div className="ct-scrim" aria-hidden />
      <div className="ct-content" style={{ ...css.page, paddingBottom: (view === "grid" || view === "livegrid" || view === "docs") ? 0 : 80, height: view === "docs" ? "100vh" : "auto", overflow: view === "docs" ? "hidden" : "visible" }}>
        <Header view={view} goBack={goBack} navStack={navStack} title={headerTitle} timeTheme={timeTheme} isOnline={isOnline} navigate={navigate} />
        {renderView()}
        <BottomNav view={view} navTo={navTo} navigate={navigate} onImportExcel={handleImportExcel} isGoogleSheetsAuthenticated={isGoogleSheetsConfigured(settings)} />
      {toast && <Toast msg={toast.msg} type={toast.type} />}
      {deleteConfirm && <ConfirmDialog msg="Delete this record permanently? This cannot be undone." onConfirm={() => deleteRecord(deleteConfirm)} onCancel={() => setDeleteConfirm(null)} />}
      <GoogleSheetsSync
        isOpen={showGoogleSync}
        onClose={() => setShowGoogleSync(false)}
        isAuthenticated={isGoogleSheetsConfigured(settings)}
        authEmail={isAppsScriptConfigured(settings) ? "Apps Script (no Cloud API)" : settings.googleSheetLink ? "Google Sheet linked" : "Not configured"}
        sheetsId={settings.googleSheetLink || sheetLinkFromSettings(settings)}
        recordCount={records.length}
        onSync={async () => { setIsSyncing(true); await new Promise(r => setTimeout(r, 2000)); setIsSyncing(false); toast_show('Synced successfully!'); }}
        onAuthClick={() => toast_show('Google Auth setup in Settings', 'warning')}
        onDisconnect={() => { saveSettings({ ...settings, enableGoogleSync: false }); toast_show('Disconnected'); }}
        isSyncing={isSyncing}
        syncMode={syncMode}
        setSyncMode={setSyncMode}
        toastShow={toast_show}
      />
      </div>
    </div>
  );
}