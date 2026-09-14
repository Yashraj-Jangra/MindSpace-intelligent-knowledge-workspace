import React from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionFromCookie } from "@/lib/session";
import { getUserNotes } from "@/lib/notes-storage";
import { getUserCanvases } from "@/lib/canvas-storage";
import { getUserTasksDue, getPinnedTasks } from "@/lib/task-storage";
import { HubHeader } from "@/components/hub/HubHeader";
import { QuickCaptureInbox } from "@/components/hub/QuickCaptureInbox";
import {
  UrgencyTimeline,
  TimelineItem,
} from "@/components/hub/UrgencyTimeline";
import { RecentCanvasesGrid } from "@/components/hub/RecentCanvasesGrid";
import { PinnedItemsRail, PinnedItem } from "@/components/hub/PinnedItemsRail";
import { CriticalZoneBanner } from "@/components/hub/CriticalZoneBanner";
import {
  Network,
  FileText,
  CheckSquare,
  Bell,
  Plus,
  Zap,
  LayoutDashboard,
  Shield,
} from "lucide-react";

export const dynamic = "force-dynamic";

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
    redirect("/login");
  }
  const userId = session.id;

  // Server-side data queries
  const notes = await getUserNotes(userId);
  const canvases = await getUserCanvases(userId);
  const dueTasks = await getUserTasksDue(userId);
  const pinnedTasks = await getPinnedTasks(userId);

  const criticalTasks = dueTasks.filter(
    (t) => t.priority === "CRITICAL" && isOverdueOrToday(t.dueAt),
  );

  const now = new Date();

  // 1. Compile note reminders
  const noteTimelineItems: TimelineItem[] = notes
    .filter((n) => n.reminderAt)
    .map((n) => {
      const reminderDate = new Date(n.reminderAt!);
      const isToday = reminderDate.toDateString() === now.toDateString();
      const isOverdue = reminderDate < now && !isToday;

      let urgency: "OVERDUE" | "DUE_TODAY" | "UPCOMING" = "UPCOMING";
      if (isToday) {
        urgency = "DUE_TODAY";
      } else if (isOverdue) {
        urgency = "OVERDUE";
      }

      return {
        id: n.id,
        type: "NOTE_REMINDER",
        title: n.title || "Untitled Note",
        urgency,
        deadlineAt: n.reminderAt!,
        sourceId: n.id,
        sourceUrl: `/notes/${n.id}`,
      };
    });

  // 2. Compile task deadlines
  const taskTimelineItems: TimelineItem[] = dueTasks.map((t) => {
    const due = new Date(t.dueAt!);
    const isToday = due.toDateString() === now.toDateString();
    const isOverdue = due < now && !isToday;

    let urgency: "OVERDUE" | "DUE_TODAY" | "UPCOMING" = "UPCOMING";
    if (isToday) {
      urgency = "DUE_TODAY";
    } else if (isOverdue) {
      urgency = "OVERDUE";
    }

    return {
      id: t.id,
      type: "TASK_DEADLINE",
      title: t.title,
      urgency,
      deadlineAt: t.dueAt!,
      sourceId: t.id,
      sourceUrl: `/tasks`,
    };
  });

  const combinedTimeline = [...noteTimelineItems, ...taskTimelineItems];
  const urgencyWeight = { OVERDUE: 0, DUE_TODAY: 1, UPCOMING: 2 };
  combinedTimeline.sort((a, b) => {
    if (urgencyWeight[a.urgency] !== urgencyWeight[b.urgency]) {
      return urgencyWeight[a.urgency] - urgencyWeight[b.urgency];
    }
    return new Date(a.deadlineAt).getTime() - new Date(b.deadlineAt).getTime();
  });

  const overdueCount = combinedTimeline.filter(
    (i) => i.urgency === "OVERDUE",
  ).length;

  const pinnedNotes = notes.filter((n) => n.isPinned);
  const pinnedItems: PinnedItem[] = [
    ...pinnedNotes.map((n) => ({
      id: n.id,
      type: "note" as const,
      title: n.title,
      priority: n.priority,
      updatedAt: n.updatedAt,
      url: `/notes/${n.id}`,
      content: n.content || undefined,
    })),
    ...pinnedTasks.map((t) => ({
      id: t.id,
      type: "task" as const,
      title: t.title,
      priority: t.priority,
      updatedAt: t.updatedAt,
      url: `/tasks`,
    })),
  ].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );

  return (
    <div className="min-h-screen w-full bg-[#0A0A0A] text-[#FAFAFA] flex flex-col font-sans selection:bg-[#FF3D00] selection:text-[#0A0A0A]">
      {/* Top Critical Task Banner */}
      <CriticalZoneBanner criticalTasks={criticalTasks} />

      {/* Global Navigation Header */}
      <HubHeader />

      {/* Main Cockpit Space */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 space-y-8">
        {/* HERO COMMAND DECK */}
        <section className="bg-[#0F0F0F] border border-[#262626] p-6 sm:p-8 relative space-y-6">
          <div className="h-1 w-24 bg-[#FF3D00] absolute top-0 left-0" />

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-[#FF3D00] font-mono text-xs uppercase tracking-widest mb-1">
                <Zap className="w-4 h-4" />
                <span>Command Center Cockpit</span>
              </div>
              <h1 className="font-sans font-black text-3xl sm:text-5xl tracking-tighter uppercase text-[#FAFAFA] leading-none">
                WELCOME, {session.name ? session.name.toUpperCase() : "CREATOR"}
              </h1>
              <p className="font-mono text-xs text-[#737373] mt-2 max-w-xl">
                Organize thoughts, manage dynamic reminders, and map ideas with
                vector canvas.
              </p>
            </div>

            {/* Quick Action Launcher Row */}
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/canvas/new"
                className="flex items-center gap-2 px-4 py-2.5 bg-[#0F0F0F] border border-[#262626] hover:border-[#FF3D00] text-[#FAFAFA] font-mono text-xs font-bold uppercase tracking-wider transition-colors"
              >
                <Plus className="w-4 h-4 text-[#FF3D00]" />
                <span>New Canvas</span>
              </Link>

              <Link
                href="/notes/new"
                className="flex items-center gap-2 px-4 py-2.5 bg-[#0F0F0F] border border-[#262626] hover:border-[#FF3D00] text-[#FAFAFA] font-mono text-xs font-bold uppercase tracking-wider transition-colors"
              >
                <Plus className="w-4 h-4 text-[#FF3D00]" />
                <span>New Note</span>
              </Link>

              <Link
                href="/tasks"
                className="flex items-center gap-2 px-4 py-2.5 bg-[#0F0F0F] border border-[#262626] hover:border-[#FF3D00] text-[#FAFAFA] font-mono text-xs font-bold uppercase tracking-wider transition-colors"
              >
                <Plus className="w-4 h-4 text-[#10B981]" />
                <span>New Task</span>
              </Link>
            </div>
          </div>

          {/* Telemetry Live Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 border-t border-[#262626] font-mono text-xs">
            <Link
              href="/"
              className="p-3 bg-[#141414] border border-[#262626] hover:border-[#FF3D00] transition-colors"
            >
              <div className="text-[10px] text-[#737373] uppercase flex items-center justify-between">
                <span>Canvases</span>
                <Network className="w-3.5 h-3.5 text-[#FF3D00]" />
              </div>
              <div className="font-black text-xl text-[#FAFAFA] mt-1">
                {canvases.length}
              </div>
            </Link>

            <Link
              href="/notes"
              className="p-3 bg-[#141414] border border-[#262626] hover:border-[#FF3D00] transition-colors"
            >
              <div className="text-[10px] text-[#737373] uppercase flex items-center justify-between">
                <span>Active Notes</span>
                <FileText className="w-3.5 h-3.5 text-[#FF3D00]" />
              </div>
              <div className="font-black text-xl text-[#FAFAFA] mt-1">
                {notes.length}
              </div>
            </Link>

            <Link
              href="/tasks"
              className="p-3 bg-[#141414] border border-[#262626] hover:border-[#FF3D00] transition-colors"
            >
              <div className="text-[10px] text-[#737373] uppercase flex items-center justify-between">
                <span>Pending Tasks</span>
                <CheckSquare className="w-3.5 h-3.5 text-[#10B981]" />
              </div>
              <div className="font-black text-xl text-[#FAFAFA] mt-1">
                {dueTasks.length}
              </div>
            </Link>

            <Link
              href="/reminders"
              className="p-3 bg-[#141414] border border-[#262626] hover:border-[#FF3D00] transition-colors"
            >
              <div className="text-[10px] text-[#737373] uppercase flex items-center justify-between">
                <span>Overdue Reminders</span>
                <Bell className="w-3.5 h-3.5 text-[#FF3D00]" />
              </div>
              <div className="font-black text-xl text-[#FF3D00] mt-1">
                {overdueCount}
              </div>
            </Link>
          </div>
        </section>

        {/* RESPONSIVE COCKPIT LAYOUT GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Workspace (2/3 width on desktop) */}
          <div className="lg:col-span-2 space-y-8">
            <RecentCanvasesGrid initialCanvases={canvases} />
            <PinnedItemsRail pinnedItems={pinnedItems} />
          </div>

          {/* Quick Capture & Deadline Sidebar (1/3 width on desktop) */}
          <div className="space-y-8">
            <QuickCaptureInbox />
            <UrgencyTimeline initialItems={combinedTimeline} />
          </div>
        </div>
      </main>
    </div>
  );
}
