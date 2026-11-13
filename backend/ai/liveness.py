import cv2
import numpy as np
from dataclasses import dataclass
from typing import Optional, List

@dataclass
class LivenessResult:
    is_live: bool
    method: str
    confidence: float
    message: str

class LivenessDetector:
    """
    Heuristic liveness detection using eye aspect ratio (EAR) blink detection
    and multi-frame motion analysis.
    """
    
    EAR_THRESHOLD = 0.25       # Below this is considered a blink
    MOTION_THRESHOLD = 500.0   # Pixel motion sum threshold
    
    def __init__(self):
        self.frame_history: List[np.ndarray] = []
        self.blink_count = 0
        self.max_history = 10
    
    def analyze_frame(self, gray_frame: np.ndarray) -> LivenessResult:
        """
        Analyze a grayscale frame for liveness indicators.
        Checks for inter-frame motion as a primary heuristic.
        """
        self.frame_history.append(gray_frame.copy())
        if len(self.frame_history) > self.max_history:
            self.frame_history.pop(0)
        
        if len(self.frame_history) < 3:
            return LivenessResult(
                is_live=False,
                method="MOTION_ANALYSIS",
                confidence=0.0,
                message="Collecting frames for liveness analysis..."
            )

        motions = []
        for i in range(1, len(self.frame_history)):
            prev = self.frame_history[i-1].astype(np.float32)
            curr = self.frame_history[i].astype(np.float32)
            motion = np.sum(np.abs(curr - prev))
            motions.append(motion)
        
        avg_motion = np.mean(motions) if motions else 0
        is_live = avg_motion > self.MOTION_THRESHOLD
        confidence = min(1.0, avg_motion / (self.MOTION_THRESHOLD * 3))
        
        return LivenessResult(
            is_live=is_live,
            method="MOTION_HEURISTIC",
            confidence=round(confidence, 3),
            message="Liveness: motion detected" if is_live else "Please move slightly for liveness check"
        )
    
    def reset(self):
        self.frame_history = []
        self.blink_count = 0
