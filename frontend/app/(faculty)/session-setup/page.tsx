'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FacultyHeader } from '@/components/layout/FacultyHeader';
import { BentoCard } from '@/components/ui/BentoCard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { subjectsAPI, sectionsAPI, sessionsAPI } from '@/lib/api';
import type { Subject, Section } from '@/types';
import toast from 'react-hot-toast';

export default function SessionSetupPage() {
  const router = useRouter();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [launching, setLaunching] = useState(false);

  const [form, setForm] = useState({
    subject_id: '',
    section_id: '',
    room_number: '',
    grace_period_minutes: '10',
  });

  useEffect(() => {
    subjectsAPI.list().then(res => {
      setSubjects(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!form.subject_id) { setSections([]); return; }
    sectionsAPI.list({ subject_id: form.subject_id }).then(res => setSections(res.data));
  }, [form.subject_id]);

  const launch = async () => {
    if (!form.subject_id || !form.section_id) {
      toast.error('Please select a subject and section');
      return;
    }
    setLaunching(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const sessionRes = await sessionsAPI.create({
        subject_id: form.subject_id,
        section_id: form.section_id,
        room_number: form.room_number,
        session_date: today,
        grace_period_minutes: parseInt(form.grace_period_minutes, 10),
      });
      const session = sessionRes.data;
      await sessionsAPI.start(session.id);
      toast.success('Session started!');
      router.push(`/live-attendance?session_id=${session.id}`);
    } catch {
      toast.error('Failed to start session. Please try again.');
      setLaunching(false);
    }
  };

  if (loading) return <div className="flex-1 flex items-center justify-center"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="flex flex-col flex-1">
      <FacultyHeader title="Session Setup" subtitle="Configure and launch a new class session" />
      <div className="p-6 max-w-2xl mx-auto w-full">
        <BentoCard title="Class Session Configuration">
          <div className="flex flex-col gap-5">
            <Select
              label="Subject"
              placeholder="Select a subject"
              options={subjects.map(s => ({ value: s.id, label: `${s.code} — ${s.name}` }))}
              value={form.subject_id}
              onChange={e => setForm(f => ({ ...f, subject_id: e.target.value, section_id: '' }))}
            />
            <Select
              label="Section"
              placeholder={form.subject_id ? 'Select section' : 'Select a subject first'}
              options={sections.map(s => ({ value: s.id, label: `Section ${s.section_name}${s.room_number ? ` · ${s.room_number}` : ''}` }))}
              value={form.section_id}
              onChange={e => setForm(f => ({ ...f, section_id: e.target.value }))}
              disabled={!form.subject_id || sections.length === 0}
            />
            <Input
              label="Room Number"
              placeholder="e.g., Lab 3B, Room 201"
              value={form.room_number}
              onChange={e => setForm(f => ({ ...f, room_number: e.target.value }))}
              icon="meeting_room"
            />
            <Input
              label="Grace Period (minutes)"
              type="number"
              min="0"
              max="60"
              value={form.grace_period_minutes}
              onChange={e => setForm(f => ({ ...f, grace_period_minutes: e.target.value }))}
              icon="timer"
            />

            <div className="p-4 bg-surface-container rounded-2xl text-sm text-on-surface-variant">
              <p className="font-semibold text-on-surface mb-2">Attendance Logic Preview</p>
              <p>• Arrived within <strong>{form.grace_period_minutes} minutes</strong> of session start → <span className="text-green-600 font-semibold">PRESENT</span></p>
              <p>• Arrived after <strong>{form.grace_period_minutes} minutes</strong> → <span className="text-amber-600 font-semibold">LATE</span></p>
              <p>• Recognition score ≥ 80% → Automatic marking</p>
              <p>• Score 60–79% → <span className="text-purple-600 font-semibold">VERIFY</span> (faculty confirmation required)</p>
            </div>

            <Button
              onClick={launch}
              loading={launching}
              disabled={!form.subject_id || !form.section_id}
              size="lg"
              icon="videocam"
              className="w-full mt-2"
            >
              Launch Classroom Mode
            </Button>
          </div>
        </BentoCard>
      </div>
    </div>
  );
}
