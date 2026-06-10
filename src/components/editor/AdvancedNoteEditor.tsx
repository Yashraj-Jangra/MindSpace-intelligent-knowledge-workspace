'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

import { RichTextProvider } from 'reactjs-tiptap-editor';
import { Bold, RichTextBold } from 'reactjs-tiptap-editor/bold';
import { Italic, RichTextItalic } from 'reactjs-tiptap-editor/italic';
import { TextUnderline, RichTextUnderline } from 'reactjs-tiptap-editor/textunderline';
import { Strike, RichTextStrike } from 'reactjs-tiptap-editor/strike';
import { Heading, RichTextHeading } from 'reactjs-tiptap-editor/heading';
import { BulletList, RichTextBulletList } from 'reactjs-tiptap-editor/bulletlist';
import { OrderedList, RichTextOrderedList } from 'reactjs-tiptap-editor/orderedlist';
import { TaskList, RichTextTaskList } from 'reactjs-tiptap-editor/tasklist';
import { CodeBlock, RichTextCodeBlock } from 'reactjs-tiptap-editor/codeblock';
import { Blockquote, RichTextBlockquote } from 'reactjs-tiptap-editor/blockquote';
import { Color, RichTextColor } from 'reactjs-tiptap-editor/color';
import { Highlight, RichTextHighlight } from 'reactjs-tiptap-editor/highlight';
import { TextAlign, RichTextAlign } from 'reactjs-tiptap-editor/textalign';
import { Link, RichTextLink } from 'reactjs-tiptap-editor/link';
import { Image, RichTextImage } from 'reactjs-tiptap-editor/image';
import { Table, RichTextTable } from 'reactjs-tiptap-editor/table';
import { Emoji, RichTextEmoji } from 'reactjs-tiptap-editor/emoji';
import { History, RichTextUndo, RichTextRedo } from 'reactjs-tiptap-editor/history';
import { Clear, RichTextClear } from 'reactjs-tiptap-editor/clear';
import { HorizontalRule, RichTextHorizontalRule } from 'reactjs-tiptap-editor/horizontalrule';
import { SearchAndReplace, RichTextSearchAndReplace } from 'reactjs-tiptap-editor/searchandreplace';
import { SlashCommand } from 'reactjs-tiptap-editor/slashcommand';

import {
  RichTextBubbleText,
  RichTextBubbleTable,
  RichTextBubbleImage,
  RichTextBubbleLink,
  RichTextBubbleCodeBlock,
} from 'reactjs-tiptap-editor/bubble';

import 'reactjs-tiptap-editor/style.css';

import {
  ArrowLeft,
  Check,
  Loader2,
  Bell,
  Pin,
  Trash2,
  Tag,
  Maximize2,
  Minimize2,
  FileText,
  Clock,
  Network,
  PenTool,
} from 'lucide-react';

import { StoredNote } from '@/lib/notes-storage';
import { ReminderModal } from '../ui/ReminderModal';
import { StylusAnnotationCanvas } from './StylusAnnotationCanvas';

interface AdvancedNoteEditorProps {
  initialNote: StoredNote;
}

export function AdvancedNoteEditor({ initialNote }: AdvancedNoteEditorProps) {
  const router = useRouter();

  // Note Metadata State
  const [title, setTitle] = useState(initialNote.title);
  const [content, setContent] = useState(initialNote.content || '');
  const [tags, setTags] = useState<string[]>(initialNote.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>(initialNote.priority || 'MEDIUM');
  const [isPinned, setIsPinned] = useState(initialNote.isPinned || false);
  const [reminderAt, setReminderAt] = useState<string | null>(initialNote.reminderAt || null);
  const [stylusDrawingData, setStylusDrawingData] = useState<string | null>(null);

  // Editor View Mode & Status
  const [isZenMode, setIsZenMode] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [isConverting, setIsConverting] = useState(false);

  // Modals state
  const [isReminderOpen, setIsReminderOpen] = useState(false);
  const [isStylusOpen, setIsStylusOpen] = useState(false);

  // Configure Extensions from reactjs-tiptap-editor
  const extensions = useMemo(() => {
    return [
      StarterKit.configure({
        codeBlock: false,
        heading: false,
        bulletList: false,
        orderedList: false,
        blockquote: false,
        horizontalRule: false,
      }),
      Heading.configure({ levels: [1, 2, 3, 4, 5, 6] }),
      Bold,
      Italic,
      TextUnderline,
      Strike,
      CodeBlock,
      Blockquote,
      BulletList,
      OrderedList,
      TaskList,
      Color,
      Highlight,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Link,
      Image.configure({
        upload: async (file: File) => {
          const formData = new FormData();
          formData.append('file', file);
          const res = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          });
          const data = await res.json();
          return data.url;
        },
      }),
      Table.configure({ resizable: true }),
      HorizontalRule,
      History,
      Clear,
      SlashCommand,
      SearchAndReplace,
      Emoji,
    ];
  }, []);

  // Initialize Editor
  const editor = useEditor({
    immediatelyRender: false,
    extensions,
    content: initialNote.content || '<p></p>',
    onUpdate: ({ editor: currentEditor }) => {
      setContent(currentEditor.getHTML());
      setSaveStatus('unsaved');
    },
    editorProps: {
      attributes: {
        class:
          'prose prose-invert max-w-none focus:outline-none min-h-[600px] text-base leading-relaxed text-[#FAFAFA] font-sans p-6',
      },
    },
  });

  // Auto-save Debounce
  const saveNote = useCallback(
    async (updatedFields: Partial<StoredNote>) => {
      if (!editor) return;
      setSaveStatus('saving');
      try {
        const htmlContent = editor.getHTML();
        await fetch(`/api/notes/${initialNote.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            content: htmlContent,
            tags,
            priority,
            isPinned,
            reminderAt,
            ...updatedFields,
          }),
        });
        setSaveStatus('saved');
      } catch (err) {
        console.error('Auto-save failed:', err);
        setSaveStatus('unsaved');
      }
    },
    [editor, initialNote.id, title, tags, priority, isPinned, reminderAt]
  );

  useEffect(() => {
    if (!editor) return;
    const timer = setTimeout(() => {
      if (saveStatus === 'unsaved') {
        saveNote({});
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [editor, saveStatus, saveNote]);

  // Telemetry Calculations
  const plainText = useMemo(() => {
    if (!editor) return content;
    return editor.getText();
  }, [content, editor]);

  const wordCount = plainText.trim() ? plainText.trim().split(/\s+/).length : 0;
  const charCount = plainText.length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  // Tag Handlers
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

  const handleRemoveTag = (tagToRemove: string) => {
    const nextTags = tags.filter((t) => t !== tagToRemove);
    setTags(nextTags);
    saveNote({ tags: nextTags });
  };

  // Convert to Visual Mind Map Canvas
  const handleConvertToCanvas = async () => {
    setIsConverting(true);
    try {
      const res = await fetch(`/api/notes/${initialNote.id}/convert-canvas`, { method: 'POST' });
      if (res.ok) {
        router.push('/');
      }
    } catch (err) {
      console.error('Failed to convert note to canvas:', err);
    } finally {
      setIsConverting(false);
    }
  };

  // Delete Note
  const handleDeleteNote = async () => {
    if (confirm('Are you sure you want to delete this note?')) {
      await fetch(`/api/notes/${initialNote.id}`, { method: 'DELETE' });
      router.push('/dashboard');
    }
  };

  return (
    <div
      className={`min-h-screen w-full bg-[#0A0A0A] text-[#FAFAFA] flex flex-col font-sans select-text ${
        isZenMode ? 'fixed inset-0 z-50 overflow-y-auto bg-[#0A0A0A]' : ''
      }`}
    >
      {/* Top Header Control Bar */}
      {!isZenMode && (
        <header className="h-16 border-b border-[#262626] bg-[#0A0A0A]/95 px-6 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-[#737373] hover:text-[#FAFAFA] transition-colors"
            >
              <ArrowLeft className="w-4 h-4 stroke-[1.5]" />
              <span>Dashboard</span>
            </button>

            <div className="h-4 w-px bg-[#262626]" />

            {/* Auto-save Status */}
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
              className="bg-[#1A1A1A] border border-[#262626] text-xs font-mono uppercase px-2.5 py-1.5 text-[#FAFAFA] focus:outline-none"
            >
              <option value="LOW">Priority: Low</option>
              <option value="MEDIUM">Priority: Medium</option>
              <option value="HIGH">Priority: High</option>
            </select>

            {/* Pin Toggle */}
            <button
              onClick={() => {
                const nextPinned = !isPinned;
                setIsPinned(nextPinned);
                saveNote({ isPinned: nextPinned });
              }}
              className={`p-1.5 border transition-colors ${
                isPinned ? 'border-[#FF3D00] text-[#FF3D00]' : 'border-[#262626] text-[#737373] hover:text-[#FAFAFA]'
              }`}
              title={isPinned ? 'Unpin Note' : 'Pin Note'}
            >
              <Pin className="w-4 h-4 stroke-[1.5]" />
            </button>

            {/* Set Reminder */}
            <button
              onClick={() => setIsReminderOpen(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 border text-xs font-mono uppercase tracking-wider transition-colors ${
                reminderAt ? 'border-[#FF3D00] text-[#FF3D00]' : 'border-[#262626] text-[#737373] hover:text-[#FAFAFA]'
              }`}
            >
              <Bell className="w-3.5 h-3.5 stroke-[1.5]" />
              <span>{reminderAt ? new Date(reminderAt).toLocaleDateString() : 'Remind'}</span>
            </button>

            {/* Open Stylus Canvas */}
            <button
              onClick={() => setIsStylusOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-[#FF3D00] text-[#FF3D00] hover:bg-[#FF3D00] hover:text-[#0A0A0A] text-xs font-mono uppercase tracking-wider font-bold transition-colors"
            >
              <PenTool className="w-3.5 h-3.5" />
              <span>Stylus</span>
            </button>

            {/* Convert to Mind Map CTA */}
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

            {/* Zen Mode Toggle */}
            <button
              onClick={() => setIsZenMode(!isZenMode)}
              className={`p-1.5 border transition-colors ${
                isZenMode ? 'border-[#FF3D00] text-[#FF3D00]' : 'border-[#262626] text-[#737373] hover:text-[#FAFAFA]'
              }`}
              title={isZenMode ? 'Exit Zen Mode' : 'Zen Focus Mode'}
            >
              {isZenMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            {/* Delete Note */}
            <button
              onClick={handleDeleteNote}
              className="p-1.5 border border-[#262626] hover:border-[#FF3D00] text-[#737373] hover:text-[#FF3D00] transition-colors"
              title="Delete Note"
            >
              <Trash2 className="w-4 h-4 stroke-[1.5]" />
            </button>
          </div>
        </header>
      )}

      {/* Main Workspace */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-8 flex flex-col space-y-6">
        {/* Title Input */}
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
              <button onClick={() => handleRemoveTag(t)} className="hover:text-[#FF3D00] ml-1">
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

        {/* Rebuilt reactjs-tiptap-editor Workspace */}
        {editor && (
          <RichTextProvider editor={editor} dark={true}>
            <div className="border border-[#262626] bg-[#0F0F0F] shadow-2xl relative min-h-[600px] text-[#FAFAFA]">
              {/* reactjs-tiptap-editor Sticky Toolbar */}
              <div className="sticky top-16 z-40 bg-[#0F0F0F] border-b border-[#262626] p-2 flex flex-wrap items-center gap-1 overflow-visible">
                <RichTextUndo />
                <RichTextRedo />
                <div className="h-4 w-px bg-[#262626] mx-1" />
                <RichTextHeading />
                <RichTextBold />
                <RichTextItalic />
                <RichTextUnderline />
                <RichTextStrike />
                <RichTextColor />
                <RichTextHighlight />
                <div className="h-4 w-px bg-[#262626] mx-1" />
                <RichTextAlign />
                <RichTextBulletList />
                <RichTextOrderedList />
                <RichTextTaskList />
                <RichTextBlockquote />
                <RichTextHorizontalRule />
                <div className="h-4 w-px bg-[#262626] mx-1" />
                <RichTextTable />
                <RichTextCodeBlock />
                <RichTextLink />
                <RichTextImage />
                <RichTextEmoji />
                <RichTextClear />
                <RichTextSearchAndReplace />
              </div>

              {/* Floating Selection Bubble Menus */}
              <RichTextBubbleText />
              <RichTextBubbleTable />
              <RichTextBubbleImage />
              <RichTextBubbleLink />
              <RichTextBubbleCodeBlock />

              {/* Tiptap Core Editor Content */}
              <EditorContent editor={editor} />
            </div>
          </RichTextProvider>
        )}

        {/* Saved Stylus Drawing Canvas Annotation Preview */}
        {stylusDrawingData && (
          <div className="border border-[#262626] bg-[#0F0F0F] p-4 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-[#737373]">
              <span>Stylus Drawing Annotation</span>
              <button onClick={() => setStylusDrawingData(null)} className="hover:text-[#FF3D00]">
                Remove Annotation
              </button>
            </div>
            <img
              src={stylusDrawingData}
              alt="Stylus Drawing"
              className="w-full max-h-96 object-contain border border-[#262626] bg-[#0A0A0A]"
            />
          </div>
        )}
      </main>

      {/* Telemetry Status Footer */}
      {!isZenMode && (
        <footer className="h-10 border-t border-[#262626] bg-[#0F0F0F] px-8 flex items-center justify-between font-mono text-[11px] text-[#737373]">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#FF3D00]" />
              <span>{wordCount} Words</span>
            </span>
            <span>{charCount} Characters</span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>~{readingTime} Min Read</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="uppercase tracking-widest text-[10px]">hunghg255/reactjs-tiptap-editor (MindSpace Dark)</span>
          </div>
        </footer>
      )}

      {/* Stylus Freehand Canvas Modal */}
      <StylusAnnotationCanvas
        isOpen={isStylusOpen}
        onClose={() => setIsStylusOpen(false)}
        initialDrawingData={stylusDrawingData}
        onSaveDrawing={(dataUrl) => setStylusDrawingData(dataUrl)}
      />

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
