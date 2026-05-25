import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, ChevronRight, Eye, Lock, Mail, Shield, User } from 'lucide-react';
import { getTimeBasedTheme, themeToCssVars } from './TimeBasedTheme';
import { Capacitor } from '@capacitor/core';
import {
  auth,
  db,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  doc,
  getDoc,
  setDoc,
  GoogleAuthProvider,
  signInWithPopup,
  sendEmailVerification,
  applyActionCode,
  collection,
  getDocs
} from './firebase';
import { sendVerificationEmail } from './emailService';
import { nativeGoogleSignIn } from './nativeGoogleSignIn';

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
    return 'Google sign-in popup was blocked or canceled. On APK, use email/password unless native Google sign-in is configured.';
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
  const theme = getTimeBasedTheme();

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

  const triggerEmailVerification = async (user, profile) => {
    try {
      if (user.emailVerified) {
        saveProfileLocally(profile);
        onLoginSuccess(user, profile);
        setLoading(false);
        return;
      }

      if (!user.emailVerified) {
        console.log('Starting email verification for:', user.email);
        
        // Try EmailJS first (if configured)
        const emailSent = await sendVerificationEmail(
          user.email,
          user.uid,
          profile?.name || user.displayName || user.email
        );

        // Fallback to Firebase if EmailJS not configured
        if (!emailSent) {
          console.log('Calling Firebase sendEmailVerification...');
          await sendEmailVerification(user, {
            url: `${window.location.origin}?email_verified=true`
          });
          console.log('✓ Firebase verification email sent to:', user.email);
        }
      }
    } catch (err) {
      console.error('❌ Email verification error:', err);
      console.error('Error code:', err?.code);
      console.error('Error message:', err?.message);
      setError(`Email verification failed: ${err?.message || err}`);
    }
    setVerifyUser(user);
    setVerifyProfile(profile);
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
        saveProfileLocally(verifyProfile);
        onLoginSuccess(verifyUser, verifyProfile);
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
    const profile = await saveOfficerProfile(user, {
      name,
      station,
      email: user.email || email,
      photoBase64,
      photoUrl: user.photoURL || '',
      provider
    });
    await triggerEmailVerification(user, profile);
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

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      if (!auth) throw new Error('Firebase is not configured. Update src/firebase.js.');

      let user;

      if (Capacitor.isNativePlatform()) {
        // Use native Google Sign-In on APK (professional app experience)
        user = await nativeGoogleSignIn();
      } else {
        // Use web popup on browser
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        const result = await signInWithPopup(auth, provider);
        user = result.user;
      }

      await handleGoogleUser(user);
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
    color: 'var(--ct-muted)',
    pointerEvents: 'none'
  };

  const photo = photoBase64 || pendingUser?.photoURL || '';
  const completingProfile = !!pendingUser;

  return (
    <div
      className="ct-app"
      data-theme={theme.period}
      style={{
        ...themeToCssVars(theme),
        minHeight: '100dvh',
        width: '100vw',
        backgroundColor: theme.bgColor,
        backgroundImage: theme.gradient,
        backgroundAttachment: 'fixed',
        backgroundSize: 'cover',
        color: 'var(--ct-text)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <div className="ct-scrim" aria-hidden />
      <div style={{ position: 'relative', zIndex: 1, minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 18, boxSizing: 'border-box' }}>
        <div style={{ width: '100%', maxWidth: 420 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Shield size={24} color="var(--ct-accent)" />
              <span style={{ fontSize: 18, fontWeight: 900, textShadow: 'var(--ct-text-shadow)' }}>C.A.S.E</span>
            </div>
            <span className="ct-period-pill">{theme.label}</span>
          </div>

          <div className="ct-glass" style={{ padding: 26, borderRadius: 24 }}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ width: 70, height: 70, background: 'var(--ct-accent)', borderRadius: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', boxShadow: '0 14px 34px color-mix(in srgb, var(--ct-accent) 55%, transparent)' }}>
                {verifyStep ? <Mail size={34} color="var(--ct-accent-fg)" /> : <Shield size={34} color="var(--ct-accent-fg)" />}
              </div>
              <h1 style={{ fontSize: 28, fontWeight: 900, color: 'var(--ct-text)', margin: 0, letterSpacing: 0 }}>
                {verifyStep ? 'Check Your Email' : 'Officer Portal'}
              </h1>
              <p style={{ color: 'var(--ct-muted)', fontSize: 14, margin: '8px 0 0', lineHeight: 1.45 }}>
                {verifyStep
                  ? `A verification link has been sent to ${verifyUser?.email || 'your email'}. Click the link then press the button below.`
                  : completingProfile ? 'Complete your police profile. Your ID is generated automatically.'
                    : isLogin ? 'Secure access for shared police records.' : 'Create an officer account.'}
              </p>
            </div>

            {error && (
              <div style={{ padding: 12, background: 'color-mix(in srgb, var(--ct-red) 18%, transparent)', border: '1px solid color-mix(in srgb, var(--ct-red) 42%, transparent)', borderRadius: 12, color: 'var(--ct-red)', fontSize: 13, marginBottom: 16, textAlign: 'center' }}>
                {error}
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
                        <input type="email" style={inputStyle} placeholder="Official email address" value={email} onChange={e => setEmail(e.target.value)} required />
                      </div>
                      <div style={{ position: 'relative' }}>
                        <Lock size={18} style={iconStyle} />
                        <input type="password" style={inputStyle} placeholder="Secure password" value={password} onChange={e => setPassword(e.target.value)} required />
                      </div>
                    </>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="squish-btn"
                    style={{ width: '100%', padding: 16, background: 'var(--ct-accent)', border: 'none', borderRadius: 16, color: 'var(--ct-accent-fg)', fontSize: 16, fontWeight: 900, cursor: loading ? 'wait' : 'pointer', marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 12px 30px color-mix(in srgb, var(--ct-accent) 45%, transparent)' }}
                  >
                    {loading ? 'Please wait...' : completingProfile ? 'Save Officer Profile' : isLogin ? 'Secure Login' : 'Register Officer'}
                    {!loading && <ChevronRight size={18} />}
                  </button>
                </form>

                {!completingProfile && (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', margin: '22px 0', gap: 12 }}>
                      <div style={{ flex: 1, height: 1, background: 'var(--ct-glass-border)' }} />
                      <span style={{ fontSize: 12, color: 'var(--ct-muted)', fontWeight: 700 }}>OR</span>
                      <div style={{ flex: 1, height: 1, background: 'var(--ct-glass-border)' }} />
                    </div>

                    <button
                      onClick={handleGoogleSignIn}
                      disabled={loading}
                      className="squish-btn"
                      style={{ width: '100%', padding: 15, background: '#fff', border: 'none', borderRadius: 16, color: '#111827', fontSize: 15, fontWeight: 800, cursor: loading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}
                    >
                      <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                      </svg>
                      Continue with Google
                    </button>

                    <button
                      type="button"
                      onClick={onDemo}
                      disabled={loading}
                      className="squish-btn"
                      style={{ width: '100%', padding: 14, marginTop: 12, background: 'var(--ct-input-bg)', border: '1px solid var(--ct-glass-border)', borderRadius: 16, color: 'var(--ct-text)', fontSize: 14, fontWeight: 800, cursor: loading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
                    >
                      <Eye size={17} />
                      View demo app
                    </button>
                    <div style={{ textAlign: 'center', color: 'var(--ct-muted)', fontSize: 11, lineHeight: 1.45, marginTop: 8 }}>
                      Demo opens sample records only. Add, edit, export, sync, and operations stay locked until officer login.
                    </div>

                    <div style={{ textAlign: 'center', marginTop: 22 }}>
                      <button
                        onClick={() => {
                          setIsLogin(!isLogin);
                          setError('');
                        }}
                        style={{ background: 'none', border: 'none', color: 'var(--ct-muted)', fontSize: 14, cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        {isLogin ? 'Register a new officer account' : 'Already registered? Login'}
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
