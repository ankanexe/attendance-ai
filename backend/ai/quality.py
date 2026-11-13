import cv2
import numpy as np
from dataclasses import dataclass

@dataclass 
class FaceQuality:
    score: float         # 0.0 to 1.0 overall quality
    sharpness: float     # Laplacian variance
    face_size_ok: bool   # face must be > 80x80 pixels
    is_usable: bool      # True if quality is acceptable for enrollment/recognition
    feedback: str        # Human-readable guidance message

def assess_quality(face_image: np.ndarray) -> FaceQuality:
    """Assess the quality of a detected face image."""
    if face_image is None or face_image.size == 0:
        return FaceQuality(0.0, 0.0, False, False, "No face detected")
    
    h, w = face_image.shape[:2]
    face_size_ok = (h >= 80 and w >= 80)

    gray = cv2.cvtColor(face_image, cv2.COLOR_BGR2GRAY) if len(face_image.shape) == 3 else face_image
    sharpness = cv2.Laplacian(gray, cv2.CV_64F).var()
    sharpness_normalized = min(1.0, sharpness / 200.0)  # 200 is a good "sharp" face

    size_score = 1.0 if face_size_ok else 0.3
    quality_score = (sharpness_normalized * 0.6) + (size_score * 0.4)
    is_usable = face_size_ok and sharpness > 50

    if not face_size_ok:
        feedback = "Move closer to the camera"
    elif sharpness < 50:
        feedback = "Hold still — image is blurry"
    elif quality_score > 0.7:
        feedback = "Good — face quality is excellent"
    else:
        feedback = "Ensure even lighting on your face"
    
    return FaceQuality(
        score=round(quality_score, 3),
        sharpness=round(sharpness, 2),
        face_size_ok=face_size_ok,
        is_usable=is_usable,
        feedback=feedback
    )
