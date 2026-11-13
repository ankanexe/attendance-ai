import cv2
import numpy as np
import os
from typing import List, Dict, Optional
from dataclasses import dataclass

from .detector import detect_faces_in_frame, DetectedFace
from .embedder import extract_embedding, serialize_embedding
from .quality import assess_quality

ENROLLMENT_ANGLES = [
    {
        "id": "front",
        "label": "Face Forward",
        "filename": "01-front.jpg",
        "instruction": "Look directly at the camera with a natural, relaxed expression.",
        "icon": "face"
    },
    {
        "id": "slight-left",
        "label": "Turn Slightly Left",
        "filename": "02-slight-left.jpg",
        "instruction": "Turn your head slightly to the left (~15°).",
        "icon": "face"
    },
    {
        "id": "slight-right",
        "label": "Turn Slightly Right",
        "filename": "03-slight-right.jpg",
        "instruction": "Turn your head slightly to the right (~15°).",
        "icon": "face"
    }
]

@dataclass
class CapturedSample:
    angle_id: str
    filename: str
    face_image: np.ndarray
    embedding: np.ndarray
    quality_score: float

class EnrollmentSession:
    """
    Manages a 3-photo face enrollment session for a student.
    Captures: 01-front.jpg, 02-slight-left.jpg, 03-slight-right.jpg
    """
    
    def __init__(self, student_id: str, student_name: str = "", storage_dir: Optional[str] = None):
        self.student_id = student_id
        self.student_name = student_name
        self.current_step = 0  # 0, 1, 2
        self.captured_samples: List[CapturedSample] = []
        self.status = "IN_PROGRESS"  # IN_PROGRESS, COMPLETE, FAILED
        self.storage_dir = storage_dir or os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            "data", "face-enrollment", student_id
        )
        
    def get_current_guidance(self) -> Dict:
        if self.current_step < len(ENROLLMENT_ANGLES):
            angle = ENROLLMENT_ANGLES[self.current_step]
            return {
                "step": self.current_step + 1,
                "total_steps": len(ENROLLMENT_ANGLES),
                "angle_id": angle["id"],
                "label": angle["label"],
                "instruction": angle["instruction"],
                "filename": angle["filename"],
                "status": self.status,
                "completed_count": len(self.captured_samples)
            }
        return {
            "step": 3,
            "total_steps": 3,
            "status": "COMPLETE",
            "message": "All 3 enrollment samples captured successfully!",
            "completed_count": len(self.captured_samples)
        }
        
    def process_frame(self, frame: np.ndarray) -> Dict:
        """
        Process incoming camera frame for current enrollment angle.
        Validates quality and extracts embedding.
        """
        if self.current_step >= len(ENROLLMENT_ANGLES):
            return {"status": "COMPLETE", "message": "Enrollment already completed."}
            
        faces = detect_faces_in_frame(frame)
        if len(faces) == 0:
            return {
                "status": "NO_FACE",
                "message": "No face detected. Please center your face inside the oval guide."
            }
            
        if len(faces) > 1:
            return {
                "status": "MULTIPLE_FACES",
                "message": "Multiple faces detected. Please ensure only the student being enrolled is in view."
            }
            
        face = faces[0]
        quality = assess_quality(face.face_image)
        
        if not quality.is_acceptable:
            return {
                "status": "POOR_QUALITY",
                "message": quality.feedback,
                "score": quality.score
            }
            
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        embedding = extract_embedding(rgb_frame, face.location)
        if embedding is None:
            return {
                "status": "EMBEDDING_FAILED",
                "message": "Could not extract face features. Please adjust lighting and try again."
            }
            
        angle = ENROLLMENT_ANGLES[self.current_step]
        
        # Save photo sample to disk if directory accessible
        try:
            os.makedirs(self.storage_dir, exist_ok=True)
            photo_path = os.path.join(self.storage_dir, angle["filename"])
            cv2.imwrite(photo_path, face.face_image)
        except Exception as e:
            print(f"[Enrollment] Notice saving photo: {e}")
            
        sample = CapturedSample(
            angle_id=angle["id"],
            filename=angle["filename"],
            face_image=face.face_image,
            embedding=embedding,
            quality_score=quality.score
        )
        self.captured_samples.append(sample)
        self.current_step += 1
        
        if self.current_step >= len(ENROLLMENT_ANGLES):
            self.status = "COMPLETE"
            return {
                "status": "COMPLETE",
                "message": "All 3 samples captured successfully! Ready to finalize.",
                "sample_count": len(self.captured_samples),
                "step": 3
            }
            
        return {
            "status": "CAPTURED",
            "message": f"Sample {self.current_step}/3 captured! Next: {ENROLLMENT_ANGLES[self.current_step]['label']}",
            "sample_count": len(self.captured_samples),
            "next_step": self.get_current_guidance()
        }
        
    def get_serialized_embeddings(self) -> List[str]:
        return [serialize_embedding(s.embedding) for s in self.captured_samples]
        
    def get_average_embedding(self) -> str:
        if not self.captured_samples:
            return ""
        vecs = [s.embedding for s in self.captured_samples]
        avg = np.mean(vecs, axis=0)
        norm = np.linalg.norm(avg)
        if norm > 0:
            avg = avg / norm
        return serialize_embedding(avg)
