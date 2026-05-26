import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Mic, Send, X, Loader, Shield, Maximize2, Minimize2 } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { VoiceRecorder } from 'capacitor-voice-recorder';

const css = {
  container: {
    position: 'fixed',
    bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))',
    right: 16,
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    pointerEvents: 'none'
  },
  trigger: {
    width: 56,
    height: 56,
    borderRadius: 28,
    background: 'linear-gradient(135deg, #3b82f6, #a855f7)',
    border: '2px solid rgba(255,255,255,0.2)',
    boxShadow: '0 8px 32px rgba(168, 85, 247, 0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    pointerEvents: 'auto',
    transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
  },
  panel: {
    width: 'min(calc(100vw - 32px), 380px)',
    background: 'rgba(10, 10, 15, 0.85)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 24,
    marginBottom: 16,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    pointerEvents: 'auto',
    boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
    transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
    transformOrigin: 'bottom right'
  },
  header: {
    flexShrink: 0,
    padding: '16px',
    background: 'rgba(255,255,255,0.03)',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  title: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    color: '#fff',
    fontWeight: 800,
    fontSize: 14,
    background: 'linear-gradient(90deg, #3b82f6, #a855f7)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent'
  },
  chatArea: {
    flex: 1,
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    overflowY: 'auto'
  },
  messageUser: {
    background: 'rgba(59, 130, 246, 0.15)',
    border: '1px solid rgba(59, 130, 246, 0.3)',
    color: '#fff',
    padding: '10px 14px',
    borderRadius: '16px 16px 4px 16px',
    alignSelf: 'flex-end',
    maxWidth: '85%',
    fontSize: 13,
    lineHeight: 1.4
  },
  messageAi: {
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    color: 'var(--ct-muted, #a1a1aa)',
    padding: '10px 14px',
    borderRadius: '16px 16px 16px 4px',
    alignSelf: 'flex-start',
    maxWidth: '85%',
    fontSize: 13,
    lineHeight: 1.4
  },
  inputArea: {
    flexShrink: 0,
    padding: '12px 16px',
    background: 'rgba(0,0,0,0.2)',
    borderTop: '1px solid rgba(255,255,255,0.05)',
    display: 'flex',
    gap: 8,
    alignItems: 'center'
  },
  input: {
    flex: 1,
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 20,
    padding: '10px 16px',
    color: '#fff',
    fontSize: 13,
    outline: 'none',
    minWidth: 0
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    cursor: 'pointer',
    flexShrink: 0
  }
};

export default function AICopilot({ settings, records }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'ai', text: 'I am the CrimeTrack AI Copilot. How can I assist your operations today?' }
  ]);
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const toggleMic = async () => {
    if (isRecording) {
      if (Capacitor.isNativePlatform()) {
        import('@capacitor-community/speech-recognition').then(({ SpeechRecognition }) => SpeechRecognition.stop()).catch(console.error);
      } else if (window.activeSpeechRec) {
        window.activeSpeechRec.stop();
      }
      setIsRecording(false);
      return;
    }

    try {
      if (Capacitor.isNativePlatform()) {
        const { SpeechRecognition } = await import('@capacitor-community/speech-recognition');
        
        // Ensure available
        const available = await SpeechRecognition.available();
        if (!available.available) {
           setMessages(prev => [...prev, { role: 'ai', text: 'MIC ERROR: Speech Recognition is not available on this device.' }]);
           return;
        }

        // Check Permissions
        const perm = await SpeechRecognition.checkPermissions();
        if (perm.speechRecognition !== 'granted') {
          const req = await SpeechRecognition.requestPermissions();
          if (req.speechRecognition !== 'granted') {
             setMessages(prev => [...prev, { role: 'ai', text: 'MIC ERROR: Microphone permission denied.' }]);
             return;
          }
        }

        setIsRecording(true);
        try {
          const result = await SpeechRecognition.start({
            language: "en-US", maxResults: 1, prompt: "Speak now...", partialResults: false, popup: false
          });
          if (result && result.matches && result.matches.length > 0) {
            handleSend(result.matches[0]);
          }
        } catch (e) {
          setMessages(prev => [...prev, { role: 'ai', text: `MIC ERROR: ${e.message}` }]);
        } finally {
          setIsRecording(false);
        }
        return; // EXIT early for native
      }
    } catch (e) {
      console.warn("Native mic failed", e);
    }

    // WEB FALLBACK
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      setMessages(prev => [...prev, { role: 'ai', text: 'ERROR: Speech recognition is not supported on this browser.' }]);
      return;
    }

    try {
      const recognition = new SpeechRec();
      window.activeSpeechRec = recognition;
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => setIsRecording(true);
      recognition.onresult = (event) => {
        const text = event.results[0][0].transcript;
        handleSend(text);
        setIsRecording(false);
      };
      recognition.onerror = (event) => {
        setMessages(prev => [...prev, { role: 'ai', text: `MIC ERROR: ${event.error}` }]);
        setIsRecording(false);
      };
      recognition.onend = () => setIsRecording(false);
      
      recognition.start();
    } catch (err) {
      console.error(err);
      setIsRecording(false);
      setMessages(prev => [...prev, { role: 'ai', text: `MIC ERROR: ${err.message}` }]);
    }
  };

  const handleSend = async (forcedText) => {
    const text = forcedText || input;
    if (!text.trim()) return;

    setMessages(prev => [...prev, { role: 'user', text }]);
    setInput('');
    setIsThinking(true);

    const apiKey = settings?.geminiApiKey || import.meta.env.VITE_GEMINI_API_KEY || "AIzaSyAZMmUoWuD5Droq6iDUhoLH6YMwCY0ACPo";
    if (!apiKey) {
      setTimeout(() => {
        setIsThinking(false);
        setMessages(prev => [...prev, { role: 'ai', text: 'ERROR: Real AI requires a Gemini API Key. Please configure it in Settings.' }]);
      }, 800);
      return;
    }

    try {
      const dbSummary = records && records.length > 0 
        ? records.map(r => `[ID:${r.id}, Name:${r.name}, Crime:${r.crimeType || r.crime || 'Unknown'}, Status:${r.status}]`).join(' | ')
        : "No records currently exist.";

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `You are a helpful Police AI Assistant in the CrimeTrack app. CrimeTrack is a practical, local-first police digital workspace built by GOAT'ECH. Answer concisely and professionally. Never hallucinate criminal records. 
          
          CURRENT DATABASE RECORDS (Local/Google Sheets):
          ${dbSummary}

          Use the database records above to answer questions about suspects, active cases, or statistics.
          
          User asks: ${text}` }] }]
        })
      });
      
      const data = await response.json();
      if (data.error) {
        if (data.error.code === 429 || data.error.message?.toLowerCase().includes('quota')) {
          throw new Error("AI Quota Exceeded. Please try again in a minute, or configure your own API key in Settings.");
        }
        throw new Error(data.error.message);
      }
      
      const aiResponse = data.candidates[0].content.parts[0].text;
      setMessages(prev => [...prev, { role: 'ai', text: aiResponse }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', text: `Failed to connect to Neural Net: ${err.message}` }]);
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div style={css.container}>
      {isOpen && (
        <div style={{ 
          ...css.panel, 
          height: isExpanded ? 'calc(100dvh - 150px)' : 'min(420px, calc(100dvh - 150px))',
          maxHeight: 'calc(100dvh - 100px)',
          opacity: isOpen ? 1 : 0, 
          transform: isOpen ? 'scale(1) translateY(0)' : 'scale(0.9) translateY(20px)' 
        }}>
          <div style={css.header}>
            <div style={css.title}>
              <Sparkles size={16} color="#a855f7" /> CrimeTrack Copilot
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setIsExpanded(!isExpanded)} style={{ background: 'transparent', border: 'none', color: 'var(--ct-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
              <button onClick={() => setIsOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--ct-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <X size={18} />
              </button>
            </div>
          </div>

          <div style={css.chatArea}>
            {messages.map((m, i) => (
              <div key={i} style={m.role === 'user' ? css.messageUser : css.messageAi}>
                {m.text}
              </div>
            ))}
            {isThinking && (
              <div style={css.messageAi}>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <Shield size={12} className="ct-spin" /> Accessing Neural Net...
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <form onSubmit={e => { e.preventDefault(); handleSend(); }} style={css.inputArea}>
            <button type="button" onClick={toggleMic} style={{ ...css.actionBtn, background: isRecording ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.05)', color: isRecording ? '#ef4444' : 'var(--ct-muted)', border: isRecording ? '1px solid rgba(239,68,68,0.5)' : 'none' }}>
              <Mic size={16} />
            </button>
            <input 
              style={css.input} 
              placeholder={isRecording ? "Listening..." : "Ask the OS..."} 
              value={input} 
              onChange={e => setInput(e.target.value)} 
              disabled={isThinking || isRecording}
            />
            <button type="submit" disabled={!input.trim() || isThinking || isRecording} style={{ ...css.actionBtn, background: input.trim() ? '#3b82f6' : 'rgba(255,255,255,0.05)', color: input.trim() ? '#fff' : 'var(--ct-muted)' }}>
              <Send size={14} style={{ transform: 'translateX(-1px)' }} />
            </button>
          </form>
        </div>
      )}

      <div style={{ ...css.trigger, transform: isOpen ? 'scale(0)' : 'scale(1)' }} onClick={() => setIsOpen(true)}>
        <Sparkles size={24} color="#fff" />
      </div>
    </div>
  );
}
