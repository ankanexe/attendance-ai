'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { FacultyHeader } from '@/components/layout/FacultyHeader';
import { BentoCard } from '@/components/ui/BentoCard';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';
import { aiAPI } from '@/lib/api';
import { cn } from '@/lib/utils';

interface EngineStatus {
  templates_loaded: number;
  match_threshold: number;
  verify_threshold: number;
}

export default function CameraSetupPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraState, setCameraState] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [cameraError, setCameraError] = useState('');
  const [faceCount, setFaceCount] = useState<number | null>(null);
  const [fps, setFps] = useState(0);
  const [engineStatus, setEngineStatus] = useState<EngineStatus | null>(null);
  const [testing, setTesting] = useState(false);
  const fpsInterval = useRef<NodeJS.Timeout>();
  const frameCount = useRef(0);

  const fetchEngineStatus = useCallback(async () => {
    try {
      const res = await aiAPI.engineStatus();
      setEngineStatus(res.data);
    } catch { /* AI engine may not be ready */ }
  }, []);

  useEffect(() => { fetchEngineStatus(); }, [fetchEngineStatus]);

  const startCamera = async () => {
    setCameraState('connecting');
    setCameraError('');
    if (stream) { stream.getTracks().forEach(t => t.stop()); }
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
      });
      setStream(s);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        await videoRef.current.play();
      }
      setCameraState('connected');
      // FPS counter
      fpsInterval.current = setInterval(() => {
        setFps(frameCount.current);
        frameCount.current = 0;
      }, 1000);
    } catch (err: unknown) {
      const error = err as { name?: string };
      setCameraState('error');
      if (error.name === 'NotAllowedError') setCameraError('Camera permission denied by browser.');
      else if (error.name === 'NotFoundError') setCameraError('No camera found on this device.');
      else setCameraError('Failed to start camera. Please check your device.');
    }
  };

  const stopCamera = () => {
    stream?.getTracks().forEach(t => t.stop());
    setStream(null);
    setCameraState('idle');
    setFaceCount(null);
    if (fpsInterval.current) clearInterval(fpsInterval.current);
  };

  const testDetection = async () => {
    setTesting(true);
    const video = videoRef.current;
    if (!video || cameraState !== 'connected') { setTesting(false); return; }
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) { setTesting(false); return; }
    ctx.drawImage(video, 0, 0);
    const base64 = canvas.toDataURL('image/jpeg', 0.7).split(',')[1];
    try {
      const res = await aiAPI.processFrame(base64, 'test-session');
      setFaceCount(Array.isArray(res.data) ? res.data.length : 0);
    } catch { setFaceCount(null); }
    setTesting(false);
  };

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const handle = () => { frameCount.current++; };
    v.addEventListener('timeupdate', handle);
    return () => v.removeEventListener('timeupdate', handle);
  }, []);

  useEffect(() => {
    return () => {
      stream?.getTracks().forEach(t => t.stop());
      if (fpsInterval.current) clearInterval(fpsInterval.current);
    };
  }, [stream]);

  const statusIcon = (ok: boolean | null, na = false) => {
    if (na) return <span className="material-symbols-outlined text-gray-400">remove</span>;
    return ok
      ? <span className="material-symbols-outlined text-green-500">check_circle</span>
      : <span className="material-symbols-outlined text-red-500">cancel</span>;
  };

  return (
    <div className="flex flex-col flex-1">
      <FacultyHeader title="Camera Setup" subtitle="Configure and test your camera for AI attendance" />
      <div className="p-6 grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Camera preview */}
        <div className="xl:col-span-2 flex flex-col gap-4">
          <BentoCard title="Camera Preview">
            <div className="relative bg-gray-900 rounded-2xl overflow-hidden aspect-video mb-4">
              <video ref={videoRef} className="w-full h-full object-cover" playsInline muted autoPlay />
              {cameraState === 'idle' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  <span className="material-symbols-outlined text-5xl text-gray-500">videocam</span>
                  <p className="text-gray-400">Click Test Connection to start camera</p>
                </div>
              )}
              {cameraState === 'connecting' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  <svg className="animate-spin h-10 w-10 text-primary" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <p className="text-white text-sm">Connecting to camera...</p>
                </div>
              )}
              {cameraState === 'error' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-8">
                  <span className="material-symbols-outlined text-4xl text-red-400">videocam_off</span>
                  <p className="text-red-300 text-center text-sm">{cameraError}</p>
                </div>
              )}
              {cameraState === 'connected' && (
                <div className="absolute top-3 left-3 bg-black/60 text-white text-xs px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 live-pulse" />
                  Camera Active · {fps} FPS
                </div>
              )}
            </div>

            <div className="flex gap-3 flex-wrap">
              {cameraState === 'idle' || cameraState === 'error' ? (
                <Button onClick={startCamera} icon="videocam">Test Connection</Button>
              ) : (
                <Button variant="outline" onClick={stopCamera} icon="stop">Stop Camera</Button>
              )}
              <Button
                variant="secondary"
                onClick={testDetection}
                loading={testing}
                disabled={cameraState !== 'connected'}
                icon="face"
              >
                Test Face Detection
              </Button>
              <Button
                onClick={() => { stopCamera(); router.push('/session-setup'); }}
                icon="play_arrow"
                disabled={cameraState !== 'connected'}
              >
                Proceed to Session Setup
              </Button>
            </div>

            {faceCount !== null && (
              <div className={cn(
                'mt-3 flex items-center gap-2 text-sm px-4 py-3 rounded-xl font-medium',
                faceCount > 0 ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
              )}>
                <span className="material-symbols-outlined text-lg">{faceCount > 0 ? 'face' : 'person_off'}</span>
                {faceCount > 0 ? `${faceCount} face(s) detected — AI engine is working!` : 'No faces detected. Try moving closer or improving lighting.'}
              </div>
            )}
          </BentoCard>
        </div>

        {/* Status panel */}
        <div className="flex flex-col gap-4">
          <BentoCard title="System Status">
            <div className="flex flex-col gap-3">
              {[
                {
                  label: 'Camera', icon: 'videocam',
                  ok: cameraState === 'connected',
                  text: cameraState === 'connected' ? 'Connected' : cameraState === 'error' ? 'Error' : 'Not connected'
                },
                {
                  label: 'AI Engine', icon: 'psychology',
                  ok: !!engineStatus,
                  text: engineStatus ? 'Active' : 'Unavailable'
                },
                {
                  label: 'Face Templates', icon: 'face',
                  ok: !!engineStatus && engineStatus.templates_loaded > 0,
                  text: engineStatus ? `${engineStatus.templates_loaded} enrolled` : 'N/A'
                },
                {
                  label: 'FPS', icon: 'speed',
                  ok: fps >= 15,
                  text: cameraState === 'connected' ? `${fps} fps` : 'N/A'
                },
              ].map(s => (
                <div key={s.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                    <span className="material-symbols-outlined text-base">{s.icon}</span>
                    {s.label}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-on-surface">{s.text}</span>
                    {statusIcon(s.ok)}
                  </div>
                </div>
              ))}
            </div>
          </BentoCard>

          <BentoCard title="AI Configuration">
            <div className="flex flex-col gap-3 text-sm">
              {[
                { label: 'Match Threshold', value: engineStatus ? `${(engineStatus.match_threshold * 100).toFixed(0)}%` : 'N/A' },
                { label: 'Verify Range', value: engineStatus ? `${(engineStatus.verify_threshold * 100).toFixed(0)}%–${((engineStatus.match_threshold - 0.01) * 100).toFixed(0)}%` : 'N/A' },
                { label: 'Detection Model', value: 'face_recognition (HOG)' },
                { label: 'Liveness', value: 'Heuristic (Motion)' },
              ].map(c => (
                <div key={c.label} className="flex items-center justify-between">
                  <span className="text-on-surface-variant">{c.label}</span>
                  <span className="font-semibold text-on-surface">{c.value}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-on-surface-variant mt-3">
              Adjust thresholds in Settings → Recognition
            </p>
          </BentoCard>

          <BentoCard title="Tips">
            <ul className="text-xs text-on-surface-variant space-y-2">
              {[
                'Ensure your face is well-lit from the front',
                'Face the camera directly when registering',
                'Avoid backlighting or harsh shadows',
                'Keep at least 50cm from the camera',
                'Remove glasses if recognition fails',
              ].map((tip, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-base text-primary mt-0.5">tips_and_updates</span>
                  {tip}
                </li>
              ))}
            </ul>
          </BentoCard>
        </div>
      </div>
    </div>
  );
}
