'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Bell, Clock, AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';

export interface TimelineItem {
  id: string;
  type: 'NOTE_REMINDER' | 'CANVAS_DEADLINE';
  title: string;
  urgency: 'OVERDUE' | 'DUE_TODAY' | 'UPCOMING';
  deadlineAt: string;
  sourceId: string;
  sourceUrl: string;
}

interface UrgencyTimelineProps {
  initialItems: TimelineItem[];
}

export function UrgencyTimeline({ initialItems }: UrgencyTimelineProps) {
  const [items, setItems] = useState<TimelineItem[]>(initialItems);

  const handleSnooze = async (itemId: string, offsetHours: number) => {
    try {
      const offsetMs = offsetHours * 60 * 60 * 1000;
      const nextReminderDate = new Date(Date.now() + offsetMs).toISOString();

      const res = await fetch(`/api/notes/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reminderAt: nextReminderDate,
        }),
      });

      if (res.ok) {
        // Optimistically update item in list or remove it if it shifts position
        // We'll update the item state, re-categorize it, and resort
        setItems((prev) => {
          const updated = prev.map((item) => {
            if (item.id === itemId) {
              const now = new Date();
              const reminderDate = new Date(nextReminderDate);
              const isToday = reminderDate.toDateString() === now.toDateString();
              const isOverdue = reminderDate < now && !isToday;

              let urgency: 'OVERDUE' | 'DUE_TODAY' | 'UPCOMING' = 'UPCOMING';
              if (isToday) {
                urgency = 'DUE_TODAY';
              } else if (isOverdue) {
                urgency = 'OVERDUE';
              }

              return {
                ...item,
                urgency,
                deadlineAt: nextReminderDate,
              };
            }
            return item;
          });

          // Sort again
          const urgencyWeight = { OVERDUE: 0, DUE_TODAY: 1, UPCOMING: 2 };
          return [...updated].sort((a, b) => {
            if (urgencyWeight[a.urgency] !== urgencyWeight[b.urgency]) {
              return urgencyWeight[a.urgency] - urgencyWeight[b.urgency];
            }
            return new Date(a.deadlineAt).getTime() - new Date(b.deadlineAt).getTime();
          });
        });
      } else {
        alert('Failed to snooze reminder.');
      }
    } catch (err) {
      console.error('Error snoozing timeline item:', err);
    }
  };

  const handleComplete = async (itemId: string) => {
    try {
      const res = await fetch(`/api/notes/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reminderAt: null, // clear the reminder
        }),
      });

      if (res.ok) {
        // Remove item from active timeline list
        setItems((prev) => prev.filter((item) => item.id !== itemId));
      } else {
        alert('Failed to complete item.');
      }
    } catch (err) {
      console.error('Error completing item:', err);
    }
  };

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case 'OVERDUE':
        return <AlertTriangle className="w-4 h-4 text-[#FF3D00]" />;
      case 'DUE_TODAY':
        return <Clock className="w-4 h-4 text-[#F59E0B]" />;
      default:
        return <Bell className="w-4 h-4 text-[#737373]" />;
    }
  };

  const formatDate = (dateStr: string, urgency: string) => {
    const d = new Date(dateStr);
    if (urgency === 'DUE_TODAY') {
      return `Today at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    return d.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
  };

  return (
    <div className="bg-[#0F0F0F] border border-[#262626] p-6 relative flex flex-col font-sans h-full">
      <div className="h-1 w-12 bg-[#FF3D00] absolute top-0 left-0" />
      <div className="flex items-center justify-between text-[#737373] mb-4">
        <span className="font-mono text-xs uppercase tracking-wider">Urgency Timeline</span>
        <Clock className="w-4 h-4 text-[#FF3D00]" />
      </div>

      {items.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-12 text-center text-xs font-mono text-[#737373] border border-dashed border-[#262626]">
          <CheckCircle2 className="w-6 h-6 text-[#10b981] mb-2" />
          <span>Timeline clear. No active deadlines.</span>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[360px] no-scrollbar">
          {items.map((item) => (
            <div
              key={item.id}
              className={`bg-[#0A0A0A] border p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative transition-all group ${
                item.urgency === 'OVERDUE'
                  ? 'border-[#FF3D00]/50 border-l-4 border-l-[#FF3D00] animate-pulse'
                  : item.urgency === 'DUE_TODAY'
                  ? 'border-[#F59E0B]/50 border-l-4 border-l-[#F59E0B]'
                  : 'border-[#262626] border-l-4 border-l-[#737373]'
              }`}
            >
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 shrink-0">{getUrgencyIcon(item.urgency)}</span>
                <div>
                  <h4 className="font-sans font-bold text-xs sm:text-sm text-[#FAFAFA] line-clamp-1">
                    {item.title}
                  </h4>
                  <span className="font-mono text-[9px] uppercase tracking-wider text-[#737373] block mt-0.5">
                    {formatDate(item.deadlineAt, item.urgency)}
                  </span>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex items-center gap-2 font-mono text-[10px] shrink-0 self-end sm:self-auto">
                {/* Check off */}
                <button
                  onClick={() => handleComplete(item.id)}
                  className="px-2 py-1 bg-[#10b981]/10 border border-[#10b981]/30 hover:bg-[#10b981] hover:text-[#0A0A0A] text-[#10b981] transition-colors"
                  title="Mark as done"
                >
                  Done
                </button>

                {/* Snooze Options */}
                <div className="flex items-center gap-1">
                  <span className="text-[#737373] mr-1">Snooze:</span>
                  <button
                    onClick={() => handleSnooze(item.id, 1)}
                    className="px-1.5 py-0.5 border border-[#262626] hover:border-[#FF3D00] text-[#737373] hover:text-[#FAFAFA] transition-colors"
                  >
                    +1h
                  </button>
                  <button
                    onClick={() => handleSnooze(item.id, 24)}
                    className="px-1.5 py-0.5 border border-[#262626] hover:border-[#FF3D00] text-[#737373] hover:text-[#FAFAFA] transition-colors"
                  >
                    +1d
                  </button>
                  <button
                    onClick={() => handleSnooze(item.id, 168)}
                    className="px-1.5 py-0.5 border border-[#262626] hover:border-[#FF3D00] text-[#737373] hover:text-[#FAFAFA] transition-colors"
                  >
                    +1w
                  </button>
                </div>

                {/* Link out */}
                <Link
                  href={item.sourceUrl}
                  className="p-1 border border-[#262626] hover:border-[#FF3D00] text-[#737373] hover:text-[#FF3D00] transition-colors ml-1"
                  title="Jump to note"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
