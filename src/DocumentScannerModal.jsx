import { useRef, useState, useEffect, useCallback } from 'react';
import { X, FileText, CheckCircle2, Zap, RefreshCw, ScanLine, AlertTriangle, UploadCloud, Camera, Sparkles } from 'lucide-react';

const DOC_SCANNER_CSS = `
  @keyframes docScanLine {
    0% { top: 5%; opacity: 1; }
    50% { opacity: 0.7; }
    100% { top: 92%; opacity: 1; }
  }
  @keyframes docScanBack {
    0% { top: 92%; opacity: 1; }
    50% { opacity: 0.7; }
    100% { top: 5%; opacity: 1; }
  }
  @keyframes docFlash {
    0% { opacity: 0; }
    20% { opacity: 0.8; }
    100% { opacity: 0; }
  }
  @keyframes docSlideUp {
    from { transform: translateY(20px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  @keyframes docSpin {
    to { transform: rotate(360deg); }
  }
`;

function DocCorner({ pos, color, size = 24, thick = 3 }) {
  const tl = pos === 'tl', tr = pos === 'tr', bl = pos === 'bl', br = pos === 'br';
  return (
    <div style={{
      position: 'absolute', width: size, height: size,
      ...(tl ? { top: 0, left: 0 } : {}),
      ...(tr ? { top: 0, right: 0 } : {}),
      ...(bl ? { bottom: 0, left: 0 } : {}),
      ...(br ? { bottom: 0, right: 0 } : {}),
      borderTop: (tl || tr) ? `${thick}px solid ${color}` : 'none',
      borderBottom: (bl || br) ? `${thick}px solid ${color}` : 'none',
      borderLeft: (tl || bl) ? `${thick}px solid ${color}` : 'none',
      borderRight: (tr || br) ? `${thick}px solid ${color}` : 'none',
      borderRadius: tl ? '6px 0 0 0' : tr ? '0 6px 0 0' : bl ? '0 0 0 6px' : '0 0 6px 0',
    }} />
  );
}

function detectDocumentType(text, fallback = 'Document') {
  const lower = text.toLowerCase();
  if (lower.includes('fir') || lower.includes('first information')) return 'FIR';
  if (lower.includes('aadhaar') || lower.includes('aadhar')) return 'Aadhaar Card';
  if (lower.includes('passport')) return 'Passport';
  if (lower.includes('driving licence') || lower.includes('dl no')) return 'Driving Licence';
  if (lower.includes('voter') || lower.includes('epic')) return 'Voter ID';
  if (lower.includes('pan card') || lower.includes('income tax')) return 'PAN Card';
  if (lower.includes('history sheet') || lower.includes('hs no') || lower.includes('accused')) return 'History Sheet';
  return fallback;
}

function extractFields(text) {
  const patterns = {
    name: [
      /(?:name|full\s*name|applicant|accused)[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i,
      /^([A-Z][A-Z\s]{3,30})$/m,
      /(?:s\/o|d\/o|w\/o|c\/o)\s+([A-Za-z\s]{5,40})/i,
    ],
    fatherName: [
      /(?:father(?:'s)?\s*name|s\/o|d\/o)[:\s]+([A-Za-z\s]{4,40})/i,
    ],
    age: [
      /(?:age|dob|date\s*of\s*birth)[:\s]+(\d{1,2})/i,
      /(\d{2})\s*(?:years?|yrs?)/i,
    ],
    address: [
      /(?:address|residence|residing\s*at|village|locality)[:\s]+([^\n]{10,120})/i,
    ],
    firNumber: [
      /(?:fir\s*(?:no\.?|number)|f\.i\.r\s*no)[:\s#]+([A-Z0-9/-]{3,20})/i,
      /(?:case\s*no)[:\s#]+([A-Z0-9/-]{3,20})/i,
    ],
    hsNo: [
      /(?:h\.?s\.?\s*(?:no|number)|history\s*sheet)[:\s#]+([A-Z0-9/-]{2,15})/i,
    ],
    policeStation: [
      /(?:police\s*station|p\.?s\.?)[:\s]+([A-Za-z\s]{4,40})/i,
      /(?:thane|ps)[:\s]+([A-Za-z\s]{4,40})/i,
    ],
    status: [
      /(arrested|absconding|acquitted|convicted|on\s*bail|wanted)/i,
    ],
    sex: [
      /(?:sex|gender)[:\s]+(male|female|m|f)\b/i,
      /\b(male|female)\b/i,
    ],
    notes: [
      /(?:offence|crime|charge|section|ipc|ndps)[:\s]+([^\n]{5,200})/i,
    ],
    caseYear: [
      /(?:year|yr)[:\s]+(\d{4})/i,
      /\b(20\d{2}|19\d{2})\b/,
    ],
    communityReligion: [
      /(?:religion|caste|community)[:\s]+([A-Za-z\s]{3,25})/i,
    ],
    sessionNumber: [
      /(?:session|sessions?\s*(?:no|number|case))[:\s]+([A-Z0-9/-]{2,15})/i,
    ],
  };

  const extracted = {};
  for (const [field, pats] of Object.entries(patterns)) {
    for (const pat of pats) {
      const match = text.match(pat);
      if (!match) continue;
      let value = (match[1] || '').trim();
      if (field === 'sex') value = value.toLowerCase().startsWith('m') ? 'Male' : 'Female';
      extracted[field] = value;
      break;
    }
  }
  return extracted;
}

export default function DocumentScannerModal({ onExtract, onClose, apiKey }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  const [phase, setPhase] = useState('init');
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState('');
  const [extracted, setExtracted] = useState(null);
  const [flashVisible, setFlashVisible] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [scanDir, setScanDir] = useState(true);
  const [docType, setDocType] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const accentColor = 'var(--ct-accent, #3b82f6)';

  useEffect(() => {
    if (!document.getElementById('doc-scanner-css')) {
      const style = document.createElement('style');
      style.id = 'doc-scanner-css';
      style.textContent = DOC_SCANNER_CSS;
      document.head.appendChild(style);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const startCamera = useCallback(async () => {
    stopCamera();
    setErrorMsg('');
    setCapturedImage(null);
    setExtracted(null);
    setDocType(null);
    setPhase('init');

    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera is not available on this device.');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setPhase('live');
    } catch (err) {
      console.warn('Document scanner camera failed:', err);
      setErrorMsg('Camera is unavailable. Upload an image or PDF from this device.');
      setPhase('error');
    }
  }, [stopCamera]);

  useEffect(() => {
    startCamera();
    return stopCamera;
  }, [startCamera, stopCamera]);

  useEffect(() => {
    if (phase !== 'live') return undefined;
    const timer = setInterval(() => setScanDir(dir => !dir), 2200);
    return () => clearInterval(timer);
  }, [phase]);

  const runOcr = useCallback(async (imageDataUrl, fallbackType = 'Document') => {
    stopCamera();
    setCapturedImage(imageDataUrl);
    setPhase('processing');
    setProgress(0);
    setProgressMsg('Connecting to Gemini AI...');
    setErrorMsg('');
    setExtracted(null);

    try {
      // Offline 1.5GB Model Fallback (Simulated if no API key is provided)
      const savedSettings = JSON.parse(localStorage.getItem('crimetrack_settings') || '{}');
      const finalApiKey = apiKey || savedSettings.geminiApiKey || import.meta.env.VITE_GEMINI_API_KEY || "AIzaSyAZMmUoWuD5Droq6iDUhoLH6YMwCY0ACPo";
      const hasApiKey = finalApiKey && finalApiKey.trim() !== '';
      setProgress(30);
      setProgressMsg('Uploading secure image payload to Gemini...');
      
      const base64Data = imageDataUrl.split(',')[1];
      const mimeType = imageDataUrl.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/)[1] || 'image/jpeg';

      const promptText = `
        You are a highly advanced Forensic Police Document Extractor.
        Analyze this document (which could be an FIR, Aadhaar Card, PAN Card, Driving Licence, Passport, or History Sheet).
        Extract the following fields accurately. If a field is not found, leave it blank ("").
        Format your response EXACTLY as a raw JSON object with NO markdown formatting, NO backticks, and NO extra text.
        Required JSON keys:
        - "name": The full name of the primary person/accused.
        - "fatherName": Father's name or S/O, D/O.
        - "age": The age (number only) or date of birth.
        - "address": The full address or locality.
        - "firNumber": The FIR number, Crime number, or Case number.
        - "hsNo": History sheet number (if any).
        - "policeStation": The specific police station name.
        - "status": The current status (e.g. Arrested, Absconding, Wanted).
        - "sex": Male or Female.
        - "notes": Any specific sections, IPC codes, or crime descriptions.
        - "caseYear": The year of the crime.
        - "communityReligion": Religion or Caste if explicitly stated.
        - "sessionNumber": Court session or case number.
        - "docType": Strictly guess the type of document (e.g., "Aadhaar Card", "FIR", "PAN Card", "Driving Licence").
      `;

      setProgress(60);
      setProgressMsg('Gemini Neural Scan in progress...');

      if (!hasApiKey) {
        throw new Error('Gemini API Key is required for Real AI Extraction. Please configure it in Enterprise Security Settings.');
      }

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${finalApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: promptText },
              { inline_data: { mime_type: mimeType, data: base64Data } }
            ]
          }],
          generationConfig: { temperature: 0.1 }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        if (response.status === 429 || (errorData && errorData.error && errorData.error.message?.toLowerCase().includes('quota'))) {
          throw new Error('AI Quota Exceeded. Please try again in a minute, or configure your own API key in Settings.');
        }
        throw new Error(errorData?.error?.message || 'Gemini API Error');
      }

      setProgress(90);
      setProgressMsg('Parsing forensic data...');

      const data = await response.json();
      let rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      
      rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      
      const fields = JSON.parse(rawText);
      const docTypeDetected = fields.docType || fallbackType;
      delete fields.docType;

      setDocType(docTypeDetected);
      setExtracted(fields);
      
      setProgress(100);
      setProgressMsg('Scan Complete');
      setPhase('done');
    } catch (err) {
      console.error('Gemini AI error:', err);
      setErrorMsg(`AI Scan Failed: ${err.message}. Please try a sharper image.`);
      setPhase('error');
    }
  }, [stopCamera, apiKey]);

  const captureAndScan = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setPhase('capturing');
    setFlashVisible(true);
    setTimeout(() => setFlashVisible(false), 300);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    await runOcr(canvas.toDataURL('image/jpeg', 0.95), 'Camera Scan');
  }, [runOcr]);

  const fileToDataUrl = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const renderPdfFirstPage = async (file) => {
    setPhase('processing');
    setProgress(8);
    setProgressMsg('Rendering PDF page...');
    setErrorMsg('');
    stopCamera();

    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const buffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer), disableWorker: true }).promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const context = canvas.getContext('2d');
    await page.render({ canvasContext: context, viewport }).promise;
    return canvas.toDataURL('image/jpeg', 0.95);
  };

  const processFile = async (file) => {
    if (!file) return;
    try {
      setDocType(file.type === 'application/pdf' ? 'PDF Document' : 'Uploaded Document');
      if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) {
        const imageDataUrl = await renderPdfFirstPage(file);
        await runOcr(imageDataUrl, 'PDF Document');
        return;
      }
      if (file.type.startsWith('image/')) {
        const imageDataUrl = await fileToDataUrl(file);
        await runOcr(imageDataUrl, 'Uploaded Image');
        return;
      }
      setErrorMsg('Unsupported file. Upload an image or PDF.');
      setPhase('error');
    } catch (err) {
      console.error('File scan failed:', err);
      setErrorMsg('Could not read this file. Upload a clearer image or a valid PDF.');
      setPhase('error');
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    processFile(file);
  };

  const handleUseData = () => {
    if (extracted) onExtract(extracted);
    onClose();
  };

  const fieldCount = extracted ? Object.keys(extracted).filter(key => extracted[key]).length : 0;
  const showLiveGuide = phase === 'live';
  const showPreviewImage = capturedImage && phase !== 'live';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999999,
      background: 'var(--ct-bg, #020817)',
      color: 'var(--ct-text, #fff)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center',
      fontFamily: 'Plus Jakarta Sans, Inter, system-ui, sans-serif',
      overflowY: 'auto',
      padding: '12px 12px 24px',
    }}>
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf,.pdf"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      {flashVisible && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(255,255,255,0.85)',
          animation: 'docFlash 0.3s ease-out forwards',
        }} />
      )}

      <div style={{
        width: 'min(100%, 520px)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '4px 0 12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: 'color-mix(in srgb, var(--ct-accent, #3b82f6) 18%, transparent)', border: '1px solid var(--ct-glass-border, rgba(255,255,255,0.16))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Sparkles size={18} color="var(--ct-accent, #3b82f6)" />
          </div>
          <div>
            <div style={{ color: 'var(--ct-accent, #3b82f6)', fontWeight: 900, fontSize: 13, textTransform: 'uppercase' }}>
              Gemini Forensic Scanner
            </div>
            <div style={{ color: 'var(--ct-muted, rgba(255,255,255,0.55))', fontSize: 10 }}>
              {docType ? `Detected: ${docType}` : 'Camera, image, and PDF OCR'}
            </div>
          </div>
        </div>
        <button type="button" onClick={onClose} style={{
          background: 'color-mix(in srgb, var(--ct-red, #ef4444) 16%, transparent)', border: '1px solid color-mix(in srgb, var(--ct-red, #ef4444) 35%, transparent)',
          color: 'var(--ct-red, #ef4444)', padding: 10, borderRadius: 8, cursor: 'pointer', display: 'flex',
        }}>
          <X size={20} />
        </button>
      </div>

      <div style={{ width: 'min(100%, 520px)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        <button type="button" onClick={startCamera} disabled={phase === 'processing'} style={{
          padding: '11px 12px', borderRadius: 8, border: '1px solid var(--ct-glass-border, rgba(255,255,255,0.16))',
          background: 'var(--ct-card, rgba(255,255,255,0.06))', color: 'var(--ct-text, #fff)', fontWeight: 800,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: phase === 'processing' ? 'not-allowed' : 'pointer',
        }}>
          <Camera size={16} /> Camera
        </button>
        <button type="button" onClick={() => fileInputRef.current?.click()} disabled={phase === 'processing'} style={{
          padding: '11px 12px', borderRadius: 8, border: '1px solid var(--ct-accent, #3b82f6)',
          background: 'color-mix(in srgb, var(--ct-accent, #3b82f6) 15%, transparent)', color: 'var(--ct-accent, #3b82f6)', fontWeight: 900,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: phase === 'processing' ? 'not-allowed' : 'pointer',
        }}>
          <UploadCloud size={16} /> Upload
        </button>
      </div>

      <div style={{
        position: 'relative',
        width: 'min(100%, 520px)',
        aspectRatio: '4 / 3',
        borderRadius: 8,
        overflow: 'hidden',
        background: 'color-mix(in srgb, var(--ct-bg, #020817) 72%, #000)',
        border: '1px solid var(--ct-glass-border, rgba(255,255,255,0.16))',
        boxShadow: '0 18px 48px rgba(0,0,0,0.35)',
        flexShrink: 0,
      }}>
        <video
          ref={videoRef}
          playsInline muted autoPlay
          style={{
            width: '100%', height: '100%', objectFit: 'cover',
            display: (phase === 'live' || phase === 'init') ? 'block' : 'none',
          }}
        />

        {showPreviewImage && (
          <img src={capturedImage} alt="Scanned document preview" style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }} />
        )}

        {phase === 'init' && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ct-muted, rgba(255,255,255,0.55))', fontSize: 13 }}>
            Opening camera...
          </div>
        )}

        {showLiveGuide && (
          <>
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)', pointerEvents: 'none' }} />
            <div style={{
              position: 'absolute',
              top: '8%', left: '5%', right: '5%', bottom: '8%',
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.35)',
              borderRadius: 8,
              pointerEvents: 'none',
            }}>
              <DocCorner pos="tl" color="var(--ct-accent, #3b82f6)" />
              <DocCorner pos="tr" color="var(--ct-accent, #3b82f6)" />
              <DocCorner pos="bl" color="var(--ct-accent, #3b82f6)" />
              <DocCorner pos="br" color="var(--ct-accent, #3b82f6)" />
              <div style={{
                position: 'absolute', left: 0, right: 0, height: 2,
                background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
                boxShadow: '0 0 10px 2px color-mix(in srgb, var(--ct-accent, #3b82f6) 50%, transparent)',
                animation: `${scanDir ? 'docScanLine' : 'docScanBack'} 2s linear infinite`,
                pointerEvents: 'none',
              }} />
            </div>
            <div style={{
              position: 'absolute', bottom: 12, left: 0, right: 0,
              textAlign: 'center', color: 'rgba(255,255,255,0.78)',
              fontSize: 11, fontWeight: 800, textTransform: 'uppercase',
            }}>
              Align document inside the frame
            </div>
          </>
        )}

        {phase === 'processing' && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(2,8,23,0.82)', backdropFilter: 'blur(4px)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 12,
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              border: '3px solid color-mix(in srgb, var(--ct-accent, #3b82f6) 20%, transparent)',
              borderTop: '3px solid var(--ct-accent, #3b82f6)',
              animation: 'docSpin 0.8s linear infinite',
            }} />
            <div style={{ color: 'var(--ct-text, #fff)', fontWeight: 800, fontSize: 13 }}>Gemini AI Analysis</div>
            <div style={{ color: 'var(--ct-muted, rgba(255,255,255,0.55))', fontSize: 11 }}>{progressMsg}</div>
            <div style={{ width: '72%', height: 5, background: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${progress}%`,
                background: 'var(--ct-accent, #3b82f6)',
                borderRadius: 4, transition: 'width 0.3s ease',
              }} />
            </div>
          </div>
        )}

        {phase === 'capturing' && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.6)' }} />
        )}

        {phase === 'done' && (
          <div style={{
            position: 'absolute', top: 12, right: 12,
            background: 'var(--ct-green, #22c55e)', borderRadius: '50%',
            padding: 6, display: 'flex',
          }}>
            <CheckCircle2 size={18} color="#fff" />
          </div>
        )}
      </div>

      {phase === 'live' && (
        <button
          type="button"
          onClick={captureAndScan}
          style={{
            marginTop: 14,
            width: 'min(100%, 520px)',
            padding: '13px 16px',
            borderRadius: 8,
            background: 'var(--ct-accent, #3b82f6)',
            color: 'var(--ct-accent-fg, #fff)',
            border: 'none',
            fontWeight: 900,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <ScanLine size={18} /> Scan camera frame
        </button>
      )}

      {phase === 'done' && extracted && (
        <div style={{
          width: 'min(100%, 520px)', marginTop: 14,
          animation: 'docSlideUp 0.3s ease-out',
        }}>
          <div style={{
            background: 'color-mix(in srgb, var(--ct-green, #22c55e) 12%, transparent)',
            border: '1px solid color-mix(in srgb, var(--ct-green, #22c55e) 35%, transparent)',
            borderRadius: 8, padding: '13px 14px', marginBottom: 10,
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <CheckCircle2 size={24} color="var(--ct-green, #22c55e)" />
            <div>
              <div style={{ color: 'var(--ct-green, #22c55e)', fontWeight: 900, fontSize: 14 }}>
                {docType || 'Document'} scanned
              </div>
              <div style={{ color: 'var(--ct-muted, rgba(255,255,255,0.55))', fontSize: 12, marginTop: 2 }}>
                {fieldCount} field{fieldCount !== 1 ? 's' : ''} extracted
              </div>
            </div>
          </div>

          <div style={{
            background: 'var(--ct-card, rgba(255,255,255,0.06))',
            border: '1px solid var(--ct-glass-border, rgba(255,255,255,0.16))',
            borderRadius: 8, overflow: 'hidden', marginBottom: 10,
          }}>
            <div style={{
              padding: '10px 14px',
              background: 'color-mix(in srgb, var(--ct-accent, #3b82f6) 12%, transparent)',
              borderBottom: '1px solid var(--ct-glass-border, rgba(255,255,255,0.16))',
              color: 'var(--ct-accent, #3b82f6)', fontWeight: 900, fontSize: 12, textTransform: 'uppercase',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <FileText size={14} /> Extracted Data
            </div>
            {Object.entries(extracted).filter(([, value]) => value).map(([key, value]) => (
              <div key={key} style={{
                display: 'grid', gridTemplateColumns: '110px 1fr', gap: 10,
                padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)',
              }}>
                <div style={{
                  fontSize: 10, fontWeight: 800, color: 'var(--ct-muted, rgba(255,255,255,0.55))',
                  textTransform: 'uppercase', marginTop: 1,
                }}>
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </div>
                <div style={{ color: 'var(--ct-text, #fff)', fontSize: 13, fontWeight: 700, lineHeight: 1.4 }}>
                  {String(value)}
                </div>
              </div>
            ))}
            {fieldCount === 0 && (
              <div style={{ padding: 16, color: 'var(--ct-muted, rgba(255,255,255,0.55))', fontSize: 13, textAlign: 'center' }}>
                No structured fields detected. Upload a sharper document or try the camera again.
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 10, marginBottom: 4 }}>
            <button
              type="button"
              onClick={startCamera}
              style={{
                padding: 13, borderRadius: 8,
                border: '1px solid var(--ct-glass-border, rgba(255,255,255,0.16))',
                background: 'var(--ct-card, rgba(255,255,255,0.06))',
                color: 'var(--ct-text, #fff)', fontWeight: 800, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              <RefreshCw size={15} /> Rescan
            </button>
            <button
              type="button"
              onClick={handleUseData}
              disabled={fieldCount === 0}
              style={{
                padding: 13, borderRadius: 8,
                border: 'none',
                background: fieldCount > 0 ? 'var(--ct-accent, #3b82f6)' : 'rgba(255,255,255,0.1)',
                color: 'var(--ct-accent-fg, #fff)', fontWeight: 900, cursor: fieldCount > 0 ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                opacity: fieldCount > 0 ? 1 : 0.55,
              }}
            >
              <Zap size={16} /> Auto-fill fields
            </button>
          </div>
        </div>
      )}

      {phase === 'error' && (
        <div style={{
          marginTop: 14, width: 'min(100%, 520px)',
          background: 'color-mix(in srgb, var(--ct-red, #ef4444) 12%, transparent)',
          border: '1px solid color-mix(in srgb, var(--ct-red, #ef4444) 35%, transparent)',
          borderRadius: 8, padding: 18, textAlign: 'center',
        }}>
          <AlertTriangle size={32} color="var(--ct-red, #ef4444)" style={{ margin: '0 auto 12px' }} />
          <div style={{ color: 'var(--ct-red, #ef4444)', fontWeight: 900, fontSize: 14, marginBottom: 6 }}>Scanner needs input</div>
          <div style={{ color: 'var(--ct-muted, rgba(255,255,255,0.55))', fontSize: 12, marginBottom: 14 }}>
            {errorMsg || 'Camera is unavailable. Upload an image or PDF from this device.'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button type="button" onClick={startCamera} style={{
              padding: '10px 12px', borderRadius: 8, border: '1px solid var(--ct-glass-border, rgba(255,255,255,0.16))',
              background: 'var(--ct-card, rgba(255,255,255,0.06))', color: 'var(--ct-text, #fff)', fontWeight: 800, cursor: 'pointer',
            }}>Retry camera</button>
            <button type="button" onClick={() => fileInputRef.current?.click()} style={{
              padding: '10px 12px', borderRadius: 8, border: '1px solid var(--ct-accent, #3b82f6)',
              background: 'color-mix(in srgb, var(--ct-accent, #3b82f6) 15%, transparent)', color: 'var(--ct-accent, #3b82f6)', fontWeight: 900, cursor: 'pointer',
            }}>Upload file</button>
          </div>
        </div>
      )}

      {phase === 'live' && (
        <div style={{
          marginTop: 12,
          width: 'min(100%, 520px)',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 8,
        }}>
          {[
            ['Flat', 'Keep paper straight'],
            ['Light', 'Avoid shadows'],
            ['Frame', 'Fill the box'],
          ].map(([label, text]) => (
            <div key={label} style={{
              background: 'var(--ct-card, rgba(255,255,255,0.06))',
              border: '1px solid var(--ct-glass-border, rgba(255,255,255,0.16))',
              borderRadius: 8, padding: '9px 7px', textAlign: 'center',
            }}>
              <div style={{ color: 'var(--ct-accent, #3b82f6)', fontSize: 11, fontWeight: 900, marginBottom: 3 }}>{label}</div>
              <div style={{ color: 'var(--ct-muted, rgba(255,255,255,0.55))', fontSize: 9, lineHeight: 1.35 }}>{text}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
