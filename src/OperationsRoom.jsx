import { useState, useEffect, useRef } from 'react';
import { ShieldAlert, Send, AlertTriangle, X, User, Edit2, Trash2, Check, LogOut, Search, Camera, Plus, Shield } from 'lucide-react';
import Peer from 'peerjs';
import CryptoJS from 'crypto-js';
import FaceScannerModal from './FaceScannerModal';
import { db, collection, doc, setDoc, getDocs, serverTimestamp } from './firebase';
import { Capacitor } from '@capacitor/core';
import { MultiCaseAnalysis, RecordAIBrief } from './features/DatabaseAI';
import { LocalNotifications } from '@capacitor/local-notifications';

async function triggerOperationsPushNotification(title, body) {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== 'granted') {
      const req = await LocalNotifications.requestPermissions();
      if (req.display !== 'granted') return;
    }
    await LocalNotifications.schedule({
      notifications: [
        {
          title,
          body,
          id: new Date().getTime(),
          schedule: { at: new Date(Date.now() + 100) },
          channelId: 'case-alerts',
          sound: 'default',
          actionTypeId: '',
          extra: { source: 'operations' }
        }
      ]
    });
  } catch (e) {
    console.warn("Push notification failed", e);
  }
}

// Encrypt password with user UID as key
function encryptPassword(password, uid) {
  return CryptoJS.AES.encrypt(password, uid).toString();
}
function decryptPassword(cipher, uid) {
  try {
    const bytes = CryptoJS.AES.decrypt(cipher, uid);
    return bytes.toString(CryptoJS.enc.Utf8) || '';
  } catch {
    return '';
  }
}

export default function OperationsRoom({ currentUser, profile, records = [], getHumanModel, releaseHumanModel, onDeleteRecord }) {
  const [inRoom, setInRoom] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [password, setPassword] = useState('');
  const [messages, setMessages] = useState([]);

  // Cap chat history to save RAM on low-end devices
  useEffect(() => {
    const limit = (navigator.deviceMemory || 4) <= 4 ? 100 : 500;
    if (messages.length > limit) {
      setMessages(prev => prev.slice(prev.length - limit));
    }
  }, [messages.length]);
  const [inputMsg, setInputMsg] = useState('');
  const [peers, setPeers] = useState([]);
  const [isHost, setIsHost] = useState(false);

  const [history, setHistory] = useState([]); // [{id, officerName, joinedAt, encryptedPassword}]
  const [viewState, setViewState] = useState('history'); // history, join_new, enter_password
  const [fbLoading, setFbLoading] = useState(true);

  const [showRecordPicker, setShowRecordPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [recordToConfirm, setRecordToConfirm] = useState(null);
  const [selectedRecordToView, setSelectedRecordToView] = useState(null);

  const [editingMsgId, setEditingMsgId] = useState(null);
  const [editInput, setEditInput] = useState('');

  const [connectionLoading, setConnectionLoading] = useState(false);
  const [connectionError, setConnectionError] = useState(null);

  // Quick-add criminal record form removed

  const peerRef = useRef(null);
  const connectionsRef = useRef({});
  const messagesEndRef = useRef(null);
  const connectionTimeoutRef = useRef(null);

  //  Load rooms from Firebase on mount
  useEffect(() => {
    if (!db || !currentUser?.uid) {
      setFbLoading(false);
      // Fallback: load from localStorage only
      const h = JSON.parse(localStorage.getItem('my_operations_history') || '[]');
      setHistory(h.map(id => ({ id, officerName: '', joinedAt: null, encryptedPassword: '' })));
      if (h.length === 0) setViewState('join_new');
      return;
    }
    setFbLoading(true);
    loadRoomsFromFirebase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.uid]);

  const loadRoomsFromFirebase = async () => {
    try {
      // Load all operations where this police is a member
      const snap = await getDocs(collection(db, 'operations'));
      const rooms = [];
      for (const opDoc of snap.docs) {
        const membersSnap = await getDocs(collection(db, 'operations', opDoc.id, 'members'));
        const myMember = membersSnap.docs.find(d => d.id === currentUser.uid);
        if (myMember) {
          const data = myMember.data();
          rooms.push({
            id: opDoc.id,
            officerName: data.officerName || '',
            joinedAt: data.joinedAt?.toDate?.() || null,
            encryptedPassword: data.encryptedPassword || ''
          });
        }
      }
      if (rooms.length > 0) {
        setHistory(rooms);
        setViewState('history');
      } else {
        setHistory([]);
        setViewState('join_new');
      }
    } catch (err) {
      console.warn('Failed to load rooms from Firebase:', err);
      // Fallback to localStorage
      const h = JSON.parse(localStorage.getItem('my_operations_history') || '[]');
      setHistory(h.map(id => ({ id, officerName: '', joinedAt: null, encryptedPassword: '' })));
      if (h.length === 0) setViewState('join_new');
    } finally {
      setFbLoading(false);
    }
  };

  // Save room + encrypted password to Firebase
  const saveRoomToFirebase = async (rId, pwd) => {
    try {
      if (!db || !currentUser?.uid) return;
      const encrypted = encryptPassword(pwd, currentUser.uid);
      await setDoc(doc(db, 'operations', rId, 'members', currentUser.uid), {
        roomId: rId,
        encryptedPassword: encrypted,
        officerName: profile?.name || currentUser.email || '',
        officerId: currentUser.uid,
        joinedAt: serverTimestamp()
      }, { merge: true });
      // Also update local history
      setHistory(prev => {
        const exists = prev.find(r => r.id === rId);
        if (exists) return prev;
        return [...prev, { id: rId, officerName: profile?.name || '', joinedAt: new Date(), encryptedPassword: encrypted }];
      });
      // Legacy localStorage backup
      const h = JSON.parse(localStorage.getItem('my_operations_history') || '[]');
      if (!h.includes(rId)) { h.push(rId); localStorage.setItem('my_operations_history', JSON.stringify(h)); }
    } catch (err) {
      console.warn('Failed to save room to Firebase:', err);
    }
  };

  const deleteHistory = async (id) => {
    setHistory(prev => prev.filter(r => r.id !== id));
    // Remove from localStorage too
    const h = JSON.parse(localStorage.getItem('my_operations_history') || '[]').filter(x => x !== id);
    localStorage.setItem('my_operations_history', JSON.stringify(h));
    // Note: we don't delete from Firebase so other devices of same officer still see it
    if (history.filter(r => r.id !== id).length === 0) setViewState('join_new');
  };

  useEffect(() => {
    if (inRoom) {
      const pending = JSON.parse(localStorage.getItem(`pending_msgs_${roomId}`) || '[]');
      if (pending.length > 0) setMessages(prev => [...prev, ...pending]);
    }
  }, [inRoom, roomId]);

  useEffect(() => {
    return () => {
      if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current);
      if (peerRef.current && !peerRef.current.destroyed) peerRef.current.destroy();
    };
  }, []);

  const leaveRoom = () => {
    if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current);
    if (peerRef.current) peerRef.current.destroy();
    setInRoom(false);
    setMessages([]);
    setPeers([]);
    setRoomId('');
    setPassword('');
    setConnectionError(null);
    setConnectionLoading(false);
    setViewState(history.length > 0 ? 'history' : 'join_new');
  };

  const updateLocalStorage = (msgId, updates) => {
    const pending = JSON.parse(localStorage.getItem(`pending_msgs_${roomId}`) || '[]');
    const updated = pending.map(m => m.id === msgId ? { ...m, ...updates } : m);
    localStorage.setItem(`pending_msgs_${roomId}`, JSON.stringify(updated));
  };

  const removeFromLocalStorage = (msgId) => {
    const pending = JSON.parse(localStorage.getItem(`pending_msgs_${roomId}`) || '[]');
    const updated = pending.filter(m => m.id !== msgId);
    localStorage.setItem(`pending_msgs_${roomId}`, JSON.stringify(updated));
  };

  const setupConnection = (conn) => {
    conn.on('open', () => {
      connectionsRef.current[conn.peer] = conn;
      setPeers(Object.keys(connectionsRef.current));
      if (isHost) {
        setMessages(currentMessages => {
          currentMessages.forEach(msg => {
            const cipherText = CryptoJS.AES.encrypt(msg.text, password).toString();
            conn.send({ ...msg, text: cipherText, isHistory: true });
          });
          return currentMessages;
        });
      }
    });

    conn.on('data', (data) => {
      if (data.type === 'chat_delete') {
        setMessages(prev => prev.filter(m => !(m.id === data.id && m.senderId === data.senderId)));
        removeFromLocalStorage(data.id);
        if (isHost) Object.values(connectionsRef.current).forEach(c => { if (c.peer !== conn.peer && c.open) c.send(data); });
        return;
      }

      if (data.type === 'chat_edit') {
        let decryptedText = '[Encrypted Data - Wrong Key]';
        try {
          const bytes = CryptoJS.AES.decrypt(data.text, password);
          const t = bytes.toString(CryptoJS.enc.Utf8);
          if (t) decryptedText = t;
        } catch { /* ignore */ }
        setMessages(prev => prev.map(m => m.id === data.id && m.senderId === data.senderId ? { ...m, text: decryptedText, edited: true } : m));
        updateLocalStorage(data.id, { text: decryptedText, edited: true });
        if (isHost) Object.values(connectionsRef.current).forEach(c => { if (c.peer !== conn.peer && c.open) c.send(data); });
        return;
      }

      if (data.type === 'record_added') {
        // Peer broadcast: another officer added a record
        const systemMsg = {
          id: crypto.randomUUID(),
          type: 'system',
          text: ` ${data.officerName} added a new record: ${data.recordName}`,
          senderId: 'system',
          senderName: 'System',
          timestamp: new Date().toLocaleTimeString()
        };
        setMessages(prev => [...prev, systemMsg]);
        triggerOperationsPushNotification("New Record Added", systemMsg.text);
        if (isHost) Object.values(connectionsRef.current).forEach(c => { if (c.peer !== conn.peer && c.open) c.send(data); });
        return;
      }

      if (data.type === 'record_deleted') {
        const systemMsg = {
          id: crypto.randomUUID(),
          type: 'system',
          text: ` ${data.officerName} deleted record: ${data.recordName}`,
          senderId: 'system',
          senderName: 'System',
          timestamp: new Date().toLocaleTimeString()
        };
        setMessages(prev => [...prev, systemMsg]);
        triggerOperationsPushNotification("Record Deleted", systemMsg.text);
        if (isHost) Object.values(connectionsRef.current).forEach(c => { if (c.peer !== conn.peer && c.open) c.send(data); });
        return;
      }

      if (data.type === 'chat' || data.type === 'record_share' || data.type === 'system') {
        let decryptedText = '[Encrypted Data - Wrong Key]';
        try {
          const bytes = CryptoJS.AES.decrypt(data.text, password);
          const t = bytes.toString(CryptoJS.enc.Utf8);
          if (t) decryptedText = t;
        } catch { console.warn('Decryption failed'); }
        const localObj = { ...data, text: decryptedText };
        setMessages(prev => {
          if (prev.some(m => m.id === localObj.id)) return prev;
          const pending = JSON.parse(localStorage.getItem(`pending_msgs_${roomId}`) || '[]');
          pending.push(localObj);
          localStorage.setItem(`pending_msgs_${roomId}`, JSON.stringify(pending));
          return [...prev, localObj];
        });
        if (!data.isHistory) {
          triggerOperationsPushNotification(data.type === 'record_share' ? "Record Shared" : (data.type === 'system' ? "System Update" : "New Message"), `${localObj.senderName}: ${decryptedText.substring(0, 40)}`);
        }
        if (isHost) Object.values(connectionsRef.current).forEach(c => { if (c.peer !== conn.peer && c.open) c.send(data); });
      }
    });

    conn.on('close', () => {
      delete connectionsRef.current[conn.peer];
      setPeers(Object.keys(connectionsRef.current));
    });
  };

  const joinRoom = (e) => {
    e.preventDefault();
    if (!roomId || !password) return;

    setConnectionLoading(true);
    setConnectionError(null);

    // Set connection timeout
    const timeoutId = setTimeout(() => {
      setConnectionError('Connection timeout. Please check your internet connection and try again.');
      setConnectionLoading(false);
      console.warn('PeerJS connection timeout after 15s');
    }, 15000);

    connectionTimeoutRef.current = timeoutId;

    const peer = new Peer(roomId, {
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' }
        ]
      }
    });

    peer.on('open', () => {
      clearTimeout(connectionTimeoutRef.current);
      console.log('PeerJS Host mode established for room:', roomId);
      setInRoom(true);
      setIsHost(true);
      setConnectionLoading(false);
      saveRoomToFirebase(roomId, password);
      peerRef.current = peer;
      peer.on('connection', (conn) => setupConnection(conn));
    });

    peer.on('disconnected', () => {
      console.warn('PeerJS Host Disconnected. Attempting reconnect...');
      if (!peer.destroyed) peer.reconnect();
    });

    peer.on('error', (err) => {
      console.warn('PeerJS Host Error:', err.type, err.message);

      if (err.type === 'unavailable-id') {
        // Room ID taken, try joining as client
        console.log('Room ID unavailable, attempting to join as client...');
        peer.destroy();

        const clientPeer = new Peer(undefined, {
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' },
              { urls: 'stun:stun2.l.google.com:19302' }
            ]
          }
        });

        clientPeer.on('open', () => {
          console.log('PeerJS Client mode established, connecting to room:', roomId);
          clearTimeout(connectionTimeoutRef.current);
          setInRoom(true);
          setIsHost(false);
          setConnectionLoading(false);
          saveRoomToFirebase(roomId, password);
          peerRef.current = clientPeer;
          const conn = clientPeer.connect(roomId);
          setupConnection(conn);
        });

        clientPeer.on('disconnected', () => {
          console.warn('PeerJS Client Disconnected. Attempting reconnect...');
          if (!clientPeer.destroyed) clientPeer.reconnect();
        });

        clientPeer.on('error', (cErr) => {
          console.warn('PeerJS Client Error:', cErr.type, cErr.message);
          clearTimeout(connectionTimeoutRef.current);
          setConnectionLoading(false);

          if (cErr.type === 'peer-unavailable') {
            setConnectionError('Room does not exist or is offline. Check the Operation ID and try again.');
          } else if (cErr.type === 'network') {
            setConnectionError('Network error. Please check your connection and try again.');
          } else if (cErr.type === 'browser-incompatible') {
            setConnectionError('WebRTC not supported on this device.');
          } else {
            setConnectionError(`Connection failed: ${cErr.message || cErr.type}`);
          }
        });
      } else if (err.type === 'peer-unavailable') {
        clearTimeout(connectionTimeoutRef.current);
        setConnectionLoading(false);
        setConnectionError('Unable to connect. The room may not exist yet or is offline.');
      } else if (err.type === 'network') {
        clearTimeout(connectionTimeoutRef.current);
        setConnectionLoading(false);
        setConnectionError('Network error. Please check your internet connection.');
      } else if (err.type === 'browser-incompatible') {
        clearTimeout(connectionTimeoutRef.current);
        setConnectionLoading(false);
        setConnectionError('WebRTC not supported on this device.');
      } else {
        clearTimeout(connectionTimeoutRef.current);
        setConnectionLoading(false);
        setConnectionError(`Connection error: ${err.message || err.type}`);
      }
    });
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (!inputMsg.trim()) return;
    const cipherText = CryptoJS.AES.encrypt(inputMsg, password).toString();
    const networkObj = {
      type: 'chat',
      id: crypto.randomUUID(),
      text: cipherText,
      senderId: currentUser.uid,
      senderName: profile?.name || currentUser.email,
      senderPhoto: profile?.photoUrl || null,
      timestamp: new Date().toLocaleTimeString()
    };
    const localObj = { ...networkObj, text: inputMsg };
    setMessages(prev => [...prev, localObj]);
    setInputMsg('');
    sendNetworkObject(networkObj, localObj);
  };

  const saveEdit = (msgId) => {
    if (!editInput.trim()) { setEditingMsgId(null); return; }
    const cipherText = CryptoJS.AES.encrypt(editInput, password).toString();
    const networkObj = { type: 'chat_edit', id: msgId, text: cipherText, senderId: currentUser.uid };
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, text: editInput, edited: true } : m));
    setEditingMsgId(null);
    updateLocalStorage(msgId, { text: editInput, edited: true });
    Object.values(connectionsRef.current).forEach(c => { if (c.open) c.send(networkObj); });
  };

  const deleteMessage = (msgId) => {
    if (!window.confirm('Delete this message for everyone?')) return;
    const networkObj = { type: 'chat_delete', id: msgId, senderId: currentUser.uid };
    setMessages(prev => prev.filter(m => m.id !== msgId));
    removeFromLocalStorage(msgId);
    Object.values(connectionsRef.current).forEach(c => { if (c.open) c.send(networkObj); });
  };

  const sendRecord = (record) => {
    const cipherText = CryptoJS.AES.encrypt(JSON.stringify(record), password).toString();
    const networkObj = {
      type: 'record_share',
      id: crypto.randomUUID(),
      text: cipherText,
      senderId: currentUser.uid,
      senderName: profile?.name || currentUser.email,
      senderPhoto: profile?.photoUrl || null,
      timestamp: new Date().toLocaleTimeString()
    };
    const localObj = { ...networkObj, text: JSON.stringify(record) };
    setMessages(prev => [...prev, localObj]);
    setShowRecordPicker(false);
    sendNetworkObject(networkObj, localObj);
  };

  const sendNetworkObject = (networkObj, localObj) => {
    const activeConns = Object.values(connectionsRef.current);
    const pending = JSON.parse(localStorage.getItem(`pending_msgs_${roomId}`) || '[]');
    pending.push(localObj);
    localStorage.setItem(`pending_msgs_${roomId}`, JSON.stringify(pending));
    if (activeConns.length > 0) activeConns.forEach(conn => { if (conn.open) conn.send(networkObj); });
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  //  Delete Criminal Record from Operations Room
  const handleDeleteRecord = (recordId, recordName) => {
    if (!window.confirm(`Delete record "${recordName}" permanently?`)) return;
    if (onDeleteRecord) onDeleteRecord(recordId);

    // Broadcast to peers
    const broadcastObj = {
      type: 'record_deleted',
      id: crypto.randomUUID(),
      recordName,
      officerName: profile?.name || currentUser.email,
      senderId: currentUser.uid,
      timestamp: new Date().toLocaleTimeString()
    };
    Object.values(connectionsRef.current).forEach(c => { if (c.open) c.send(broadcastObj); });

    setMessages(prev => [...prev, {
      ...broadcastObj,
      text: ` You deleted record: ${recordName}`,
      type: 'system',
      senderName: 'System'
    }]);

    setSelectedRecordToView(null);
  };

  //  PRE-ROOM SCREENS
  if (!inRoom) {
    if (fbLoading) {
      return (
        <div style={{ padding: '72px 14px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh' }}>
          <div style={{ textAlign: 'center', color: 'var(--ct-muted)' }}>
            <Shield size={40} color="var(--ct-accent)" style={{ marginBottom: 12 }} />
            <div>Loading your operations...</div>
          </div>
        </div>
      );
    }

    if (viewState === 'history') {
      return (
        <div style={{ padding: '72px 14px', minHeight: '100dvh' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
            <ShieldAlert size={28} color="#ef4444" />
            <h2 style={{ color: 'var(--ct-text)', margin: 0 }}>My Operations</h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {history.map(room => {
              const rid = typeof room === 'string' ? room : room.id;
              const rName = typeof room === 'string' ? '' : room.officerName;
              const rDate = typeof room === 'string' ? null : room.joinedAt;
              const hasPassword = typeof room === 'object' && !!room.encryptedPassword;
              return (
                <div key={rid} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div onClick={() => {
                    setRoomId(rid);
                    // Auto-fill password if saved
                    if (hasPassword) {
                      const decrypted = decryptPassword(room.encryptedPassword, currentUser.uid);
                      if (decrypted) { setPassword(decrypted); }
                    }
                    setViewState('enter_password');
                  }} style={{ flex: 1, cursor: 'pointer' }}>
                    <div style={{ color: 'var(--ct-text)', fontWeight: 'bold', fontSize: 18, marginBottom: 4 }}>{rid.toUpperCase()}</div>
                    {rName && <div style={{ fontSize: 11, color: 'var(--ct-muted)', marginBottom: 2 }}>Joined by: {rName}</div>}
                    {rDate && <div style={{ fontSize: 11, color: 'var(--ct-muted)', marginBottom: 2 }}>
                      {new Date(rDate).toLocaleDateString()}
                    </div>}
                    <div style={{ color: '#3b82f6', fontSize: 13, fontWeight: '500', display: 'flex', alignItems: 'center', gap: 6 }}>
                      {hasPassword ? ' Password saved  tap to join ' : 'Tap to join secure room '}
                    </div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); deleteHistory(rid); }} style={{ background: 'rgba(239,68,68,0.1)', border: 'none', borderRadius: 12, width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <Trash2 size={18} color="#ef4444" />
                  </button>
                </div>
              );
            })}
          </div>

          <button onClick={() => { setRoomId(''); setPassword(''); setViewState('join_new'); }} style={{ marginTop: 24, width: '100%', padding: '18px', background: 'rgba(59,130,246,0.1)', border: '2px dashed rgba(59,130,246,0.5)', borderRadius: 16, color: '#3b82f6', fontWeight: 'bold', fontSize: 16, cursor: 'pointer' }}>
            + Create or Join New Operation
          </button>
        </div>
      );
    }

    if (viewState === 'enter_password') {
      return (
        <div style={{ padding: '72px 14px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh' }}>
          <div style={{ width: '100%', maxWidth: '100%', background: 'transparent', padding: 24, borderRadius: 24, border: '1px solid rgba(239,68,68,0.2)' }}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ width: 64, height: 64, background: 'rgba(239,68,68,0.1)', borderRadius: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <ShieldAlert size={32} color="#ef4444" />
              </div>
              <h2 style={{ margin: 0, color: 'var(--ct-text)', fontSize: 24 }}>{roomId.toUpperCase()}</h2>
              <p style={{ color: 'var(--ct-muted)', fontSize: 14, marginTop: 8 }}>Enter the passkey to decrypt this room.</p>
            </div>
            {connectionError && (
              <div style={{ padding: '12px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 8, marginBottom: 16, color: '#ef4444', fontSize: 13, textAlign: 'center' }}>
                {connectionError}
              </div>
            )}
            <form onSubmit={joinRoom} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <input type="password" disabled={connectionLoading} style={{ padding: '16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: 'var(--ct-text)', fontSize: 16, opacity: connectionLoading ? 0.5 : 1, cursor: connectionLoading ? 'not-allowed' : 'text' }} placeholder="Secret Passkey" value={password} onChange={e => setPassword(e.target.value)} required autoFocus />
              {password && <div style={{ fontSize: 11, color: '#10b981', textAlign: 'center' }}> Password auto-filled from Firebase</div>}
              <button type="submit" disabled={connectionLoading} style={{ padding: '16px', background: connectionLoading ? 'rgba(239,68,68,0.5)' : '#ef4444', border: 'none', borderRadius: 12, color: 'var(--ct-text)', fontWeight: 'bold', fontSize: 16, cursor: connectionLoading ? 'not-allowed' : 'pointer', opacity: connectionLoading ? 0.7 : 1 }}>
                {connectionLoading ? 'Connecting...' : 'Connect Securely'}
              </button>
              <button type="button" onClick={() => { setViewState('history'); setConnectionError(null); }} disabled={connectionLoading} style={{ padding: '16px', background: 'transparent', border: 'none', color: 'var(--ct-muted)', cursor: connectionLoading ? 'not-allowed' : 'pointer', fontSize: 15, opacity: connectionLoading ? 0.5 : 1 }}>Cancel</button>
            </form>
          </div>
        </div>
      );
    }

    // viewState === 'join_new'
    return (
      <div style={{ padding: '72px 14px 100px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh', boxSizing: 'border-box' }}>
        <div style={{ width: '100%', maxWidth: '100%', background: 'transparent', padding: 24, borderRadius: 24, border: '1px solid rgba(239,68,68,0.2)' }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ width: 64, height: 64, background: 'rgba(239,68,68,0.1)', borderRadius: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <ShieldAlert size={32} color="#ef4444" />
            </div>
            <h2 style={{ margin: 0, color: 'var(--ct-text)' }}>Secure Operations</h2>
            <p style={{ color: 'var(--ct-muted)', fontSize: 13, marginTop: 8 }}>Enter Operation ID and secret key to join the P2P encrypted room.</p>
          </div>
          {connectionError && (
            <div style={{ padding: '12px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 8, marginBottom: 16, color: '#ef4444', fontSize: 13, textAlign: 'center' }}>
              {connectionError}
            </div>
          )}
          <form onSubmit={joinRoom} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <input disabled={connectionLoading} style={{ padding: '16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: 'var(--ct-text)', width: '100%', boxSizing: 'border-box', opacity: connectionLoading ? 0.5 : 1, cursor: connectionLoading ? 'not-allowed' : 'text' }} placeholder="Operation ID (e.g. ALPHA-1)" value={roomId} onChange={e => setRoomId(e.target.value)} required />
            <input disabled={connectionLoading} style={{ padding: '16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: 'var(--ct-text)', width: '100%', boxSizing: 'border-box', opacity: connectionLoading ? 0.5 : 1, cursor: connectionLoading ? 'not-allowed' : 'text' }} placeholder="Secret Passkey" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
            <button type="submit" disabled={connectionLoading} style={{ padding: '16px', background: connectionLoading ? 'rgba(239,68,68,0.5)' : '#ef4444', border: 'none', borderRadius: 12, color: 'var(--ct-text)', fontWeight: 800, cursor: connectionLoading ? 'not-allowed' : 'pointer', opacity: connectionLoading ? 0.7 : 1 }}>
              {connectionLoading ? 'Connecting...' : 'Connect to Secure Channel'}
            </button>
            {history.length > 0 && (
              <button type="button" onClick={() => { setViewState('history'); setConnectionError(null); }} disabled={connectionLoading} style={{ marginTop: 8, padding: '16px', background: 'transparent', border: 'none', color: 'var(--ct-muted)', width: '100%', cursor: connectionLoading ? 'not-allowed' : 'pointer', opacity: connectionLoading ? 0.5 : 1 }}>
                Back to My Operations
              </button>
            )}
          </form>
        </div>
      </div>
    );
  }

  //  IN-ROOM CHAT VIEW
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', boxSizing: 'border-box' }}>
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: '72px 14px 20px', display: 'flex', flexDirection: 'column' }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, padding: '12px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 16 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#ef4444', display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShieldAlert size={18} /> {roomId.toUpperCase()}
                <span style={{ fontSize: 10, padding: '2px 6px', background: 'rgba(255,255,255,0.1)', color: 'var(--ct-text)', borderRadius: 4, fontWeight: 'normal' }}>
                  {isHost ? "You Created this Room" : "You Joined this Room"}
                </span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--ct-muted)', marginTop: 2 }}>
                {peers.length} {peers.length === 1 ? 'Peer' : 'Peers'} Connected
              </div>
            </div>
            <button onClick={leaveRoom} style={{ padding: '8px 16px', background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.5)', borderRadius: 10, color: '#fca5a5', fontSize: 13, fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <LogOut size={14} /> Leave
            </button>
          </div>

          {peers.length === 0 && (
            <div style={{ padding: 12, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 12, color: '#fcd34d', fontSize: 12, display: 'flex', gap: 8, marginBottom: 16 }}>
              <AlertTriangle size={16} style={{ flexShrink: 0 }} />
              You are the only one here. Operations chat runs in true P2P.
            </div>
          )}

          {/* Chat Area */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 16 }}>
            {(() => {
              const taggedSuspects = [];
              const chatMessages = [];
              const seenRecordIds = new Set();

              messages.forEach(msg => {
                const isSystemMsg = msg.type === 'system' || msg.senderId === 'system';
                let isRecord = msg.type === 'record_share';
                let parsedRecord = null;

                if (!isSystemMsg) {
                  try {
                    const parsed = JSON.parse(msg.text);
                    if (parsed && typeof parsed === 'object' && parsed.id && parsed.name) {
                      isRecord = true;
                      parsedRecord = parsed;
                    }
                  } catch { if (isRecord) isRecord = false; }
                }

                if (isRecord && parsedRecord) {
                  if (!seenRecordIds.has(parsedRecord.id)) {
                    seenRecordIds.add(parsedRecord.id);
                    taggedSuspects.push({ ...parsedRecord, msgTimestamp: msg.timestamp, msgId: msg.id, msgSenderId: msg.senderId });
                  }
                } else {
                  chatMessages.push({ ...msg, isSystemMsg });
                }
              });

              return (
                <>
                  {taggedSuspects.length > 0 && (
                    <div style={{ padding: '0 4px', marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--ct-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Shield size={14} color="#f59e0b" /> Tagged Suspects
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 8, scrollbarWidth: 'none' }}>
                        {taggedSuspects.map(rec => (
                          <div key={rec.id} style={{ position: 'relative', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', padding: '8px 12px', borderRadius: 12, display: 'flex', gap: 10, alignItems: 'center', minWidth: 200 }}>
                            {rec.msgSenderId === currentUser.uid && (
                              <button
                                onClick={(e) => { e.stopPropagation(); deleteMessage(rec.msgId); }}
                                style={{ position: 'absolute', top: -6, right: -6, background: '#ef4444', border: 'none', borderRadius: '50%', width: 20, height: 20, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 2 }}
                                title="Remove Tag"
                              >
                                <X size={12} />
                              </button>
                            )}
                            <div onClick={() => setSelectedRecordToView(rec)} style={{ display: 'flex', gap: 10, alignItems: 'center', width: '100%', cursor: 'pointer' }}>
                              {rec.photo ? (
                                <img src={rec.photo} style={{ width: 36, height: 36, borderRadius: 18, objectFit: 'cover' }} />
                              ) : (
                                <div style={{ width: 36, height: 36, borderRadius: 18, background: 'color-mix(in srgb, var(--ct-text) 10%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><User size={18} /></div>
                              )}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ color: '#f59e0b', fontWeight: 'bold', fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{rec.name}</div>
                                <div style={{ fontSize: 10, color: 'var(--ct-muted)' }}>{rec.status || 'Unknown'}</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {chatMessages.map(item => {
                    const msg = item.msg || item;
                    const isSystemMsg = msg.isSystemMsg || msg.type === 'system' || msg.senderId === 'system';
                    const isMe = msg.senderId === currentUser.uid;

                    if (isSystemMsg) {
                      return (
                        <div key={msg.id} style={{ textAlign: 'center', padding: '6px 12px' }}>
                          <span style={{ fontSize: 11, color: 'var(--ct-muted)', background: 'rgba(255,255,255,0.05)', padding: '4px 12px', borderRadius: 20 }}>{msg.text}</span>
                        </div>
                      );
                    }

                    return (
                      <div key={msg.id} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '85%', display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', gap: 8, alignItems: 'flex-end' }}>
                        {!isSystemMsg && !isMe && (
                          <div style={{ flexShrink: 0, marginBottom: 18 }}>
                            {msg.senderPhoto ? (
                              <img src={msg.senderPhoto} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />
                            ) : (
                              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><User size={14} color="#fff" /></div>
                            )}
                          </div>
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                          {!isMe && <div style={{ fontSize: 10, color: 'var(--ct-muted)', marginBottom: 4, marginLeft: 4 }}>{msg.senderName}</div>}
                          {editingMsgId === msg.id ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, background: 'rgba(255,255,255,0.1)', padding: 12, borderRadius: 12 }}>
                              <input autoFocus value={editInput} onChange={e => setEditInput(e.target.value)} style={{ padding: '10px', borderRadius: 8, border: '1px solid #3b82f6', background: 'rgba(0,0,0,0.5)', color: 'var(--ct-text)', outline: 'none' }} />
                              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                <button onClick={() => setEditingMsgId(null)} style={{ padding: '6px 12px', borderRadius: 6, background: 'color-mix(in srgb, var(--ct-text) 10%, transparent)', color: 'var(--ct-text)', border: 'none' }}><X size={14} /></button>
                                <button onClick={() => saveEdit(msg.id)} style={{ padding: '6px 12px', borderRadius: 6, background: '#3b82f6', color: 'var(--ct-text)', border: 'none' }}><Check size={14} /></button>
                              </div>
                            </div>
                          ) : (
                            <div style={{ background: isMe ? '#3b82f6' : 'rgba(255,255,255,0.1)', padding: '10px 14px', borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px', color: 'var(--ct-text)', fontSize: 14 }}>
                              {msg.text}
                              {msg.edited && <span style={{ fontSize: 10, opacity: 0.7, marginLeft: 6 }}>*(edited)*</span>}
                            </div>
                          )}
                          <div style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', alignItems: 'center', gap: 12, marginTop: 4, padding: '0 4px' }}>
                            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>{msg.timestamp}</div>
                            {isMe && editingMsgId !== msg.id && (
                              <div style={{ display: 'flex', gap: 8 }}>
                                <Edit2 size={10} color="#60a5fa" style={{ cursor: 'pointer' }} onClick={() => { setEditingMsgId(msg.id); setEditInput(msg.text); }} />
                                <Trash2 size={10} color="#f87171" style={{ cursor: 'pointer' }} onClick={() => deleteMessage(msg.id)} />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </>
              );
            })()}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Bar */}
        <form onSubmit={sendMessage} style={{ display: 'flex', gap: 8, padding: '12px 14px', background: 'var(--ct-bg)', borderTop: '1px solid rgba(255,255,255,0.1)', zIndex: 100, paddingBottom: '12px' }}>
          <button type="button" onClick={() => setShowRecordPicker(true)} style={{ width: 48, height: 48, borderRadius: 24, background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.4)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }} title="Tag Suspect">
            <Plus size={20} />
          </button>
          <input style={{ flex: 1, padding: '14px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, color: 'var(--ct-text)', outline: 'none', backdropFilter: 'blur(10px)', minWidth: 0 }} placeholder="Secure message..." value={inputMsg} onChange={e => setInputMsg(e.target.value)} />
          <button type="submit" style={{ width: 48, height: 48, borderRadius: 24, background: '#3b82f6', border: 'none', color: 'var(--ct-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
            <Send size={18} style={{ transform: 'translateX(-2px)' }} />
          </button>
        </form>

        {/* Record Picker Modal */}
        {showRecordPicker && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.95)', zIndex: 99999, display: 'flex', flexDirection: 'column' }}>
            <div style={{ background: 'var(--ct-card)', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ color: 'var(--ct-text)', fontWeight: 'bold' }}>Select Record to Share</div>
                <X color="var(--ct-text)" onClick={() => setShowRecordPicker(false)} style={{ cursor: 'pointer' }} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: '0 12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <Search size={16} color="var(--ct-muted)" />
                  <input placeholder="Search name or FIR..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ flex: 1, padding: '12px', background: 'transparent', border: 'none', color: 'var(--ct-text)', outline: 'none' }} />
                </div>
                {getHumanModel && (
                  <button onClick={() => setIsScanning(true)} style={{ background: 'var(--ct-accent)', border: 'none', borderRadius: 12, padding: '0 16px', color: 'var(--ct-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <Camera size={18} />
                  </button>
                )}
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {records && records.length > 0 ? records.filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase()) || (r.firNumber && r.firNumber.toLowerCase().includes(searchQuery.toLowerCase()))).map(r => (
                <div key={r.id} onClick={() => { setRecordToConfirm(r); setShowRecordPicker(false); }} style={{ background: 'rgba(255,255,255,0.05)', padding: 12, borderRadius: 8, color: 'var(--ct-text)', display: 'flex', gap: 12, alignItems: 'center', cursor: 'pointer' }}>
                  {r.photo ? <img src={r.photo} style={{ width: 40, height: 40, borderRadius: 20, objectFit: 'cover' }} /> : <div style={{ width: 40, height: 40, borderRadius: 20, background: 'color-mix(in srgb, var(--ct-text) 10%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><User size={20} /></div>}
                  <div>
                    <div style={{ fontWeight: 'bold' }}>{r.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--ct-muted)' }}>{r.firNumber || 'No FIR'}</div>
                  </div>
                </div>
              )) : (
                <div style={{ color: 'var(--ct-text)', textAlign: 'center', marginTop: 40 }}>No records available.</div>
              )}
            </div>
          </div>
        )}

        {isScanning && (
          <FaceScannerModal records={records} getHumanModel={getHumanModel} releaseHumanModel={releaseHumanModel} onClose={() => setIsScanning(false)} onMatch={(matchedRecord) => { setIsScanning(false); setRecordToConfirm(matchedRecord); }} />
        )}

        {recordToConfirm && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div style={{ background: 'var(--ct-card)', borderRadius: 20, padding: 24, width: '100%', maxWidth: 360, color: 'var(--ct-text)', border: '1px solid color-mix(in srgb, var(--ct-accent) 30%, transparent)', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}>
              <h2 style={{ margin: '0 0 16px', fontSize: 20 }}>Share to Operation?</h2>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: 16, borderRadius: 12, marginBottom: 24 }}>
                {recordToConfirm.photo ? <img src={recordToConfirm.photo} style={{ width: 60, height: 60, borderRadius: 30, objectFit: 'cover' }} /> : <div style={{ width: 60, height: 60, borderRadius: 30, background: 'color-mix(in srgb, var(--ct-text) 10%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><User size={30} /></div>}
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: 18 }}>{recordToConfirm.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--ct-muted)', marginTop: 2 }}>Age: {recordToConfirm.age || 'Unknown'}  {recordToConfirm.sex || 'Unknown'}</div>
                  <div style={{ fontSize: 12, color: 'var(--ct-accent)', marginTop: 4 }}>FIR: {recordToConfirm.firNumber || 'N/A'}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={() => setRecordToConfirm(null)} style={{ flex: 1, padding: '14px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: 'none', color: 'var(--ct-text)', fontWeight: 'bold', cursor: 'pointer' }}>Cancel</button>
                <button onClick={() => { sendRecord(recordToConfirm); setRecordToConfirm(null); }} style={{ flex: 1, padding: '14px', borderRadius: 12, background: 'var(--ct-accent)', border: 'none', color: 'var(--ct-text)', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><Send size={16} /> Share</button>
              </div>
            </div>
          </div>
        )}

        {/* View Shared Record Modal */}
        {selectedRecordToView && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.95)', zIndex: 99999, display: 'flex', flexDirection: 'column', padding: 20, overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, marginTop: 40 }}>
              <div style={{ color: '#3b82f6', fontWeight: 'bold', fontSize: 18 }}>Shared Record</div>
              <X color="var(--ct-text)" onClick={() => setSelectedRecordToView(null)} size={28} style={{ cursor: 'pointer' }} />
            </div>
            <div style={{ background: 'var(--ct-card)', borderRadius: 16, padding: 20, color: 'var(--ct-text)' }}>
              {selectedRecordToView.photo && <img src={selectedRecordToView.photo} style={{ width: '100%', borderRadius: 8, marginBottom: 16 }} />}
              <h2 style={{ margin: '0 0 8px' }}>{selectedRecordToView.name}</h2>
              <div style={{ color: 'var(--ct-muted)', marginBottom: 16 }}>Age: {selectedRecordToView.age}  Sex: {selectedRecordToView.sex}</div>
              {[
                ['Address', selectedRecordToView.address],
                ['FIR Number', selectedRecordToView.firNumber],
                ['Status', selectedRecordToView.status],
                ['Area of Operation', selectedRecordToView.areaOfOperation],
                ['Current Doings', selectedRecordToView.currentDoings],
                ['Hideouts', selectedRecordToView.hideouts],
              ].filter(([, v]) => v).map(([label, value]) => (
                <div key={label} style={{ background: 'rgba(0,0,0,0.3)', padding: 12, borderRadius: 8, marginBottom: 12 }}>
                  <div style={{ fontSize: 11, color: 'var(--ct-muted)' }}>{label}</div>
                  <div>{value}</div>
                </div>
              ))}
              {/* AI Analysis Buttons */}
              <div style={{ marginTop: 16, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 16 }}>
                <RecordAIBrief record={selectedRecordToView} />
                <MultiCaseAnalysis record={selectedRecordToView} />
              </div>

              {/* Delete Record button  only for records in local database */}
              {onDeleteRecord && records.find(r => r.id === selectedRecordToView.id) && (
                <button onClick={() => handleDeleteRecord(selectedRecordToView.id, selectedRecordToView.name)} style={{ width: '100%', marginTop: 12, padding: 14, borderRadius: 12, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', color: '#f87171', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <Trash2 size={16} /> Delete Record from Database
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
