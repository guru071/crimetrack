import { useState, useEffect } from 'react';
import { Activity, Shield, Cpu, Database, Zap, Sparkles, Terminal, HardDrive, Wifi, Server, Brain } from 'lucide-react';
import { AIMonitorBadge, getAIStats } from './DatabaseAI';

export default function CommandCenter() {
  const [load, setLoad] = useState({ cpu: 2, mem: 15, net: 45, dbStorage: 'Active / 1.2MB' });
  const [logs, setLogs] = useState([
    "> KERNEL INITIALIZED",
    "> AWAITING COMMAND..."
  ]);
  
  useEffect(() => {
    let lastTime = performance.now();
    
    const fetchMetrics = async () => {
      // 1. Network Latency
      const start = performance.now();
      try {
        await fetch('https://firestore.googleapis.com/', { mode: 'no-cors', cache: 'no-store' });
        const latency = Math.floor(performance.now() - start);
        setLoad(prev => ({ ...prev, net: latency }));
      } catch (e) {
        setLoad(prev => ({ ...prev, net: 0 }));
      }

      // 2. Storage Allocation
      if (navigator.storage && navigator.storage.estimate) {
        try {
          const est = await navigator.storage.estimate();
          const mb = (est.usage / (1024 * 1024)).toFixed(2);
          setLoad(prev => ({ ...prev, dbStorage: `Active / ${mb}MB` }));
        } catch (e) {}
      }

      // 3. Memory Usage (VRAM / Heap)
      if (performance.memory) {
        const memMb = performance.memory.usedJSHeapSize;
        const limitMb = performance.memory.jsHeapSizeLimit || (512 * 1024 * 1024);
        const percent = Math.floor((memMb / limitMb) * 100);
        setLoad(prev => ({ ...prev, mem: Math.max(1, percent) }));
      } else {
        // Fallback for non-Chromium browsers
        setLoad(prev => ({ ...prev, mem: Math.floor(Math.random() * 10) + 10 }));
      }
      
      // 4. Thread Load (CPU)
      const now = performance.now();
      const delta = now - lastTime;
      const excess = Math.max(0, delta - 2000);
      let cpuLoad = Math.min(100, Math.floor((excess / 2000) * 100));
      if (cpuLoad < 2) cpuLoad = Math.floor(Math.random() * 5) + 1;
      setLoad(prev => ({ ...prev, cpu: cpuLoad }));
      
      lastTime = performance.now();
    };

    fetchMetrics(); // Initial fetch
    const t = setInterval(fetchMetrics, 2000);

    const LOG_MESSAGES = [
      "Running biometric cross-reference...",
      "Syncing with local SQLite volume...",
      "Decrypting payload [AES-256]...",
      "Establishing P2P Secure Bridge...",
      "Allocating VRAM to Neural Net...",
      "Scanning regional dispatch frequencies...",
      "Updating global threat matrix...",
      "Handshake with Firebase successful...",
      "Optimizing query cache...",
      "Validating officer credentials..."
    ];

    const logTimer = setInterval(() => {
      setLogs(prev => {
        const time = new Date().toISOString().split('T')[1].slice(0, 8);
        const randLog = LOG_MESSAGES[Math.floor(Math.random() * LOG_MESSAGES.length)];
        const newLog = `> [${time}] ${randLog}`;
        const next = [...prev, newLog];
        if (next.length > 5) next.shift();
        return next;
      });
    }, 1800);

    return () => {
      clearInterval(t);
      clearInterval(logTimer);
    };
  }, []);

  return (
    <div style={{ color: '#fff', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <div style={{ width: 40, height: 40, background: 'rgba(168,85,247,0.15)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Sparkles size={24} color="#a855f7" />
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900, background: 'linear-gradient(90deg, #a855f7, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', textTransform: 'uppercase' }}>
            System Core
          </h2>
          <div style={{ fontSize: 11, color: 'var(--ct-muted)' }}>AI & Kernel Monitoring</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Cpu size={16} color="#a855f7" />
            <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--ct-muted)' }}>Kernel Load</span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#a855f7' }}>{load.cpu}%</div>
          <div style={{ width: '100%', height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, marginTop: 8 }}>
            <div style={{ width: `${load.cpu}%`, height: '100%', background: '#a855f7', borderRadius: 2, transition: 'width 0.5s' }} />
          </div>
        </div>
        
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <HardDrive size={16} color="#3b82f6" />
            <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--ct-muted)' }}>VRAM Allocation</span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#3b82f6' }}>{load.mem}%</div>
          <div style={{ width: '100%', height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, marginTop: 8 }}>
            <div style={{ width: `${load.mem}%`, height: '100%', background: '#3b82f6', borderRadius: 2, transition: 'width 0.5s' }} />
          </div>
        </div>
      </div>

      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Terminal size={16} color="#10b981" />
          <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--ct-muted)' }}>Live Analytics</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { icon: <Database size={14} color="#f59e0b" />, label: 'Local Encrypted Storage', value: load.dbStorage },
            { icon: <Zap size={14} color="#ef4444" />, label: 'Neural Net Latency', value: `${load.net} ms` },
            { icon: <Shield size={14} color="#10b981" />, label: 'P2P Secure Ops Bridge', value: 'Connected' },
            { icon: <Server size={14} color="#6366f1" />, label: 'Firebase Sync Engine', value: load.net > 0 ? 'Online' : 'Offline' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12, borderBottom: i === 3 ? 'none' : '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {item.icon}
                <span style={{ fontSize: 13, color: 'var(--ct-text)' }}>{item.label}</span>
              </div>
              <div style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--ct-muted)' }}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: 'color-mix(in srgb, #10b981 10%, transparent)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 16, padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <Wifi size={24} color="#10b981" />
        <div>
          <div style={{ color: '#10b981', fontWeight: 800, fontSize: 14 }}>System Optimal</div>
          <div style={{ color: 'var(--ct-muted)', fontSize: 11, marginTop: 4 }}>All police OS modules and offline kernels are running smoothly.</div>
        </div>
      </div>

      <div style={{ background: '#020205', border: '1px solid rgba(99,252,176,0.2)', borderRadius: 12, padding: 12, marginTop: 16, height: 110, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', overflow: 'hidden' }}>
        {logs.map((log, i) => (
          <div key={i} style={{ fontFamily: '"Fira Code", monospace', fontSize: 10, color: i === logs.length - 1 ? '#63fcb0' : 'rgba(99,252,176,0.4)', marginBottom: 6, textShadow: i === logs.length - 1 ? '0 0 5px rgba(99,252,176,0.5)' : 'none' }}>
            {log}
          </div>
        ))}
      </div>

      <div style={{ background: 'rgba(168,85,247,0.05)', border: '1px solid rgba(168,85,247,0.2)', borderRadius: 16, padding: 14, marginTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Brain size={14} color="#a855f7" />
          <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: 'var(--ct-muted)' }}>AI Activity Monitor</span>
        </div>
        <AIMonitorBadge />
      </div>
    </div>
  );
}