'use client';

import React, { useState } from 'react';
import { AlarmClock, X, Check } from 'lucide-react';

interface ReminderModalProps {
  isOpen: boolean;
  nodeId: string | null;
  nodeLabel: string;
  onClose: () => void;
  onConfirm: (nodeId: string, reminderAt: string) => Promise<void>;
}

export function ReminderModal({ isOpen, nodeId, nodeLabel, onClose, onConfirm }: ReminderModalProps) {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('09:00');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !nodeId) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) return;

    setIsSubmitting(true);
    try {
      const dateTimeString = `${date}T${time}:00`;
      await onConfirm(nodeId, dateTimeString);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-[#0F0F0F] border border-[#FF3D00] p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#737373] hover:text-[#FAFAFA] transition-colors"
        >
          <X className="w-5 h-5 stroke-[1.5]" />
        </button>

        <div className="flex items-center gap-2 text-[#FF3D00] mb-4">
          <AlarmClock className="w-5 h-5 stroke-[1.5]" />
          <span className="font-mono text-xs uppercase tracking-wider font-semibold">Set Node Reminder</span>
        </div>

        <h3 className="font-sans text-xl font-bold text-[#FAFAFA] mb-6 tracking-tight line-clamp-2">
          {nodeLabel}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-[#737373] mb-1">
              Reminder Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full bg-[#1A1A1A] border border-[#262626] px-4 py-3 text-sm text-[#FAFAFA] focus:outline-none focus:border-[#FF3D00]"
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-[#737373] mb-1">
              Reminder Time
            </label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
              className="w-full bg-[#1A1A1A] border border-[#262626] px-4 py-3 text-sm text-[#FAFAFA] focus:outline-none focus:border-[#FF3D00]"
            />
          </div>

          <div className="pt-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-mono uppercase tracking-wider text-[#737373] hover:text-[#FAFAFA]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !date}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#FF3D00] text-[#0A0A0A] font-mono text-xs uppercase tracking-wider font-bold hover:bg-[#FAFAFA] transition-colors disabled:opacity-50"
            >
              <Check className="w-4 h-4 stroke-[2]" />
              <span>Schedule Notification</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
