'use client';
import { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import type { RecognitionResult } from '@/types';

interface CameraViewProps {
  sessionId: string;
  onResults: (results: RecognitionResult[]) => void;
  studentNames: Record<string, string>;
  active: boolean;
  onToggleCamera?: () => void;
}

// ── Canvas drawing helpers ────────────────────────────────────────────────────

/** Map state to display colors */
function stateColor(state: string): { stroke: string; glow: string; label: string } {
  switch (state) {
    case 'MATCHED':       return { stroke: '#22C55E', glow: 'rgba(34,197,94,0.35)',  label: 'PRESENT' };
    case 'AMBIGUOUS':     return { stroke: '#F59E0B', glow: 'rgba(245,158,11,0.35)', label: 'VERIFY'  };
    case 'NOT_IN_SESSION':return { stroke: '#3B82F6', glow: 'rgba(59,130,246,0.35)', label: 'NOT IN CLASS' };
    default:              return { stroke: '#00D4FF', glow: 'rgba(0,212,255,0.25)',  label: 'SCANNING' };
  }
}

/** Draw glowing L-bracket corners around a bounding box */
function drawCornerBrackets(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  color: string, glow: string
) {
  const cs = Math.min(24, w * 0.18, h * 0.18);
  const lw = 3.5;

  // Outer glow pass
  ctx.shadowColor = color;
  ctx.shadowBlur = 12;
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.lineCap = 'round';

  ctx.beginPath();
  // Top-left
  ctx.moveTo(x, y + cs);       ctx.lineTo(x, y);         ctx.lineTo(x + cs, y);
  // Top-right
  ctx.moveTo(x + w - cs, y);   ctx.lineTo(x + w, y);     ctx.lineTo(x + w, y + cs);
  // Bottom-right
  ctx.moveTo(x + w, y + h - cs); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w - cs, y + h);
  // Bottom-left
  ctx.moveTo(x + cs, y + h);   ctx.lineTo(x, y + h);     ctx.lineTo(x, y + h - cs);
  ctx.stroke();

  ctx.shadowBlur = 0;
}

/** Draw thin bounding rect with opacity */
function drawFaceRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, color: string
) {
  ctx.save();
  ctx.globalAlpha = 0.45;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 4]);
  ctx.strokeRect(x, y, w, h);
  ctx.setLineDash([]);
  ctx.restore();
}

/** Draw landmark dots and mesh triangle lines (simulated from 5 real keypoints) */
function drawFaceMesh(
  ctx: CanvasRenderingContext2D,
  landmarks: number[][],        // [[x,y],...]  — already mirrored
  x: number, y: number, w: number, h: number,
  color: string,
  scanY: number                 // current scanline Y — dims dots below scan
) {
  if (landmarks.length === 0) {
    // No real landmarks: synthesize a mesh grid pattern over the face region
    drawSyntheticMesh(ctx, x, y, w, h, color, scanY);
    return;
  }

  // Draw mesh connection lines between landmark clusters
  ctx.save();
  ctx.globalAlpha = 0.30;
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.8;
  ctx.shadowColor = color;
  ctx.shadowBlur = 3;

  // Connect: left_eye → nose, right_eye → nose, nose → mouth_l, nose → mouth_r
  const pairs = [[0,2],[1,2],[2,3],[2,4],[0,1],[3,4]];
  for (const [a,b] of pairs) {
    if (landmarks[a] && landmarks[b]) {
      ctx.beginPath();
      ctx.moveTo(landmarks[a][0], landmarks[a][1]);
      ctx.lineTo(landmarks[b][0], landmarks[b][1]);
      ctx.stroke();
    }
  }
  ctx.restore();

  // Draw keypoint circles
  landmarks.forEach(([lx, ly]) => {
    const belowScan = ly > scanY;
    ctx.save();
    ctx.globalAlpha = belowScan ? 0.25 : 0.90;
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = belowScan ? 2 : 8;
    ctx.beginPath();
    ctx.arc(lx, ly, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

/** Draw synthetic 5×7 dot grid mesh over face when no real landmarks available */
function drawSyntheticMesh(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  color: string,
  scanY: number
) {
  const cols = 6, rows = 8;
  const pts: [number, number][][] = [];

  for (let r = 0; r < rows; r++) {
    const row: [number, number][] = [];
    for (let c = 0; c < cols; c++) {
      const px = x + (w * (c + 0.5)) / cols;
      const py = y + (h * (r + 0.5)) / rows;
      row.push([px, py]);
    }
    pts.push(row);
  }

  // Draw horizontal + vertical thin lines
  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.7;

  for (let r = 0; r < rows; r++) {
    ctx.beginPath();
    ctx.moveTo(pts[r][0][0], pts[r][0][1]);
    for (let c = 1; c < cols; c++) {
      ctx.lineTo(pts[r][c][0], pts[r][c][1]);
    }
    ctx.stroke();
  }
  for (let c = 0; c < cols; c++) {
    ctx.beginPath();
    ctx.moveTo(pts[0][c][0], pts[0][c][1]);
    for (let r = 1; r < rows; r++) {
      ctx.lineTo(pts[r][c][0], pts[r][c][1]);
    }
    ctx.stroke();
  }
  ctx.restore();

  // Draw small dots at intersections
  for (const row of pts) {
    for (const [px, py] of row) {
      const belowScan = py > scanY;
      ctx.save();
      ctx.globalAlpha = belowScan ? 0.20 : 0.75;
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = belowScan ? 1 : 5;
      ctx.beginPath();
      ctx.arc(px, py, 1.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}

/** Draw the glowing horizontal scan line sweeping through the face */
function drawScanLine(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number,
  scanY: number, color: string
) {
  if (scanY < y || scanY > y + 9999) return;

  ctx.save();
  // Gradient glow across the line
  const grad = ctx.createLinearGradient(x, scanY, x + w, scanY);
  grad.addColorStop(0,   'transparent');
  grad.addColorStop(0.2, color);
  grad.addColorStop(0.5, color);
  grad.addColorStop(0.8, color);
  grad.addColorStop(1,   'transparent');

  ctx.globalAlpha = 0.80;
  ctx.strokeStyle = grad;
  ctx.lineWidth = 2;
  ctx.shadowColor = color;
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.moveTo(x, scanY);
  ctx.lineTo(x + w, scanY);
  ctx.stroke();

  // Thin tail glow
  ctx.globalAlpha = 0.25;
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.restore();
}

/** Draw name + score pill badge above the bounding box */
function drawNameBadge(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number,
  name: string, score: string, color: string
) {
  const text = `${name}  ${score}`;
  ctx.font = 'bold 13px "Inter", sans-serif';
  const tw = ctx.measureText(text).width + 22;
  const bx = Math.max(0, x + w / 2 - tw / 2);
  const by = Math.max(0, y - 36);

  // Pill background
  ctx.save();
  ctx.globalAlpha = 0.92;
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 8;
  ctx.beginPath();
  (ctx as CanvasRenderingContext2D & { roundRect: Function }).roundRect(bx, by, tw, 26, 13);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Text
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#fff';
  ctx.fillText(text, bx + 11, by + 18);
  ctx.restore();
}

/** Draw the confidence percentage in the center of the bounding box */
function drawConfidenceBadge(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  score: number, state: string, color: string
) {
  if (state === 'UNKNOWN' && score < 5) return;
  const pct = `${Math.round(score)}%`;
  const fontSize = Math.max(28, Math.min(42, w * 0.22));
  ctx.font = `bold ${fontSize}px "Inter", sans-serif`;

  const cx = x + w / 2;
  const cy = y + h / 2 + fontSize * 0.35;

  // White with drop shadow
  ctx.save();
  ctx.globalAlpha = state === 'MATCHED' ? 0.96 : 0.70;
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = color;
  ctx.shadowBlur = 16;
  ctx.textAlign = 'center';
  ctx.fillText(pct, cx, cy);

  // Subtitle
  const subtitle = state === 'MATCHED' ? 'Identity Confirmed ✓'
    : state === 'AMBIGUOUS' ? 'Verify Required'
    : 'Verifying your face…';
  ctx.font = `500 12px "Inter", sans-serif`;
  ctx.globalAlpha = 0.80;
  ctx.fillStyle = '#fff';
  ctx.shadowBlur = 4;
  ctx.fillText(subtitle, cx, cy + 20);
  ctx.restore();
}

/** Draw state tag pill below the bounding box */
function drawStateTag(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, h: number,
  label: string, color: string
) {
  ctx.font = 'bold 11px "Inter", sans-serif';
  const tw = ctx.measureText(label).width + 18;
  const tx = x;
  const ty = y + h + 6;

  ctx.save();
  ctx.globalAlpha = 0.88;
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 6;
  ctx.beginPath();
  (ctx as CanvasRenderingContext2D & { roundRect: Function }).roundRect(tx, ty, tw, 22, 11);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'left';
  ctx.fillText(label, tx + 9, ty + 15);
  ctx.restore();
}


// ── Component ─────────────────────────────────────────────────────────────────

export function CameraView({
  sessionId,
  onResults,
  studentNames,
  active,
  onToggleCamera,
}: CameraViewProps) {
  const videoRef  = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animRef   = useRef<number>(0);
  const scanTimeRef = useRef<number>(performance.now()); // scan line animation start
  const lastFpsTime = useRef(performance.now());
  const frameCount  = useRef(0);

  const [fps, setFps]               = useState(0);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [results, setResults]         = useState<RecognitionResult[]>([]);

  // ── Camera lifecycle ─────────────────────────────────────────────────────
  const stopAllTracks = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => { try { t.stop(); } catch { /* */ } });
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraReady(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const start = async () => {
      stopAllTracks();
      setCameraError(null);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setCameraReady(true);
        }
      } catch (err: unknown) {
        const e = err as { name?: string };
        if (e.name === 'NotAllowedError') setCameraError('Camera permission denied.');
        else if (e.name === 'NotFoundError') setCameraError('No webcam found.');
        else setCameraError('Could not connect to camera device.');
      }
    };
    if (active) start(); else stopAllTracks();
    return () => { cancelled = true; stopAllTracks(); };
  }, [active, stopAllTracks]);

  useEffect(() => () => { stopAllTracks(); cancelAnimationFrame(animRef.current); }, [stopAllTracks]);

  // ── Draw loop ────────────────────────────────────────────────────────────
  const drawFrame = useCallback(() => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2 || !active) {
      animRef.current = requestAnimationFrame(drawFrame);
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cw = video.videoWidth  || 1280;
    const ch = video.videoHeight || 720;
    canvas.width  = cw;
    canvas.height = ch;

    // Mirror the video (natural selfie view)
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(video, -cw, 0, cw, ch);
    ctx.restore();

    // ── Scan line animation clock ──────────────────────────────────────────
    const now = performance.now();
    const scanCycleDuration = 2200;   // ms for one full sweep
    const elapsed = (now - scanTimeRef.current) % scanCycleDuration;
    const scanProgress = elapsed / scanCycleDuration; // 0 → 1

    // ── Per-face overlays ─────────────────────────────────────────────────
    for (const r of results) {
      const [rx, ry, rw, rh] = r.bounding_box;
      // Mirror X coordinate for canvas
      const mx = cw - rx - rw;

      const { stroke, glow, label } = stateColor(r.state);

      // Mirror landmarks if present
      const mirroredLms: number[][] = (r.landmarks || []).map(([lx, ly]: number[]) => [
        cw - lx, ly
      ]);

      // Current scan line Y within this face box
      const scanY = ry + scanProgress * rh;

      // 1. Semi-transparent dashed rect
      drawFaceRect(ctx, mx, ry, rw, rh, stroke);

      // 2. Face mesh dots + triangle lines
      drawFaceMesh(ctx, mirroredLms, mx, ry, rw, rh, stroke, scanY);

      // 3. Animated horizontal scan line sweeping through face
      drawScanLine(ctx, mx, ry, rw, scanY, stroke);

      // 4. Glowing L-bracket corners
      drawCornerBrackets(ctx, mx, ry, rw, rh, stroke, glow);

      // 5. Confidence % in center of face box
      drawConfidenceBadge(ctx, mx, ry, rw, rh, r.recognition_score, r.state, stroke);

      // 6. Name + score pill badge above box
      const name = r.student_id
        ? (studentNames[r.student_id] || `Student ${r.student_id.slice(0, 8)}`)
        : 'Unknown';
      drawNameBadge(ctx, mx, ry, rw, name, `${r.recognition_score.toFixed(1)}%`, stroke);

      // 7. State tag below box
      ctx.textAlign = 'left';
      drawStateTag(ctx, mx, ry, rh, label, stroke);
    }

    // ── FPS counter ───────────────────────────────────────────────────────
    frameCount.current++;
    if (now - lastFpsTime.current > 1000) {
      setFps(frameCount.current);
      frameCount.current = 0;
      lastFpsTime.current = now;
    }

    animRef.current = requestAnimationFrame(drawFrame);
  }, [results, studentNames, active]);

  useEffect(() => {
    animRef.current = requestAnimationFrame(drawFrame);
    return () => cancelAnimationFrame(animRef.current);
  }, [drawFrame]);

  // ── Frame capture → backend AI ───────────────────────────────────────────
  useEffect(() => {
    if (!cameraReady || !active || !sessionId) return;
    const interval = setInterval(async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      try {
        const base64 = canvas.toDataURL('image/jpeg', 0.72).split(',')[1];
        const token = typeof window !== 'undefined' ? localStorage.getItem('attendai_token') : '';
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}/ai/process-frame`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ frame: base64, session_id: sessionId }),
          }
        );
        if (res.ok) {
          const data: RecognitionResult[] = await res.json();
          setResults(data);
          onResults(data);
        }
      } catch { /* non-fatal */ }
    }, 420);
    return () => clearInterval(interval);
  }, [cameraReady, active, sessionId, onResults]);

  // ── Inactive state ───────────────────────────────────────────────────────
  if (!active) {
    return (
      <div className="relative bg-slate-900 rounded-2xl overflow-hidden aspect-video flex flex-col items-center justify-center gap-4 p-8 text-center">
        <span className="material-symbols-outlined text-6xl text-slate-600">videocam_off</span>
        <div>
          <h3 className="text-white font-bold text-lg">Camera Stopped</h3>
          <p className="text-slate-400 text-sm mt-1">Hardware stream inactive.</p>
        </div>
        {onToggleCamera && (
          <Button onClick={onToggleCamera} icon="videocam" size="md" className="mt-2">
            Start Camera
          </Button>
        )}
      </div>
    );
  }

  if (cameraError) {
    return (
      <div className="relative bg-slate-900 rounded-2xl overflow-hidden aspect-video flex flex-col items-center justify-center gap-4 p-8 text-center">
        <span className="material-symbols-outlined text-5xl text-red-400">no_photography</span>
        <p className="text-white font-semibold text-base">{cameraError}</p>
        {onToggleCamera && (
          <Button onClick={onToggleCamera} variant="outline" size="sm" icon="refresh">
            Retry Camera
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="relative bg-black rounded-2xl overflow-hidden aspect-video shadow-xl">
      <video ref={videoRef} className="hidden" playsInline muted />
      <canvas ref={canvasRef} className="w-full h-full object-contain" />

      {!cameraReady && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 gap-3">
          <svg className="animate-spin h-10 w-10 text-primary" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-white text-sm font-medium">Connecting to camera…</p>
        </div>
      )}

      {/* ── Floating HUD ── */}
      {cameraReady && (
        <>
          {/* LIVE badge */}
          <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/65 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-lg font-mono">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            LIVE · AI ENGINE
          </div>

          {/* Stop button */}
          {onToggleCamera && (
            <button
              onClick={onToggleCamera}
              className="absolute top-3 right-3 flex items-center gap-1.5 bg-red-600/85 hover:bg-red-700 text-white text-xs px-3 py-1.5 rounded-lg backdrop-blur-sm transition-colors font-medium shadow"
            >
              <span className="material-symbols-outlined text-sm">stop_circle</span>
              Stop Camera
            </button>
          )}

          {/* Bottom-right: FPS */}
          <div className="absolute bottom-3 right-3 bg-black/65 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded-lg font-mono">
            {fps} FPS
          </div>

          {/* Bottom-left: face count */}
          <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-black/65 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded-lg">
            <span className="material-symbols-outlined text-xs text-cyan-400">psychology</span>
            {results.length} Face{results.length === 1 ? '' : 's'} · InsightFace ArcFace
          </div>
        </>
      )}
    </div>
  );
}