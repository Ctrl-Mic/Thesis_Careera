import base64
import binascii
import os
import re
import secrets
from contextlib import asynccontextmanager
from io import BytesIO
from pathlib import Path

import cv2
import easyocr
import numpy as np
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException
from insightface.app import FaceAnalysis
from PIL import Image, UnidentifiedImageError
from pydantic import BaseModel


load_dotenv(Path(__file__).resolve().parents[2] / ".env.local")

MAX_IMAGE_BYTES = 5 * 1024 * 1024
MAX_IMAGE_PIXELS = 20_000_000
OCR_CANVAS_SIZE = 1280
STUDENT_ID_PATTERN = re.compile(r"\bPDM[\s-]*20\d{2}[\s-]*\d{6}\b", re.IGNORECASE)
NAME_LABEL_PATTERN = re.compile(
    r"^\s*(?:(?:student|full)\s+)?name\s*[:#-]?\s*(.*?)\s*$",
    re.IGNORECASE,
)
NAME_STOP_WORDS = {
    "student", "name", "identification", "card", "school", "university",
    "college", "republic", "philippines", "address", "course", "program",
    "valid", "until", "signature", "registrar", "department",
}

face_analyzer = None
text_reader = None


@asynccontextmanager
async def lifespan(_app):
    global face_analyzer, text_reader
    face_analyzer = FaceAnalysis(name="buffalo_l", providers=["CPUExecutionProvider"])
    face_analyzer.prepare(ctx_id=-1, det_size=(960, 960))
    text_reader = easyocr.Reader(["en"], gpu=False)
    yield
    face_analyzer = None
    text_reader = None


app = FastAPI(title="Careera ID and Face Verification", lifespan=lifespan)


class ImageRequest(BaseModel):
    imageBase64: str


def require_api_key(x_api_key: str | None = Header(default=None)):
    expected_key = os.environ.get("INSIGHTFACE_API_KEY")
    if not expected_key:
        raise HTTPException(status_code=503, detail="The verification API key is not configured.")
    if not x_api_key or not secrets.compare_digest(x_api_key, expected_key):
        raise HTTPException(status_code=401, detail="Invalid API key.")


def decode_image(encoded_image: str):
    try:
        image_bytes = base64.b64decode(encoded_image, validate=True)
    except (binascii.Error, ValueError) as error:
        raise HTTPException(status_code=400, detail="The image data is invalid.") from error

    if not image_bytes or len(image_bytes) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="The image must be smaller than 5 MB.")

    try:
        with Image.open(BytesIO(image_bytes)) as source_image:
            if source_image.format not in {"JPEG", "PNG", "WEBP"}:
                raise HTTPException(status_code=400, detail="Upload a JPG, PNG or WEBP image.")
            width, height = source_image.size
            if width * height > MAX_IMAGE_PIXELS:
                raise HTTPException(status_code=400, detail="The image dimensions are too large.")
            source_image.verify()
    except HTTPException:
        raise
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as error:
        raise HTTPException(status_code=400, detail="The uploaded file is not a readable image.") from error

    image = cv2.imdecode(np.frombuffer(image_bytes, dtype=np.uint8), cv2.IMREAD_COLOR)
    if image is None:
        raise HTTPException(status_code=400, detail="The uploaded file is not a readable image.")
    return image


def get_single_face_vector(image):
    faces = face_analyzer.get(image)
    if len(faces) != 1:
        raise HTTPException(
            status_code=422,
            detail="Exactly one clear face must be visible in the image.",
        )

    vector = faces[0].normed_embedding
    if vector is None or not np.isfinite(vector).all():
        raise HTTPException(status_code=422, detail="A usable face could not be detected.")
    return vector.astype(float).tolist()


def extract_student_id(text: str):
    match = STUDENT_ID_PATTERN.search(text)
    if not match:
        return None
    parts = re.search(r"(PDM)[\s-]*(20\d{2})[\s-]*(\d{6})", match.group(0), re.IGNORECASE)
    if not parts:
        return None
    return f"{parts.group(1).upper()}-{parts.group(2)}-{parts.group(3)}"


def extract_name(lines: list[str]):
    for index, line in enumerate(lines):
        match = NAME_LABEL_PATTERN.match(line)
        if not match:
            continue
        value = match.group(1).strip(" :-#")
        if value:
            return value
        if index + 1 < len(lines):
            return lines[index + 1]

    candidates = []
    for line in lines:
        words = re.findall(r"[A-Za-z][A-Za-z'-]*", line)
        if (
            2 <= len(words) <= 6
            and not any(word.lower() in NAME_STOP_WORDS for word in words)
        ):
            candidates.append(" ".join(words))
    return max(candidates, key=len, default=None)


def recognize_id_text(image):
    lines = [
        line.strip()
        for line in text_reader.readtext(image, detail=0, canvas_size=OCR_CANVAS_SIZE)
        if line.strip()
    ]
    text = "\n".join(lines)
    return {
        "text": text,
        "fullName": extract_name(lines),
        "studentId": extract_student_id(text),
    }


@app.get("/health")
def health():
    return {"status": "ok", "ready": face_analyzer is not None and text_reader is not None}


@app.post("/extract", dependencies=[Depends(require_api_key)])
def extract_id(request: ImageRequest):
    image = decode_image(request.imageBase64)
    if face_analyzer is None or text_reader is None:
        raise HTTPException(status_code=503, detail="The verification models are still loading.")

    return {
        **recognize_id_text(image),
        "faceVector": get_single_face_vector(image),
    }


@app.post("/face-vector", dependencies=[Depends(require_api_key)])
def extract_live_face(request: ImageRequest):
    image = decode_image(request.imageBase64)
    if face_analyzer is None:
        raise HTTPException(status_code=503, detail="The face model is still loading.")
    return {"faceVector": get_single_face_vector(image)}
