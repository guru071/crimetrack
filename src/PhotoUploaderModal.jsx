import { useState, useRef, useEffect } from "react";
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { X, RefreshCcw } from 'lucide-react';
import { resizeImageFile } from './imageUtils';

export default function PhotoUploaderModal({ initialMode, onPhotoCapture, onClose, humanInstance, T, css }) {
  const [cropSrc, setCropSrc] = useState(null);
  const [crop, setCrop] = useState({ unit: '%', x: 25, y: 25, width: 50, height: 50, aspect: 1 });
  const [completedCrop, setCompletedCrop] = useState(null);
  const [useCamera, setUseCamera] = useState(initialMode === 'camera');
  const [facingMode, setFacingMode] = useState("environment");
  const imgRef = useRef(null);
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
  const fileInputTriggered = useRef(false);

  useEffect(() => {
    let timeoutId;
    if (initialMode === 'camera') {
      startCamera();
    } else if (initialMode === 'upload' && !fileInputTriggered.current) {
      fileInputTriggered.current = true;
      // Small delay to ensure render
      timeoutId = setTimeout(() => fileInputRef.current?.click(), 100);
    }
    // Opening behavior is intentionally keyed only to the requested initial mode.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [initialMode]);

  const startCamera = async (mode = facingMode) => {
    setUseCamera(true);
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(t => t.stop());
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: mode } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (e) {
      alert("Camera access denied or unavailable.");
      onClose();
    }
  };

  const toggleCamera = () => {
    const newMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(newMode);
    startCamera(newMode);
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    setUseCamera(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext("2d").drawImage(videoRef.current, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg");
    stopCamera();
    setCropSrc(dataUrl);
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) {
      if (!cropSrc) onClose();
      return;
    }
    const resizedBase64 = await resizeImageFile(file, 1024);
    if (resizedBase64) {
      setCropSrc(resizedBase64);
    } else {
      alert("Failed to load image");
      onClose();
    }
  };

  const applyCrop = async () => {
    if (!completedCrop || !imgRef.current) return;
    const image = imgRef.current;
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    const MAX_DIM = 600;
    let targetW = completedCrop.width * scaleX;
    let targetH = completedCrop.height * scaleY;

    if (targetW > MAX_DIM || targetH > MAX_DIM) {
      const ratio = Math.min(MAX_DIM / targetW, MAX_DIM / targetH);
      targetW *= ratio;
      targetH *= ratio;
    }

    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');

    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0, 0, targetW, targetH
    );

    const base64Image = canvas.toDataURL('image/jpeg', 0.8);
    let faceDesc = null;

    if (humanInstance) {
      try {
        const result = await humanInstance.detect(canvas);
        if (result && result.face && result.face.length > 0 && result.face[0].embedding) {
          faceDesc = Array.from(result.face[0].embedding);
        } else {
          alert("Warning: No clear face detected in the photo. Facial recognition search will not work for this record.");
        }
      } catch (e) {
        console.log("Human API error during descriptor extraction", e);
      }
    }

    onPhotoCapture(base64Image, faceDesc);
  };

  const cancel = () => {
    stopCamera();
    onClose();
  };

  return (
    <>
      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handlePhotoUpload} />

      {cropSrc && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", zIndex: 9999, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ color: "#fff", marginBottom: 16, fontSize: 16, fontWeight: 600 }}>Crop Photo</div>
          <div style={{ maxHeight: "60vh", overflow: "auto" }}>
            <ReactCrop crop={crop} onChange={c => setCrop(c)} onComplete={c => setCompletedCrop(c)} aspect={1}>
              <img ref={imgRef} src={cropSrc} style={{ maxHeight: "60vh" }} alt="Crop me" />
            </ReactCrop>
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 24, width: "100%", maxWidth: 300 }}>
            <button style={{ ...css.btn, flex: 1, color: T.text, background: T.card2 }} onClick={cancel}>Cancel</button>
            <button style={{ ...css.btnAccent, flex: 1 }} onClick={applyCrop}>Apply</button>
          </div>
        </div>
      )}

      {useCamera && !cropSrc && (
        <div style={{ position: "fixed", inset: 0, background: "#000", zIndex: 9999, display: "flex", flexDirection: "column" }}>

          {/* Top Bar */}
          <div style={{ padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "absolute", top: 0, width: "100%", zIndex: 10, background: "linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)", boxSizing: "border-box" }}>
            <button onClick={cancel} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", display: "flex" }}>
              <X size={28} />
            </button>
            <div style={{ color: "#fff", fontSize: 16, fontWeight: 600, letterSpacing: 1 }}>PHOTO</div>
            <div style={{ width: 28 }} />
          </div>

          {/* Viewfinder */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            style={{ width: "100%", height: "100%", objectFit: "cover", transform: facingMode === "user" ? "scaleX(-1)" : "none" }}
          />

          {/* Bottom Controls */}
          <div style={{ position: "absolute", bottom: 0, width: "100%", padding: "40px 24px", display: "flex", justifyContent: "space-around", alignItems: "center", background: "linear-gradient(to top, rgba(0,0,0,0.8), transparent)", boxSizing: "border-box" }}>

            <div style={{ width: 48 }} />

            {/* Shutter Button */}
            <button
              onClick={capturePhoto}
              style={{
                width: 76, height: 76, borderRadius: 38,
                background: "rgba(255,255,255,0.3)", border: "4px solid #fff",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 0 20px rgba(0,0,0,0.3)"
              }}
            >
              <div style={{ width: 56, height: 56, borderRadius: 28, background: "#fff" }} />
            </button>

            {/* Flip Camera */}
            <button
              onClick={toggleCamera}
              style={{ background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", cursor: "pointer", width: 48, height: 48, borderRadius: 24, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(10px)" }}
            >
              <RefreshCcw size={22} />
            </button>
          </div>
        </div>
      )}

      {/* Fallback UI if programmatic file picker click is blocked by the browser */}
      {!useCamera && !cropSrc && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 9999, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: T.card2, padding: 32, borderRadius: 24, textAlign: 'center', width: '100%', maxWidth: 320, boxShadow: '0 24px 48px rgba(0,0,0,0.5)', border: `1px solid ${T.border || 'rgba(255,255,255,0.1)'}` }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: T.text, marginBottom: 12 }}>Upload Photo</div>
            <div style={{ fontSize: 14, color: T.text, opacity: 0.7, marginBottom: 24 }}>Select an image file from your device to continue.</div>
            <label 
              style={{ ...css.btnAccent, width: '100%', padding: '14px 20px', borderRadius: 12, marginBottom: 12, fontSize: 16, fontWeight: 600, display: 'block', cursor: 'pointer', boxSizing: 'border-box' }} 
            >
              Choose File
              <input type="file" accept="image/*" style={{ width: 0, height: 0, opacity: 0, position: 'absolute' }} onChange={handlePhotoUpload} />
            </label>
            <button 
              style={{ ...css.btn, width: '100%', padding: '14px 20px', borderRadius: 12, color: T.text, background: "transparent", border: `1px solid ${T.border || 'rgba(255,255,255,0.2)'}` }} 
              onClick={cancel}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}
