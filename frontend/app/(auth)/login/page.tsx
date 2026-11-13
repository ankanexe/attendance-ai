'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '@/lib/auth';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

function LoginForm() {
  const [email, setEmail] = useState('faculty@attendai.com');
  const [password, setPassword] = useState('faculty123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      router.push('/dashboard');
    } catch {
      setError('Invalid Faculty ID / Email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-[45%] bg-primary flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 rounded-full border-4 border-white" />
          <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full border-4 border-white" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full border-2 border-white" />
        </div>
        <div className="relative">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
              <span className="text-white font-black text-2xl">A</span>
            </div>
            <div>
              <h1 className="text-white font-black text-2xl">AttendAI</h1>
              <p className="text-white/70 text-sm">Faculty Attendance Capture System</p>
            </div>
          </div>
          <h2 className="text-white text-4xl font-bold leading-tight">
            Intelligent Attendance.<br />Smarter Classrooms.
          </h2>
          <p className="text-white/80 mt-4 text-lg leading-relaxed">
            Faculty-facing real-time AI face recognition attendance system for modern university classrooms.
          </p>
        </div>
        <div className="relative grid grid-cols-2 gap-4">
          {[
            { icon: 'face', label: 'Face Recognition', desc: 'Real-time AI matching' },
            { icon: 'schedule', label: 'Exact Timestamps', desc: 'Second-level precision' },
            { icon: 'verified_user', label: 'Human-in-the-Loop', desc: 'Verification drawer' },
            { icon: 'analytics', label: 'Who Attended', desc: 'Session roster breakdown' },
          ].map(f => (
            <div key={f.label} className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm">
              <span className="material-symbols-outlined text-white text-2xl mb-2 block">{f.icon}</span>
              <p className="text-white font-semibold text-sm">{f.label}</p>
              <p className="text-white/70 text-xs">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right login form */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-[400px]">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <span className="text-white font-black text-xl">A</span>
            </div>
            <h1 className="text-2xl font-black text-primary">AttendAI</h1>
          </div>

          <h2 className="text-2xl font-bold text-on-surface mb-1">Faculty Sign In</h2>
          <p className="text-on-surface-variant mb-8">Enter your credentials to access the attendance system</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Faculty / Staff ID or Email"
              type="text"
              placeholder="faculty@attendai.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              icon="badge"
              required
            />
            <Input
              label="Password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              icon="lock"
              required
            />

            {error && (
              <div className="flex items-center gap-2 text-sm text-error bg-error-container/50 rounded-xl px-4 py-3">
                <span className="material-symbols-outlined text-lg">error</span>
                {error}
              </div>
            )}

            <Button type="submit" loading={loading} size="lg" className="mt-2 w-full">
              Sign In to AttendAI
            </Button>
          </form>

          <p className="text-xs text-on-surface-variant text-center mt-8">
            AttendAI © 2026 · AI-Powered Attendance Capture Layer
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <AuthProvider>
      <LoginForm />
    </AuthProvider>
  );
}