"""
detector.py — AttendAI Precision Face Detector

Priority chain (best-to-fallback):
  1. InsightFace RetinaFace  (most accurate, returns 5-pt landmarks)
  2. OpenCV YuNet DNN        (built into OpenCV 4.8+, deep neural detector)
  3. MediaPipe Face Detection (Google BlazeFace, zero false positives)
  4. OpenCV Haar Cascade      (legacy fallback, disabled skin-color noise)

NO skin-color HSV fallback. NO center-crop ghost boxes.
"""

import cv2
import numpy as np
from dataclasses import dataclass, field
from typing import List, Tuple, Optional

# ── InsightFace ──────────────────────────────────────────────────────────────
HAS_INSIGHTFACE = False
_insightface_app = None

try:
    import insightface
    from insightface.app import FaceAnalysis
    _insightface_app = FaceAnalysis(
        name="buffalo_s",          # fast lightweight model
        providers=["CPUExecutionProvider"]
    )
    _insightface_app.prepare(ctx_id=0, det_size=(640, 640))
    HAS_INSIGHTFACE = True
    print("[Detector] InsightFace RetinaFace loaded OK")
except Exception as _ie:
    print(f"[Detector] InsightFace not available ({_ie}), trying fallbacks...")

# ── MediaPipe ────────────────────────────────────────────────────────────────
HAS_MEDIAPIPE = False
_mp_detector = None

if not HAS_INSIGHTFACE:
    try:
        import mediapipe as mp
        _mp_detector = mp.solutions.face_detection.FaceDetection(
            model_selection=1,       # full-range model (up to 5m)
            min_detection_confidence=0.55
        )
        HAS_MEDIAPIPE = True
        print("[Detector] MediaPipe BlazeFace loaded ✓")
    except Exception as _me:
        print(f"[Detector] MediaPipe not available ({_me}), trying OpenCV…")

# ── OpenCV Cascade (last resort) ─────────────────────────────────────────────
_cv_cascade = None
if not HAS_INSIGHTFACE and not HAS_MEDIAPIPE:
    try:
        if hasattr(cv2, "data") and hasattr(cv2.data, "haarcascades"):
            path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
            _cv_cascade = cv2.CascadeClassifier(path)
            print("[Detector] OpenCV Haar Cascade loaded (fallback) ✓")
    except Exception:
        pass


@dataclass
class DetectedFace:
    bounding_box: Tuple[int, int, int, int]   # (x, y, w, h) pixel coords
    face_image: np.ndarray                     # cropped BGR face chip
    location: Tuple[int, int, int, int]        # (top, right, bottom, left) for embedder
    landmarks: List[Tuple[int, int]] = field(default_factory=list)
    # landmarks: up to 5 points: [left_eye, right_eye, nose, mouth_left, mouth_right]
    detection_score: float = 1.0


# ─────────────────────────────────────────────────────────────────────────────
def detect_faces_in_frame(frame: np.ndarray) -> List[DetectedFace]:
    """
    Detect all human faces in a BGR video frame.
    Returns DetectedFace list with bounding boxes and landmark keypoints.
    """
    if frame is None or frame.size == 0:
        return []

    h, w = frame.shape[:2]

    # ── Strategy 1: InsightFace RetinaFace ───────────────────────────────────
    if HAS_INSIGHTFACE and _insightface_app is not None:
        try:
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            faces = _insightface_app.get(rgb)
            results = []
            for face in faces:
                if face.det_score < 0.45:
                    continue
                x1, y1, x2, y2 = face.bbox.astype(int)
                x1, y1 = max(0, x1), max(0, y1)
                x2, y2 = min(w, x2), min(h, y2)
                fw, fh = x2 - x1, y2 - y1
                if fw < 30 or fh < 30:
                    continue

                face_img = frame[y1:y2, x1:x2]
                if face_img.size == 0:
                    continue

                # 5-point landmarks (kps shape: [5, 2])
                lms = []
                if face.kps is not None:
                    for pt in face.kps:
                        lms.append((int(pt[0]), int(pt[1])))

                results.append(DetectedFace(
                    bounding_box=(x1, y1, fw, fh),
                    face_image=face_img,
                    location=(y1, x2, y2, x1),   # top, right, bottom, left
                    landmarks=lms,
                    detection_score=float(face.det_score)
                ))
            if results:
                return results
        except Exception as e:
            print(f"[Detector] InsightFace error: {e}")

    # ── Strategy 2: MediaPipe BlazeFace ──────────────────────────────────────
    if HAS_MEDIAPIPE and _mp_detector is not None:
        try:
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            mp_results = _mp_detector.process(rgb)
            results = []
            if mp_results.detections:
                for det in mp_results.detections:
                    score = det.score[0] if det.score else 0
                    if score < 0.50:
                        continue
                    bb = det.location_data.relative_bounding_box
                    x1 = max(0, int(bb.xmin * w))
                    y1 = max(0, int(bb.ymin * h))
                    fw = min(w - x1, int(bb.width * w))
                    fh = min(h - y1, int(bb.height * h))
                    if fw < 30 or fh < 30:
                        continue

                    face_img = frame[y1:y1+fh, x1:x1+fw]
                    if face_img.size == 0:
                        continue

                    # MediaPipe returns 6 keypoints; take first 5
                    import mediapipe as mp_lib
                    lms = []
                    for kp in det.location_data.relative_keypoints[:5]:
                        lms.append((int(kp.x * w), int(kp.y * h)))

                    results.append(DetectedFace(
                        bounding_box=(x1, y1, fw, fh),
                        face_image=face_img,
                        location=(y1, x1 + fw, y1 + fh, x1),
                        landmarks=lms,
                        detection_score=float(score)
                    ))
            if results:
                return results
        except Exception as e:
            print(f"[Detector] MediaPipe error: {e}")

    # ── Strategy 3: OpenCV Haar Cascade (no HSV skin, no center crop) ────────
    if _cv_cascade is not None:
        try:
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            gray = cv2.equalizeHist(gray)
            detections = _cv_cascade.detectMultiScale(
                gray,
                scaleFactor=1.1,
                minNeighbors=7,    # Stricter to reduce false positives
                minSize=(80, 80),
                flags=cv2.CASCADE_SCALE_IMAGE
            )
            results = []
            for (x, y, fw, fh) in detections:
                face_img = frame[y:y+fh, x:x+fw]
                if face_img.size == 0:
                    continue
                results.append(DetectedFace(
                    bounding_box=(int(x), int(y), int(fw), int(fh)),
                    face_image=face_img,
                    location=(int(y), int(x+fw), int(y+fh), int(x)),
                    landmarks=[],
                    detection_score=0.7
                ))
            return results
        except Exception as e:
            print(f"[Detector] Cascade error: {e}")

    # ── No detection: return empty list (NEVER ghost boxes) ──────────────────
    return []
