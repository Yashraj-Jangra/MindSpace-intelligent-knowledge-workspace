'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { AppHeader } from '@/components/navigation/AppHeader';
import { MacroTaskWidget } from '@/components/tasks/MacroTaskWidget';
import { StoredTask, TaskStatus, TaskPriority } from '@/lib/task-storage';
import { ListTodo, Plus, Search, ShieldAlert } from 'lucide-react';

export default function TasksPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();

  const [tasks, setTasks] = useState<StoredTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'DONE' | 'CRITICAL'>('ALL');
  const [search, setSearch] = useState('');

  // Macro creation form
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState<TaskPriority>('MEDIUM');
  const [newDueAt, setNewDueAt] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push('/login');
    }
  }, [user, isAuthLoading, router]);

  const loadTasks = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/tasks');
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
      }
    } catch (err) {
      console.error('Error fetching tasks:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadTasks();
    }
  }, [user]);

  if (isAuthLoading || !user) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-[#FAFAFA] flex items-center justify-center font-mono text-xs uppercase tracking-widest">
        Loading Session...
      </div>
    );
  }

  const handleCreateMacro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDesc.trim() || null,
          priority: newPriority,
          dueAt: newDueAt || null,
        }),
      });

      if (res.ok) {
        setNewTitle('');
        setNewDesc('');
        setNewPriority('MEDIUM');
        setNewDueAt('');
        setIsFormOpen(false);
        await loadTasks();
      }
    } catch (err) {
      console.error('Error creating macro task:', err);
    }
  };

  const handleToggleSubtask = async (id: string) => {
    const subtask = findSubtask(id);
    if (!subtask) return;

    const nextStatus: TaskStatus = subtask.status === 'DONE' ? 'TODO' : 'DONE';

    try {
      // Optimistic update
      setTasks((prev) =>
        prev.map((macro) => {
          if (macro.subtasks) {
            const hasSub = macro.subtasks.some((s) => s.id === id);
            if (hasSub) {
              const nextSubs = macro.subtasks.map((s) =>
                s.id === id ? { ...s, status: nextStatus } : s
              );
              // Recalculate macro progress status
              const completed = nextSubs.filter((s) => s.status === 'DONE').length;
              let macroStatus: TaskStatus = macro.status;
              if (completed === nextSubs.length) {
                macroStatus = 'DONE';
              } else if (completed > 0) {
                macroStatus = 'IN_PROGRESS';
              } else {
                macroStatus = 'TODO';
              }
              return { ...macro, status: macroStatus, subtasks: nextSubs };
            }
          }
          return macro;
        })
      );

      // Hit API complete endpoint if checked done, else use patch
      const url = nextStatus === 'DONE' ? `/api/tasks/${id}/complete` : `/api/tasks/${id}`;
      const method = nextStatus === 'DONE' ? 'POST' : 'PATCH';
      const body = nextStatus === 'DONE' ? {} : { status: 'TODO' };

      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      // Reload tasks in background to ensure correct sync
      const res = await fetch('/api/tasks');
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
      }
    } catch (err) {
      console.error('Error toggling task:', err);
    }
  };

  const handleAddSubtask = async (parentId: string, title: string, priority: TaskPriority) => {
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          parentId,
          priority,
        }),
      });

      if (res.ok) {
        await loadTasks();
      }
    } catch (err) {
      console.error('Error adding subtask:', err);
    }
  };

  const handleDeleteSubtask = async (id: string) => {
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await loadTasks();
      }
    } catch (err) {
      console.error('Error deleting subtask:', err);
    }
  };

  const handleDeleteMacro = async (id: string) => {
    if (!confirm('Are you sure you want to delete this macro objective and all its subtasks?')) return;

    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setTasks((prev) => prev.filter((t) => t.id !== id));
      }
    } catch (err) {
      console.error('Error deleting macro task:', err);
    }
  };

  const handleTogglePinMacro = async (id: string, currentPinned: boolean) => {
    try {
      // Optimistic update
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, isPinned: !currentPinned } : t))
      );

      await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isPinned: !currentPinned,
        }),
      });
    } catch (err) {
      console.error('Error toggling pin:', err);
    }
  };

  const findSubtask = (id: string): StoredTask | undefined => {
    for (const macro of tasks) {
      const sub = macro.subtasks?.find((s) => s.id === id);
      if (sub) return sub;
    }
    return undefined;
  };

  // Filtering and Searching
  const filteredTasks = tasks.filter((macro) => {
    const matchesSearch =
      macro.title.toLowerCase().includes(search.toLowerCase()) ||
      (macro.description && macro.description.toLowerCase().includes(search.toLowerCase()));

    if (!matchesSearch) return false;

    if (filter === 'ACTIVE') {
      return macro.status !== 'DONE';
    }
    if (filter === 'DONE') {
      return macro.status === 'DONE';
    }
    if (filter === 'CRITICAL') {
      return macro.priority === 'CRITICAL' && macro.status !== 'DONE';
    }
    return true;
  });

  return (
    <div className="min-h-screen w-full bg-[#0A0A0A] text-[#FAFAFA] flex flex-col font-sans">
      <AppHeader
        title="Tasks Engine"
        actions={
          <button
            onClick={() => setIsFormOpen(!isFormOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FF3D00] text-[#0A0A0A] font-mono text-xs uppercase font-bold hover:bg-[#FF5722] transition-colors"
          >
            <Plus className="w-4 h-4 stroke-[2]" />
            <span className="hidden sm:inline">New Macro Objective</span>
          </button>
        }
      />

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-8 space-y-6 sm:space-y-8">
        
        {/* Title Bar */}
        <section className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pb-4 border-b border-[#262626]">
          <div>
            <span className="font-mono text-[9px] uppercase tracking-widest text-[#FF3D00] block mb-1">
              Objectives & Execution
            </span>
            <h2 className="font-sans font-black text-2xl sm:text-4xl tracking-tighter uppercase text-[#FAFAFA]">
              Task System
            </h2>
          </div>

          <button
            onClick={() => setIsFormOpen(!isFormOpen)}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#FF3D00] hover:bg-[#FAFAFA] text-[#0A0A0A] font-mono text-xs uppercase font-bold tracking-wider transition-colors shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[2]" />
            <span>{isFormOpen ? 'Close Panel' : 'New Objective'}</span>
          </button>
        </section>

        {/* Creation Panel */}
        {isFormOpen && (
          <form onSubmit={handleCreateMacro} className="bg-[#0F0F0F] border border-[#FF3D00] p-6 relative space-y-4">
            <div className="h-1 w-12 bg-[#FF3D00] absolute top-0 left-0" />
            <h3 className="font-mono text-xs uppercase text-[#FF3D00] font-bold">New Macro Objective</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="font-mono text-[10px] uppercase text-[#737373] block">Objective Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Launch Beta Site"
                  className="w-full bg-[#1A1A1A] border border-[#262626] focus:border-[#FF3D00] text-xs font-mono text-[#FAFAFA] px-3 py-2.5 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-mono text-[10px] uppercase text-[#737373] block">Due Date & Time</label>
                <input
                  type="datetime-local"
                  value={newDueAt}
                  onChange={(e) => setNewDueAt(e.target.value)}
                  className="w-full bg-[#1A1A1A] border border-[#262626] focus:border-[#FF3D00] text-xs font-mono text-[#FAFAFA] px-3 py-2 focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="font-mono text-[10px] uppercase text-[#737373] block">Brief Description</label>
              <textarea
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Details, parameters, or outcomes of this objective..."
                className="w-full bg-[#1A1A1A] border border-[#262626] focus:border-[#FF3D00] text-xs font-mono text-[#FAFAFA] p-3 focus:outline-none h-20 resize-none"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <label className="font-mono text-[10px] uppercase text-[#737373] block mr-3">Priority Level</label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value as TaskPriority)}
                  className="bg-[#1A1A1A] border border-[#262626] focus:border-[#FF3D00] text-xs font-mono text-[#FAFAFA] px-3 py-2 focus:outline-none"
                >
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                  <option value="CRITICAL">CRITICAL</option>
                </select>
              </div>

              <button
                type="submit"
                className="px-6 py-2.5 bg-[#FF3D00] hover:bg-[#FAFAFA] text-[#0A0A0A] font-mono text-xs uppercase font-bold tracking-wider transition-colors"
              >
                Create Objective
              </button>
            </div>
          </form>
        )}

        {/* Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-[#737373] absolute left-3 top-1/2 -translate-y-1/2 stroke-[1.5]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search objectives..."
              className="w-full bg-[#1A1A1A] border border-[#262626] focus:border-[#FF3D00] text-xs font-mono text-[#FAFAFA] pl-9 pr-4 py-2 focus:outline-none"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto">
            {(['ALL', 'ACTIVE', 'DONE', 'CRITICAL'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 font-mono text-[11px] border uppercase transition-colors shrink-0 ${
                  filter === f
                    ? 'border-[#FF3D00] text-[#FF3D00]'
                    : 'border-[#262626] text-[#737373] hover:text-[#FAFAFA]'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Task Lists grid */}
        {isLoading ? (
          <div className="text-center py-12 font-mono text-xs text-[#737373] uppercase tracking-widest">
            Loading tasks...
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="bg-[#0F0F0F] border border-[#262626] p-12 text-center space-y-4">
            <ListTodo className="w-8 h-8 text-[#737373] mx-auto stroke-[1.5]" />
            <h3 className="font-sans font-bold text-lg uppercase text-[#FAFAFA]">No Objectives Found</h3>
            <p className="text-xs font-mono text-[#737373] max-w-xs mx-auto">
              Create a macro objective and break it down into micro subtasks to track execution.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {filteredTasks.map((t) => (
              <MacroTaskWidget
                key={t.id}
                macroTask={t}
                onToggleSubtask={handleToggleSubtask}
                onDeleteSubtask={handleDeleteSubtask}
                onAddSubtask={handleAddSubtask}
                onDeleteMacro={handleDeleteMacro}
                onTogglePinMacro={handleTogglePinMacro}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
