'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Underline from '@tiptap/extension-underline';
import Highlight from '@tiptap/extension-highlight';
import ImageExtension from '@tiptap/extension-image';
import LinkExtension from '@tiptap/extension-link';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import Color from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import { common, createLowlight } from 'lowlight';

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
  Sparkles,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Link as LinkIcon,
  Palette,
} from 'lucide-react';

import { StoredNote } from '@/lib/notes-storage';
import { ReminderModal } from '../ui/ReminderModal';
import { StylusAnnotationCanvas } from './StylusAnnotationCanvas';
import { StickerPicker } from './StickerPicker';
import { CustomizableToolbar, DockPosition } from './CustomizableToolbar';

interface AdvancedNoteEditorProps {
  initialNote: StoredNote;
}

const lowlight = createLowlight(common);

export function AdvancedNoteEditor({ initialNote }: AdvancedNoteEditorProps) {
  const router = useRouter();

  // Note Metadata State
  const [title, setTitle] = useState(initialNote.title);
  const [tags, setTags] = useState<string[]>(initialNote.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>(initialNote.priority || 'MEDIUM');
  const [isPinned, setIsPinned] = useState(initialNote.isPinned || false);
  const [reminderAt, setReminderAt] = useState<string | null>(initialNote.reminderAt || null);
  const [stylusDrawingData, setStylusDrawingData] = useState<string | null>(null);

  // Editor View Mode & Toolbar Position
  const [dockPosition, setDockPosition] = useState<DockPosition>('TOP');
  const [isZenMode, setIsZenMode] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [isConverting, setIsConverting] = useState(false);

  // Modals state
  const [isReminderOpen, setIsReminderOpen] = useState(false);
  const [isStylusOpen, setIsStylusOpen] = useState(false);
  const [isStickerOpen, setIsStickerOpen] = useState(false);

  // Initialize Tiptap Editor with Full Extensions
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        codeBlock: false,
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Underline,
      Highlight.configure({
        multicolor: true,
      }),
      ImageExtension.configure({
        allowBase64: true,
      }),
      LinkExtension.configure({
        openOnClick: false,
        autolink: true,
      }),
      CodeBlockLowlight.configure({
        lowlight,
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Placeholder.configure({
        placeholder: "Write your note here or type '/' for formatting commands...",
      }),
      TextStyle,
      Color,
    ],
    content: initialNote.content || '<p></p>',
    onUpdate: () => {
      setSaveStatus('unsaved');
    },
    editorProps: {
      attributes: {
        class:
          'prose prose-invert max-w-none focus:outline-none min-h-[550px] text-base leading-relaxed text-[#FAFAFA] font-sans px-6 py-4',
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
  const textContent = editor?.getText() || '';
  const wordCount = textContent.trim() ? textContent.trim().split(/\s+/).length : 0;
  const charCount = textContent.length;
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

  // Image Upload Handler
  const handleOpenImageUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async () => {
      if (input.files && input.files[0]) {
        const file = input.files[0];
        const formData = new FormData();
        formData.append('file', file);
        try {
          const res = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
          });
          const data = await res.json();
          if (data.url && editor) {
            editor.chain().focus().setImage({ src: data.url }).run();
          }
        } catch (err) {
          console.error('Upload failed:', err);
        }
      }
    };
    input.click();
  };

  // Insert Sticker into Editor
  const handleSelectSticker = (stickerText: string) => {
    if (editor) {
      editor.chain().focus().insertContent(` ${stickerText} `).run();
    }
  };

  return (
    <div
      className={`min-h-screen w-full bg-[#0A0A0A] text-[#FAFAFA] flex flex-col font-sans select-text ${
        isZenMode ? 'fixed inset-0 z-50 overflow-y-auto bg-[#0A0A0A]' : ''
      }`}
    >
      {/* Top Header Control Bar (Hidden in Zen Mode) */}
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

      {/* Dockable Customizable Toolbar */}
      <CustomizableToolbar
        editor={editor}
        dockPosition={dockPosition}
        onPositionChange={setDockPosition}
        onOpenStylus={() => setIsStylusOpen(true)}
        onOpenStickerPicker={() => setIsStickerOpen(true)}
        onOpenImageUpload={handleOpenImageUpload}
        onToggleZenMode={() => setIsZenMode(!isZenMode)}
        isZenMode={isZenMode}
        onConvertToCanvas={handleConvertToCanvas}
        isConverting={isConverting}
      />

      {/* Editor Content Main Workspace */}
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

        {/* Tiptap Rich Text Editor Workspace Container */}
        <div className="border border-[#262626] bg-[#0F0F0F] p-4 shadow-xl relative min-h-[550px]">
          {/* Floating Selection Bubble Menu */}
          {editor && (
            <BubbleMenu
              editor={editor}
              className="bg-[#0F0F0F] border border-[#262626] shadow-2xl p-1 flex items-center gap-1 text-xs font-mono text-[#FAFAFA]"
            >
              <button
                onClick={() => editor.chain().focus().toggleBold().run()}
                className={`p-1.5 transition-colors ${
                  editor.isActive('bold') ? 'bg-[#1A1A1A] text-[#FF3D00]' : 'text-[#737373] hover:text-[#FAFAFA]'
                }`}
                title="Bold"
              >
                <Bold className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={`p-1.5 transition-colors ${
                  editor.isActive('italic') ? 'bg-[#1A1A1A] text-[#FF3D00]' : 'text-[#737373] hover:text-[#FAFAFA]'
                }`}
                title="Italic"
              >
                <Italic className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                className={`p-1.5 transition-colors ${
                  editor.isActive('underline') ? 'bg-[#1A1A1A] text-[#FF3D00]' : 'text-[#737373] hover:text-[#FAFAFA]'
                }`}
                title="Underline"
              >
                <UnderlineIcon className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => editor.chain().focus().toggleStrike().run()}
                className={`p-1.5 transition-colors ${
                  editor.isActive('strike') ? 'bg-[#1A1A1A] text-[#FF3D00]' : 'text-[#737373] hover:text-[#FAFAFA]'
                }`}
                title="Strikethrough"
              >
                <Strikethrough className="w-3.5 h-3.5" />
              </button>
              <div className="h-4 w-px bg-[#262626] mx-0.5" />
              <button
                onClick={() => editor.chain().focus().setColor('#FF3D00').run()}
                className="p-1.5 text-[#FF3D00] hover:scale-110 transition-transform"
                title="Vermillion Highlight"
              >
                <Palette className="w-3.5 h-3.5" />
              </button>
            </BubbleMenu>
          )}

          <EditorContent editor={editor} />
        </div>

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
            <span className="uppercase tracking-widest text-[10px]">Tiptap Pro Suite (Bold Theme)</span>
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

      {/* Sticker & Emoji Picker Modal */}
      <StickerPicker
        isOpen={isStickerOpen}
        onClose={() => setIsStickerOpen(false)}
        onSelectSticker={handleSelectSticker}
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
