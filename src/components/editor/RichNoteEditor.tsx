'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  Heading3,
  Code,
  List,
  ListOrdered,
  Quote,
  CheckSquare,
  Sparkles,
  Bell,
  Tag,
  ArrowLeft,
  Pin,
  Trash2,
  Check,
  Loader2,
  Network,
} from 'lucide-react';
import { ReminderModal } from '../ui/ReminderModal';
import { StoredNote } from '@/lib/notes-storage';

interface RichNoteEditorProps {
  initialNote: StoredNote;
}

export function RichNoteEditor({ initialNote }: RichNoteEditorProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initialNote.title);
  const [content, setContent] = useState(initialNote.content);
  const [tags, setTags] = useState<string[]>(initialNote.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>(initialNote.priority || 'MEDIUM');
  const [isPinned, setIsPinned] = useState(initialNote.isPinned || false);
  const [reminderAt, setReminderAt] = useState<string | null>(initialNote.reminderAt || null);

  // Auto-Save Status
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [isConverting, setIsConverting] = useState(false);
  const [isReminderOpen, setIsReminderOpen] = useState(false);

  // Auto-save debounce effect
  const saveNote = useCallback(
    async (updatedFields: Partial<StoredNote>) => {
      setSaveStatus('saving');
      try {
        await fetch(`/api/notes/${initialNote.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedFields),
        });
        setSaveStatus('saved');
      } catch (err) {
        console.error('Auto-save failed:', err);
        setSaveStatus('unsaved');
      }
    },
    [initialNote.id]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      if (title !== initialNote.title || content !== initialNote.content) {
        saveNote({ title, content, tags, priority, isPinned, reminderAt });
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [title, content, tags, priority, isPinned, reminderAt, initialNote, saveNote]);

  // Insert markdown helper at cursor position
  const insertMarkdown = (prefix: string, suffix = '') => {
    const textarea = document.getElementById('note-textarea') as HTMLTextAreaElement | null;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const replacement = `${prefix}${selectedText || 'text'}${suffix}`;

    const newContent = content.substring(0, start) + replacement + content.substring(end);
    setContent(newContent);
    setSaveStatus('unsaved');

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + (selectedText.length || 4));
    }, 50);
  };

  // Add Tag
  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      const newTag = tagInput.trim().toLowerCase();
      if (!tags.includes(newTag)) {
        const nextTags = [...tags, newTag];
        setTags(nextTags);
        saveNote({ tags: nextTags });
      }
      setTagInput('');
    }
  };

  // Remove Tag
  const handleRemoveTag = (tagToRemove: string) => {
    const nextTags = tags.filter((t) => t !== tagToRemove);
    setTags(nextTags);
    saveNote({ tags: nextTags });
  };

  // Toggle Pin
  const handleTogglePin = () => {
    const nextPinned = !isPinned;
    setIsPinned(nextPinned);
    saveNote({ isPinned: nextPinned });
  };

  // Delete Note
  const handleDeleteNote = async () => {
    if (confirm('Are you sure you want to delete this note?')) {
      await fetch(`/api/notes/${initialNote.id}`, { method: 'DELETE' });
      router.push('/notes');
    }
  };

  // Convert Note to Mind Map Canvas
  const handleConvertToCanvas = async () => {
    setIsConverting(true);
    try {
      const res = await fetch(`/api/notes/${initialNote.id}/convert-canvas`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        router.push(`/canvas/${data.canvasId}`);
      }
    } catch (err) {
      console.error('Failed to convert note to canvas:', err);
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0A0A0A] text-[#FAFAFA] flex flex-col font-sans">
      {/* Top Header Controls */}
      <header className="h-16 border-b border-[#262626] bg-[#0A0A0A]/95 px-6 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/notes')}
            className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-[#737373] hover:text-[#FAFAFA] transition-colors"
          >
            <ArrowLeft className="w-4 h-4 stroke-[1.5]" />
            <span>Notes</span>
          </button>

          <div className="h-4 w-px bg-[#262626]" />

          {/* Auto-Save Indicator */}
          <div className="flex items-center gap-2 font-mono text-xs">
            {saveStatus === 'saving' ? (
              <span className="flex items-center gap-1 text-[#FF3D00]">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Saving...</span>
              </span>
            ) : saveStatus === 'saved' ? (
              <span className="flex items-center gap-1 text-[#737373]">
                <Check className="w-3 h-3 text-[#10b981]" />
                <span>Saved</span>
              </span>
            ) : (
              <span className="text-[#FF3D00]">Unsaved</span>
            )}
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center gap-3">
          {/* Priority Selector */}
          <select
            value={priority}
            onChange={(e) => {
              const p = e.target.value as 'LOW' | 'MEDIUM' | 'HIGH';
              setPriority(p);
              saveNote({ priority: p });
            }}
            aria-label="Select note priority"
            className="bg-[#1A1A1A] border border-[#262626] text-xs font-mono uppercase px-2.5 py-1.5 text-[#FAFAFA] focus:outline-none"
          >
            <option value="LOW">Priority: Low</option>
            <option value="MEDIUM">Priority: Medium</option>
            <option value="HIGH">Priority: High</option>
          </select>

          {/* Toggle Pin Button */}
          <button
            onClick={handleTogglePin}
            className={`p-1.5 border transition-colors ${
              isPinned ? 'border-[#FF3D00] text-[#FF3D00]' : 'border-[#262626] text-[#737373] hover:text-[#FAFAFA]'
            }`}
            title={isPinned ? 'Unpin Note' : 'Pin Note'}
          >
            <Pin className="w-4 h-4 stroke-[1.5]" />
          </button>

          {/* Set Reminder Button */}
          <button
            onClick={() => setIsReminderOpen(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 border text-xs font-mono uppercase tracking-wider transition-colors ${
              reminderAt ? 'border-[#FF3D00] text-[#FF3D00]' : 'border-[#262626] text-[#737373] hover:text-[#FAFAFA]'
            }`}
          >
            <Bell className="w-3.5 h-3.5 stroke-[1.5]" />
            <span>{reminderAt ? new Date(reminderAt).toLocaleDateString() : 'Remind'}</span>
          </button>

          {/* Convert to Mind Map Button */}
          <button
            onClick={handleConvertToCanvas}
            disabled={isConverting}
            className="flex items-center gap-2 px-4 py-1.5 bg-[#FF3D00] hover:bg-[#FAFAFA] text-[#0A0A0A] text-xs font-mono uppercase tracking-wider font-bold transition-colors"
          >
            {isConverting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Network className="w-3.5 h-3.5 stroke-[2]" />
            )}
            <span>Convert to Mind Map</span>
          </button>

          {/* Delete Note Button */}
          <button
            onClick={handleDeleteNote}
            className="p-1.5 border border-[#262626] hover:border-[#FF3D00] text-[#737373] hover:text-[#FF3D00] transition-colors"
            title="Delete Note"
          >
            <Trash2 className="w-4 h-4 stroke-[1.5]" />
          </button>
        </div>
      </header>

      {/* Formatting Toolbar */}
      <div className="border-b border-[#262626] bg-[#0F0F0F] px-8 py-2 flex items-center gap-1 overflow-x-auto">
        <button
          onClick={() => insertMarkdown('**', '**')}
          className="p-2 text-[#737373] hover:text-[#FAFAFA] hover:bg-[#1A1A1A] transition-colors"
          title="Bold (**text**)"
        >
          <Bold className="w-4 h-4 stroke-[2]" />
        </button>
        <button
          onClick={() => insertMarkdown('*', '*')}
          className="p-2 text-[#737373] hover:text-[#FAFAFA] hover:bg-[#1A1A1A] transition-colors"
          title="Italic (*text*)"
        >
          <Italic className="w-4 h-4 stroke-[2]" />
        </button>

        <div className="h-4 w-px bg-[#262626] mx-1" />

        <button
          onClick={() => insertMarkdown('# ')}
          className="p-2 text-[#737373] hover:text-[#FAFAFA] hover:bg-[#1A1A1A] transition-colors"
          title="Heading 1 (# Heading)"
        >
          <Heading1 className="w-4 h-4 stroke-[2]" />
        </button>
        <button
          onClick={() => insertMarkdown('## ')}
          className="p-2 text-[#737373] hover:text-[#FAFAFA] hover:bg-[#1A1A1A] transition-colors"
          title="Heading 2 (## Heading)"
        >
          <Heading2 className="w-4 h-4 stroke-[2]" />
        </button>
        <button
          onClick={() => insertMarkdown('### ')}
          className="p-2 text-[#737373] hover:text-[#FAFAFA] hover:bg-[#1A1A1A] transition-colors"
          title="Heading 3 (### Heading)"
        >
          <Heading3 className="w-4 h-4 stroke-[2]" />
        </button>

        <div className="h-4 w-px bg-[#262626] mx-1" />

        <button
          onClick={() => insertMarkdown('- [ ] ')}
          className="p-2 text-[#737373] hover:text-[#FAFAFA] hover:bg-[#1A1A1A] transition-colors"
          title="Checklist (- [ ])"
        >
          <CheckSquare className="w-4 h-4 stroke-[2]" />
        </button>
        <button
          onClick={() => insertMarkdown('- ')}
          className="p-2 text-[#737373] hover:text-[#FAFAFA] hover:bg-[#1A1A1A] transition-colors"
          title="Bullet List (- item)"
        >
          <List className="w-4 h-4 stroke-[2]" />
        </button>
        <button
          onClick={() => insertMarkdown('1. ')}
          className="p-2 text-[#737373] hover:text-[#FAFAFA] hover:bg-[#1A1A1A] transition-colors"
          title="Numbered List (1. item)"
        >
          <ListOrdered className="w-4 h-4 stroke-[2]" />
        </button>

        <div className="h-4 w-px bg-[#262626] mx-1" />

        <button
          onClick={() => insertMarkdown('`', '`')}
          className="p-2 text-[#737373] hover:text-[#FAFAFA] hover:bg-[#1A1A1A] transition-colors"
          title="Code Block (`code`)"
        >
          <Code className="w-4 h-4 stroke-[2]" />
        </button>
        <button
          onClick={() => insertMarkdown('> ')}
          className="p-2 text-[#737373] hover:text-[#FAFAFA] hover:bg-[#1A1A1A] transition-colors"
          title="Blockquote (> quote)"
        >
          <Quote className="w-4 h-4 stroke-[2]" />
        </button>
      </div>

      {/* Editor Content Workspace */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-8 flex flex-col space-y-6">
        {/* Title Field */}
        <input
          type="text"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setSaveStatus('unsaved');
          }}
          placeholder="Note Title..."
          className="w-full bg-transparent font-sans font-black text-4xl sm:text-5xl tracking-tighter text-[#FAFAFA] focus:outline-none placeholder:text-[#262626]"
        />

        {/* Tag Manager Bar */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#262626]">
          <Tag className="w-3.5 h-3.5 text-[#FF3D00]" />
          {tags.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#1A1A1A] border border-[#262626] text-[11px] font-mono text-[#FAFAFA]"
            >
              <span>#{t}</span>
              <button
                onClick={() => handleRemoveTag(t)}
                className="hover:text-[#FF3D00] ml-1"
              >
                ×
              </button>
            </span>
          ))}
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleAddTag}
            placeholder="Add tag + press enter..."
            className="bg-transparent border-none text-xs font-mono text-[#737373] focus:text-[#FAFAFA] focus:outline-none w-44"
          />
        </div>

        {/* Markdown Content Area */}
        <textarea
          id="note-textarea"
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            setSaveStatus('unsaved');
          }}
          placeholder="Write your note in Markdown..."
          className="flex-1 w-full min-h-[500px] bg-transparent text-base text-[#FAFAFA] leading-relaxed font-sans focus:outline-none resize-none placeholder:text-[#262626]"
        />
      </main>

      {/* Reminder Scheduling Modal */}
      <ReminderModal
        isOpen={isReminderOpen}
        nodeId={initialNote.id}
        nodeLabel={title}
        onClose={() => setIsReminderOpen(false)}
        onConfirm={async (id, dateStr) => {
          setReminderAt(dateStr);
          await saveNote({ reminderAt: dateStr });
        }}
      />
    </div>
  );
}
