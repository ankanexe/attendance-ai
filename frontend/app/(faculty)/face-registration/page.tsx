'use client';
import { useEffect, useRef, useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { FacultyHeader } from '@/components/layout/FacultyHeader';
import { BentoCard } from '@/components/ui/BentoCard';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { studentsAPI, aiAPI } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { Student } from '@/types';
import toast from 'react-hot-toast';

const ANGLES = [
  { key: 'FRONT', label: 'Sample 1: Face Forward', filename: '01-front.jpg', instruction: 'Look directly at the camera with a neutral, natural expression.', icon: 'face' },
  { key: 'SLIGHT_LEFT', label: 'Sample 2: Turn Slightly Left', filename: '02-slight-left.jpg', instruction: 'Turn your head slightly to the left (~15°).', icon: 'face' },
  { key: 'SLIGHT_RIGHT', label: 'Sample 3: Turn Slightly Right', filename: '03-slight-right.jpg', instruction: 'Turn your head slightly to the right (~15°).', icon: 'face' },
];

function FaceRegistrationContent() {
  const params = useSearchParams();
  const router = useRouter();
  const studentId = params.get('student_id') || '';

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animRef = useRef<number>(0);

  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [cameraReady, setCameraReady] = useState(false);
  const [step, setStep] = useState(0); // 0, 1, 2
  const [capturing, setCapturing] = useState(false);
  const [captured, setCaptured] = useState<boolean[]>([false, false, false]);
  const [feedback, setFeedback] = useState('Starting camera...');
  const [complete, setComplete] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  const stopAllTracks = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => {
        try { t.stop(); } catch { /* ignore */ }
      });
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraReady(false);
  }, []);

  useEffect(() => {
    if (!studentId) {
      setLoading(false);
      return;
    }
    studentsAPI.get(studentId).then(res => {
      setStudent(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [studentId]);

  const startCamera = useCallback(async () => {
    stopAllTracks();
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
      });
      streamRef.current = s;
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        await videoRef.current.play();
      }
      setCameraReady(true);
      setFeedback('Camera ready. Align face in the oval guide and click Capture.');

      if (studentId) {
        try { await aiAPI.startEnrollment(studentId); } catch { /* non-fatal */ }
      }
    } catch {
      setFeedback('Camera access denied. Please allow camera permissions in browser.');
    }
  }, [studentId, stopAllTracks]);

  // Draw loop (mirror + oval face guide)
  const drawFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas && video.readyState >= 2) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        ctx.save();
        ctx.scale(-1, 1);
        ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
        ctx.restore();

        // Oval face guide overlay
        const cx = canvas.width / 2;
        const cy = canvas.height / 2 - 20;
        const ow = 210; const oh = 280;
        ctx.strokeStyle = 'rgba(53, 37, 205, 0.8)';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([10, 5]);
        ctx.beginPath();
        ctx.ellipse(cx, cy, ow / 2, oh / 2, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
    animRef.current = requestAnimationFrame(drawFrame);
  }, []);

  useEffect(() => {
    animRef.current = requestAnimationFrame(drawFrame);
    return () => cancelAnimationFrame(animRef.current);
  }, [drawFrame]);

  useEffect(() => {
    startCamera();
    return () => {
      stopAllTracks();
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [startCamera, stopAllTracks]);

  const captureFrame = async () => {
    if (!canvasRef.current || !cameraReady || !studentId) return;
    setCapturing(true);
    setFeedback('Processing face quality & vector features...');
    const base64 = canvasRef.current.toDataURL('image/jpeg', 0.85).split(',')[1];
    try {
      const res = await aiAPI.captureEnrollment(studentId, base64);
      const data = res.data;
      if (data.status === 'NO_FACE') {
        setFeedback('No face detected. Please position face clearly inside the oval guide.');
      } else if (data.status === 'POOR_QUALITY') {
        setFeedback(data.message || 'Image quality too low. Ensure proper lighting.');
      } else if (data.status === 'MULTIPLE_FACES') {
        setFeedback('Multiple faces detected. Please ensure only the student is visible.');
      } else if (data.status === 'CAPTURED' || data.status === 'COMPLETE') {
        const newCaptured = [...captured];
        newCaptured[step] = true;
        setCaptured(newCaptured);
        if (step < 2) {
          setStep(s => s + 1);
          setFeedback(ANGLES[step + 1]?.instruction || 'Sample captured successfully!');
          toast.success(`Sample ${step + 1}/3 captured!`);
        } else {
          setFeedback('All 3 samples captured! Committing face templates to database...');
          setFinalizing(true);
          try {
            await aiAPI.finalizeEnrollment(studentId);
            setComplete(true);
            stopAllTracks(); // Turn camera off on completion
            toast.success(`Face registration complete for ${student?.full_name || 'student'}!`);
          } catch {
            setFeedback('Finalization failed. Please try again.');
          }
          setFinalizing(false);
        }
      }
    } catch {
      setFeedback('Capture failed. Please try again.');
    }
    setCapturing(false);
  };

  if (loading) return <div className="flex-1 flex items-center justify-center"><LoadingSpinner size="lg" /></div>;

  if (!studentId) {
    return (
      <div className="flex flex-col flex-1 p-8 text-center max-w-md mx-auto items-center justify-center gap-4">
        <span className="material-symbols-outlined text-6xl text-on-surface-variant">person_search</span>
        <h2 className="text-xl font-bold text-on-surface">Select a Student to Enroll</h2>
        <p className="text-sm text-on-surface-variant">
          Please select a student from the directory to start 3-photo face template registration.
        </p>
        <Button onClick={() => router.push('/students')} icon="group">
          Go to Student Directory
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1">
      <FacultyHeader
        title="Face Template Registration"
        subtitle={student ? `Enrolling 3-Photo Template: ${student.full_name} (${student.student_id})` : '3-Photo Enrollment Wizard'}
      />
      <div className="p-6 max-w-4xl mx-auto w-full flex flex-col gap-6">
        {/* Student Info Card */}
        {student && (
          <BentoCard>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <span className="text-primary font-black text-xl">
                  {student.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </span>
              </div>
              <div>
                <h2 className="font-bold text-on-surface text-base">{student.full_name}</h2>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  ID: {student.student_id} · Roll: {student.roll_number} · Sem {student.semester} · {student.section}
                </p>
              </div>
              <div className="ml-auto">
                <span className={cn(
                  'badge text-xs px-3 py-1',
                  student.face_enrolled ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                )}>
                  {student.face_enrolled ? `✓ Enrolled (${student.face_sample_count || 3} samples)` : '⚠ Needs Enrollment'}
                </span>
              </div>
            </div>
          </BentoCard>
        )}

        {/* 3-Step Progress Header */}
        <div className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-outline-variant shadow-sm">
          {ANGLES.map((a, i) => (
            <div key={a.key} className="flex items-center gap-2 flex-1">
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                captured[i] ? 'bg-green-500 text-white' : i === step ? 'bg-primary text-white' : 'bg-surface-container text-on-surface-variant'
              )}>
                {captured[i] ? <span className="material-symbols-outlined text-base">check</span> : i + 1}
              </div>
              <div className="min-w-0 hidden sm:block">
                <p className={cn('text-xs font-semibold truncate', i === step ? 'text-primary' : 'text-on-surface-variant')}>
                  Sample {i + 1}/3
                </p>
                <p className="text-[10px] text-on-surface-variant/70 font-mono truncate">{a.filename}</p>
              </div>
              {i < 2 && <div className="flex-1 h-px bg-outline-variant" />}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Camera Viewport */}
          <div className="md:col-span-2 flex flex-col gap-4">
            <div className="relative bg-black rounded-2xl overflow-hidden aspect-video shadow-md">
              <video ref={videoRef} className="hidden" playsInline muted />
              <canvas ref={canvasRef} className="w-full h-full object-contain" />
              {!cameraReady && !complete && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
                  <LoadingSpinner size="md" text="Connecting camera..." />
                </div>
              )}
            </div>

            {complete ? (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center shadow-sm">
                <span className="material-symbols-outlined text-5xl text-green-600 mb-2 block">verified</span>
                <h3 className="text-lg font-bold text-green-900 mb-1">Face Registration Complete!</h3>
                <p className="text-xs text-green-800 mb-4 max-w-md mx-auto">
                  3 normalized 128D mathematical embeddings have been committed to the local database for <strong>{student?.full_name}</strong>.
                </p>
                <div className="flex gap-3 justify-center">
                  <Button onClick={() => router.push(`/students/${studentId}`)}>View Student Profile</Button>
                  <Button variant="outline" onClick={() => router.push('/students')}>Back to Directory</Button>
                </div>
              </div>
            ) : (
              <Button
                onClick={captureFrame}
                loading={capturing || finalizing}
                disabled={!cameraReady || complete}
                size="lg"
                icon="photo_camera"
                className="w-full shadow-sm"
              >
                {finalizing ? 'Finalizing 3-Photo Templates...' : `Capture Sample ${step + 1} of 3 (${ANGLES[step]?.filename})`}
              </Button>
            )}
          </div>

          {/* Step Instructions & Feedback */}
          <div className="flex flex-col gap-4">
            {!complete && (
              <BentoCard title="Current Pose Guidance">
                <div className="flex flex-col gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                    <span className="material-symbols-outlined text-2xl text-primary">{ANGLES[step]?.icon}</span>
                  </div>
                  <div className="text-center">
                    <h3 className="font-bold text-sm text-on-surface">{ANGLES[step]?.label}</h3>
                    <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">{ANGLES[step]?.instruction}</p>
                  </div>
                  <div className={cn(
                    'text-xs px-3.5 py-2.5 rounded-xl font-medium text-center',
                    feedback.includes('Processing') ? 'bg-blue-50 text-blue-700' :
                    feedback.includes('No face') ? 'bg-amber-50 text-amber-800' :
                    feedback.includes('denied') ? 'bg-red-50 text-red-700' :
                    'bg-surface-container text-on-surface-variant'
                  )}>
                    {feedback}
                  </div>
                </div>
              </BentoCard>
            )}

            <BentoCard title="3-Photo Enrollment Spec">
              <ul className="text-xs text-on-surface-variant space-y-2">
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-primary">looks_one</span>
                  <span><strong>01-front.jpg:</strong> Neutral frontal angle</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-primary">looks_two</span>
                  <span><strong>02-slight-left.jpg:</strong> 15° slight left turn</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-primary">looks_3</span>
                  <span><strong>03-slight-right.jpg:</strong> 15° slight right turn</span>
                </li>
              </ul>
            </BentoCard>

            <BentoCard title="Biometric Privacy">
              <p className="text-[11px] text-on-surface-variant leading-relaxed">
                Biometric data is stored exclusively as 128D mathematical vectors. Raw camera images are not exposed or transmitted externally.
              </p>
            </BentoCard>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FaceRegistrationPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><LoadingSpinner size="lg" text="Loading Face Registration..." /></div>}>
      <FaceRegistrationContent />
    </Suspense>
  );
}
