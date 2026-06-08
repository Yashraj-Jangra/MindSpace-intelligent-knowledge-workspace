import React from 'react';
import { getNoteById, createNote } from '@/lib/notes-storage';
import { getSessionFromCookie } from '@/lib/session';
import { AdvancedNoteEditor } from '@/components/editor/AdvancedNoteEditor';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function NotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSessionFromCookie();
  const userId = session?.id || 'default_user';

  let note = await getNoteById(id);

  if (!note) {
    if (id === 'new') {
      note = await createNote({
        userId,
        title: 'Untitled Note',
        content: '',
      });
      redirect(`/notes/${note.id}`);
    } else {
      redirect('/dashboard');
    }
  }

  return <AdvancedNoteEditor initialNote={note} />;
}
