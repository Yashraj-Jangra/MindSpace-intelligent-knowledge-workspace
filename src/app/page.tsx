import React from 'react';
import { redirect } from 'next/navigation';
import { getSessionFromCookie } from '@/lib/session';
import { getUserNotes } from '@/lib/notes-storage';
import { getUserCanvases } from '@/lib/canvas-storage';
import { getUserTasksDue, getPinnedTasks } from '@/lib/task-storage';
import { HubHeader } from '@/components/hub/HubHeader';
import { QuickCaptureInbox } from '@/components/hub/QuickCaptureInbox';
import { UrgencyTimeline, TimelineItem } from '@/components/hub/UrgencyTimeline';
import { RecentCanvasesGrid } from '@/components/hub/RecentCanvasesGrid';
import { PinnedItemsRail, PinnedItem } from '@/components/hub/PinnedItemsRail';
import { CriticalZoneBanner } from '@/components/hub/CriticalZoneBanner';

export const dynamic = 'force-dynamic';

function isOverdueOrToday(dueAtStr: string | null) {
  if (!dueAtStr) return false;
  const now = new Date();
  const due = new Date(dueAtStr);
  const isToday = due.toDateString() === now.toDateString();
  return due < now || isToday;
}

export default async function HubDashboard() {
  const session = await getSessionFromCookie();
  if (!session) {
    redirect('/login');
  }
  const userId = session.id;

  // Server-side database/JSON fallback data queries
  const notes = await getUserNotes(userId);
  const canvases = await getUserCanvases(userId);
  const dueTasks = await getUserTasksDue(userId);
  const pinnedTasks = await getPinnedTasks(userId);

  // Identify critical overdue/due-today tasks for the top pressure banner
  const criticalTasks = dueTasks.filter(
    (t) => t.priority === 'CRITICAL' && isOverdueOrToday(t.dueAt)
  );

  const now = new Date();

  // 1. Compile timeline item reminders from notes
  const noteTimelineItems: TimelineItem[] = notes
    .filter((n) => n.reminderAt)
    .map((n) => {
      const reminderDate = new Date(n.reminderAt!);
      const isToday = reminderDate.toDateString() === now.toDateString();
      const isOverdue = reminderDate < now && !isToday;

      let urgency: 'OVERDUE' | 'DUE_TODAY' | 'UPCOMING' = 'UPCOMING';
      if (isToday) {
        urgency = 'DUE_TODAY';
      } else if (isOverdue) {
        urgency = 'OVERDUE';
      }

      return {
        id: n.id,
        type: 'NOTE_REMINDER',
        title: n.title || 'Untitled Note',
        urgency,
        deadlineAt: n.reminderAt!,
        sourceId: n.id,
        sourceUrl: `/notes/${n.id}`,
      };
    });

  // 2. Compile timeline items from due tasks
  const taskTimelineItems: TimelineItem[] = dueTasks.map((t) => {
    const due = new Date(t.dueAt!);
    const isToday = due.toDateString() === now.toDateString();
    const isOverdue = due < now && !isToday;

    let urgency: 'OVERDUE' | 'DUE_TODAY' | 'UPCOMING' = 'UPCOMING';
    if (isToday) {
      urgency = 'DUE_TODAY';
    } else if (isOverdue) {
      urgency = 'OVERDUE';
    }

    return {
      id: t.id,
      type: 'TASK_DEADLINE',
      title: t.title,
      urgency,
      deadlineAt: t.dueAt!,
      sourceId: t.id,
      sourceUrl: `/tasks`,
    };
  });

  // Merge & Sort timeline: OVERDUE first -> DUE_TODAY -> UPCOMING, then chronologically
  const combinedTimeline = [...noteTimelineItems, ...taskTimelineItems];
  const urgencyWeight = { OVERDUE: 0, DUE_TODAY: 1, UPCOMING: 2 };
  combinedTimeline.sort((a, b) => {
    if (urgencyWeight[a.urgency] !== urgencyWeight[b.urgency]) {
      return urgencyWeight[a.urgency] - urgencyWeight[b.urgency];
    }
    return new Date(a.deadlineAt).getTime() - new Date(b.deadlineAt).getTime();
  });

  const pinnedNotes = notes.filter((n) => n.isPinned);

  // Widen pinned rails to accept notes + tasks unified sorted by update time
  const pinnedItems: PinnedItem[] = [
    ...pinnedNotes.map((n) => ({
      id: n.id,
      type: 'note' as const,
      title: n.title,
      priority: n.priority,
      updatedAt: n.updatedAt,
      url: `/notes/${n.id}`,
      content: n.content || undefined,
    })),
    ...pinnedTasks.map((t) => ({
      id: t.id,
      type: 'task' as const,
      title: t.title,
      priority: t.priority,
      updatedAt: t.updatedAt,
      url: `/tasks`,
    })),
  ].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  return (
    <div className="min-h-screen w-full bg-[#0A0A0A] text-[#FAFAFA] flex flex-col font-sans selection:bg-[#FF3D00] selection:text-[#0A0A0A]">
      {/* Dynamic top critical task alert banner */}
      <CriticalZoneBanner criticalTasks={criticalTasks} />

      {/* Personalized Hub Navigation Header */}
      <HubHeader />

      {/* Main Cockpit Space */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-8 space-y-8">
        
        {/* Typographic Welcome statement */}
        <section className="border-b border-[#262626] pb-6">
          <span className="font-mono text-[9px] uppercase tracking-widest text-[#FF3D00] block mb-1">
            Visual Workspace
          </span>
          <h2 className="font-sans font-black text-3xl sm:text-5xl tracking-tighter uppercase text-[#FAFAFA] leading-none">
            Welcome to Mind<span className="text-[#FF3D00]">Space</span>
          </h2>
          <p className="font-mono text-xs text-[#737373] mt-2">
            Organize thoughts, manage dynamic reminders, and map ideas with vector canvas.
          </p>
        </section>

        {/* Responsive Cockpit Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content Area (2/3 width on desktop) */}
          <div className="lg:col-span-2 space-y-6">
            <RecentCanvasesGrid initialCanvases={canvases} />
          </div>

          {/* Quick Actions & Timeline sidebar (1/3 width on desktop) */}
          <div className="space-y-6">
            <QuickCaptureInbox />
            <UrgencyTimeline initialItems={combinedTimeline} />
          </div>
        </div>

        {/* Pinned rail below main grid */}
        <PinnedItemsRail pinnedItems={pinnedItems} />
      </main>
    </div>
  );
}
