import numpy as np
from typing import List, Tuple, Optional
from dataclasses import dataclass

@dataclass
class MatchResult:
    student_id: Optional[str]
    score: float  # 0.0 to 1.0 (higher = better match)
    state: str    # "MATCHED", "AMBIGUOUS", "UNKNOWN"

def cosine_similarity(vec1: np.ndarray, vec2: np.ndarray) -> float:
    """Calculate cosine similarity between two embedding vectors."""
    v1 = vec1.flatten().astype(np.float64)
    v2 = vec2.flatten().astype(np.float64)
    norm1 = np.linalg.norm(v1)
    norm2 = np.linalg.norm(v2)
    if norm1 == 0 or norm2 == 0:
        return 0.0
    dot = np.dot(v1, v2)
    return float(np.clip(dot / (norm1 * norm2), 0.0, 1.0))

def match_against_templates(
    query_embedding: np.ndarray,
    enrolled_templates: List[Tuple[str, np.ndarray]],
    match_threshold: float = 0.80,
    verify_threshold: float = 0.60
) -> MatchResult:
    """
    Compare query embedding against all enrolled face templates.
    Returns the best match with state determination.
    """
    if not enrolled_templates:
        return MatchResult(student_id=None, score=0.0, state="UNKNOWN")
    
    best_student_id = None
    best_score = 0.0
    
    for student_id, template_embedding in enrolled_templates:
        sim = cosine_similarity(query_embedding, template_embedding)
        if sim > best_score:
            best_score = sim
            best_student_id = student_id
    
    if best_score >= match_threshold:
        state = "MATCHED"
    elif best_score >= verify_threshold:
        state = "AMBIGUOUS"
    else:
        state = "UNKNOWN"
        best_student_id = None
    
    return MatchResult(
        student_id=best_student_id,
        score=round(best_score, 4),
        state=state
    )
