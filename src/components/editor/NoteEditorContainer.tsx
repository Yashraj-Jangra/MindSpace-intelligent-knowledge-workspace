'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { StoredNote } from '@/lib/notes-storage';
import { Loader2 } from 'lucide-react';

const AdvancedNoteEditor = dynamic(
  () => import('./AdvancedNoteEditor').then((mod) => mod.AdvancedNoteEditor),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen w-full bg-[#0A0A0A] text-[#FAFAFA] flex items-center justify-center font-mono text-xs">
        <div className="flex items-center gap-2 text-[#FF3D00]">
          <Loader2 className="w-5 h-5 animate-spin text-[#FF3D00]" />
          <span className="uppercase tracking-widest font-bold">Initializing MindSpace Tiptap Suite...</span>
        </div>
      </div>
    ),
  }
);

export function NoteEditorContainer({ initialNote }: { initialNote: StoredNote }) {
  return <AdvancedNoteEditor initialNote={initialNote} />;
}
