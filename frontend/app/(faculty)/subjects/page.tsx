'use client';
import { useEffect, useState } from 'react';
import { FacultyHeader } from '@/components/layout/FacultyHeader';
import { BentoCard } from '@/components/ui/BentoCard';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { subjectsAPI } from '@/lib/api';
import type { Subject } from '@/types';
import toast from 'react-hot-toast';

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ code: '', name: '', department: 'CS', semester: '3', credits: '4' });

  const fetchSubjects = async () => {
    setLoading(true);
    try { const r = await subjectsAPI.list(); setSubjects(r.data); } catch { }
    setLoading(false);
  };

  useEffect(() => { fetchSubjects(); }, []);

  const handleAdd = async () => {
    setSaving(true);
    try {
      await subjectsAPI.create({ ...form, semester: parseInt(form.semester), credits: parseInt(form.credits) });
      toast.success('Subject added'); setModal(false); fetchSubjects();
    } catch { toast.error('Failed to add subject'); }
    setSaving(false);
  };

  return (
    <div className="flex flex-col flex-1">
      <FacultyHeader
        title="Subjects"
        subtitle={`${subjects.length} subjects configured`}
        actions={<Button size="sm" icon="add" onClick={() => setModal(true)}>Add Subject</Button>}
      />
      <div className="p-6">
        <BentoCard>
          {loading ? <div className="flex justify-center py-12"><LoadingSpinner /></div> : subjects.length === 0 ? (
            <EmptyState icon="menu_book" title="No subjects yet" action={<Button icon="add" onClick={() => setModal(true)}>Add Subject</Button>} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-outline-variant">
                    {['Code', 'Name', 'Department', 'Semester', 'Credits'].map(h => (
                      <th key={h} className="text-left py-3 px-3 text-xs font-semibold text-on-surface-variant uppercase first:pl-0">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {subjects.map(s => (
                    <tr key={s.id} className="border-b border-outline-variant/50 hover:bg-surface-container/50 transition-colors">
                      <td className="py-3 px-3 first:pl-0 font-mono font-bold text-primary">{s.code}</td>
                      <td className="py-3 px-3 font-semibold text-on-surface">{s.name}</td>
                      <td className="py-3 px-3 text-on-surface-variant">{s.department}</td>
                      <td className="py-3 px-3 text-on-surface-variant">{s.semester}</td>
                      <td className="py-3 px-3 text-on-surface-variant">{s.credits}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </BentoCard>
      </div>
      <Modal open={modal} onClose={() => setModal(false)} title="Add Subject" size="sm">
        <div className="flex flex-col gap-4">
          <Input label="Subject Code" placeholder="CS-301" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} />
          <Input label="Subject Name" placeholder="Data Structures" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <Input label="Department" value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Semester" type="number" min="1" max="8" value={form.semester} onChange={e => setForm(f => ({ ...f, semester: e.target.value }))} />
            <Input label="Credits" type="number" min="1" max="6" value={form.credits} onChange={e => setForm(f => ({ ...f, credits: e.target.value }))} />
          </div>
          <div className="flex gap-3 mt-2">
            <Button variant="outline" onClick={() => setModal(false)} className="flex-1">Cancel</Button>
            <Button loading={saving} onClick={handleAdd} className="flex-1">Add Subject</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
