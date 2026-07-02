import { common, createLowlight } from 'lowlight';

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
  ShieldCheck,
  Settings,
} from 'lucide-react';

import { StoredNote } from '@/lib/notes-storage';
import { ReminderModal } from '../ui/ReminderModal';
import { EditorSettingsPopover } from './EditorSettingsPopover';
import { ThemeToggle } from '../ui/ThemeToggle';

// Stylus & Digital Ink System Imports
import {
  VectorStroke,
  StylusTool,
  PenSubtype,
  LineType,
  StylusSettings,
  DEFAULT_STYLUS_SETTINGS,
  StylusButtonAction,
} from '@/lib/stylus/stylus-types';
import { NativeStylusCanvas } from './stylus/NativeStylusCanvas';
import { VerticalStylusSidebar } from './stylus/VerticalStylusSidebar';
import { PenSettingsPopover, PenPreset } from './stylus/PenSettingsPopover';
import { ShapeSettingsPopover } from './stylus/ShapeSettingsPopover';
import { HighlighterSettingsPopover } from './stylus/HighlighterSettingsPopover';
import { EraserSettingsPopover } from './stylus/EraserSettingsPopover';
import { LassoSettingsPopover } from './stylus/LassoSettingsPopover';
import { StylusSettingsModal } from './stylus/StylusSettingsModal';
import { useStylusHardware } from '@/hooks/useStylusHardware';
import { recognizeInkToText } from '@/lib/stylus/ink-to-text';

interface AdvancedNoteEditorProps {
  initialNote: StoredNote;
}

const DEFAULT_PEN_BOX_PRESETS: PenPreset[] = [
  { id: 'p1', name: 'White Ballpoint', subtype: 'ballpoint', color: '#FAFAFA', width: 3, lineType: 'solid', smoothing: 'mild' },
  { id: 'p2', name: 'Red Crimson', subtype: 'fountain', color: '#D32F2F', width: 4, lineType: 'solid', smoothing: 'high' },
  { id: 'p3', name: 'Deep Blue', subtype: 'ballpoint', color: '#1976D2', width: 3, lineType: 'solid', smoothing: 'mild' },
  { id: 'p4', name: 'Vermillion Accent', subtype: 'fountain', color: '#FF3D00', width: 5, lineType: 'solid', smoothing: 'high' },
];

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

  // Stylus Vector Stroke & Engine State (OFF by default for normal note editing)
  const [activeTool, setActiveTool] = useState<StylusTool>('pen');
  const [activePenSubtype, setActivePenSubtype] = useState<PenSubtype>('ballpoint');
  const [activeColor, setActiveColor] = useState<string>('#FF3D00');
  const [strokeWidth, setStrokeWidth] = useState<number>(3);
  const [lineType, setLineType] = useState<LineType>('solid');
  const [stylusSettings, setStylusSettings] = useState<StylusSettings>({
    ...DEFAULT_STYLUS_SETTINGS,
    isStylusModeActive: false, // Default to normal note editor
  });
  const [strokes, setStrokes] = useState<VectorStroke[]>([]);
  const [undoStack, setUndoStack] = useState<VectorStroke[][]>([]);
  const [redoStack, setRedoStack] = useState<VectorStroke[][]>([]);

  // Pen Box Presets & Popover State
  const [isPenPopoverOpen, setIsPenPopoverOpen] = useState(false);
  const [isShapePopoverOpen, setIsShapePopoverOpen] = useState(false);
  const [isHighlighterPopoverOpen, setIsHighlighterPopoverOpen] = useState(false);
  const [isEraserPopoverOpen, setIsEraserPopoverOpen] = useState(false);
  const [isLassoPopoverOpen, setIsLassoPopoverOpen] = useState(false);
  const [penBoxPresets, setPenBoxPresets] = useState<PenPreset[]>(DEFAULT_PEN_BOX_PRESETS);

  // Editor View Mode & Status
  const [isZenMode, setIsZenMode] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [isConverting, setIsConverting] = useState(false);

  // Modals & Popovers state
  const [isReminderOpen, setIsReminderOpen] = useState(false);
  const [isStylusSettingsOpen, setIsStylusSettingsOpen] = useState(false);
  const [isEditorSettingsOpen, setIsEditorSettingsOpen] = useState(false);

  // Configure Extensions from reactjs-tiptap-editor
  const extensions = useMemo(() => {
    let lowlightInstance;
    try {
      lowlightInstance = createLowlight(common);
    } catch (e) {
      console.warn('[Tiptap Lowlight Warning]: Using default code block styling.', e);
    }

    return [
      StarterKit.configure({
        bold: false,
        italic: false,
        strike: false,
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
      lowlightInstance ? CodeBlock.configure({ lowlight: lowlightInstance }) : CodeBlock,
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
          'prose prose-invert max-w-none focus:outline-none min-h-[650px] text-base leading-relaxed text-[#FAFAFA] font-sans p-8',
      },
    },
  });

  // Undo / Redo Stacks for Vector Strokes
  const handleStrokesChange = (nextStrokes: VectorStroke[]) => {
    setUndoStack((prev) => [...prev, strokes]);
    setRedoStack([]);
    setStrokes(nextStrokes);
    setSaveStatus('unsaved');
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setRedoStack((prev) => [...prev, strokes]);
    setStrokes(previous);
    setUndoStack((prev) => prev.slice(0, prev.length - 1));
    setSaveStatus('unsaved');
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack((prev) => [...prev, strokes]);
    setStrokes(next);
    setRedoStack((prev) => prev.slice(0, prev.length - 1));
    setSaveStatus('unsaved');
  };

  const handleClearStrokes = () => {
    if (confirm('Clear all freehand stylus strokes on this note?')) {
      handleStrokesChange([]);
    }
  };

  // Select Preset from Pen Box
  const handleSelectPreset = (preset: PenPreset) => {
    setActivePenSubtype(preset.subtype);
    setActiveColor(preset.color);
    setStrokeWidth(preset.width);
    setLineType(preset.lineType);
    setStylusSettings((prev) => ({ ...prev, smoothingLevel: preset.smoothing }));
    setActiveTool('pen');
  };

  // Add Preset to Pen Box
  const handleAddToPenBox = (preset: PenPreset) => {
    setPenBoxPresets((prev) => [...prev, preset]);
    setIsPenPopoverOpen(false);
  };

  // Convert Ink to Text OCR Callback
  const handleConvertInkToText = async () => {
    if (!strokes.length || !editor) return;
    const result = await recognizeInkToText(strokes);
    if (result && result.text) {
      editor.chain().focus().insertContent(`<p><strong>[Handwritten Ink]:</strong> ${result.text}</p>`).run();
      setSaveStatus('unsaved');
    }
  };

  // Hardware Button Event Handler via Hook
  const handleHardwareAction = useCallback((action: StylusButtonAction) => {
    switch (action) {
      case 'toggle_eraser':
        setActiveTool((prev) => (prev === 'eraser' ? 'pen' : 'eraser'));
        break;
      case 'undo':
        handleUndo();
        break;
      case 'redo':
        handleRedo();
        break;
      case 'cycle_color':
        setActiveColor((prev) => (prev === '#FF3D00' ? '#FAFAFA' : prev === '#FAFAFA' ? '#4285F4' : '#FF3D00'));
        break;
      case 'clear_ink':
        handleClearStrokes();
        break;
      case 'convert_text':
        handleConvertInkToText();
        break;
    }
  }, [strokes, editor]);

  useStylusHardware({
    settings: stylusSettings,
    onExecuteAction: handleHardwareAction,
  });

  // Deserialize initial drawing data
  useEffect(() => {
    if (initialNote.drawingData) {
      try {
        const parsed = JSON.parse(initialNote.drawingData);
        if (Array.isArray(parsed)) {
          setStrokes(parsed);
        }
      } catch (err) {
        console.error('Failed to parse drawing data:', err);
      }
    }
  }, [initialNote.drawingData]);

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
            drawingData: JSON.stringify(strokes),
            ...updatedFields,
          }),
        });
        setSaveStatus('saved');
      } catch (err) {
        console.error('Auto-save failed:', err);
        setSaveStatus('unsaved');
      }
    },
    [editor, initialNote.id, title, tags, priority, isPinned, reminderAt, strokes]
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

  // Export Note as Markdown file
  const handleExportMarkdown = () => {
    if (!editor) return;
    const textContent = editor.getText();
    const blob = new Blob([`# ${title}\n\n${textContent}`], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.toLowerCase().replace(/\s+/g, '-') || 'note'}.md`;
    a.click();
    URL.revokeObjectURL(url);
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
      {/* Vertical Stylus Sidebar Dock (ONLY visible when Stylus Mode is ACTIVE) */}
      {stylusSettings.isStylusModeActive && (
        <VerticalStylusSidebar
          activeTool={activeTool}
          onSelectTool={setActiveTool}
          onTogglePenPopover={() => {
            setIsPenPopoverOpen(!isPenPopoverOpen);
            setIsShapePopoverOpen(false);
            setIsHighlighterPopoverOpen(false);
            setIsEraserPopoverOpen(false);
            setIsLassoPopoverOpen(false);
          }}
          onClosePenPopover={() => {
            setIsPenPopoverOpen(false);
            setIsHighlighterPopoverOpen(false);
            setIsEraserPopoverOpen(false);
            setIsLassoPopoverOpen(false);
          }}
          onToggleHighlighterPopover={() => {
            setIsHighlighterPopoverOpen(!isHighlighterPopoverOpen);
            setIsPenPopoverOpen(false);
            setIsShapePopoverOpen(false);
            setIsEraserPopoverOpen(false);
            setIsLassoPopoverOpen(false);
          }}
          onToggleEraserPopover={() => {
            setIsEraserPopoverOpen(!isEraserPopoverOpen);
            setIsPenPopoverOpen(false);
            setIsHighlighterPopoverOpen(false);
            setIsShapePopoverOpen(false);
            setIsLassoPopoverOpen(false);
          }}
          onToggleLassoPopover={() => {
            setIsLassoPopoverOpen(!isLassoPopoverOpen);
            setIsPenPopoverOpen(false);
            setIsHighlighterPopoverOpen(false);
            setIsEraserPopoverOpen(false);
            setIsShapePopoverOpen(false);
          }}
          onToggleShapePopover={() => {
            setIsShapePopoverOpen(!isShapePopoverOpen);
            setIsPenPopoverOpen(false);
            setIsHighlighterPopoverOpen(false);
            setIsEraserPopoverOpen(false);
            setIsLassoPopoverOpen(false);
          }}
          settings={stylusSettings}
          onToggleStylusMode={() =>
            setStylusSettings((prev) => ({
              ...prev,
              isStylusModeActive: !prev.isStylusModeActive,
            }))
          }
          onUndo={handleUndo}
          onRedo={handleRedo}
        />
      )}

      {/* Pen Popover Settings */}
      {stylusSettings.isStylusModeActive && (
        <PenSettingsPopover
          isOpen={isPenPopoverOpen}
          onClose={() => setIsPenPopoverOpen(false)}
          activePenSubtype={activePenSubtype}
          onSelectPenSubtype={setActivePenSubtype}
          activeColor={activeColor}
          onChangeColor={setActiveColor}
          strokeWidth={strokeWidth}
          onChangeWidth={setStrokeWidth}
          lineType={lineType}
          onChangeLineType={setLineType}
          settings={stylusSettings}
          onUpdateSettings={(newSettings) => setStylusSettings((prev) => ({ ...prev, ...newSettings }))}
        />
      )}

      {/* Highlighter Popover Settings */}
      {stylusSettings.isStylusModeActive && (
        <HighlighterSettingsPopover
          isOpen={isHighlighterPopoverOpen}
          onClose={() => setIsHighlighterPopoverOpen(false)}
          activeColor={activeColor}
          onChangeColor={setActiveColor}
          settings={stylusSettings}
          onUpdateSettings={(newSettings) => setStylusSettings((prev) => ({ ...prev, ...newSettings }))}
        />
      )}

      {/* Eraser Popover Settings */}
      {stylusSettings.isStylusModeActive && (
        <EraserSettingsPopover
          isOpen={isEraserPopoverOpen}
          onClose={() => setIsEraserPopoverOpen(false)}
          settings={stylusSettings}
          onUpdateSettings={(newSettings) => setStylusSettings((prev) => ({ ...prev, ...newSettings }))}
        />
      )}

      {/* Lasso Popover Settings */}
      {stylusSettings.isStylusModeActive && (
        <LassoSettingsPopover
          isOpen={isLassoPopoverOpen}
          onClose={() => setIsLassoPopoverOpen(false)}
          settings={stylusSettings}
          onUpdateSettings={(newSettings) => setStylusSettings((prev) => ({ ...prev, ...newSettings }))}
        />
      )}

      {/* Auto-Shape Popover Settings */}
      {stylusSettings.isStylusModeActive && (
        <ShapeSettingsPopover
          isOpen={isShapePopoverOpen}
          onClose={() => setIsShapePopoverOpen(false)}
          settings={stylusSettings}
          onUpdateSettings={(newSettings) => setStylusSettings((prev) => ({ ...prev, ...newSettings }))}
        />
      )}

      {/* Top Header Control Bar */}
      {!isZenMode && (
        <header className="min-h-[3.5rem] border-b border-[#262626] bg-[#0A0A0A]/95 px-3 sm:px-6 py-2 sm:py-0 flex items-center justify-between sticky top-0 z-40 font-sans gap-2 overflow-x-auto no-scrollbar">
          {/* Left Section: Back, Title, Save Status */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              onClick={() => router.push('/dashboard')}
              className="p-1.5 border border-[#262626] hover:border-[#FAFAFA] text-[#737373] hover:text-[#FAFAFA] transition-colors"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-4 h-4 stroke-[1.5]" />
            </button>

            <div className="h-4 w-px bg-[#262626]" />

            <span className="font-mono text-xs uppercase tracking-wider text-[#FAFAFA] font-bold truncate max-w-[100px] sm:max-w-[200px]">
              {title || 'Untitled Note'}
            </span>

            <div className="h-4 w-px bg-[#262626] hidden sm:block" />

            {/* Auto-save Status Badge */}
            <div className="hidden sm:flex items-center gap-1.5 font-mono text-[11px]">
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

          {/* Center Section: Prominent Sleek Stylus Mode Pill Toggle */}
          <div className="flex items-center justify-center shrink-0">
            <button
              onClick={() => {
                const nextActive = !stylusSettings.isStylusModeActive;
                setStylusSettings((prev) => ({
                  ...prev,
                  isStylusModeActive: nextActive,
                }));
                if (!nextActive) {
                  setIsPenPopoverOpen(false);
                  setIsHighlighterPopoverOpen(false);
                  setIsEraserPopoverOpen(false);
                  setIsShapePopoverOpen(false);
                }
              }}
              className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full border text-[11px] sm:text-xs font-mono uppercase tracking-wider font-bold transition-all duration-200 ${
                stylusSettings.isStylusModeActive
                  ? 'border-[#FF3D00] bg-[#FF3D00]/15 text-[#FF3D00] shadow-md shadow-[#FF3D00]/20'
                  : 'border-[#262626] bg-[#0F0F0F] text-[#737373] hover:text-[#FAFAFA] hover:border-[#737373]'
              }`}
              title="Toggle Stylus Mode (Drawing Overlay)"
            >
              <span
                className={`w-2 h-2 rounded-full transition-all ${
                  stylusSettings.isStylusModeActive ? 'bg-[#FF3D00] animate-pulse shadow-sm shadow-[#FF3D00]' : 'bg-[#737373]'
                }`}
              />
              <PenTool className="w-3.5 h-3.5" />
              <span>{stylusSettings.isStylusModeActive ? 'Stylus ON' : 'Stylus'}</span>
            </button>
          </div>

          {/* Right Section: Compact Icon Toolbar */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Convert to Mind Map CTA */}
            <button
              onClick={handleConvertToCanvas}
              disabled={isConverting}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FF3D00] hover:bg-[#FAFAFA] text-[#0A0A0A] text-xs font-mono uppercase tracking-wider font-bold transition-colors"
              title="Convert Note to Visual Mind Map Canvas"
            >
              {isConverting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Network className="w-3.5 h-3.5 stroke-[2]" />
              )}
              <span className="hidden sm:inline">Convert Mind Map</span>
            </button>

            {/* Pin Toggle Button */}
            <button
              onClick={() => {
                const nextPinned = !isPinned;
                setIsPinned(nextPinned);
                saveNote({ isPinned: nextPinned });
              }}
              className={`p-2 border transition-colors ${
                isPinned ? 'border-[#FF3D00] bg-[#FF3D00]/10 text-[#FF3D00]' : 'border-[#262626] text-[#737373] hover:text-[#FAFAFA]'
              }`}
              title={isPinned ? 'Unpin Note' : 'Pin Note'}
            >
              <Pin className="w-3.5 h-3.5 stroke-[1.5]" />
            </button>

            {/* Set Reminder Button */}
            <button
              onClick={() => setIsReminderOpen(true)}
              className={`p-2 border transition-colors ${
                reminderAt ? 'border-[#FF3D00] bg-[#FF3D00]/10 text-[#FF3D00]' : 'border-[#262626] text-[#737373] hover:text-[#FAFAFA]'
              }`}
              title={reminderAt ? `Reminder: ${new Date(reminderAt).toLocaleDateString()}` : 'Set Note Reminder'}
            >
              <Bell className="w-3.5 h-3.5 stroke-[1.5]" />
            </button>

            {/* Full Screen Immersion Toggle */}
            <button
              onClick={() => setIsZenMode(!isZenMode)}
              className={`p-2 border transition-colors ${
                isZenMode ? 'border-[#FF3D00] text-[#FF3D00]' : 'border-[#262626] text-[#737373] hover:text-[#FAFAFA]'
              }`}
              title={isZenMode ? 'Exit Full Screen' : 'Full Screen Immersive Focus'}
            >
              {isZenMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>

            {/* Settings & Overflow Dropdown Trigger Button */}
            <button
              onClick={() => setIsEditorSettingsOpen(!isEditorSettingsOpen)}
              className={`p-2 border transition-colors editor-settings-trigger ${
                isEditorSettingsOpen
                  ? 'border-[#FF3D00] bg-[#1A1A1A] text-[#FF3D00]'
                  : 'border-[#262626] text-[#737373] hover:text-[#FAFAFA]'
              }`}
              title="More Note Settings"
            >
              <Settings className="w-3.5 h-3.5 stroke-[1.5]" />
            </button>
          </div>
        </header>
      )}

      {/* Editor Settings Overflow Popover */}
      <EditorSettingsPopover
        isOpen={isEditorSettingsOpen}
        onClose={() => setIsEditorSettingsOpen(false)}
        priority={priority}
        onChangePriority={(p) => {
          setPriority(p);
          saveNote({ priority: p });
        }}
        onExportMarkdown={handleExportMarkdown}
        onDeleteNote={handleDeleteNote}
      />

      {/* Floating Exit Full Screen Button (ONLY visible when Full Screen Immersive Mode is Active) */}
      {isZenMode && (
        <button
          onClick={() => setIsZenMode(false)}
          className="fixed top-4 right-6 z-50 flex items-center gap-2 px-3 py-1.5 bg-[#0A0A0A]/90 border border-[#FF3D00] text-[#FF3D00] hover:bg-[#FF3D00] hover:text-[#0A0A0A] text-xs font-mono uppercase tracking-wider font-bold transition-all shadow-xl"
          title="Exit Full Screen Mode (or press Esc)"
        >
          <Minimize2 className="w-3.5 h-3.5" />
          <span>Exit Full Screen</span>
        </button>
      )}

      {/* Main Workspace */}
      <main
        className={`flex-1 max-w-5xl w-full mx-auto p-8 flex flex-col space-y-6 transition-all duration-200 ${
          stylusSettings.isStylusModeActive ? 'pl-16' : 'pl-8'
        }`}
      >
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

        {/* Editor Workspace Container */}
        {editor && (
          <RichTextProvider editor={editor}>
            <div className="border border-[#262626] bg-[#0F0F0F] shadow-2xl relative min-h-[650px] text-[#FAFAFA]">
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

              {/* Native Freehand Stylus Overlay Canvas (Completely DISABLED & non-interactive when Stylus Mode is OFF) */}
              <NativeStylusCanvas
                isActive={stylusSettings.isStylusModeActive}
                activeTool={activeTool}
                activePenSubtype={activePenSubtype}
                activeColor={activeColor}
                strokeWidth={strokeWidth}
                lineType={lineType}
                settings={stylusSettings}
                strokes={strokes}
                onStrokesChange={handleStrokesChange}
              />
            </div>
          </RichTextProvider>
        )}
      </main>

      {/* Telemetry Status Footer */}
      {!isZenMode && (
        <footer
          className={`h-10 border-t border-[#262626] bg-[#0F0F0F] px-8 flex items-center justify-between font-mono text-[11px] text-[#737373] fixed bottom-0 left-0 right-0 z-30 transition-all duration-200 ${
            stylusSettings.isStylusModeActive ? 'pl-20' : 'pl-8'
          }`}
        >
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
            <span className="uppercase tracking-widest text-[10px]">
              {stylusSettings.isStylusModeActive ? 'Stylus Mode (Active)' : 'Normal Text Editor Mode'}
            </span>
          </div>
        </footer>
      )}

      {/* Hardware Button & Gesture Settings Drawer */}
      <StylusSettingsModal
        isOpen={isStylusSettingsOpen}
        onClose={() => setIsStylusSettingsOpen(false)}
        settings={stylusSettings}
        onUpdateSettings={(newSettings) =>
          setStylusSettings((prev) => ({ ...prev, ...newSettings }))
        }
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
