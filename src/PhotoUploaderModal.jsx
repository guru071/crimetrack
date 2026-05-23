import { useState, useRef, useEffect } from "react";
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

export default function PhotoUploaderModal({ initialMode, onPhotoCapture, onClose, humanInstance, T, css }) {
  const [cropSrc, setCropSrc] = useState(null);
  const [crop, setCrop] = useState({ unit: '%', x: 25, y: 25, width: 50, height: 50, aspect: 1 });
  const [completedCrop, setCompletedCrop] = useState(null);
  const [useCamera, setUseCamera] = useState(initialMode === 'camera');
  const imgRef = useRef(null);
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (initialMode === 'camera') {
      startCamera();
    } else if (initialMode === 'upload') {
      // Small delay to ensure render
      setTimeout(() => fileInputRef.current?.click(), 100);
    }
  }, [initialMode]);

  const startCamera = async () => {
    setUseCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (e) {
      alert("Camera access denied or unavailable.");
      onClose();
    }
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

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) {
      if (!cropSrc) onClose();
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setCropSrc(reader.result);
    reader.readAsDataURL(file);
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
        <div style={{ position: "fixed", inset: 0, background: "#000", zIndex: 9999, display: "flex", flexDirection: "column", alignItems: "center", justifyItems: "center", justifyContent: "center" }}>
          <div style={{ color: "#fff", fontSize: 16, marginBottom: 20, fontWeight: 600 }}>Take Suspect Photo</div>
          <video ref={videoRef} autoPlay playsInline style={{ width: "100%", maxHeight: "60vh", objectFit: "cover", border: `2px solid ${T.accent}` }} />
          <div style={{ display: "flex", gap: 16, width: "100%", maxWidth: 300, marginTop: 30 }}>
            <button style={{ ...css.btnAccent, flex: 2, padding: 16, fontSize: 16, background: "#4ade80", color: "#000" }} onClick={capturePhoto}>
              📸 Capture
            </button>
            <button style={{ ...css.btn, flex: 1, borderColor: T.red, color: T.red }} onClick={cancel}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}
