import React from 'react';
import Link from 'next/link';
import { getUserNotes } from '@/lib/notes-storage';
import { getSessionFromCookie } from '@/lib/session';
import { AppHeader } from '@/components/navigation/AppHeader';
import { Bell, ArrowLeft, Clock, FileText, CheckCircle2, AlertTriangle, Shield } from 'lucide-react';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function RemindersDashboard() {
  const session = await getSessionFromCookie();
  if (!session) {
    redirect('/login');
  }
  const userId = session.id;

  const notes = await getUserNotes(userId);
  const reminderNotes = notes.filter((n) => n.reminderAt);

  const now = new Date();

  // Categorize reminders
  const dueToday = reminderNotes.filter((n) => {
    if (!n.reminderAt) return false;
    const rDate = new Date(n.reminderAt);
    return rDate.toDateString() === now.toDateString();
  });

  const upcoming = reminderNotes.filter((n) => {
    if (!n.reminderAt) return false;
    return new Date(n.reminderAt) > now && new Date(n.reminderAt).toDateString() !== now.toDateString();
  });

  const overdue = reminderNotes.filter((n) => {
    if (!n.reminderAt) return false;
    return new Date(n.reminderAt) < now && new Date(n.reminderAt).toDateString() !== now.toDateString();
  });

  return (
    <div className="min-h-screen w-full bg-[#0A0A0A] text-[#FAFAFA] flex flex-col font-sans">
      <AppHeader title="Reminders & Deadlines" />

      {/* Main Workspace */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-8 space-y-6 sm:space-y-8">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-[#0F0F0F] border border-[#FF3D00] p-6 relative">
            <div className="h-1 w-12 bg-[#FF3D00] absolute top-0 left-0" />
            <div className="flex items-center justify-between text-[#737373] mb-2">
              <span className="font-mono text-xs uppercase tracking-wider">Due Today</span>
              <Clock className="w-4 h-4 text-[#FF3D00]" />
            </div>
            <div className="font-sans font-black text-3xl text-[#FAFAFA]">{dueToday.length}</div>
          </div>

          <div className="bg-[#0F0F0F] border border-[#262626] p-6 relative">
            <div className="h-1 w-12 bg-[#10b981] absolute top-0 left-0" />
            <div className="flex items-center justify-between text-[#737373] mb-2">
              <span className="font-mono text-xs uppercase tracking-wider">Upcoming</span>
              <Bell className="w-4 h-4 text-[#10b981]" />
            </div>
            <div className="font-sans font-black text-3xl text-[#FAFAFA]">{upcoming.length}</div>
          </div>

          <div className="bg-[#0F0F0F] border border-[#262626] p-6 relative">
            <div className="h-1 w-12 bg-[#FF3D00] absolute top-0 left-0" />
            <div className="flex items-center justify-between text-[#737373] mb-2">
              <span className="font-mono text-xs uppercase tracking-wider">Overdue</span>
              <AlertTriangle className="w-4 h-4 text-[#FF3D00]" />
            </div>
            <div className="font-sans font-black text-3xl text-[#FAFAFA]">{overdue.length}</div>
          </div>
        </div>

        {/* Due Today Section */}
        {dueToday.length > 0 && (
          <div className="space-y-4">
            <div className="font-mono text-xs uppercase tracking-wider text-[#FF3D00] flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>DUE TODAY ({dueToday.length})</span>
            </div>

            <div className="space-y-3">
              {dueToday.map((n) => (
                <Link
                  key={n.id}
                  href={`/notes/${n.id}`}
                  className="block bg-[#0F0F0F] border border-[#FF3D00] p-4 hover:bg-[#1A1A1A] transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-sans font-bold text-base text-[#FAFAFA]">{n.title}</h3>
                      <p className="text-xs text-[#737373] line-clamp-1 mt-1">{n.content}</p>
                    </div>
                    <div className="text-right font-mono text-xs text-[#FF3D00]">
                      {n.reminderAt && new Date(n.reminderAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Reminders Section */}
        <div className="space-y-4">
          <div className="font-mono text-xs uppercase tracking-wider text-[#10b981] flex items-center gap-2">
            <Bell className="w-4 h-4" />
            <span>UPCOMING REMINDERS ({upcoming.length})</span>
          </div>

          {upcoming.length === 0 ? (
            <div className="bg-[#0F0F0F] border border-[#262626] p-8 text-center text-xs font-mono text-[#737373]">
              No upcoming note reminders scheduled.
            </div>
          ) : (
            <div className="space-y-3">
              {upcoming.map((n) => (
                <Link
                  key={n.id}
                  href={`/notes/${n.id}`}
                  className="block bg-[#0F0F0F] border border-[#262626] p-4 hover:border-[#10b981] transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-sans font-bold text-base text-[#FAFAFA]">{n.title}</h3>
                      <p className="text-xs text-[#737373] line-clamp-1 mt-1">{n.content}</p>
                    </div>
                    <div className="text-right font-mono text-xs text-[#10b981]">
                      {n.reminderAt && new Date(n.reminderAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
