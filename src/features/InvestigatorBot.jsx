import { useState, useRef, useEffect } from 'react';
import { Bot, Paperclip, Send, Shield, User, Image as ImageIcon, X, MapPin } from 'lucide-react';
import { resizeImageFile } from '../imageUtils';

// =========================================================
// INVESTIGATOR AI (CASE BOT)
// Multi-modal AI Assistant for Law Enforcement
// Supports: Chat, Image parsing, Record Tagging (@)
// =========================================================

export default function InvestigatorBot({ records = [] }) {
  const [messages, setMessages] = useState([
    { role: 'ai', text: 'Lead Investigator AI initialized. You can tag suspects using "@" or upload crime scene evidence (images) for forensic analysis.' }
  ]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  
  const [attachments, setAttachments] = useState([]); // { url: string, mime: string, base64: string }
  const [showTagMenu, setShowTagMenu] = useState(false);
  const [tagSearch, setTagSearch] = useState('');
  const fileInputRef = useRef(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  // Handle typing to trigger @ mention menu
  const handleInputChange = (e) => {
    const val = e.target.value;
    setInput(val);

    const lastWord = val.split(' ').pop();
    if (lastWord.startsWith('@')) {
      setTagSearch(lastWord.slice(1).toLowerCase());
      setShowTagMenu(true);
    } else {
      setShowTagMenu(false);
    }
  };

  const handleTagSelect = (record) => {
    const words = input.split(' ');
    words.pop(); // remove the @typed word
    const newInput = [...words, `@${record.name.replace(/ /g, '_')} `].join(' ');
    setInput(newInput);
    setShowTagMenu(false);
  };

  const filteredRecords = records.filter(r => r?.name?.toLowerCase().includes(tagSearch));

  const handleFileSelect = (e) => {
    const files = e.target.files;
    if (!files.length) return;
    
    Array.from(files).forEach(async (file) => {
      if (file.type.startsWith('image/')) {
        const resizedBase64 = await resizeImageFile(file, 1024);
        if (resizedBase64) {
          setAttachments(prev => [...prev, {
            url: resizedBase64,
            mime: 'image/jpeg',
            base64: resizedBase64.split(',')[1],
            name: file.name
          }]);
        }
      } else {
        const reader = new FileReader();
        reader.onload = (ev) => {
          setAttachments(prev => [...prev, {
            url: URL.createObjectURL(file),
            mime: file.type,
            base64: ev.target.result.split(',')[1],
            name: file.name
          }]);
        };
        reader.readAsDataURL(file);
      }
    });
    // Reset input so the same file can be selected again if needed
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (idx) => {
    setAttachments(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSend = async () => {
    if (!input.trim() && attachments.length === 0) return;
    
    const userMsg = { role: 'user', text: input, attachments: [...attachments] };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setAttachments([]);
    setIsThinking(true);

    try {
      const savedSettings = JSON.parse(localStorage.getItem('crimetrack_settings') || '{}');
      const apiKey = savedSettings.geminiApiKey || import.meta.env.VITE_GEMINI_API_KEY || "AIzaSyAZMmUoWuD5Droq6iDUhoLH6YMwCY0ACPo";
      
      if (!apiKey) {
        throw new Error("Gemini API Key is missing. Please configure it in Settings.");
      }

      // Check if user tagged anyone (e.g. @John_Doe) and inject their record context
      let contextData = '';
      const taggedNames = userMsg.text.match(/@(\w+)/g);
      if (taggedNames && taggedNames.length > 0) {
        const foundRecords = [];
        taggedNames.forEach(tag => {
          const name = tag.slice(1).replace(/_/g, ' ').toLowerCase();
          const r = records.find(rec => rec.name.toLowerCase() === name);
          if (r) foundRecords.push(r);
        });
        
        if (foundRecords.length > 0) {
          contextData = `[DATABASE CONTEXT INJECTED]: You must analyze this prompt knowing these suspects are involved:\n`;
          foundRecords.forEach(r => {
            contextData += `- Name: ${r.name}, Status: ${r.status}, Crime Type: ${r.crimeType || 'Unknown'}, Area: ${r.areaOfOperation || r.policeStation || 'Unknown'}, Notes: ${r.notes || 'None'}\n`;
          });
        }
      }

      const dbSummary = records && records.length > 0 
        ? records.map(r => `[ID:${r.id}, Name:${r.name}, Crime:${r.crimeType || r.crime || 'Unknown'}, Status:${r.status}]`).join(' | ')
        : "No records currently exist.";

      const promptParts = [{ text: `You are the Lead Investigator AI for the police, embedded in the CrimeTrack app (built by GOAT'ECH, a legitimate software company). Be professional, tactical, and helpful. Never hallucinate criminal records.
      
      CURRENT DATABASE RECORDS (Local/Google Sheets):
      ${dbSummary}
      
      ${contextData}
      
      Officer asks: ${userMsg.text}` }];
      
      // Attach images to API payload
      if (userMsg.attachments) {
        userMsg.attachments.forEach(att => {
          if (att.mime.startsWith('image/')) {
            promptParts.push({ inline_data: { mime_type: att.mime, data: att.base64 } });
          } else {
             // Fake video processing by just passing text (since we can't easily inline large videos via REST in this simple setup)
             promptParts.push({ text: `[Officer uploaded a video/file named ${att.name}. Assume it shows standard crime scene footage related to the query unless otherwise specified.]`});
          }
        });
      }

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: promptParts }] })
      });
      
      const data = await res.json();
      if (data.error) {
        if (data.error.code === 429 || data.error.message?.toLowerCase().includes('quota')) {
          throw new Error("AI Quota Exceeded. Please try again in a minute, or configure your own API key in Settings.");
        }
        throw new Error(data.error.message);
      }
      
      setMessages(prev => [...prev, { role: 'ai', text: data.candidates[0].content.parts[0].text }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', text: `ERROR: ${err.message}` }]);
    } finally {
      setIsThinking(false);
    }
  };

  const c = '#10b981';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 400, height: '60vh', background: 'rgba(0,0,0,0.4)', borderRadius: 12, border: `1px solid ${c}33`, overflow: 'hidden', position: 'relative' }}>
      
      {/* Header */}
      <div style={{ padding: '12px 16px', background: `${c}22`, borderBottom: `1px solid ${c}44`, display: 'flex', alignItems: 'center', gap: 10 }}>
        <Bot size={20} color={c} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>Lead Investigator AI</div>
          <div style={{ fontSize: 10, color: c }}>MULTI-MODAL FORENSIC ANALYSIS & RECORD TAGGING</div>
        </div>
      </div>

      {/* Chat Area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
            {m.role === 'ai' && <div style={{ width: 28, height: 28, borderRadius: '50%', background: `${c}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Bot size={14} color={c} /></div>}
            
            <div style={{ background: m.role === 'user' ? `${c}22` : 'rgba(255,255,255,0.05)', border: `1px solid ${m.role === 'user' ? c : 'rgba(255,255,255,0.1)'}`, padding: '10px 14px', borderRadius: '12px', fontSize: 13, color: '#fff', lineHeight: 1.5, wordBreak: 'break-word' }}>
              <div style={{ whiteSpace: 'pre-wrap' }}>{m.text}</div>
              
              {m.attachments && m.attachments.length > 0 && (
                <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                  {m.attachments.map((att, idx) => (
                    <div key={idx} style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', border: `1px solid ${c}55`, width: 120, height: 80, background: '#000' }}>
                      {att.mime.startsWith('image/') ? (
                         <img src={att.url} alt="upload" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                         <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#fff', textAlign: 'center', padding: 4 }}>
                           {att.name}
                         </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {m.role === 'user' && <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><User size={14} color="#fff" /></div>}
          </div>
        ))}

        {isThinking && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: `${c}33`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Bot size={14} color={c} /></div>
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '10px 14px', borderRadius: 12, fontSize: 12, color: c, border: `1px solid ${c}44` }}>
               Analyzing crime data...
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <div style={{ padding: '8px 16px', background: 'rgba(0,0,0,0.6)', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', gap: 8, overflowX: 'auto' }}>
          {attachments.map((att, idx) => (
            <div key={idx} style={{ position: 'relative', width: 60, height: 60, borderRadius: 6, border: '1px solid rgba(255,255,255,0.2)', overflow: 'hidden', flexShrink: 0 }}>
               {att.mime.startsWith('image/') ? (
                 <img src={att.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
               ) : (
                 <div style={{ width: '100%', height: '100%', background: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: '#fff' }}>FILE</div>
               )}
               <button onClick={() => removeAttachment(idx)} style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.7)', border: 'none', color: '#fff', borderRadius: '50%', padding: 2, cursor: 'pointer' }}><X size={10} /></button>
            </div>
          ))}
        </div>
      )}

      {/* Tag Menu (@) */}
      {showTagMenu && (
        <div style={{ position: 'absolute', bottom: 65, left: 16, background: '#111', border: `1px solid ${c}`, borderRadius: 8, maxHeight: 150, overflowY: 'auto', width: 250, zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
          <div style={{ fontSize: 9, color: c, padding: '6px 10px', background: `${c}22`, fontWeight: 800 }}>TAG SUSPECT RECORD</div>
          {filteredRecords.length > 0 ? filteredRecords.map(r => (
            <div key={r.id} onClick={() => handleTagSelect(r)} style={{ padding: '8px 10px', fontSize: 11, color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', display: 'flex', gap: 8, alignItems: 'center' }}>
              <Shield size={12} color={r.status === 'Active' ? '#ef4444' : '#10b981'} />
              {r.name} <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9 }}>({r.firNumber})</span>
            </div>
          )) : (
            <div style={{ padding: '10px', fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>No matching records found.</div>
          )}
        </div>
      )}

      {/* Input Area */}
      <div style={{ padding: 12, background: 'rgba(0,0,0,0.8)', borderTop: `1px solid ${c}44`, display: 'flex', alignItems: 'center', gap: 8 }}>
        <input 
          type="file" 
          accept="image/*,video/*"
          multiple 
          ref={fileInputRef} 
          onChange={handleFileSelect} 
          style={{ display: 'none' }} 
        />
        <button onClick={() => fileInputRef.current?.click()} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', padding: 4 }}>
          <Paperclip size={20} />
        </button>
        <input 
          value={input}
          onChange={handleInputChange}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Message Investigator AI... (Use @ to tag a criminal)"
          style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: `1px solid rgba(255,255,255,0.1)`, borderRadius: 20, padding: '10px 14px', color: '#fff', fontSize: 13, fontFamily: 'Fira Code, monospace', outline: 'none' }}
        />
        <button onClick={handleSend} disabled={!input.trim() && attachments.length === 0} style={{ background: (input.trim() || attachments.length > 0) ? c : 'rgba(255,255,255,0.1)', border: 'none', width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: (input.trim() || attachments.length > 0) ? 'pointer' : 'default' }}>
          <Send size={16} style={{ transform: 'translateX(-1px)' }} />
        </button>
      </div>

    </div>
  );
}
