'use client';
import { AuthProvider } from '@/lib/auth';
import { FacultySidebar } from '@/components/layout/FacultySidebar';
import { Toaster } from 'react-hot-toast';

export default function FacultyLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <div className="flex min-h-screen bg-background">
        <FacultySidebar />
        <main className="flex-1 ml-64 flex flex-col min-h-screen">
          {children}
        </main>
      </div>
      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: '#fff', border: '1px solid #C7C4D8', color: '#0B1C30', borderRadius: '12px' },
          success: { iconTheme: { primary: '#16A34A', secondary: '#fff' } },
          error: { iconTheme: { primary: '#BA1A1A', secondary: '#fff' } },
        }}
      />
    </AuthProvider>
  );
}