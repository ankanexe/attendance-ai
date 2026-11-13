"""
embedder.py — AttendAI Face Embedding Engine

Priority chain:
  1. InsightFace ArcFace (buffalo_l / buffalo_s)  — 512D, industry #1 accuracy
     + 5-point affine alignment before extraction
     + CLAHE equalization for low-light robustness
  2. dlib 128D ResNet (face_recognition library)
     + CLAHE applied before encoding
  3. Minimal fallback: centered-grid spatial LBP (128D) if nothing else available
"""

import cv2
import numpy as np
import base64
from typing import Optional, List, Tuple

# ── InsightFace ArcFace ───────────────────────────────────────────────────────
HAS_INSIGHTFACE = False
_insightface_recognizer = None

try:
    import insightface
    from insightface.model_zoo import get_model
    from insightface.app import FaceAnalysis
    # Reuse the same analysis app which includes recognition model
    _insightface_app_emb = FaceAnalysis(
        name="buffalo_s",
        providers=["CPUExecutionProvider"]
    )
    _insightface_app_emb.prepare(ctx_id=0, det_size=(640, 640))
    HAS_INSIGHTFACE = True
    print("[Embedder] InsightFace ArcFace loaded OK")
except Exception as _ie:
    print(f"[Embedder] InsightFace not available ({_ie})")

# ── face_recognition (dlib ResNet 128D) ──────────────────────────────────────
HAS_FACE_REC = False
try:
    import face_recognition
    HAS_FACE_REC = True
    print("[Embedder] face_recognition (dlib 128D) loaded OK")
except ImportError:
    pass

# ── CLAHE enhancer (shared) ───────────────────────────────────────────────────
_clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))


def _apply_clahe(face_bgr: np.ndarray) -> np.ndarray:
    """Apply CLAHE to Y channel of YCrCb for lighting-robust contrast enhancement."""
    try:
        ycrcb = cv2.cvtColor(face_bgr, cv2.COLOR_BGR2YCrCb)
        ycrcb[:, :, 0] = _clahe.apply(ycrcb[:, :, 0])
        return cv2.cvtColor(ycrcb, cv2.COLOR_YCrCb2BGR)
    except Exception:
        return face_bgr


def _align_face_5pt(
    img_bgr: np.ndarray,
    landmarks: List[Tuple[int, int]],
    output_size: int = 112
) -> Optional[np.ndarray]:
    """
    Perform affine alignment using 5 facial landmarks to canonical positions.
    Standard ArcFace canonical anchor points for 112×112 crop.
    Landmarks order: [left_eye, right_eye, nose, mouth_left, mouth_right]
    """
    if len(landmarks) < 5:
        return None

    # ArcFace canonical anchor positions at 112×112
    dst_pts = np.float32([
        [38.29, 51.69],   # left eye
        [73.53, 51.50],   # right eye
        [56.02, 71.74],   # nose tip
        [41.55, 92.37],   # mouth left
        [70.72, 92.20],   # mouth right
    ])

    src_pts = np.float32(landmarks[:5])
    M, _ = cv2.estimateAffinePartial2D(src_pts, dst_pts, method=cv2.LMEDS)
    if M is None:
        return None

    aligned = cv2.warpAffine(img_bgr, M, (output_size, output_size),
                             flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
    return aligned


def extract_embedding(
    frame_rgb: np.ndarray,
    face_location: Tuple[int, int, int, int],
    landmarks: Optional[List[Tuple[int, int]]] = None
) -> Optional[np.ndarray]:
    """
    Extract a normalized face embedding for a detected face region.

    Args:
        frame_rgb:     Full RGB frame (H×W×3)
        face_location: (top, right, bottom, left) bounding box
        landmarks:     Optional 5-point list from detector

    Returns:
        float32 numpy array (512D for InsightFace, 128D for dlib) or None
    """
    h, w = frame_rgb.shape[:2]
    top, right, bottom, left = face_location
    top = max(0, min(top, h - 1))
    bottom = max(bottom, top + 20)
    bottom = min(bottom, h)
    left = max(0, min(left, w - 1))
    right = max(right, left + 20)
    right = min(right, w)

    # ── Strategy 1: InsightFace ArcFace with 5-pt alignment ──────────────────
    if HAS_INSIGHTFACE and _insightface_app_emb is not None:
        try:
            frame_bgr = cv2.cvtColor(frame_rgb, cv2.COLOR_RGB2BGR)

            # Try aligned chip extraction if landmarks are available
            aligned_chip = None
            if landmarks and len(landmarks) >= 5:
                aligned_chip = _align_face_5pt(frame_bgr, landmarks)

            if aligned_chip is not None:
                # Apply CLAHE on aligned chip
                aligned_chip = _apply_clahe(aligned_chip)
                chip_rgb = cv2.cvtColor(aligned_chip, cv2.COLOR_BGR2RGB)
                # Run insightface on aligned chip
                faces = _insightface_app_emb.get(chip_rgb)
                if faces:
                    emb = faces[0].embedding
                    if emb is not None:
                        norm = np.linalg.norm(emb)
                        if norm > 0:
                            return (emb / norm).astype(np.float32)

            # Fallback: run insightface on full frame and get matching face
            frame_bgr_clahe = frame_bgr.copy()
            face_crop = frame_bgr_clahe[top:bottom, left:right]
            if face_crop.size > 0:
                face_crop = _apply_clahe(face_crop)
                frame_bgr_clahe[top:bottom, left:right] = face_crop

            frame_rgb_enh = cv2.cvtColor(frame_bgr_clahe, cv2.COLOR_BGR2RGB)
            faces = _insightface_app_emb.get(frame_rgb_enh)

            # Pick best face closest to the given bounding box center
            if faces:
                cx, cy = (left + right) / 2, (top + bottom) / 2
                best_face = min(faces, key=lambda f: abs(
                    (f.bbox[0] + f.bbox[2]) / 2 - cx) + abs((f.bbox[1] + f.bbox[3]) / 2 - cy))
                emb = best_face.embedding
                if emb is not None:
                    norm = np.linalg.norm(emb)
                    if norm > 0:
                        return (emb / norm).astype(np.float32)
        except Exception as e:
            print(f"[Embedder] InsightFace extraction error: {e}")

    # ── Strategy 2: face_recognition (dlib 128D ResNet) ─────────────────────
    if HAS_FACE_REC:
        try:
            # Apply CLAHE before dlib encoding
            frame_bgr = cv2.cvtColor(frame_rgb, cv2.COLOR_RGB2BGR)
            face_crop = frame_bgr[top:bottom, left:right]
            if face_crop.size > 0:
                face_crop = _apply_clahe(face_crop)
                frame_bgr[top:bottom, left:right] = face_crop
            frame_rgb_enh = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)

            encodings = face_recognition.face_encodings(frame_rgb_enh, [(top, right, bottom, left)])
            if encodings:
                emb = encodings[0].astype(np.float32)
                norm = np.linalg.norm(emb)
                if norm > 0:
                    emb = emb / norm
                return emb
        except Exception as e:
            print(f"[Embedder] face_recognition error: {e}")

    # ── Strategy 3: LBP-histogram fallback (128D) ────────────────────────────
    try:
        frame_bgr = cv2.cvtColor(frame_rgb, cv2.COLOR_RGB2BGR)
        face_crop = frame_bgr[top:bottom, left:right]
        if face_crop.size == 0 or face_crop.shape[0] < 20 or face_crop.shape[1] < 20:
            return None

        # CLAHE on gray
        face_resized = cv2.resize(face_crop, (96, 96))
        gray = cv2.cvtColor(face_resized, cv2.COLOR_BGR2GRAY)
        gray = _clahe.apply(gray)

        # LBP uniform histogram in 4×4 grid
        embedding = np.zeros(128, dtype=np.float32)
        idx = 0
        radius, n_points = 1, 8
        h4, w4 = 24, 24

        for i in range(4):
            for j in range(4):
                cell = gray[i*h4:(i+1)*h4, j*w4:(j+1)*w4]
                # Simplified LBP: use HOG-like gradient bins
                gx = cv2.Sobel(cell.astype(np.float32), cv2.CV_32F, 1, 0, ksize=1)
                gy = cv2.Sobel(cell.astype(np.float32), cv2.CV_32F, 0, 1, ksize=1)
                mag, ang = cv2.cartToPolar(gx, gy, angleInDegrees=True)
                hist, _ = np.histogram(ang, bins=8, range=(0, 360), weights=mag)
                embedding[idx:idx+8] = hist
                idx += 8

        norm = np.linalg.norm(embedding)
        if norm > 0:
            embedding /= norm
        return embedding
    except Exception as e:
        print(f"[Embedder] Fallback error: {e}")

    return None


def serialize_embedding(embedding: np.ndarray) -> str:
    """Serialize numpy float32 array to base64 string for DB storage."""
    return base64.b64encode(embedding.astype(np.float32).tobytes()).decode('utf-8')


def deserialize_embedding(serialized: str) -> np.ndarray:
    """Deserialize base64 string back to float32 numpy array."""
    return np.frombuffer(base64.b64decode(serialized), dtype=np.float32)
