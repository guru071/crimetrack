from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import cv2
import numpy as np
import pytesseract
import re
from deepface import DeepFace

app = FastAPI(title="CrimeTrack Python AI Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# On Windows, you might need to point to tesseract executable if it's not in PATH
# If Tesseract is installed elsewhere, change this path.
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

@app.get("/")
def read_root():
    return {"status": "CrimeTrack Python AI Engine is running"}

@app.post("/api/ocr")
async def extract_document_text(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        # Convert to grayscale for better OCR
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        try:
            text = pytesseract.image_to_string(gray)
        except Exception as e:
            raise HTTPException(status_code=500, detail="Tesseract OCR is not installed or configured correctly on this Windows machine. Please install Tesseract-OCR and ensure the path is correct in main.py.")
        
        # Super basic regex extraction logic
        name_match = re.search(r'(?i)name[:\s]+([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)', text)
        age_match = re.search(r'(?i)age[:\s]+(\d+)', text)
        fir_match = re.search(r'(?i)fir\s*(?:no\.?|number)?[:\s]+([A-Z0-9/-]+)', text)
        address_match = re.search(r'(?i)address[:\s]+([^\n]+)', text)
        
        return {
            "success": True,
            "raw_text": text,
            "extracted": {
                "name": name_match.group(1) if name_match else "",
                "age": age_match.group(1) if age_match else "",
                "firNumber": fir_match.group(1) if fir_match else "",
                "address": address_match.group(1) if address_match else ""
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/biometric/scan")
async def scan_face(file: UploadFile = File(...)):
    """
    Advanced Server-Side Facial Recognition using DeepFace (Facenet).
    This provides drastically higher accuracy than browser-based JS models.
    """
    try:
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        # Generate embedding using Facenet (Google's state of the art model)
        embedding_obj = DeepFace.represent(img_path=img, model_name="Facenet", enforce_detection=False)
        
        if len(embedding_obj) > 0:
            return {"success": True, "embedding": embedding_obj[0]["embedding"]}
        else:
            return {"success": False, "error": "No face detected"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
