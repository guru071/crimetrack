import { useRef, useState, useEffect } from 'react';
import { X, Camera } from 'lucide-react';

export default function FaceScannerModal({ records, getHumanModel, onMatch, onClose }) {
  const videoRef = useRef(null);
  const scanLoopRef = useRef(null);
  const [facingMode, setFacingMode] = useState("environment");
  const [status, setStatus] = useState("Initializing camera...");
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let captured = false;
    let streamRef = null;

    const startCamera = async () => {
      try {
        const human = await getHumanModel();
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode } });
        streamRef = stream;
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onplay = () => {
            setIsReady(true);
            setStatus("Position face in frame...");
            
            const scan = async () => {
              if (captured) return;
              if (videoRef.current && !videoRef.current.paused) {
                const res = await human.detect(videoRef.current);

                if (res.face && res.face.length === 1 && res.face[0].score > 0.4 && res.face[0].embedding) {
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

                  if (bestSimilarity >= 0.60 && bestMatch) {
                    captured = true;
                    setStatus(`Match Found: ${bestMatch.name}`);
                    setTimeout(() => {
                      onMatch(bestMatch);
                    }, 500);
                    return;
                  } else {
                    setStatus("No match found. Keep still...");
                  }
                } else if (res.face && res.face.length > 1) {
                   setStatus("Multiple faces detected. Please show only one.");
                } else {
                   setStatus("Position face in frame...");
                }
              }
              if (!captured) {
                scanLoopRef.current = requestAnimationFrame(scan);
              }
            };
            scan();
          };
        }
      } catch (err) {
        console.error(err);
        setStatus("Camera error: " + err.message);
      }
    };

    startCamera();

    return () => {
      captured = true;
      if (scanLoopRef.current) cancelAnimationFrame(scanLoopRef.current);
      if (streamRef) streamRef.getTracks().forEach(t => t.stop());
    };
  }, [facingMode, getHumanModel, onMatch, records]);

  return (
    <div style={{ position: "fixed", inset: 0, background: "var(--ct-bg)", zIndex: 999999, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "absolute", top: 20, right: 20, zIndex: 10 }}>
        <button onClick={onClose} style={{ background: "rgba(239, 68, 68, 0.1)", border: "none", color: "#fca5a5", padding: "10px", borderRadius: "50%", cursor: "pointer", display: "flex" }}>
          <X size={24} />
        </button>
      </div>
      
      <div style={{ color: "var(--ct-text)", fontSize: 20, marginBottom: 20, fontWeight: 700 }}>
        Scan Record
      </div>

      <div style={{ position: "relative", width: 280, height: 280, borderRadius: 24, overflow: "hidden", background: "#000", boxShadow: "0 10px 40px rgba(0,0,0,0.3)" }}>
        <video ref={videoRef} playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover", transform: facingMode === "user" ? "scaleX(-1)" : "none" }} />
        {isReady && (
          <div style={{ position: "absolute", inset: 0, border: "2px solid rgba(59, 130, 246, 0.5)", borderRadius: 24, pointerEvents: "none" }}>
            <div style={{ position: "absolute", inset: "10%", border: "2px dashed rgba(255,255,255,0.4)", borderRadius: "50%", animation: "pulse 2s infinite" }} />
          </div>
        )}
      </div>

      <div style={{ marginTop: 24, color: "var(--ct-accent)", fontWeight: 600, fontSize: 16, textAlign: "center", padding: "0 20px" }}>
        {status}
      </div>

      <div style={{ marginTop: 40 }}>
        <button style={{ padding: "12px 24px", borderRadius: 12, border: "1px solid var(--ct-border)", background: "var(--ct-card)", color: "var(--ct-text)", display: "flex", gap: 10, alignItems: "center", cursor: "pointer" }} onClick={() => setFacingMode(f => f === "environment" ? "user" : "environment")}>
          <Camera size={18} /> Flip Camera
        </button>
      </div>
    </div>
  );
}
