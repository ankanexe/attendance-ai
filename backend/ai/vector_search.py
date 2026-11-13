import numpy as np
from typing import List, Tuple, Dict, Optional
from dataclasses import dataclass

@dataclass
class SearchCandidate:
    student_id: str
    similarity: float  # 0.0 to 1.0 (Cosine Similarity)
    sample_index: int

class FaceVectorSearchService:
    """
    Abstracted Face Vector Index & Search Service.
    
    Designed to support scale up to 15,000-30,000 students at a university.
    Currently uses an in-memory normalized matrix with vectorized cosine similarity.
    Can be replaced or backed by FAISS, HNSWLib, or Milvus with zero changes to caller APIs.
    """
    
    def __init__(self, embedding_dim: int = 128):
        self.embedding_dim = embedding_dim
        # List of student IDs corresponding to each row in the matrix
        self.student_ids: List[str] = []
        # (N, D) normalized numpy array
        self.matrix: Optional[np.ndarray] = None
        # Map of student_id -> list of sample indices in matrix
        self.student_to_indices: Dict[str, List[int]] = {}
        
    def clear(self):
        """Reset the vector index."""
        self.student_ids = []
        self.matrix = None
        self.student_to_indices = {}
        
    def add_template(self, student_id: str, embedding: np.ndarray):
        """Add or append a normalized embedding vector for a student."""
        vec = embedding.flatten().astype(np.float32)
        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = vec / norm
        else:
            return
            
        if self.matrix is None or len(self.student_ids) == 0:
            self.matrix = vec.reshape(1, -1)
            self.student_ids = [student_id]
            self.student_to_indices = {student_id: [0]}
        else:
            self.matrix = np.vstack([self.matrix, vec.reshape(1, -1)])
            idx = len(self.student_ids)
            self.student_ids.append(student_id)
            if student_id not in self.student_to_indices:
                self.student_to_indices[student_id] = []
            self.student_to_indices[student_id].append(idx)
            
    def load_from_list(self, templates: List[Tuple[str, np.ndarray]]):
        """Batch load a collection of (student_id, embedding) tuples into index."""
        self.clear()
        if not templates:
            return
            
        valid_ids = []
        valid_vecs = []
        
        for s_id, emb in templates:
            vec = emb.flatten().astype(np.float32)
            norm = np.linalg.norm(vec)
            if norm > 0:
                vec = vec / norm
                valid_ids.append(s_id)
                valid_vecs.append(vec)
                
        if valid_vecs:
            self.matrix = np.vstack(valid_vecs)
            self.student_ids = valid_ids
            self.student_to_indices = {}
            for i, s_id in enumerate(self.student_ids):
                if s_id not in self.student_to_indices:
                    self.student_to_indices[s_id] = []
                self.student_to_indices[s_id].append(i)
                
    def search(self, query_embedding: np.ndarray, top_k: int = 1) -> List[SearchCandidate]:
        """
        Perform vectorized cosine similarity search against all enrolled templates.
        Returns candidates sorted by highest similarity score.
        """
        if self.matrix is None or len(self.student_ids) == 0:
            return []
            
        q = query_embedding.flatten().astype(np.float32)
        norm = np.linalg.norm(q)
        if norm > 0:
            q = q / norm
        else:
            return []
            
        # Vectorized dot product (Cosine similarity on normalized vectors)
        # (N, D) dot (D,) -> (N,)
        similarities = np.dot(self.matrix, q)
        
        # Aggregate best score per student
        best_per_student: Dict[str, Tuple[float, int]] = {}
        for idx, sim in enumerate(similarities):
            s_id = self.student_ids[idx]
            sim_val = float(np.clip(sim, 0.0, 1.0))
            if s_id not in best_per_student or sim_val > best_per_student[s_id][0]:
                best_per_student[s_id] = (sim_val, idx)
                
        # Sort by similarity descending
        sorted_students = sorted(
            best_per_student.items(),
            key=lambda item: item[1][0],
            reverse=True
        )
        
        results = [
            SearchCandidate(student_id=s_id, similarity=round(score_data[0], 4), sample_index=score_data[1])
            for s_id, score_data in sorted_students[:top_k]
        ]
        return results

    @property
    def total_vectors(self) -> int:
        return len(self.student_ids) if self.student_ids else 0

    @property
    def unique_students_count(self) -> int:
        return len(self.student_to_indices)
