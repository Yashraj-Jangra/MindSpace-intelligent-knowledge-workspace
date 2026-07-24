import React from 'react';
import { getNoteById, createNote } from '@/lib/notes-storage';
import { getSessionFromCookie } from '@/lib/session';
import { NoteEditorContainer } from '@/components/editor/NoteEditorContainer';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function NotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSessionFromCookie();
  if (!session) {
    redirect('/login');
  }
  const userId = session.id;

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

  return <NoteEditorContainer initialNote={note} />;
}
