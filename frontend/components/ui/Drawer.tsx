'use client';
import { type ReactNode } from 'react';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  width?: string;
}

export function Drawer({ open, onClose, title, children, width = 'w-[420px]' }: DrawerProps) {
  return (
    <>
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
          <div className={`relative ${width} h-full bg-white shadow-2xl flex flex-col animate-slide-in`}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant flex-shrink-0">
              {title && <h2 className="text-lg font-semibold text-on-surface">{title}</h2>}
              <button
                onClick={onClose}
                className="ml-auto w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-container text-on-surface-variant transition-colors"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">{children}</div>
          </div>
        </div>
      )}
    </>
  );
}
