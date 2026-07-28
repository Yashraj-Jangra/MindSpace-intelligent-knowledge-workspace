'use client';

import React from 'react';
import { Calendar, CheckSquare, Bell, Clock, Repeat } from 'lucide-react';

interface CalendarEventCardProps {
  event: {
    id: string;
    title: string;
    description?: string | null;
    startAt: string;
    endAt?: string | null;
    color: string;
    sourceType: 'EVENT' | 'TASK' | 'NOTE';
    sourceId?: string | null;
    isAllDay?: boolean;
    location?: string | null;
    recurrence?: string;
    priority?: string;
    status?: string;
  };
  onClick: () => void;
}

export function CalendarEventCard({ event, onClick }: CalendarEventCardProps) {
  const startDate = new Date(event.startAt);
  const timeStr = event.isAllDay
    ? 'All Day'
    : startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const handleDragStart = (e: React.DragEvent) => {
    e.stopPropagation();
    e.dataTransfer.setData(
      'text/plain',
      JSON.stringify({
        id: event.id,
        sourceType: event.sourceType,
        sourceId: event.sourceId,
        startAt: event.startAt,
      })
    );
  };

  const getIcon = () => {
    if (event.sourceType === 'TASK') return <CheckSquare className="w-3 h-3 text-[#10B981]" />;
    if (event.sourceType === 'NOTE') return <Bell className="w-3 h-3 text-[#FF3D00]" />;
    return <Calendar className="w-3 h-3 text-[#4285F4]" />;
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="group relative cursor-grab active:cursor-grabbing select-none bg-[#0F0F0F] hover:bg-[#1A1A1A] border border-[#262626] p-2 transition-all duration-150 mb-1.5 overflow-hidden"
      style={{ borderLeftWidth: '3px', borderLeftColor: event.color }}
    >
      <div className="flex items-center justify-between gap-1 mb-1">
        <div className="flex items-center gap-1.5 min-w-0">
          {getIcon()}
          <span className="font-mono text-[10px] uppercase text-[#737373] tracking-wider truncate">
            {timeStr}
          </span>
        </div>
        {event.recurrence && event.recurrence !== 'NONE' && (
          <Repeat className="w-2.5 h-2.5 text-[#8B5CF6] shrink-0" />
        )}
      </div>

      <div className="font-semibold text-xs text-[#FAFAFA] line-clamp-1 group-hover:text-white">
        {event.title}
      </div>

      {event.sourceType === 'TASK' && event.priority && (
        <div className="mt-1 flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider">
          <span
            className={`px-1 py-0.2 border ${
              event.priority === 'CRITICAL'
                ? 'border-[#FF3D00] text-[#FF3D00] bg-[#FF3D00]/10 animate-pulse'
                : 'border-[#262626] text-[#737373]'
            }`}
          >
            {event.priority}
          </span>
        </div>
      )}
    </div>
  );
}
