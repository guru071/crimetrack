import { useEffect, useState, useRef } from 'react';
import { User, Shield, LogOut, Edit2, Check, X, Camera, Trash2 } from 'lucide-react';
import { db, auth, signOut, doc, getDoc, setDoc, deleteDoc, deleteUser } from './firebase';

export default function ProfileView({ currentUser, onLogout, SettingsComponent }) {
  const [profile, setProfile] = useState(() => {
    try { return JSON.parse(localStorage.getItem("crimetrack_auth_profile") || "null"); } catch { return null; }
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editStation, setEditStation] = useState("");
  const [editPhotoBase64, setEditPhotoBase64] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (currentUser?.uid && db) {
      getDoc(doc(db, "users", currentUser.uid)).then(docSnap => {
        if (docSnap.exists()) {
          const nextProfile = { uid: currentUser.uid, ...docSnap.data() };
          localStorage.setItem("crimetrack_auth_profile", JSON.stringify(nextProfile));
          setProfile(nextProfile);
          setEditName(nextProfile.name || "");
          setEditStation(nextProfile.station || "");
        }
      });
    }
  }, [currentUser]);

  const handleLogout = async () => {
    if (auth) await signOut(auth);
    onLogout();
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm("WARNING: This will permanently delete your CrimeTrack account, all personal details, and clear your active operations history on this device. This action cannot be undone. Are you absolutely sure?")) return;

    try {
      if (currentUser?.uid && db) {
        await deleteDoc(doc(db, "police_profiles", currentUser.uid)).catch(() => null);
        await deleteDoc(doc(db, "users", currentUser.uid)).catch(() => null);
      }

      localStorage.removeItem("crimetrack_auth_profile");
      localStorage.removeItem("crimetrack_settings");
      localStorage.removeItem("my_operations_history");
      for (let i = 0; i < localStorage.length; i++) {
         const key = localStorage.key(i);
         if (key && key.startsWith('pending_msgs_')) {
            localStorage.removeItem(key);
         }
      }

      if (auth && auth.currentUser) {
        await deleteUser(auth.currentUser);
      }
      
      onLogout();
    } catch (err) {
      console.error("Failed to delete account:", err);
      if (err.code === 'auth/requires-recent-login') {
        alert("Please log out and log back in before deleting your account for security verification.");
      } else {
        alert("Failed to delete account: " + err.message);
      }
    }
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 300;
        const MAX_HEIGHT = 300;
        let width = img.width; let height = img.height;
        if (width > height) { if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; } }
        else { if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; } }
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        setEditPhotoBase64(canvas.toDataURL('image/jpeg', 0.6));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!currentUser?.uid || !db) return;
    setIsSaving(true);
    try {
      const updatedData = {
        name: editName,
        station: editStation,
        updatedAt: new Date().toISOString()
      };
      if (editPhotoBase64) {
        updatedData.photoUrl = editPhotoBase64;
      }

      const profileRef = doc(db, 'users', currentUser.uid);
      await setDoc(profileRef, updatedData, { merge: true });

      const nextProfile = { ...profile, ...updatedData };
      setProfile(nextProfile);
      localStorage.setItem("crimetrack_auth_profile", JSON.stringify(nextProfile));
      setIsEditing(false);
      setEditPhotoBase64("");
    } catch (err) {
      console.error("Failed to update profile", err);
      alert("Failed to update profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const cancelEdit = () => {
    setEditName(profile?.name || "");
    setEditStation(profile?.station || "");
    setEditPhotoBase64("");
    setIsEditing(false);
  };

  const displayPhoto = editPhotoBase64 || profile?.photoUrl;

  return (
    <div style={{ padding: "72px 14px 80px", maxWidth: 800, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: "var(--ct-accent)" }}>Officer Profile</div>
        {!isEditing && (
          <button onClick={() => setIsEditing(true)} className="ct-btn-accent" style={{ padding: "8px 16px", fontSize: 13, borderRadius: 20 }}>
            <Edit2 size={14} /> Edit Profile
          </button>
        )}
      </div>

      <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 24, padding: 24, border: "1px solid rgba(255,255,255,0.1)", display: "flex", gap: 24, alignItems: "center", marginBottom: 24, position: "relative", overflow: "hidden" }}>

        <div style={{ width: 80, height: 80, borderRadius: 40, background: "rgba(255,255,255,0.1)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, position: "relative", cursor: isEditing ? "pointer" : "default" }} onClick={() => isEditing && fileInputRef.current?.click()}>
          {displayPhoto ? (
            <img src={displayPhoto} alt="Officer" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: isEditing ? 0.7 : 1 }} />
          ) : (
            <User size={32} color="rgba(255,255,255,0.5)" />
          )}
          {isEditing && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.4)" }}>
              <Camera size={24} color="#fff" />
            </div>
          )}
          <input type="file" accept="image/*" ref={fileInputRef} onChange={handlePhotoUpload} style={{ display: "none" }} />
        </div>

        <div style={{ flex: 1 }}>
          {isEditing ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <input type="text" value={editName} onChange={e => setEditName(e.target.value)} placeholder="Full Name" className="ct-input" style={{ fontSize: 16, padding: "8px 12px" }} />
              <input type="text" value={editStation} onChange={e => setEditStation(e.target.value)} placeholder="Police Station" className="ct-input" style={{ fontSize: 14, padding: "8px 12px" }} />
            </div>
          ) : (
            <>
              <div style={{ fontSize: 24, fontWeight: 800, color: "var(--ct-text)", letterSpacing: "-0.02em" }}>{profile?.name || currentUser?.email || "Officer"}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--ct-muted)", fontSize: 13, marginTop: 4 }}>
                <Shield size={14} color="var(--ct-accent)" />
                {profile?.station || "Unknown Station"}
              </div>
            </>
          )}

          {!isEditing && (
            <>
              <div style={{ fontSize: 12, color: "var(--ct-text)", marginTop: 6, fontFamily: "monospace" }}>
                Police ID: {profile?.policeId || "Generating after login"}
              </div>
              <div style={{ fontSize: 11, color: "var(--ct-muted)", marginTop: 4 }}>
                {profile?.email || currentUser?.email}
              </div>
            </>
          )}
        </div>

        {isEditing ? (
          <div style={{ position: "absolute", top: 16, right: 16, display: "flex", gap: 8 }}>
            <button onClick={cancelEdit} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", padding: "8px", borderRadius: "50%", cursor: "pointer", display: "flex" }}>
              <X size={16} />
            </button>
            <button onClick={handleSave} disabled={isSaving} style={{ background: "var(--ct-accent)", border: "none", color: "#000", padding: "8px", borderRadius: "50%", cursor: "pointer", display: "flex" }}>
              <Check size={16} />
            </button>
          </div>
        ) : (
          <button onClick={handleLogout} style={{ position: "absolute", top: 16, right: 16, background: "rgba(239, 68, 68, 0.1)", border: "none", color: "#fca5a5", padding: "8px 12px", borderRadius: 12, display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
            <LogOut size={14} /> Logout
          </button>
        )}
      </div>

      <div style={{ width: "100%", height: 1, background: "rgba(255,255,255,0.1)", margin: "32px 0" }}></div>

      {/* Embedded Settings */}
      {SettingsComponent}

      <div style={{ marginTop: 32, padding: 24, background: "rgba(239, 68, 68, 0.05)", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: 16 }}>
        <div style={{ color: "#ef4444", fontWeight: "bold", fontSize: 16, marginBottom: 8 }}>Danger Zone</div>
        <div style={{ color: "var(--ct-muted)", fontSize: 13, marginBottom: 16 }}>
          Permanently delete your account, personal data, and clear all operations history on this device.
        </div>
        <button onClick={handleDeleteAccount} style={{ width: "100%", padding: "14px", background: "rgba(239, 68, 68, 0.1)", border: "1px solid #ef4444", borderRadius: 12, color: "#ef4444", fontWeight: "bold", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <Trash2 size={16} /> Delete My Account
        </button>
      </div>
    </div>
  );
}

