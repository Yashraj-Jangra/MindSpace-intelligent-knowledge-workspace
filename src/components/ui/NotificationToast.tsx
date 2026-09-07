'use client';

import React from 'react';
import { BellRing, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  title: string;
  message: string;
  scheduledFor: string;
}

interface NotificationToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export function NotificationToast({ toasts, onDismiss }: NotificationToastProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="bg-[#0F0F0F] border-2 border-[#FF3D00] p-4 text-[#FAFAFA] relative animate-in slide-in-from-bottom duration-200"
        >
          <button
            onClick={() => onDismiss(t.id)}
            className="absolute top-3 right-3 text-[#737373] hover:text-[#FAFAFA] transition-colors"
          >
            <X className="w-4 h-4 stroke-[1.5]" />
          </button>

          <div className="flex items-start gap-3">
            <div className="p-2 bg-[#FF3D00]/10 border border-[#FF3D00] text-[#FF3D00]">
              <BellRing className="w-5 h-5 stroke-[1.5]" />
            </div>

            <div className="flex-1 pr-4">
              <span className="font-mono text-[10px] uppercase tracking-widest text-[#FF3D00]">
                REMINDER DUE
              </span>
              <h4 className="font-sans font-bold text-sm text-[#FAFAFA] mt-0.5 mb-1 tracking-tight">
                {t.title}
              </h4>
              <p className="text-xs text-[#737373] font-sans line-clamp-2">{t.message}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
