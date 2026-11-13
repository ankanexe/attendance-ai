SECRET_KEY = "attendai-super-secret-jwt-key-2026"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours
DATABASE_URL = "sqlite:///./attendai.db"
MATCH_THRESHOLD = 0.80      # Confidence >= 80% = PRESENT/LATE
VERIFY_THRESHOLD = 0.60     # 60%-79% = VERIFY
GRACE_PERIOD_DEFAULT = 10   # minutes
FACE_DATA_DIR = "../data/face-embeddings/"
