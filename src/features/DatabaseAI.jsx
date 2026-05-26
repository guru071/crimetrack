import { useState, useRef } from 'react';
import { Brain, Search, Sparkles, AlertTriangle, TrendingUp, X, Loader, ChevronDown, ChevronUp, Zap } from 'lucide-react';

const GEMINI_KEY = 'AIzaSyAZMmUoWuD5Droq6iDUhoLH6YMwCY0ACPo';

async function callGemini(prompt, apiKey = null) {
  const savedSettings = JSON.parse(localStorage.getItem('crimetrack_settings') || '{}');
  const key = apiKey || savedSettings.geminiApiKey || import.meta.env.VITE_GEMINI_API_KEY || GEMINI_KEY;
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    }
  );
  const data = await res.json();
  if (data.error) {
    if (data.error.code === 429 || data.error.message?.toLowerCase().includes('quota')) {
      throw new Error("AI Quota Exceeded. Please try again in a minute, or configure your own API key in Settings.");
    }
    throw new Error(data.error.message);
  }
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response';
}

/* ─── Smart AI Search ─────────────────────────────── */
export function AISearchBar({ records, onResults, apiKey }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const runSearch = async () => {
    if (!query.trim()) return;
    setLoading(true); setError('');
    try {
      const summary = records.slice(0, 80).map(r =>
        `ID:${r.id} Name:${r.name} FIR:${r.firNumber || '-'} Status:${r.status || '-'} Offense:${r.offense || '-'} Age:${r.age || '-'} Area:${r.areaOfOperation || '-'} Cases:${(r.cases || []).length}`
      ).join('\n');

      const prompt = `You are a police database AI. Given this query: "${query}"
Return ONLY a JSON array of IDs that match. Example: ["id1","id2"]
Records:\n${summary}\nIf no match, return [].`;

      const result = await callGemini(prompt, apiKey);
      const match = result.match(/\[[\s\S]*?\]/);
      const ids = match ? JSON.parse(match[0]) : [];
      const matched = records.filter(r => ids.includes(r.id));
      onResults(matched, query);
    } catch (e) {
      setError('AI search failed: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.3)', borderRadius: 16, padding: '8px 14px' }}>
        <Brain size={16} color="#a855f7" style={{ flexShrink: 0 }} />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && runSearch()}
          placeholder='AI Search: "show theft cases 2024" or "wanted suspects"'
          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--ct-text)', fontSize: 13 }}
        />
        {loading
          ? <Loader size={16} color="#a855f7" style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }} />
          : <button onClick={runSearch} style={{ background: '#a855f7', border: 'none', borderRadius: 10, padding: '4px 10px', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>Search</button>
        }
      </div>
      {error && <div style={{ color: '#ef4444', fontSize: 11, marginTop: 4, paddingLeft: 8 }}>{error}</div>}
    </div>
  );
}

/* ─── Anomaly Detector ────────────────────────────── */
export function AnomalyDetector({ records, apiKey }) {
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const detect = async () => {
    setLoading(true); setResult('');
    try {
      const summary = records.slice(0, 100).map(r =>
        `Name:${r.name} | FIR:${r.firNumber || '-'} | Status:${r.status || '-'} | Area:${r.areaOfOperation || '-'} | Cases:${(r.cases || []).length} | Age:${r.age || '-'}`
      ).join('\n');
      const prompt = `You are a police intelligence AI. Analyze this database for suspicious patterns:
${summary}
Report: repeat offenders, same address for multiple accused, high-risk areas, escalation trends. Use bullet points. Be concise and professional.`;
      const res = await callGemini(prompt, apiKey);
      setResult(res);
      setOpen(true);
    } catch (e) {
      setResult('Error: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginBottom: 12 }}>
      <button onClick={detect} disabled={loading} style={{ width: '100%', padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, color: '#f87171', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        {loading ? <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <AlertTriangle size={14} />}
        {loading ? 'Scanning Database...' : 'Run AI Anomaly Detection'}
      </button>
      {result && (
        <div style={{ marginTop: 8, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, overflow: 'hidden' }}>
          <button onClick={() => setOpen(o => !o)} style={{ width: '100%', padding: '10px 14px', background: 'transparent', border: 'none', color: '#f87171', fontWeight: 700, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>⚠ Anomaly Report</span>
            {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {open && <div style={{ padding: '0 14px 14px', color: 'var(--ct-muted)', fontSize: 12, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{result}</div>}
        </div>
      )}
    </div>
  );
}

/* ─── Record AI Threat Brief ──────────────────────── */
export function RecordAIBrief({ record, apiKey }) {
  const [brief, setBrief] = useState('');
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true); setBrief('');
    try {
      const caseSummary = (record.cases || []).map((c, i) =>
        `Case ${i + 1}: FIR ${c.caseId || 'N/A'}, Offense: ${c.offense || 'N/A'}, Status: ${c.status || 'N/A'}, Court: ${c.court || 'N/A'}`
      ).join('\n') || `FIR: ${record.firNumber || 'N/A'}`;

      const prompt = `You are a police AI. Generate a professional 3-sentence threat assessment for this accused:
Name: ${record.name}, Age: ${record.age || 'Unknown'}, Status: ${record.status || 'Unknown'}
Area: ${record.areaOfOperation || 'Unknown'}, Activities: ${record.currentDoings || 'Unknown'}
Cases:\n${caseSummary}
Be clinical, accurate, and use law enforcement terminology.`;
      const res = await callGemini(prompt, apiKey);
      setBrief(res);
    } catch (e) {
      setBrief('Error: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: 12 }}>
      {!brief && !loading && (
        <button onClick={generate} style={{ width: '100%', padding: '10px 14px', background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.3)', borderRadius: 12, color: '#c084fc', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Sparkles size={14} /> Generate AI Threat Brief
        </button>
      )}
      {loading && (
        <div style={{ padding: 12, background: 'rgba(168,85,247,0.06)', borderRadius: 12, border: '1px solid rgba(168,85,247,0.2)', display: 'flex', alignItems: 'center', gap: 8, color: '#c084fc', fontSize: 13 }}>
          <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> Generating AI assessment...
        </div>
      )}
      {brief && (
        <div style={{ padding: 14, background: 'rgba(168,85,247,0.08)', borderRadius: 12, border: '1px solid rgba(168,85,247,0.25)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, color: '#c084fc', fontWeight: 700, fontSize: 12 }}>
            <Brain size={13} /> AI THREAT ASSESSMENT
          </div>
          <div style={{ color: 'var(--ct-text)', fontSize: 13, lineHeight: 1.6 }}>{brief}</div>
          <button onClick={() => setBrief('')} style={{ marginTop: 8, background: 'transparent', border: 'none', color: 'var(--ct-muted)', fontSize: 11, cursor: 'pointer' }}>Dismiss</button>
        </div>
      )}
    </div>
  );
}

/* ─── Multi-Case Pattern Analysis ────────────────── */
export function MultiCaseAnalysis({ record, apiKey }) {
  const cases = record.cases || [];
  const [analysis, setAnalysis] = useState('');
  const [loading, setLoading] = useState(false);

  if (cases.length < 2) return null;

  const analyze = async () => {
    setLoading(true); setAnalysis('');
    try {
      const caseList = cases.map((c, i) =>
        `Case ${i + 1}: FIR ${c.caseId || 'N/A'} | Date: ${c.date || 'N/A'} | Offense: ${c.offense || 'N/A'} | Status: ${c.status || 'N/A'} | Court: ${c.court || 'N/A'} | Notes: ${c.notes || '-'}`
      ).join('\n');

      const prompt = `You are a senior police crime analyst. This accused has ${cases.length} registered cases:
Accused: ${record.name}, Age: ${record.age || 'Unknown'}
${caseList}
Provide: 1) Criminal pattern analysis 2) Escalation trend 3) Risk level (Low/Medium/High/Critical) 4) Recommended action. Use bullet points. Be professional and concise.`;
      const res = await callGemini(prompt, apiKey);
      setAnalysis(res);
    } catch (e) {
      setAnalysis('Error: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: 12 }}>
      <button onClick={analyze} disabled={loading} style={{ width: '100%', padding: '12px 14px', background: 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(168,85,247,0.15))', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 12, color: '#fca5a5', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        {loading ? <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <TrendingUp size={14} />}
        {loading ? 'Analyzing Criminal Pattern...' : `AI Pattern Analysis (${cases.length} Cases)`}
      </button>
      {analysis && (
        <div style={{ marginTop: 8, padding: 14, background: 'rgba(239,68,68,0.06)', borderRadius: 12, border: '1px solid rgba(239,68,68,0.25)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ color: '#f87171', fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <TrendingUp size={13} /> CRIMINAL PATTERN REPORT
            </div>
            <button onClick={() => setAnalysis('')} style={{ background: 'transparent', border: 'none', color: 'var(--ct-muted)', cursor: 'pointer' }}><X size={14} /></button>
          </div>
          <div style={{ color: 'var(--ct-text)', fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{analysis}</div>
        </div>
      )}
    </div>
  );
}

/* ─── AI Usage Monitor ────────────────────────────── */
const aiLog = { calls: 0, success: 0, fail: 0, totalMs: 0 };
export function trackAICall(success, ms) {
  aiLog.calls++;
  if (success) aiLog.success++; else aiLog.fail++;
  aiLog.totalMs += ms;
}
export function getAIStats() {
  return {
    calls: aiLog.calls,
    success: aiLog.success,
    fail: aiLog.fail,
    avgMs: aiLog.calls > 0 ? Math.round(aiLog.totalMs / aiLog.calls) : 0,
  };
}

export function AIMonitorBadge() {
  const stats = getAIStats();
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
      {[
        { label: 'AI Calls', value: stats.calls, color: '#a855f7' },
        { label: 'Success', value: stats.success, color: '#10b981' },
        { label: 'Failed', value: stats.fail, color: '#ef4444' },
        { label: 'Avg Latency', value: `${stats.avgMs}ms`, color: '#f59e0b' },
      ].map(s => (
        <div key={s.label} style={{ flex: 1, minWidth: 70, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '8px 10px', textAlign: 'center' }}>
          <div style={{ fontSize: 16, fontWeight: 900, color: s.color }}>{s.value}</div>
          <div style={{ fontSize: 9, color: 'var(--ct-muted)', textTransform: 'uppercase', marginTop: 2 }}>{s.label}</div>
        </div>
      ))}
    </div>
  );
}
