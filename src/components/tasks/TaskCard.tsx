'use client';

import React from 'react';
import { Timer, Trash2, Clock } from 'lucide-react';
import { StoredTask } from '@/lib/task-storage';
import { usePomodoro } from '@/contexts/PomodoroContext';

interface TaskCardProps {
  task: StoredTask;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

export function TaskCard({ task, onToggle, onDelete }: TaskCardProps) {
  const { startFocus, state: pomodoroState } = usePomodoro();
  const isDone = task.status === 'DONE';
  const isTimerLinked = pomodoroState.linkedTaskId === task.id && pomodoroState.isRunning;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL':
        return 'bg-[#FF3D00]';
      case 'HIGH':
        return 'bg-[#F59E0B]';
      case 'MEDIUM':
        return 'bg-[#737373]';
      default:
        return 'bg-[#262626] border border-[#737373]';
    }
  };

  const getDueStatus = () => {
    if (!task.dueAt) return null;
    const now = new Date();
    const due = new Date(task.dueAt);
    const isToday = due.toDateString() === now.toDateString();
    
    if (due < now && !isToday) {
      return { text: 'Overdue', color: 'text-[#FF3D00]' };
    }
    if (isToday) {
      return { text: 'Today', color: 'text-[#F59E0B]' };
    }
    return { text: due.toLocaleDateString(), color: 'text-[#737373]' };
  };

  const dueStatus = getDueStatus();

  return (
    <div className="flex items-center justify-between py-2 border-b border-[#1A1A1A] last:border-b-0 hover:bg-[#0F0F0F]/50 px-2 transition-colors group">
      <div className="flex items-center gap-3 min-w-0">
        {/* Toggle Checkbox */}
        <button
          onClick={() => onToggle(task.id)}
          className={`w-4 h-4 border flex items-center justify-center transition-all ${
            isDone
              ? 'border-[#FF3D00] bg-[#FF3D00] text-[#0A0A0A]'
              : 'border-[#262626] hover:border-[#FF3D00]'
          }`}
        >
          {isDone && (
            <svg
              className="w-3.5 h-3.5 stroke-[2.5]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </button>

        {/* Title */}
        <span
          className={`text-xs font-mono truncate transition-all ${
            isDone ? 'line-through text-[#737373]' : 'text-[#FAFAFA]'
          }`}
        >
          {task.title}
        </span>

        {/* Priority dot */}
        <div
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${getPriorityColor(task.priority)}`}
          title={`${task.priority} Priority`}
        />

        {/* Due date chip */}
        {dueStatus && (
          <span className={`font-mono text-[9px] uppercase tracking-wider flex items-center gap-1 ${dueStatus.color}`}>
            <Clock className="w-2.5 h-2.5" />
            <span>{dueStatus.text}</span>
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Start Focus Timer */}
        {!isDone && (
          <button
            onClick={() => startFocus(task.id, task.title)}
            className={`p-1 border transition-colors ${
              isTimerLinked
                ? 'border-[#FF3D00] text-[#FF3D00] bg-[#FF3D00]/10'
                : 'border-[#262626] text-[#737373] hover:text-[#FF3D00] hover:border-[#FF3D00]'
            }`}
            title="Start Focus Timer"
          >
            <Timer className="w-3 h-3" />
          </button>
        )}

        {/* Delete button */}
        <button
          onClick={() => onDelete(task.id)}
          className="p-1 border border-[#262626] text-[#737373] hover:text-[#ef4444] hover:border-[#ef4444] transition-colors"
          title="Delete subtask"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
