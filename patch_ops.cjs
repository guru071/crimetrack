const fs = require('fs');
let content = fs.readFileSync('src/OperationsRoom.jsx', 'utf8');

// 1. Add import for FaceScannerModal and Search, Camera icons
if (!content.includes('import FaceScannerModal')) {
    content = content.replace("import { User, ShieldAlert, LogOut, FileText, Send, Edit2, Trash2, Check, X, AlertTriangle } from 'lucide-react';", "import { User, ShieldAlert, LogOut, FileText, Send, Edit2, Trash2, Check, X, AlertTriangle, Search, Camera } from 'lucide-react';\nimport FaceScannerModal from './FaceScannerModal';");
}

// 2. Add state variables inside OperationsRoom
const stateReplacement =   const [showRecordPicker, setShowRecordPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [recordToConfirm, setRecordToConfirm] = useState(null);;
content = content.replace("  const [showRecordPicker, setShowRecordPicker] = useState(false);", stateReplacement);

// 3. Filter records in the picker
content = content.replace("{records && records.length > 0 ? records.map(r => (", {records && records.length > 0 ? records.filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase()) || (r.firNumber && r.firNumber.toLowerCase().includes(searchQuery.toLowerCase()))).map(r => ();

// 4. Update the onClick in Record Picker to setRecordToConfirm
content = content.replace(/onClick=\{\(\) => sendRecord\(r\)\}/g, "onClick={() => setRecordToConfirm(r)}");

// 5. Add Search Bar and Scan Button inside Record Picker Modal
const modalHeader = <div style={{ background: "var(--ct-card)", padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
             <div style={{ color: "var(--ct-text)", fontWeight: 'bold' }}>Select Record to Share</div>
             <X color="var(--ct-text)" onClick={() => setShowRecordPicker(false)} style={{ cursor: 'pointer' }} />
          </div>;

const searchAndScanHeader = <div style={{ background: "var(--ct-card)", padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
             <div style={{ color: "var(--ct-text)", fontWeight: 'bold' }}>Select Record to Share</div>
             <X color="var(--ct-text)" onClick={() => setShowRecordPicker(false)} style={{ cursor: 'pointer' }} />
          </div>
          <div style={{ padding: "0 16px", marginTop: 12, display: "flex", gap: 8 }}>
             <div style={{ flex: 1, display: "flex", alignItems: "center", background: "rgba(255,255,255,0.05)", borderRadius: 12, padding: "0 12px", border: "1px solid rgba(255,255,255,0.1)" }}>
                <Search size={16} color="var(--ct-muted)" />
                <input 
                   placeholder="Search name or FIR..." 
                   value={searchQuery}
                   onChange={e => setSearchQuery(e.target.value)}
                   style={{ flex: 1, padding: "12px", background: "transparent", border: "none", color: "var(--ct-text)", outline: "none" }} 
                />
             </div>
             {getHumanModel && (
                <button onClick={() => setIsScanning(true)} style={{ background: "var(--ct-accent)", border: "none", borderRadius: 12, padding: "0 16px", color: "var(--ct-text)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                   <Camera size={18} />
                </button>
             )}
          </div>;

content = content.replace(modalHeader, searchAndScanHeader);

// 6. Add Scanner Modal and Confirmation Modal at the very end before the last </div>
const extraModals = 
      {isScanning && (
        <FaceScannerModal 
          records={records} 
          getHumanModel={getHumanModel} 
          onClose={() => setIsScanning(false)}
          onMatch={(matchedRecord) => {
             setIsScanning(false);
             setRecordToConfirm(matchedRecord);
          }}
        />
      )}

      {recordToConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
           <div style={{ background: "var(--ct-card)", borderRadius: 20, padding: 24, width: "100%", maxWidth: 360, color: "var(--ct-text)", border: "1px solid color-mix(in srgb, var(--ct-accent) 30%, transparent)", boxShadow: "0 10px 40px rgba(0,0,0,0.5)" }}>
              <h2 style={{ margin: "0 0 16px", fontSize: 20 }}>Share to Operation?</h2>
              
              <div style={{ display: 'flex', gap: 16, alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: 16, borderRadius: 12, marginBottom: 24 }}>
                 {recordToConfirm.photoUrl ? (
                    <img src={recordToConfirm.photoUrl} style={{ width: 60, height: 60, borderRadius: 30, objectFit: 'cover' }} />
                 ) : (
                    <div style={{ width: 60, height: 60, borderRadius: 30, background: "color-mix(in srgb, var(--ct-text) 10%, transparent)", display: 'flex', alignItems: 'center', justifyContent: 'center' }}><User size={30} /></div>
                 )}
                 <div>
                    <div style={{ fontWeight: 'bold', fontSize: 18 }}>{recordToConfirm.name}</div>
                    <div style={{ fontSize: 13, color: "var(--ct-muted)", marginTop: 2 }}>Age: {recordToConfirm.age} • {recordToConfirm.sex}</div>
                    <div style={{ fontSize: 12, color: "var(--ct-accent)", marginTop: 4 }}>FIR: {recordToConfirm.firNumber || 'N/A'}</div>
                 </div>
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                 <button onClick={() => setRecordToConfirm(null)} style={{ flex: 1, padding: "14px", borderRadius: 12, background: "rgba(255,255,255,0.05)", border: "none", color: "var(--ct-text)", fontWeight: "bold", cursor: "pointer" }}>Cancel</button>
                 <button onClick={() => { sendRecord(recordToConfirm); setRecordToConfirm(null); setShowRecordPicker(false); }} style={{ flex: 1, padding: "14px", borderRadius: 12, background: "var(--ct-accent)", border: "none", color: "var(--ct-text)", fontWeight: "bold", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}><Send size={16} /> Share</button>
              </div>
           </div>
        </div>
      )}
;

const viewRecordModalIndex = content.lastIndexOf('{/* View Record Modal */}');
content = content.substring(0, viewRecordModalIndex) + extraModals + '\n      ' + content.substring(viewRecordModalIndex);

// Add getHumanModel to props
content = content.replace("export default function OperationsRoom({ currentUser, profile, records }) {", "export default function OperationsRoom({ currentUser, profile, records, getHumanModel }) {");

fs.writeFileSync('src/OperationsRoom.jsx', content, 'utf8');
console.log('OperationsRoom updated with search, scan, and confirm.');
