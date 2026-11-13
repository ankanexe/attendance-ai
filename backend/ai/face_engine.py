"""
face_engine.py — AttendAI Recognition Orchestrator

Wires together:
  - detector.py  (InsightFace RetinaFace → MediaPipe → Haar fallback)
  - embedder.py  (InsightFace ArcFace 512D → dlib 128D → LBP fallback)
  - vector_search.py (vectorized cosine similarity at 30k-student scale)
"""

import cv2
import numpy as np
from typing import List, Dict, Optional, Tuple, Set
from dataclasses import dataclass, field
import time

from .detector import detect_faces_in_frame, DetectedFace
from .embedder import extract_embedding, deserialize_embedding
from .quality import assess_quality
from .liveness import LivenessDetector
from .vector_search import FaceVectorSearchService


@dataclass
class RecognitionResult:
    bounding_box: tuple                           # (x, y, w, h)
    student_id: Optional[str]
    recognition_score: float                      # 0.0 – 1.0
    state: str                                    # MATCHED | AMBIGUOUS | UNKNOWN | NOT_IN_SESSION
    quality_score: float
    liveness_confident: bool
    feedback: str
    landmarks: List[Tuple[int, int]] = field(default_factory=list)
    # 5 face keypoint pixel coords: [left_eye, right_eye, nose, mouth_l, mouth_r]


class FaceEngine:
    """
    Real-time face recognition orchestrator.
    Handles frame → detect → embed → match pipeline with automatic
    threshold calibration based on embedding dimensionality.
    """

    def __init__(self):
        # These will be auto-calibrated once we detect the embedding dimension
        self._match_threshold: Optional[float] = None
        self._verify_threshold: Optional[float] = None
        self.vector_search = FaceVectorSearchService()
        self.liveness_detector = LivenessDetector()
        self._last_process_time = 0.0
        self._min_interval = 0.04    # cap at 25fps to avoid overloading CPU
        self._emb_dim: Optional[int] = None

    @property
    def match_threshold(self) -> float:
        # ArcFace 512D: 0.48–0.52 ≈ 99%+ accuracy on LFW
        # dlib 128D: 0.60–0.65
        # LBP fallback: 0.78–0.82
        if self._match_threshold is not None:
            return self._match_threshold
        if self._emb_dim == 512:
            return 0.48
        if self._emb_dim == 128:
            return 0.60
        return 0.78

    @property
    def verify_threshold(self) -> float:
        if self._verify_threshold is not None:
            return self._verify_threshold
        if self._emb_dim == 512:
            return 0.35
        if self._emb_dim == 128:
            return 0.48
        return 0.62

    def load_templates(self, templates: List[Dict]):
        """
        Load enrolled face templates (base64 embeddings) into the vector search index.
        Automatically calibrates thresholds from the first embedding's dimension.
        """
        template_tuples = []
        for t in templates:
            try:
                emb = deserialize_embedding(t["embedding"])
                if self._emb_dim is None and emb is not None:
                    self._emb_dim = len(emb)
                    print(f"[FaceEngine] Detected embedding dimension: {self._emb_dim}D — "
                          f"match_threshold={self.match_threshold:.2f}, "
                          f"verify_threshold={self.verify_threshold:.2f}")
                template_tuples.append((t["student_id"], emb))
            except Exception as e:
                print(f"[FaceEngine] Template deserialize error for {t.get('student_id')}: {e}")

        self.vector_search.load_from_list(template_tuples)
        print(f"[FaceEngine] Loaded {self.vector_search.total_vectors} templates "
              f"for {self.vector_search.unique_students_count} students.")

    def process_frame(
        self,
        frame: np.ndarray,
        session_enrolled_ids: Optional[Set[str]] = None
    ) -> List[RecognitionResult]:
        """
        Run full detection + recognition pipeline on a single BGR video frame.
        Returns one RecognitionResult per detected face (never ghost results).
        """
        if frame is None or frame.size == 0:
            return []

        # Rate-limit to ~25fps max
        now = time.time()
        if now - self._last_process_time < self._min_interval:
            return []
        self._last_process_time = now

        # Convert once for embedder
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

        # Detect faces
        faces: List[DetectedFace] = detect_faces_in_frame(frame)
        if not faces:
            return []

        # Liveness check on full gray frame
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        liveness = self.liveness_detector.analyze_frame(gray)

        results: List[RecognitionResult] = []

        for face in faces:
            quality = assess_quality(face.face_image)

            # Extract embedding — pass landmarks for 5-pt alignment
            embedding = extract_embedding(
                rgb_frame,
                face.location,
                landmarks=face.landmarks if face.landmarks else None
            )

            if embedding is None:
                results.append(RecognitionResult(
                    bounding_box=face.bounding_box,
                    student_id=None,
                    recognition_score=0.0,
                    state="UNKNOWN",
                    quality_score=quality.score,
                    liveness_confident=liveness.is_live,
                    feedback="Face detected — adjust lighting or distance",
                    landmarks=face.landmarks
                ))
                continue

            # Calibrate thresholds from embedding dimension
            if self._emb_dim is None:
                self._emb_dim = len(embedding)

            # Vector similarity search
            candidates = self.vector_search.search(embedding, top_k=1)

            if candidates:
                best = candidates[0]
                score = best.similarity
                student_id = best.student_id

                if score >= self.match_threshold:
                    if session_enrolled_ids is not None and student_id not in session_enrolled_ids:
                        state = "NOT_IN_SESSION"
                        feedback = "Recognized — Not Enrolled in This Session"
                    else:
                        state = "MATCHED"
                        feedback = "Identity Confirmed ✓"
                elif score >= self.verify_threshold:
                    state = "AMBIGUOUS"
                    feedback = "Ambiguous — Faculty Verification Required"
                else:
                    state = "UNKNOWN"
                    student_id = None
                    feedback = "Unknown Face"
            else:
                score = 0.0
                student_id = None
                state = "UNKNOWN"
                feedback = "No enrolled templates in database"

            results.append(RecognitionResult(
                bounding_box=face.bounding_box,
                student_id=student_id,
                recognition_score=score,
                state=state,
                quality_score=quality.score,
                liveness_confident=liveness.is_live,
                feedback=feedback,
                landmarks=face.landmarks
            ))

        return results

    def result_to_dict(self, result: RecognitionResult) -> Dict:
        return {
            "bounding_box": list(result.bounding_box),
            "student_id": result.student_id,
            "recognition_score": round(result.recognition_score * 100, 1),
            "state": result.state,
            "quality_score": round(result.quality_score * 100, 1),
            "liveness_confident": result.liveness_confident,
            "feedback": result.feedback,
            "landmarks": [list(pt) for pt in result.landmarks],  # [[x,y], ...]
        }
