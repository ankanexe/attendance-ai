'use client';
import { useEffect, useState } from 'react';
import { FacultyHeader } from '@/components/layout/FacultyHeader';
import { BentoCard } from '@/components/ui/BentoCard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { settingsAPI } from '@/lib/api';
import type { SystemSetting } from '@/types';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    settingsAPI.list().then(res => {
      const map: Record<string, string> = {};
      (res.data as SystemSetting[]).forEach(s => { map[s.key] = s.value; });
      setSettings(map);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const set = (key: string, val: string) => setSettings(prev => ({ ...prev, [key]: val }));

  const save = async () => {
    setSaving(true);
    try {
      await Promise.all(Object.entries(settings).map(([k, v]) => settingsAPI.update(k, v)));
      toast.success('Settings saved');
    } catch { toast.error('Failed to save settings'); }
    setSaving(false);
  };

  if (loading) return <div className="flex-1 flex items-center justify-center"><LoadingSpinner size="lg" /></div>;

  const thresh = parseFloat(settings.match_threshold || '0.80') * 100;
  const verifyThresh = parseFloat(settings.verify_threshold || '0.60') * 100;

  return (
    <div className="flex flex-col flex-1">
      <FacultyHeader title="Settings" subtitle="Configure attendance, recognition, and system preferences" />
      <div className="p-6 max-w-2xl mx-auto w-full flex flex-col gap-6">
        {/* Recognition Settings */}
        <BentoCard title="Recognition Settings">
          <div className="flex flex-col gap-5">
            <div>
              <label className="text-sm font-medium text-on-surface block mb-2">
                Match Threshold: <strong className="text-primary">{thresh.toFixed(0)}%</strong>
              </label>
              <input
                type="range" min="60" max="99" step="1"
                value={thresh}
                onChange={e => set('match_threshold', (parseFloat(e.target.value) / 100).toString())}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-xs text-on-surface-variant mt-1">
                <span>60% (Permissive)</span><span>99% (Strict)</span>
              </div>
              <p className="text-xs text-on-surface-variant mt-2">
                Scores ≥ {thresh.toFixed(0)}% → automatic PRESENT/LATE. Recommended: 80%
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-on-surface block mb-2">
                Verify Threshold: <strong className="text-purple-600">{verifyThresh.toFixed(0)}%</strong>
              </label>
              <input
                type="range" min="40" max="79" step="1"
                value={verifyThresh}
                onChange={e => set('verify_threshold', (parseFloat(e.target.value) / 100).toString())}
                className="w-full accent-purple-600"
              />
              <p className="text-xs text-on-surface-variant mt-2">
                Scores {verifyThresh.toFixed(0)}%–{(thresh - 1).toFixed(0)}% → VERIFY (faculty confirmation needed)
              </p>
            </div>
          </div>
        </BentoCard>

        {/* Attendance Settings */}
        <BentoCard title="Attendance Settings">
          <div className="flex flex-col gap-4">
            <Input
              label="Default Grace Period (minutes)"
              type="number" min="0" max="60"
              value={settings.grace_period_minutes || '10'}
              onChange={e => set('grace_period_minutes', e.target.value)}
              icon="timer"
            />
            <p className="text-xs text-on-surface-variant">
              Students arriving within this grace period will be marked PRESENT. Can be overridden per session.
            </p>
          </div>
        </BentoCard>

        {/* Liveness */}
        <BentoCard title="Liveness Detection">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-medium text-on-surface">Enable Liveness Check</p>
              <p className="text-xs text-on-surface-variant mt-0.5">Heuristic motion-based anti-spoofing (not deep learning)</p>
            </div>
            <button
              onClick={() => set('liveness_enabled', settings.liveness_enabled === 'true' ? 'false' : 'true')}
              className={`w-12 h-6 rounded-full transition-colors ${settings.liveness_enabled === 'true' ? 'bg-primary' : 'bg-outline-variant'}`}
            >
              <div className={`w-5 h-5 rounded-full bg-white shadow-sm mx-0.5 transition-transform ${settings.liveness_enabled === 'true' ? 'translate-x-6' : ''}`} />
            </button>
          </div>
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-700">
            <strong>Note:</strong> Current liveness detection uses motion heuristics only. It is NOT a deep anti-spoofing model and does not prevent all spoofing attempts. For high-security deployments, a dedicated anti-spoofing system should be integrated.
          </div>
        </BentoCard>

        <Button loading={saving} onClick={save} size="lg" className="w-full">Save All Settings</Button>
      </div>
    </div>
  );
}
