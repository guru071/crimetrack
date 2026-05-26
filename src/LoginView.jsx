import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, ChevronRight, Eye, Lock, Mail, Shield, User } from 'lucide-react';
import { getSelectedTheme, themeToCssVars } from './TimeBasedTheme';
import { Capacitor } from '@capacitor/core';
import {
  auth,
  db,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  doc,
  getDoc,
  setDoc,
  sendEmailVerification,
  applyActionCode,
  collection,
  getDocs
} from './firebase';
import { sendVerificationEmail } from './emailService';
import { nativeGoogleSignIn, checkGoogleRedirectResult } from './nativeGoogleSignIn';

function withTimeout(promise, ms, message) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function friendlyFirebaseError(err) {
  const message = err?.message || String(err);
  if (message.includes('database (default) does not exist') || message.includes('Firestore')) {
    return 'Firebase Firestore is not enabled. Open Firebase Console > Firestore Database > Create database, then try again.';
  }
  if (message.includes('storage') || message.includes('bucket') || message.includes('Not Found')) {
    return 'Firebase Storage is not enabled, or the storage bucket is wrong. Enable Storage in Firebase Console or use the Apps Script Drive upload URL.';
  }
  if (message.includes('auth/popup') || message.includes('popup')) {
    return 'Google sign-in popup was blocked or canceled. Please use email/password login.';
  }
  if (message.includes('auth/web-storage-unsupported')) {
    return 'Your browser has cookies/storage disabled. Please allow cookies for Google Sign-In.';
  }
  return message;
}

function stationKey(station) {
  return (station || 'general').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'general';
}

function generatePoliceId(user, station) {
  const stationCode = (station || 'CT')
    .replace(/[^a-z0-9]/gi, '')
    .slice(0, 4)
    .toUpperCase()
    .padEnd(4, 'X');
  const uidPart = (user?.uid || `${Date.now()}`)
    .replace(/[^a-z0-9]/gi, '')
    .slice(-6)
    .toUpperCase()
    .padStart(6, '0');
  return `CT-${stationCode}-${uidPart}`;
}

function saveProfileLocally(profile) {
  if (!profile) return;
  localStorage.setItem('crimetrack_auth_profile', JSON.stringify(profile));
  const settings = JSON.parse(localStorage.getItem('crimetrack_settings') || '{}');
  const nextSettings = {
    ...settings,
    officerId: profile.policeId,
    officerName: profile.name,
    policeProfile: profile
  };
  localStorage.setItem('crimetrack_settings', JSON.stringify(nextSettings));
}

async function uploadOfficerPhoto(user, photoBase64, fallbackUrl = '') {
  // Free Tier Optimization: Bypass external storage completely.
  // The compressed base64 string will be saved directly into the Firestore document.
  return photoBase64 || fallbackUrl || '';
}

async function fetchOfficerProfile(user) {
  if (!db || !user?.uid) return null;
  const snap = await withTimeout(getDoc(doc(db, 'users', user.uid)), 15000, 'Firebase profile load timed out.');
  if (!snap.exists()) return null;
  return { uid: user.uid, ...snap.data() };
}

async function saveOfficerProfile(user, details) {
  if (!db || !user?.uid) throw new Error('Firebase Firestore is not configured.');
  const station = details.station.trim();
  const existing = await fetchOfficerProfile(user);
  const policeId = existing?.policeId || generatePoliceId(user, station);
  const photoUrl = await uploadOfficerPhoto(user, details.photoBase64, details.photoUrl || existing?.photoUrl || user.photoURL || '');
  const now = new Date().toISOString();
  const profile = {
    uid: user.uid,
    policeId,
    name: details.name.trim(),
    email: user.email || details.email,
    station,
    photoUrl,
    provider: details.provider || user.providerData?.[0]?.providerId || 'password',
    updatedAt: now,
    createdAt: existing?.createdAt || now
  };

  await withTimeout(Promise.all([
    setDoc(doc(db, 'users', user.uid), profile, { merge: true }),
    setDoc(doc(db, 'stations', stationKey(station)), {
      name: station,
      updatedAt: now,
      createdBy: existing?.uid || user.uid
    }, { merge: true })
  ]), 20000, 'Firebase profile save timed out.');

  saveProfileLocally(profile);
  return profile;
}

export default function LoginView({ onLoginSuccess, onDemo }) {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [station, setStation] = useState('');
  const [photoBase64, setPhotoBase64] = useState('');
  const [pendingUser, setPendingUser] = useState(null);

  // Email Verification States
  const [verifyStep, setVerifyStep] = useState(false);
  const [verifyUser, setVerifyUser] = useState(null);
  const [showPolicy, setShowPolicy] = useState(false);
  const [verifyProfile, setVerifyProfile] = useState(null);
  const [resendLoading, setResendLoading] = useState(false);

  const [availableStations, setAvailableStations] = useState([]);
  const [showStationDropdown, setShowStationDropdown] = useState(false);
  const stationRef = useRef(null);

  useEffect(() => {
    if (!db) return;
    getDocs(collection(db, 'stations')).then(snap => {
      const stations = [];
      snap.forEach(doc => stations.push(doc.data().name));
      setAvailableStations(stations.filter(Boolean));
    }).catch(err => console.warn("Failed to load stations", err));
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (stationRef.current && !stationRef.current.contains(e.target)) {
        setShowStationDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fileInputRef = useRef(null);
  const theme = getSelectedTheme();

  // Handle email verification callback from Firebase link
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oobCode = params.get('oobCode');
    const mode = params.get('mode');
    const emailVerified = params.get('email_verified');

    if (emailVerified === 'true') {
      setError('Email verified successfully. You can now log in.');
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    if (mode === 'verifyEmail' && oobCode && auth) {
      setLoading(true);
      applyActionCode(auth, oobCode)
        .then(() => {
          setError('Email verified successfully. You can now log in.');
          // Clear URL params
          window.history.replaceState({}, document.title, window.location.pathname);
        })
        .catch((err) => {
          const msg = err.code === 'auth/invalid-action-code' ? 'Link expired or invalid' : err.message;
          setError('Verification failed: ' + msg);
        })
        .finally(() => setLoading(false));
    }
  }, []);

  const triggerEmailVerification = async (user, profileDraft) => {
    try {
      if (user.emailVerified) {
        setLoading(true);
        const savedProfile = await saveOfficerProfile(user, profileDraft);
        saveProfileLocally(savedProfile);
        onLoginSuccess(user, savedProfile);
        setLoading(false);
        return;
      }

      if (!user.emailVerified) {
        console.log('Starting email verification for:', user.email);

        // Try EmailJS first (if configured)
        const emailSent = await sendVerificationEmail(
          user.email,
          user.uid,
          profileDraft?.name || user.displayName || user.email
        );

        // Fallback to Firebase if EmailJS not configured
        if (!emailSent) {
          console.log('Calling Firebase sendEmailVerification...');
          await sendEmailVerification(user, {
            url: `${window.location.origin}?email_verified=true`
          });
          console.log(' Firebase verification email sent to:', user.email);
        }
      }
    } catch (err) {
      console.error(' Email verification error:', err);
      console.error('Error code:', err?.code);
      console.error('Error message:', err?.message);
      setError(`Email verification failed: ${err?.message || err}`);
    }
    setVerifyUser(user);
    setVerifyProfile(profileDraft);
    localStorage.setItem('pending_officer_profile', JSON.stringify(profileDraft));
    setVerifyStep(true);
    setLoading(false);
  };

  const handleCheckVerification = async () => {
    if (!verifyUser) return;
    setLoading(true);
    setError('');
    try {
      await verifyUser.reload();
      if (verifyUser.emailVerified) {
        let draft = verifyProfile;
        if (!draft) {
          try { draft = JSON.parse(localStorage.getItem('pending_officer_profile')); } catch (e) { /* ignore */ }
        }
        if (draft && !draft.policeId) {
          const savedProfile = await saveOfficerProfile(verifyUser, draft);
          saveProfileLocally(savedProfile);
          onLoginSuccess(verifyUser, savedProfile);
          localStorage.removeItem('pending_officer_profile');
        } else {
          saveProfileLocally(draft || {});
          onLoginSuccess(verifyUser, draft || {});
        }
      } else {
        setError('Email not verified yet. Please click the link in your inbox and try again.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!verifyUser) return;
    setResendLoading(true);
    setError('');
    try {
      await sendEmailVerification(verifyUser);
      setError('Verification email resent. Check your inbox.');
    } catch (err) {
      setError(err.message);
    } finally {
      setResendLoading(false);
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
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
        } else {
          if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Compress heavily so it easily fits within Firestore's 1MB document limit
        setPhotoBase64(canvas.toDataURL('image/jpeg', 0.6));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const completeProfile = async (user, provider = 'password') => {
    if (!name.trim() || !station.trim()) throw new Error('Name and police station are required.');
    if (!photoBase64 && !user.photoURL) throw new Error('A profile photo is required.');
    const profileDraft = {
      name,
      station,
      email: user.email || email,
      photoBase64,
      photoUrl: user.photoURL || '',
      provider
    };
    await triggerEmailVerification(user, profileDraft);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!auth) throw new Error('Firebase is not configured. Update src/firebase.js.');

      if (isLogin) {
        const userCredential = await withTimeout(
          signInWithEmailAndPassword(auth, email, password),
          30000,
          'Email login timed out. Check internet and Firebase Authentication setup.'
        );
        const profile = await fetchOfficerProfile(userCredential.user);

        // Block Google-registered officers from using manual login
        if (profile?.provider && profile.provider !== 'password') {
          await auth.signOut();
          throw new Error('This account was registered using Google Sign-In. Please use the "Continue with Google" button to login.');
        }

        if (!profile?.policeId || !profile?.station) {
          setPendingUser(userCredential.user);
          setName(profile?.name || userCredential.user.displayName || userCredential.user.email || '');
          setStation(profile?.station || '');
          return;
        }
        await triggerEmailVerification(userCredential.user, profile);
        return;
      }

      // Check if email already registered via Google before creating new account
      const userCredential = await withTimeout(
        createUserWithEmailAndPassword(auth, email, password),
        30000,
        'Officer registration timed out. Check internet and Firebase Authentication setup.'
      );
      await completeProfile(userCredential.user, 'password');
    } catch (err) {
      console.error(err);
      setError(friendlyFirebaseError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleUser = useCallback(async (user) => {
    const profile = await fetchOfficerProfile(user);

    if (profile?.provider && profile.provider === 'password') {
      await auth.signOut();
      throw new Error('This account was registered using Email & Password. Please use the manual login form instead.');
    }

    if (profile?.policeId && profile?.station) {
      saveProfileLocally(profile);
      onLoginSuccess(user, profile);
      return;
    }

    setPendingUser(user);
    setName(profile?.name || user.displayName || user.email || '');
    setEmail(user.email || '');
    setStation(profile?.station || '');
  }, [onLoginSuccess]);

  // On Android APK: check if we just returned from a Google redirect sign-in
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    checkGoogleRedirectResult().then(user => {
      if (user) handleGoogleUser(user);
    }).catch(err => {
      console.warn('Redirect result check failed:', err);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      if (!auth) throw new Error('Firebase is not configured. Update src/firebase.js.');

      let user;

      if (Capacitor.isNativePlatform()) {
        // Native Android/iOS: uses native plugin
        user = await nativeGoogleSignIn();
      } else {
        // Web browser/Electron: uses popup
        user = await nativeGoogleSignIn();
      }

      if (user) {
        await handleGoogleUser(user);
      }

    } catch (err) {
      console.error(err);
      setError(friendlyFirebaseError(err));
    } finally {
      setLoading(false);
    }
  };

  const handlePendingProfileSubmit = async (e) => {
    e.preventDefault();
    if (!pendingUser) return;
    setLoading(true);
    setError('');
    try {
      await completeProfile(pendingUser, pendingUser.providerData?.[0]?.providerId || 'google.com');
    } catch (err) {
      console.error(err);
      setError(friendlyFirebaseError(err));
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '15px 15px 15px 44px',
    background: 'var(--ct-input-bg)',
    border: '1px solid var(--ct-glass-border)',
    borderRadius: 14,
    color: 'var(--ct-text)',
    fontSize: 15,
    outline: 'none',
    boxSizing: 'border-box',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)'
  };

  const iconStyle = {
    position: 'absolute',
    left: 14,
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#10b981',
    pointerEvents: 'none'
  };

  const photo = photoBase64 || pendingUser?.photoURL || '';
  const completingProfile = !!pendingUser;

  return (
    <>
      <div
        style={{
          flex: 1,
          width: '100%',
          backgroundColor: '#050505',
          backgroundImage: 'radial-gradient(circle at center, #111 0%, #000 100%)',
          color: '#10b981',
          fontFamily: '"Fira Code", monospace',
          position: 'relative',
          overflowY: 'auto',
          overflowX: 'hidden'
        }}
      >
        {/* Terminal Grid Background */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(16,185,129,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,0.03) 1px, transparent 1px)', backgroundSize: '30px 30px' }} />

        <div style={{ position: 'relative', zIndex: 1, minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 18, boxSizing: 'border-box' }}>
          <div style={{ width: '100%', maxWidth: 460 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, borderBottom: '1px solid rgba(16,185,129,0.3)', paddingBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Shield size={28} color="#10b981" />
                <span style={{ fontSize: 22, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px', textShadow: '0 0 10px rgba(16,185,129,0.5)' }}>RESTRICTED ACCESS</span>
              </div>
              <span style={{ color: '#ef4444', fontSize: 12, animation: 'pulse 2s infinite' }}>[ LEVEL 4 CLEARANCE REQUIRED ]</span>
            </div>

            <div style={{ background: 'rgba(10,10,10,0.8)', padding: 30, borderRadius: 8, border: '1px solid rgba(16,185,129,0.4)', boxShadow: '0 0 30px rgba(16,185,129,0.1)' }}>
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <div style={{ width: 80, height: 80, border: '2px solid #10b981', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: 'inset 0 0 20px rgba(16,185,129,0.2)' }}>
                  {verifyStep ? <Mail size={36} color="#10b981" /> : <Lock size={36} color="#10b981" />}
                </div>
                <h1 style={{ fontSize: 24, fontWeight: 900, color: '#fff', margin: 0, textTransform: 'uppercase' }}>
                  {verifyStep ? 'AWAITING VERIFICATION' : 'POLICE TERMINAL LOGIN'}
                </h1>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, margin: '10px 0 0', lineHeight: 1.5 }}>
                  {verifyStep
                    ? `Encrypted link dispatched to ${verifyUser?.email}. Authenticate to proceed.`
                    : completingProfile ? 'Initialize new officer profile generation.'
                      : isLogin ? 'Warning: Unauthorized access is a federal offense.' : 'Request officer clearance generation.'}
                </p>
              </div>

              {error && (
                <div style={{ padding: 12, background: 'rgba(239,68,68,0.1)', border: '1px left solid #ef4444', color: '#ef4444', fontSize: 13, marginBottom: 20, fontFamily: 'monospace' }}>
                  [ERROR]: {error}
                </div>
              )}

              {verifyStep ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {/* Envelope animation */}
                  <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'center' }}>
                      <Mail size={56} color="var(--ct-accent)" />
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--ct-muted)', lineHeight: 1.6 }}>
                      Open your email and click the
                      <br />
                      <strong style={{ color: 'var(--ct-accent)' }}>"Verify Email"</strong> link sent by Firebase.
                      <br />Then come back and press the button below.
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleCheckVerification}
                    className="squish-btn"
                    style={{ width: '100%', padding: 16, background: 'var(--ct-accent)', border: 'none', borderRadius: 16, color: 'var(--ct-accent-fg)', fontSize: 16, fontWeight: 900, cursor: loading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 12px 30px color-mix(in srgb, var(--ct-accent) 45%, transparent)' }}
                  >
                    {loading ? 'Checking...' : 'I have verified my email'}
                    {!loading && <ChevronRight size={18} />}
                  </button>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 4 }}>
                    <button
                      type="button"
                      disabled={resendLoading}
                      onClick={handleResendVerification}
                      style={{ background: 'none', border: 'none', color: 'var(--ct-muted)', fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      {resendLoading ? 'Sending...' : 'Resend verification email'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setVerifyStep(false)}
                      style={{ background: 'none', border: 'none', color: 'var(--ct-muted)', fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <form onSubmit={completingProfile ? handlePendingProfileSubmit : handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {(completingProfile || !isLogin) && (
                      <>
                        <div style={{ position: 'relative' }}>
                          <User size={18} style={iconStyle} />
                          <input style={inputStyle} placeholder="Officer full name" value={name} onChange={e => setName(e.target.value)} required />
                        </div>
                        <div style={{ position: 'relative' }} ref={stationRef}>
                          <Shield size={18} style={iconStyle} />
                          <input
                            style={inputStyle}
                            placeholder="Police station"
                            value={station}
                            onChange={e => {
                              setStation(e.target.value);
                              setShowStationDropdown(true);
                            }}
                            onFocus={() => setShowStationDropdown(true)}
                            required
                          />
                          {showStationDropdown && station.trim() && (
                            <div style={{
                              position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, zIndex: 10,
                              background: 'var(--ct-input-bg)', border: '1px solid var(--ct-glass-border)',
                              borderRadius: 14, overflow: 'hidden', backdropFilter: 'blur(16px)',
                              boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
                            }}>
                              {availableStations.filter(s => s.toLowerCase().includes(station.toLowerCase()) && s !== station).length > 0 ? (
                                availableStations.filter(s => s.toLowerCase().includes(station.toLowerCase()) && s !== station).slice(0, 5).map((s, idx) => (
                                  <div
                                    key={idx}
                                    onClick={() => {
                                      setStation(s);
                                      setShowStationDropdown(false);
                                    }}
                                    style={{
                                      padding: '12px 16px', cursor: 'pointer', color: 'var(--ct-text)', fontSize: 14,
                                      borderBottom: idx < 4 ? '1px solid var(--ct-glass-border)' : 'none'
                                    }}
                                    onMouseEnter={e => e.target.style.background = 'rgba(255,255,255,0.1)'}
                                    onMouseLeave={e => e.target.style.background = 'transparent'}
                                  >
                                    {s}
                                  </div>
                                ))
                              ) : (
                                <div style={{ padding: '12px 16px', color: 'var(--ct-muted)', fontSize: 13 }}>
                                  Creating new station: "{station}"
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          style={{ ...inputStyle, padding: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', textAlign: 'left' }}
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <span style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                            {photo ? (
                              <img src={photo} alt="Officer" style={{ width: 36, height: 36, borderRadius: 18, objectFit: 'cover' }} />
                            ) : (
                              <span style={{ width: 36, height: 36, borderRadius: 18, background: 'color-mix(in srgb, var(--ct-accent) 20%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Camera size={17} color="var(--ct-accent)" />
                              </span>
                            )}
                            <span style={{ color: photo ? 'var(--ct-text)' : 'var(--ct-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {photoBase64 ? 'Profile photo selected' : pendingUser?.photoURL ? 'Using Google photo' : 'Add profile photo'}
                            </span>
                          </span>
                        </button>
                        <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} accept="image/*" style={{ display: 'none' }} />
                      </>
                    )}

                    {!completingProfile && (
                      <>
                        <div style={{ position: 'relative' }}>
                          <Mail size={18} style={iconStyle} />
                          <input type="email" style={{ ...inputStyle, background: 'rgba(0,0,0,0.5)', border: '1px solid #10b981', color: '#10b981' }} placeholder="[ OFFICER EMAIL / BADGE ]" value={email} onChange={e => setEmail(e.target.value)} required />
                        </div>
                        <div style={{ position: 'relative' }}>
                          <Lock size={18} style={iconStyle} />
                          <input type="password" style={{ ...inputStyle, background: 'rgba(0,0,0,0.5)', border: '1px solid #10b981', color: '#10b981' }} placeholder="[ SECURITY CLEARANCE KEY ]" value={password} onChange={e => setPassword(e.target.value)} required />
                        </div>
                      </>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      style={{ width: '100%', padding: 16, background: '#10b981', border: 'none', color: '#000', fontSize: 16, fontWeight: 900, cursor: loading ? 'wait' : 'pointer', marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, textTransform: 'uppercase', letterSpacing: '1px' }}
                    >
                      {loading ? 'AUTHENTICATING...' : completingProfile ? 'SAVE PROFILE DATA' : isLogin ? 'INITIALIZE SECURE LOGIN' : 'REQUEST CLEARANCE'}
                    </button>
                  </form>

                  {!completingProfile && (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', margin: '22px 0', gap: 12 }}>
                        <div style={{ flex: 1, height: 1, background: 'rgba(16,185,129,0.3)' }} />
                        <span style={{ fontSize: 12, color: '#10b981', fontWeight: 700 }}>OR</span>
                        <div style={{ flex: 1, height: 1, background: 'rgba(16,185,129,0.3)' }} />
                      </div>

                      <button
                        onClick={handleGoogleSignIn}
                        disabled={loading}
                        style={{ width: '100%', padding: 15, background: 'transparent', border: '1px solid #10b981', color: '#10b981', fontSize: 13, fontWeight: 800, cursor: loading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, textTransform: 'uppercase' }}
                      >
                        [ OVERRIDE VIA GOOGLE BIOMETRICS ]
                      </button>

                      <button
                        type="button"
                        onClick={onDemo}
                        disabled={loading}
                        style={{ width: '100%', padding: 14, marginTop: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', color: '#ef4444', fontSize: 13, fontWeight: 800, cursor: loading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, textTransform: 'uppercase' }}
                      >
                        <Eye size={17} />
                        [ BYPASS: READ-ONLY DEMO MODE ]
                      </button>
                      <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 10, lineHeight: 1.45, marginTop: 8, fontFamily: 'monospace' }}>
                        WARNING: Demo mode is severely restricted. Write access locked.
                      </div>

                      <div style={{ textAlign: 'center', marginTop: 22 }}>
                        <button
                          onClick={() => {
                            setIsLogin(!isLogin);
                            setError('');
                          }}
                          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}
                        >
                          {isLogin ? '[ INITIATE NEW CLEARANCE ]' : '[ CANCEL CLEARANCE / BACK TO LOGIN ]'}
                        </button>
                      </div>

                      {/* Privacy & License Footer */}
                      <div style={{ marginTop: 28, padding: '14px 16px', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(16,185,129,0.2)', fontSize: 10, color: 'rgba(255,255,255,0.4)', lineHeight: 1.7, textAlign: 'center', fontFamily: 'monospace' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#ef4444', marginBottom: 6 }}>RESTRICTED GOVERNMENT SYSTEM</div>
                        <div>This terminal is for authorized law enforcement personnel only. All activities are logged and monitored. Unauthorized access is punishable by law.</div>
                        <div style={{ marginTop: 6 }}>By authenticating, you agree to the{' '}
                          <button onClick={() => setShowPolicy(true)} style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer', fontSize: 10, textDecoration: 'underline', padding: 0 }}>Security Protocol &amp; Terms</button>.
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Privacy Policy Modal */}
      {showPolicy && (
        <div
          onClick={() => setShowPolicy(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: 'var(--ct-card)', borderRadius: 20, maxWidth: 520, width: '100%', maxHeight: '85vh', overflowY: 'auto', padding: 28, boxShadow: '0 32px 80px rgba(0,0,0,0.6)', border: '1px solid var(--ct-glass-border)' }}
          >
            <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--ct-accent)', marginBottom: 4 }}> Privacy Policy &amp; Terms of Use</div>
            <div style={{ fontSize: 11, color: 'var(--ct-muted)', marginBottom: 20 }}>C.A.S.E  Criminal Activity Surveillance Engine &nbsp;|&nbsp; Last updated: May 2025</div>

            {[
              {
                title: '1. About This Application',
                body: 'C.A.S.E is an independent, self-hosted law enforcement records management tool developed by GOAT\'ECH. It is NOT affiliated with, endorsed by, or operated by any government body, police department, or public authority. Use of this application is entirely at the discretion of the deploying organization.'
              },
              {
                title: '2. Data Storage & Ownership',
                body: 'All criminal records, officer profiles, and operational data entered into C.A.S.E are stored exclusively in YOUR OWN Firebase/Firestore database configured by your organization. GOAT\'ECH does not have access to, store, or process your records data. You are the sole data controller and owner.'
              },
              {
                title: '3. Data Collection',
                body: 'C.A.S.E collects: (a) Officer account information (name, email, police station, badge ID, profile photo) for authentication. (b) Criminal records added by officers. (c) App usage metadata for functionality (e.g. session tokens). No data is sold or shared with advertisers.'
              },
              {
                title: '4. Authentication & Security',
                body: 'Login is secured via Firebase Authentication (Google or email/password). Passwords are never stored in plaintext. Access requires a registered officer profile, and end-to-end encryption can be enabled in Settings.'
              },
              {
                title: '5. Camera & Microphone Access',
                body: 'C.A.S.E requests camera access for: (a) Face recognition during criminal record scanning. (b) Officer profile photo upload. Microphone access is used for voice-to-text search. These permissions are never used for surveillance of officers.'
              },
              {
                title: '6. Operations Room & P2P',
                body: 'The Secure Operations Room uses peer-to-peer (PeerJS) connections between officers. Messages and shared records are transmitted directly between connected devices. Conversation data is not stored on any server unless explicitly saved to your Firebase database.'
              },
              {
                title: '7. Third-Party Services',
                body: 'C.A.S.E uses: Firebase (Google) for authentication and database; PeerJS for P2P communication; Google Sheets (optional) for data export. Each service is governed by its own privacy policy. GOAT\'ECH is not responsible for third-party data practices.'
              },
              {
                title: '8. Disclaimer of Liability',
                body: 'C.A.S.E is provided "as is" without warranty. GOAT\'ECH is not liable for any misuse, data loss, unauthorized access, or legal consequences arising from the use of this application. Deploying organizations are solely responsible for compliance with local data protection laws (e.g. IT Act, GDPR, DPDP Act).'
              },
              {
                title: '9. License',
                body: 'C.A.S.E is proprietary software developed by GOAT\'ECH. Unauthorized redistribution, resale, or modification of this application is prohibited. Organizations granted access may deploy it internally for law enforcement record management purposes only.'
              },
              {
                title: '10. Contact',
                body: 'For privacy concerns, data requests, or legal inquiries, contact: goat.technology.maghs@gmail.com'
              },
            ].map(({ title, body }) => (
              <div key={title} style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ct-text)', marginBottom: 4 }}>{title}</div>
                <div style={{ fontSize: 12, color: 'var(--ct-muted)', lineHeight: 1.75 }}>{body}</div>
              </div>
            ))}

            <button
              onClick={() => setShowPolicy(false)}
              style={{ width: '100%', padding: 14, marginTop: 8, background: 'var(--ct-accent)', border: 'none', borderRadius: 14, color: 'var(--ct-accent-fg)', fontSize: 14, fontWeight: 800, cursor: 'pointer' }}
            >
              I Understand  Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
