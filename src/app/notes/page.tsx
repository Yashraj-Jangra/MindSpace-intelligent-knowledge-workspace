import React from 'react';
import Link from 'next/link';
import { getUserNotes } from '@/lib/notes-storage';
import { getSessionFromCookie } from '@/lib/session';
import { Plus, Pin, Bell, Tag, FileText, Search, Network, Clock, Shield } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { redirect } from 'next/navigation';
import { AppHeader } from '@/components/navigation/AppHeader';

export const dynamic = 'force-dynamic';

export default async function NotesLibrary({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; tag?: string }>;
}) {
  const session = await getSessionFromCookie();
  if (!session) {
    redirect('/login');
  }
  const userId = session.id;

  const resolvedSearchParams = await searchParams;
  const search = resolvedSearchParams?.search || '';
  const tag = resolvedSearchParams?.tag || '';

  const notes = await getUserNotes(userId, search, tag);
  const pinnedNotes = notes.filter((n) => n.isPinned);
  const reminderNotes = notes.filter((n) => n.reminderAt);

  // Extract unique tags across all notes
  const allTags = Array.from(new Set(notes.flatMap((n) => n.tags)));

  return (
    <div className="min-h-screen w-full bg-[#0A0A0A] text-[#FAFAFA] flex flex-col font-sans">
      <AppHeader
        title="Notes Workspace"
        actions={
          <Link
            href="/notes/new"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FF3D00] text-[#0A0A0A] font-mono text-xs uppercase font-bold hover:bg-[#FF5722] transition-colors"
          >
            <Plus className="w-4 h-4 stroke-[2]" />
            <span className="hidden sm:inline">New Note</span>
          </Link>
        }
      />

      {/* Main Workspace */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-8 space-y-6 sm:space-y-8">
        {/* Quick Stats Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-[#0F0F0F] border border-[#262626] p-6 relative">
            <div className="h-1 w-12 bg-[#FF3D00] absolute top-0 left-0" />
            <div className="flex items-center justify-between text-[#737373] mb-2">
              <span className="font-mono text-xs uppercase tracking-wider">Total Notes</span>
              <FileText className="w-4 h-4 text-[#FF3D00]" />
            </div>
            <div className="font-sans font-black text-3xl text-[#FAFAFA]">{notes.length}</div>
          </div>

          <div className="bg-[#0F0F0F] border border-[#262626] p-6 relative">
            <div className="h-1 w-12 bg-[#3b82f6] absolute top-0 left-0" />
            <div className="flex items-center justify-between text-[#737373] mb-2">
              <span className="font-mono text-xs uppercase tracking-wider">Pinned Notes</span>
              <Pin className="w-4 h-4 text-[#3b82f6]" />
            </div>
            <div className="font-sans font-black text-3xl text-[#FAFAFA]">{pinnedNotes.length}</div>
          </div>

          <div className="bg-[#0F0F0F] border border-[#262626] p-6 relative">
            <div className="h-1 w-12 bg-[#10b981] absolute top-0 left-0" />
            <div className="flex items-center justify-between text-[#737373] mb-2">
              <span className="font-mono text-xs uppercase tracking-wider">Active Reminders</span>
              <Bell className="w-4 h-4 text-[#10b981]" />
            </div>
            <div className="font-sans font-black text-3xl text-[#FAFAFA]">{reminderNotes.length}</div>
          </div>
        </div>

        {/* Search & Tag Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pb-4 border-b border-[#262626]">
          <form method="GET" action="/notes" className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[#737373] absolute left-3 top-1/2 -translate-y-1/2 stroke-[1.5]" />
            <input
              type="text"
              name="search"
              defaultValue={search}
              placeholder="Search notes by title or content..."
              className="w-full bg-[#1A1A1A] border border-[#262626] focus:border-[#FF3D00] text-xs font-mono text-[#FAFAFA] pl-9 pr-4 py-2.5 focus:outline-none"
            />
          </form>

          {/* Tag Pills */}
          {allTags.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto">
              <Tag className="w-3.5 h-3.5 text-[#FF3D00] shrink-0" />
              <Link
                href="/notes"
                className={`px-2.5 py-1 font-mono text-[11px] border transition-colors ${
                  !tag ? 'border-[#FF3D00] text-[#FF3D00]' : 'border-[#262626] text-[#737373] hover:text-[#FAFAFA]'
                }`}
              >
                All
              </Link>
              {allTags.map((t) => (
                <Link
                  key={t}
                  href={`/notes?tag=${t}`}
                  className={`px-2.5 py-1 font-mono text-[11px] border transition-colors ${
                    tag === t ? 'border-[#FF3D00] text-[#FF3D00]' : 'border-[#262626] text-[#737373] hover:text-[#FAFAFA]'
                  }`}
                >
                  #{t}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Pinned Shelf */}
        {pinnedNotes.length > 0 && !search && !tag && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-[#3b82f6]">
              <Pin className="w-4 h-4" />
              <span>PINNED NOTES</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pinnedNotes.map((n) => (
                <Link
                  key={n.id}
                  href={`/notes/${n.id}`}
                  className="bg-[#0F0F0F] border border-[#3b82f6] p-6 hover:border-[#FF3D00] transition-colors group relative"
                >
                  <div className="h-1 w-12 bg-[#3b82f6] absolute top-0 left-0" />
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-[10px] uppercase text-[#3b82f6]">PINNED</span>
                    <Clock className="w-3.5 h-3.5 text-[#737373]" />
                  </div>
                  <h3 className="font-sans font-bold text-lg text-[#FAFAFA] group-hover:text-[#FF3D00] transition-colors mb-2">
                    {n.title}
                  </h3>
                  <p className="text-xs text-[#737373] line-clamp-3 leading-relaxed mb-4">
                    {n.content || 'Empty note...'}
                  </p>
                  <div className="flex items-center justify-between text-[11px] font-mono text-[#737373]">
                    <span>{new Date(n.updatedAt).toLocaleDateString()}</span>
                    {n.tags.length > 0 && <span>#{n.tags[0]}</span>}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* All Notes List / Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between font-mono text-xs uppercase tracking-wider text-[#737373]">
            <span>ALL NOTES ({notes.length})</span>
            {search && <span>Filtered by: "{search}"</span>}
          </div>

          {notes.length === 0 ? (
            <div className="bg-[#0F0F0F] border border-[#262626] p-12 text-center space-y-4">
              <FileText className="w-8 h-8 text-[#737373] mx-auto stroke-[1.5]" />
              <h3 className="font-sans font-bold text-xl uppercase text-[#FAFAFA]">No Notes Found</h3>
              <p className="text-xs font-mono text-[#737373] max-w-sm mx-auto">
                Create your first classic note to organize ideas, meeting logs, and reminders.
              </p>
              <Link
                href="/notes/new"
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#FF3D00] hover:bg-[#FAFAFA] text-[#0A0A0A] font-mono text-xs uppercase font-bold transition-colors mt-2"
              >
                <Plus className="w-4 h-4 stroke-[2]" />
                <span>Create New Note</span>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {notes.map((n) => (
                <Link
                  key={n.id}
                  href={`/notes/${n.id}`}
                  className="bg-[#0F0F0F] border border-[#262626] p-6 hover:border-[#FF3D00] transition-colors group relative flex flex-col justify-between"
                >
                  <div className="h-1 w-12 bg-[#FF3D00] absolute top-0 left-0" />
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-[10px] uppercase text-[#737373]">
                        {n.priority} PRIORITY
                      </span>
                      {n.reminderAt && <Bell className="w-3.5 h-3.5 text-[#FF3D00]" />}
                    </div>
                    <h3 className="font-sans font-bold text-lg text-[#FAFAFA] group-hover:text-[#FF3D00] transition-colors mb-2">
                      {n.title}
                    </h3>
                    <p className="text-xs text-[#737373] line-clamp-3 leading-relaxed mb-4">
                      {n.content || 'Empty note...'}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono text-[#737373] pt-4 border-t border-[#262626]">
                    <span>{new Date(n.updatedAt).toLocaleDateString()}</span>
                    <div className="flex items-center gap-2">
                      {n.canvasId && (
                        <span title="Has Mind Map">
                          <Network className="w-3.5 h-3.5 text-[#3b82f6]" />
                        </span>
                      )}
                      {n.tags.length > 0 && <span>#{n.tags[0]}</span>}
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
