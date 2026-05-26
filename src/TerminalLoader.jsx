import React, { useState, useEffect } from 'react';
import { Shield, Lock, Database, Cpu, Activity, Server, Radio, Terminal, Hexagon } from 'lucide-react';

const BOOT_SEQUENCE = [
  { text: "INIT SYSTEM KERNEL...", time: 100, color: "text-blue-400" },
  { text: "LOADING ENCRYPTION MODULES...", time: 300, color: "text-blue-400" },
  { text: "[OK] AES-256-GCM SECURE CHANNEL ESTABLISHED", time: 500, color: "text-green-400" },
  { text: "MOUNTING SECURE VIRTUAL FILESYSTEM...", time: 700, color: "text-blue-400" },
  { text: "[OK] VFS MOUNTED AT /DEV/SECURE", time: 850, color: "text-green-400" },
  { text: "INITIALIZING AI NEURAL ENGINE...", time: 1000, color: "text-blue-400" },
  { text: "LOADING TENSORFLOW MODELS [0/3]...", time: 1200, color: "text-yellow-400" },
  { text: "LOADING TENSORFLOW MODELS [3/3]...", time: 1500, color: "text-yellow-400" },
  { text: "[OK] AI ENGINE ONLINE", time: 1700, color: "text-green-400" },
  { text: "CONNECTING TO DECENTRALIZED P2P NETWORK...", time: 1900, color: "text-blue-400" },
  { text: "NEGOTIATING WEBRTC PEER CONNECTION...", time: 2100, color: "text-yellow-400" },
  { text: "[OK] OPERATIONS ROOM LINK ESTABLISHED", time: 2400, color: "text-green-400" },
  { text: "SYNCING FIREBASE DATABASE STATE...", time: 2600, color: "text-blue-400" },
  { text: "[OK] SYNC COMPLETE (1,024 MS)", time: 2900, color: "text-green-400" },
  { text: "FINALIZING BOOT SEQUENCE...", time: 3100, color: "text-blue-400" },
  { text: "[OK] SYSTEM READY.", time: 3400, color: "text-emerald-500 font-bold" }
];

export default function TerminalLoader({ onComplete }) {
  const [lines, setLines] = useState([]);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let timeouts = [];
    
    BOOT_SEQUENCE.forEach((item, index) => {
      const timeout = setTimeout(() => {
        setLines(prev => [...prev, item]);
        setProgress(Math.round(((index + 1) / BOOT_SEQUENCE.length) * 100));
        
        if (index === BOOT_SEQUENCE.length - 1) {
          setTimeout(() => {
            onComplete();
          }, 800); // Wait a bit before completing
        }
      }, item.time);
      timeouts.push(timeout);
    });

    return () => timeouts.forEach(clearTimeout);
  }, [onComplete]);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999999,
      backgroundColor: '#050505', color: '#0f0',
      fontFamily: '"Fira Code", "Courier New", monospace',
      display: 'flex', flexDirection: 'column',
      padding: 'env(safe-area-inset-top, 20px) 20px 20px',
      overflow: 'hidden'
    }}>
      {/* Top Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #333', paddingBottom: 10, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Shield color="#ef4444" size={24} />
          <span style={{ color: '#fff', fontWeight: 'bold', letterSpacing: 2 }}>CRIMETRACK OS v3.0</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Lock size={16} color="#10b981" />
          <Terminal size={16} color="#3b82f6" />
        </div>
      </div>

      {/* Main Terminal Window */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
        
        {/* Abstract Background Graphic */}
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', opacity: 0.05, pointerEvents: 'none' }}>
          <Hexagon size={300} strokeWidth={1} />
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, overflowY: 'auto' }}>
          {lines.map((line, i) => (
            <div key={i} style={{ display: 'flex', gap: 10 }}>
              <span style={{ color: '#555', userSelect: 'none' }}>[{String(i).padStart(4, '0')}]</span>
              <span className={line.color || ''} style={{ 
                color: line.color?.includes('blue') ? '#3b82f6' : 
                       line.color?.includes('green') ? '#10b981' : 
                       line.color?.includes('yellow') ? '#eab308' : 
                       line.color?.includes('emerald') ? '#34d399' : '#fff',
                fontWeight: line.color?.includes('bold') ? 'bold' : 'normal',
                textShadow: line.color?.includes('green') || line.color?.includes('emerald') ? '0 0 8px rgba(16, 185, 129, 0.4)' : 'none'
              }}>
                {line.text}
              </span>
            </div>
          ))}
          {progress < 100 && (
            <div style={{ display: 'flex', gap: 10, animation: 'pulse 1s infinite' }}>
              <span style={{ color: '#555' }}>[{String(lines.length).padStart(4, '0')}]</span>
              <span style={{ color: '#fff' }}>_</span>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#888', marginBottom: 8 }}>
            <span>SYSTEM BOOT PROGRESS</span>
            <span>{progress}%</span>
          </div>
          <div style={{ height: 4, background: '#222', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ 
              height: '100%', 
              width: `${progress}%`, 
              background: progress === 100 ? '#10b981' : '#3b82f6',
              boxShadow: progress === 100 ? '0 0 10px #10b981' : '0 0 10px #3b82f6',
              transition: 'width 0.2s ease-out, background 0.3s'
            }} />
          </div>
        </div>

      </div>
    </div>
  );
}
