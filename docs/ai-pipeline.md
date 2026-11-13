# AttendAI — Computer Vision & AI Pipeline

## 1. Pipeline Overview

The AttendAI Computer Vision pipeline processes live webcam video frames to identify enrolled students and record attendance in real-time.

```
+------------------+     +-----------------------+     +------------------------+
| 1. Video Stream  | --> | 2. Face Detection     | --> | 3. Quality & Liveness  |
| 720p/1080p WebRTC|     | Multi-face localizer  |     | Sharpness & Motion     |
+------------------+     +-----------------------+     +------------------------+
                                                                    |
                                                                    v
+------------------+     +-----------------------+     +------------------------+
| 6. Attendance    | <-- | 5. Cosine Similarity  | <-- | 4. 128D Embedding Gen  |
| Decision Engine  |     | Vectorized Distance   |     | Spatial Gradient Norm  |
+------------------+     +-----------------------+     +------------------------+
```

---

## 2. Pipeline Stages

### Stage 1: Frame Acquisition
- Video is captured via browser `navigator.mediaDevices.getUserMedia` at 1280x720 (ideal).
- Frames are mirrored horizontally on the canvas for natural interaction.
- Frame sampling is throttled to 2 FPS (500ms intervals) for AI inference to ensure smooth rendering and low CPU load.

### Stage 2: Face Detection & Localization
- Detects multiple concurrent faces in the frame.
- Returns bounding coordinates `(x, y, width, height)` for each face.
- Extracts cropped region of interest (ROI) with 10% spatial padding.

### Stage 3: Face Quality & Liveness Assessment
- **Sharpness**: Evaluated using the Laplacian variance `cv2.Laplacian(gray, cv2.CV_64F).var()`. Values < 50 trigger "Hold still — image is blurry" feedback.
- **Minimum Size**: Faces smaller than 60x60 pixels trigger "Move closer to camera" feedback.
- **Motion Heuristics**: Inter-frame pixel difference analysis across a 10-frame sliding window detects micro-movements to discourage static photo spoofing.

### Stage 4: Feature Embedding Extraction
- Cropped face is normalized to a canonical 96x96 resolution and histogram-equalized.
- Multi-scale spatial gradient descriptors (Sobel horizontal + vertical) are extracted across a 4x4 spatial grid with 8 orientation bins, yielding a 128-dimensional floating-point vector.
- Vector is $L_2$-normalized: $\hat{v} = \frac{v}{\|v\|_2}$.

### Stage 5: Cosine Similarity Matching
The query embedding $\hat{q}$ is compared against all enrolled templates $\{\hat{t}_i\}$:
$$\text{Score}(\hat{q}, \hat{t}_i) = \hat{q} \cdot \hat{t}_i = \sum_{k=1}^{128} q_k \cdot t_{i,k}$$

### Stage 6: Threshold Decision Logic
- **$\text{Score} \ge 0.80$ (Match Threshold)**: Categorized as `MATCHED`. Evaluated against the session grace period to mark `PRESENT` or `LATE`.
- **$0.60 \le \text{Score} < 0.80$ (Verify Threshold)**: Categorized as `AMBIGUOUS`. Dispatched to the faculty `[VERIFY]` drawer for human confirmation.
- **$\text{Score} < 0.60$**: Categorized as `UNKNOWN`. Logged as an unknown face event without affecting student attendance.

---

## 3. Multi-Angle Enrollment Wizard

To ensure high-accuracy matching under varying angles, enrollment collects 3 distinct perspectives:
1. **Frontal Angle**: $0^\circ$ direct camera look.
2. **Left Angle**: $15^\circ$ slight left turn.
3. **Right Angle**: $15^\circ$ slight right turn.

The resulting 3 feature vectors are stored in `face_templates` and averaged during inference for maximum pose invariance.
