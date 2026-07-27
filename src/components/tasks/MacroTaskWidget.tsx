'use client';

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Trash2, Pin, Plus } from 'lucide-react';
import { StoredTask, TaskPriority } from '@/lib/task-storage';
import { TaskCard } from './TaskCard';

interface MacroTaskWidgetProps {
  macroTask: StoredTask;
  onToggleSubtask: (id: string) => void;
  onDeleteSubtask: (id: string) => void;
  onAddSubtask: (parentId: string, title: string, priority: TaskPriority) => void;
  onDeleteMacro: (id: string) => void;
  onTogglePinMacro: (id: string, currentPinned: boolean) => void;
}

export function MacroTaskWidget({
  macroTask,
  onToggleSubtask,
  onDeleteSubtask,
  onAddSubtask,
  onDeleteMacro,
  onTogglePinMacro,
}: MacroTaskWidgetProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [subtaskTitle, setSubtaskTitle] = useState('');
  const [subtaskPriority, setSubtaskPriority] = useState<TaskPriority>('MEDIUM');

  const subtasks = macroTask.subtasks || [];
  const completedCount = subtasks.filter((t) => t.status === 'DONE').length;
  const totalCount = subtasks.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const handleSubmitSubtask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subtaskTitle.trim()) return;
    onAddSubtask(macroTask.id, subtaskTitle.trim(), subtaskPriority);
    setSubtaskTitle('');
    setSubtaskPriority('MEDIUM');
  };

  const getPriorityBorder = (priority: string) => {
    switch (priority) {
      case 'CRITICAL':
        return 'border-[#FF3D00]';
      case 'HIGH':
        return 'border-[#F59E0B]';
      case 'MEDIUM':
        return 'border-[#737373]';
      default:
        return 'border-[#262626]';
    }
  };

  const isOverdue = () => {
    if (!macroTask.dueAt || macroTask.status === 'DONE') return false;
    const now = new Date();
    const due = new Date(macroTask.dueAt);
    const isToday = due.toDateString() === now.toDateString();
    return due < now && !isToday;
  };

  return (
    <div
      className={`bg-[#0F0F0F] border p-5 relative flex flex-col justify-between transition-all ${
        isOverdue()
          ? 'border-[#FF3D00] animate-pulse shadow-[0_0_15px_rgba(255,61,0,0.15)]'
          : 'border-[#262626]'
      }`}
    >
      {/* Top Vermillion accent bar */}
      <div className="h-1 w-12 bg-[#FF3D00] absolute top-0 left-0" />

      {/* Header Info */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-[9px] uppercase tracking-wider text-[#737373]">
              Macro Objective
            </span>
            {macroTask.priority === 'CRITICAL' && (
              <span className="px-1.5 py-0.5 bg-[#FF3D00]/10 border border-[#FF3D00]/30 text-[8px] font-mono uppercase tracking-widest text-[#FF3D00]">
                CRITICAL
              </span>
            )}
          </div>
          <h3 className="font-sans font-black text-lg text-[#FAFAFA] tracking-tight leading-tight">
            {macroTask.title}
          </h3>
          {macroTask.description && (
            <p className="text-xs text-[#737373] mt-1 font-mono">{macroTask.description}</p>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onTogglePinMacro(macroTask.id, macroTask.isPinned)}
            className={`p-1 border transition-colors ${
              macroTask.isPinned
                ? 'border-[#FF3D00] text-[#FF3D00]'
                : 'border-[#262626] text-[#737373] hover:text-[#FAFAFA] hover:border-[#FAFAFA]'
            }`}
            title={macroTask.isPinned ? 'Unpin Objective' : 'Pin Objective'}
          >
            <Pin className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDeleteMacro(macroTask.id)}
            className="p-1 border border-[#262626] text-[#737373] hover:text-[#ef4444] hover:border-[#ef4444] transition-colors"
            title="Delete Objective"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 border border-[#262626] text-[#737373] hover:text-[#FAFAFA] hover:border-[#FAFAFA] transition-colors"
          >
            {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Progress Section */}
      <div className="space-y-2 mb-4">
        <div className="flex justify-between items-center font-mono text-[10px]">
          <span className="text-[#737373] uppercase tracking-wider">Progress</span>
          <span className="text-[#FAFAFA] font-bold">
            {completedCount} / {totalCount} Subtasks ({progressPercent}%)
          </span>
        </div>
        <div className="h-1.5 w-full bg-[#1A1A1A] relative overflow-hidden">
          <div
            className="h-full bg-[#FF3D00] transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Nested checklist list */}
      {!isCollapsed && (
        <div className="space-y-1 mb-4 border-t border-[#1A1A1A] pt-3">
          {subtasks.length === 0 ? (
            <div className="text-center py-4 text-[10px] font-mono text-[#737373] border border-dashed border-[#262626] uppercase tracking-wider">
              No Subtasks Assigned
            </div>
          ) : (
            subtasks.map((sub) => (
              <TaskCard
                key={sub.id}
                task={sub}
                onToggle={onToggleSubtask}
                onDelete={onDeleteSubtask}
              />
            ))
          )}
        </div>
      )}

      {/* Inline subtask creation form */}
      {!isCollapsed && (
        <form onSubmit={handleSubmitSubtask} className="flex gap-2 items-center">
          <input
            type="text"
            value={subtaskTitle}
            onChange={(e) => setSubtaskTitle(e.target.value)}
            placeholder="Add a micro subtask..."
            className="flex-1 bg-[#1A1A1A] border border-[#262626] focus:border-[#FF3D00] text-xs font-mono text-[#FAFAFA] px-2 py-1.5 focus:outline-none"
          />

          <select
            value={subtaskPriority}
            onChange={(e) => setSubtaskPriority(e.target.value as TaskPriority)}
            className="bg-[#1A1A1A] border border-[#262626] focus:border-[#FF3D00] text-[10px] font-mono text-[#FAFAFA] px-1.5 py-1.5 focus:outline-none"
          >
            <option value="LOW">LOW</option>
            <option value="MEDIUM">MED</option>
            <option value="HIGH">HIGH</option>
            <option value="CRITICAL">CRIT</option>
          </select>

          <button
            type="submit"
            disabled={!subtaskTitle.trim()}
            className={`p-1.5 transition-colors border ${
              subtaskTitle.trim()
                ? 'border-[#FF3D00] text-[#FF3D00] hover:bg-[#FF3D00]/10'
                : 'border-[#262626] text-[#737373] cursor-not-allowed'
            }`}
            title="Add Subtask"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </form>
      )}
    </div>
  );
}
