'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { FacultyHeader } from '@/components/layout/FacultyHeader';
import { BentoCard } from '@/components/ui/BentoCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { studentsAPI } from '@/lib/api';
import type { Student } from '@/types';
import toast from 'react-hot-toast';

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [addModal, setAddModal] = useState(false);
  const [adding, setAdding] = useState(false);
  const [importModal, setImportModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    student_id: '',
    roll_number: '',
    full_name: '',
    email: '',
    department: 'CSE Core',
    semester: '3',
    section: 'Section A'
  });

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await studentsAPI.list({ search, page, limit: 30 });
      setStudents(res.data.items || []);
      setTotal(res.data.total || 0);
    } catch {
      toast.error('Failed to load students roster');
    }
    setLoading(false);
  }, [search, page]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const handleAdd = async () => {
    setAdding(true);
    try {
      await studentsAPI.create({ ...form, semester: parseInt(form.semester, 10) });
      toast.success(`Student ${form.full_name} registered successfully!`);
      setAddModal(false);
      setForm({ student_id: '', roll_number: '', full_name: '', email: '', department: 'CSE Core', semester: '3', section: 'Section A' });
      fetchStudents();
    } catch {
      toast.error('Failed to add student. Ensure Student ID is unique.');
    }
    setAdding(false);
  };

  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setImporting(true);
    try {
      const res = await studentsAPI.importCSV(formData);
      toast.success(`Imported ${res.data.imported_count} students! (${res.data.skipped_duplicates_count} duplicates skipped)`);
      setImportModal(false);
      fetchStudents();
    } catch {
      toast.error('CSV import failed. Please verify column headers.');
    }
    setImporting(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="flex flex-col flex-1">
      <FacultyHeader
        title="Student & Face Registry"
        subtitle={`${total} students registered in CSE Core department`}
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" icon="upload_file" onClick={() => setImportModal(true)}>
              Import CSV
            </Button>
            <Button size="sm" icon="person_add" onClick={() => setAddModal(true)}>
              Add Student
            </Button>
          </div>
        }
      />

      <div className="p-6 flex flex-col gap-4">
        {/* Search & Filter bar */}
        <div className="flex gap-3 items-center justify-between flex-wrap">
          <Input
            placeholder="Search by name, student ID, or roll number..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            icon="search"
            className="max-w-md"
          />
          <span className="text-xs text-on-surface-variant font-medium">
            Attendance eligibility threshold: <strong className="text-green-700 font-bold">≥ 75%</strong>
          </span>
        </div>

        <BentoCard>
          {loading ? (
            <div className="flex justify-center py-16"><LoadingSpinner /></div>
          ) : students.length === 0 ? (
            <EmptyState
              icon="group"
              title="No students found"
              description="Register new students or import your class roster via CSV."
              action={<Button icon="person_add" onClick={() => setAddModal(true)}>Add Student</Button>}
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-outline-variant text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                      <th className="text-left py-3 px-3 first:pl-0">Student</th>
                      <th className="text-left py-3 px-3">Student ID</th>
                      <th className="text-left py-3 px-3">Roll No</th>
                      <th className="text-left py-3 px-3">Section</th>
                      <th className="text-left py-3 px-3">Face Status</th>
                      <th className="text-left py-3 px-3">Overall Att.</th>
                      <th className="text-left py-3 px-3">Last Attendance</th>
                      <th className="text-right py-3 px-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/50">
                    {students.map(s => {
                      const att = s.overall_attendance ?? 0;
                      const isEligible = att >= 75;

                      return (
                        <tr key={s.id} className="hover:bg-surface-container/30 transition-colors">
                          <td className="py-3 px-3 first:pl-0">
                            <div className="flex items-center gap-2.5">
                              <Avatar name={s.full_name} size="sm" />
                              <div>
                                <Link
                                  href={`/students/${s.id}`}
                                  className="font-semibold text-on-surface hover:text-primary transition-colors hover:underline"
                                >
                                  {s.full_name}
                                </Link>
                                <p className="text-[11px] text-on-surface-variant">{s.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3 font-mono text-xs font-semibold text-primary">{s.student_id}</td>
                          <td className="py-3 px-3 font-mono text-xs text-on-surface-variant">{s.roll_number}</td>
                          <td className="py-3 px-3 text-xs text-on-surface-variant">{s.section}</td>
                          <td className="py-3 px-3">
                            <span className={`text-xs font-semibold flex items-center gap-1 ${s.face_enrolled ? 'text-green-700' : 'text-amber-700'}`}>
                              <span className="material-symbols-outlined text-sm">
                                {s.face_enrolled ? 'check_circle' : 'pending'}
                              </span>
                              {s.face_enrolled ? `${s.face_sample_count || 3}/3 Enrolled` : 'Not Enrolled'}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span className={`font-bold text-xs px-2 py-0.5 rounded-md ${
                              isEligible ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {att.toFixed(1)}%
                            </span>
                          </td>
                          <td className="py-3 px-3 text-xs text-on-surface-variant">
                            {s.last_attendance || '—'}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Link href={`/students/${s.id}`} title="View Student Profile">
                                <Button size="sm" variant="ghost" icon="visibility">Profile</Button>
                              </Link>
                              <Link href={`/face-registration?student_id=${s.id}`} title="Register Face">
                                <Button size="sm" variant="secondary" icon="face">
                                  {s.face_enrolled ? 'Update' : 'Enroll'}
                                </Button>
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-outline-variant">
                <p className="text-xs text-on-surface-variant">
                  Showing {students.length} of {total} registered students
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                    Previous
                  </Button>
                  <Button variant="outline" size="sm" disabled={students.length < 30} onClick={() => setPage(p => p + 1)}>
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </BentoCard>
      </div>

      {/* Add Student Modal */}
      <Modal open={addModal} onClose={() => setAddModal(false)} title="Register New Student" size="md">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Full Name" placeholder="Ankan Haldar" value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} required />
            <Input label="Email" type="email" placeholder="ankan.haldar@university.edu" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
            <Input label="Student ID" placeholder="CSE301" value={form.student_id} onChange={e => setForm(f => ({ ...f, student_id: e.target.value }))} required />
            <Input label="Roll Number" placeholder="CS3A-01" value={form.roll_number} onChange={e => setForm(f => ({ ...f, roll_number: e.target.value }))} required />
            <Input label="Department" placeholder="CSE Core" value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} />
            <Input label="Semester" type="number" min="1" max="8" value={form.semester} onChange={e => setForm(f => ({ ...f, semester: e.target.value }))} />
            <Input label="Section" placeholder="Section A" value={form.section} onChange={e => setForm(f => ({ ...f, section: e.target.value }))} />
          </div>
          <div className="flex gap-3 mt-2">
            <Button variant="outline" onClick={() => setAddModal(false)} className="flex-1">Cancel</Button>
            <Button loading={adding} onClick={handleAdd} className="flex-1">Save Student</Button>
          </div>
        </div>
      </Modal>

      {/* CSV Import Modal */}
      <Modal open={importModal} onClose={() => setImportModal(false)} title="Import Class Roster CSV" size="md">
        <div className="flex flex-col gap-4">
          <p className="text-xs text-on-surface-variant leading-relaxed">
            Upload a CSV file containing your student roster. The system automatically maps columns and skips duplicate Student IDs.
          </p>
          <div className="p-3 bg-surface-container rounded-xl text-xs font-mono text-on-surface-variant">
            Required headers: Student ID, Name, Roll Number, Email, Department, Semester, Section
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleCSVUpload}
            disabled={importing}
            className="block w-full text-sm text-on-surface-variant file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary/90 cursor-pointer"
          />
          {importing && <LoadingSpinner size="sm" text="Importing students..." />}
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => setImportModal(false)}>Close</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
