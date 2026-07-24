import { common, createLowlight } from 'lowlight';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

import { RichTextProvider } from 'reactjs-tiptap-editor';
import * as Tooltip from '@radix-ui/react-tooltip';
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

import { Emoji, RichTextEmoji } from 'reactjs-tiptap-editor/emoji';
import { History, RichTextUndo, RichTextRedo } from 'reactjs-tiptap-editor/history';
import { Clear, RichTextClear } from 'reactjs-tiptap-editor/clear';
import { HorizontalRule, RichTextHorizontalRule } from 'reactjs-tiptap-editor/horizontalrule';
import { SearchAndReplace, RichTextSearchAndReplace } from 'reactjs-tiptap-editor/searchandreplace';
import { SlashCommand } from 'reactjs-tiptap-editor/slashcommand';

import {
  RichTextBubbleText,
  RichTextBubbleImage,
  RichTextBubbleLink,
  RichTextBubbleCodeBlock,
} from 'reactjs-tiptap-editor/bubble';

import { CanvasTableExtension } from './table/CanvasTableExtension';
import { InsertTableModal } from './table/InsertTableModal';



import {
  ArrowLeft,
  Check,
  Loader2,
  Bell,
  Sparkles,
  Share2,
  Trash2,
  Tag,
  PenTool,
  Settings2,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Crosshair,
  FileText,
  MousePointer,
  Highlighter,
  Eraser,
  Table,
  Network,
  Pin,
  Maximize2,
  Minimize2,
  MoreHorizontal,
  Clock,
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
  NotePageData,
  PaperTemplate,
} from '@/lib/stylus/stylus-types';
import { NativeStylusCanvas } from './stylus/NativeStylusCanvas';
import { VerticalStylusSidebar } from './stylus/VerticalStylusSidebar';
import { PageNavigationBar } from './PageNavigationBar';
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

  // Multi-Page Notebook State
  const initialPages: NotePageData[] = initialNote.pages && initialNote.pages.length > 0
    ? initialNote.pages
    : [
      {
        id: 'p-1',
        pageNumber: 1,
        content: initialNote.content || '<p></p>',
        strokes: [],
        paperTemplate: 'blank',
      },
    ];

  const [pages, setPages] = useState<NotePageData[]>(initialPages);
  const [activePageIndex, setActivePageIndex] = useState<number>(0);

  // Sidebar Visibility State (Controlled by Top Header Stylus Mode Toggle)
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);

  // Stylus Vector Stroke & Engine State
  const [activeTool, setActiveTool] = useState<StylusTool>('pen');
  const [activePenSubtype, setActivePenSubtype] = useState<PenSubtype>('ballpoint');
  const [activeColor, setActiveColor] = useState<string>('#FF3D00');
  const [strokeWidth, setStrokeWidth] = useState<number>(3);
  const [lineType, setLineType] = useState<LineType>('solid');
  const [stylusSettings, setStylusSettings] = useState<StylusSettings>({
    ...DEFAULT_STYLUS_SETTINGS,
    isStylusModeActive: true,
    stylusOnlyMode: false,
  });
  const [strokes, setStrokes] = useState<VectorStroke[]>(initialPages[0]?.strokes || []);
  const [undoStack, setUndoStack] = useState<VectorStroke[][]>([]);
  const [redoStack, setRedoStack] = useState<VectorStroke[][]>([]);

  // Mode Auto-Switching Helpers
  const handleActivateStylusMode = () => {
    setStylusSettings((prev) => ({ ...prev, isStylusModeActive: true }));
    if (editor && !editor.isDestroyed) {
      editor.setEditable(false);
    }
  };

  const handleDeactivateStylusMode = () => {
    setStylusSettings((prev) => ({ ...prev, isStylusModeActive: false }));
    if (editor && !editor.isDestroyed) {
      editor.setEditable(true);
      editor.commands.focus();
    }
  };

  // Pen Box Presets & Popover State
  const [isPenPopoverOpen, setIsPenPopoverOpen] = useState(false);
  const [isShapePopoverOpen, setIsShapePopoverOpen] = useState(false);
  const [isHighlighterPopoverOpen, setIsHighlighterPopoverOpen] = useState(false);
  const [isEraserPopoverOpen, setIsEraserPopoverOpen] = useState(false);
  const [isLassoPopoverOpen, setIsLassoPopoverOpen] = useState(false);
  const [penBoxPresets, setPenBoxPresets] = useState<PenPreset[]>(DEFAULT_PEN_BOX_PRESETS);

  // Editor View Mode & Native Full Screen Status
  const [isZenMode, setIsZenMode] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');

  // Canvas Zoom & Center Lock
  const [canvasZoom, setCanvasZoom] = useState(1.0);
  const [lockCenter, setLockCenter] = useState(true);
  const [isConverting, setIsConverting] = useState(false);
  const [isInsertTableOpen, setIsInsertTableOpen] = useState(false);



  // Native HTML5 Fullscreen API Toggle
  const toggleFullScreen = async () => {
    try {
      if (!document.fullscreenElement) {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        }
        setIsZenMode(true);
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
        setIsZenMode(false);
      }
    } catch (err) {
      console.error('Fullscreen toggle error:', err);
      setIsZenMode((prev) => !prev);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsZenMode(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);



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
      CanvasTableExtension,
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

  // Toggle Tiptap editor editability dynamically when switching between Text Edit Mode and Stylus Drawing Mode
  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      editor.setEditable(!stylusSettings.isStylusModeActive);
    }
  }, [editor, stylusSettings.isStylusModeActive]);

  // Synchronize Text Formatting Toolbar buttons' active state dynamically with actual TipTap editor state
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;

    const updateToolbarActiveStates = () => {
      const row2 = document.querySelector('.note-editor-toolbar-row2');
      if (!row2) return;

      const rawTaskList = editor.isActive('taskList');
      const rawBulletList = editor.isActive('bulletList');
      const rawOrderedList = editor.isActive('orderedList');

      // Enforce strict single-active priority: only ONE list type can be active at any given moment
      let taskListActive = false;
      let bulletListActive = false;
      let orderedListActive = false;

      if (rawTaskList) {
        taskListActive = true;
      } else if (rawBulletList) {
        bulletListActive = true;
      } else if (rawOrderedList) {
        orderedListActive = true;
      }

      const activeStates: Record<string, boolean> = {
        taskList: taskListActive,
        bulletList: bulletListActive,
        orderedList: orderedListActive,
        blockquote: editor.isActive('blockquote'),
        codeBlock: editor.isActive('codeBlock'),
        bold: editor.isActive('bold'),
        italic: editor.isActive('italic'),
        underline: editor.isActive('underline'),
        strike: editor.isActive('strike'),
        highlight: editor.isActive('highlight'),
        heading: editor.isActive('heading'),
        link: editor.isActive('link'),
        table: editor.isActive('canvasTable') || editor.isActive('table'),
      };

      const buttons = row2.querySelectorAll('button');
      buttons.forEach((btn) => {
        const svg = btn.querySelector('svg');
        const svgHTML = svg ? svg.outerHTML : btn.innerHTML;
        const ariaLabel = (btn.getAttribute('aria-label') || btn.getAttribute('title') || btn.textContent || '').toLowerCase();
        const btnId = btn.id;

        // Horizontal Rule and Text Alignment buttons must NEVER maintain an active red state color
        if (
          svgHTML.includes('lucide-minus') ||
          svgHTML.includes('lucide-align') ||
          ariaLabel.includes('align') ||
          ariaLabel.includes('horizontal') ||
          ariaLabel.includes('divider') ||
          ariaLabel.includes('rule')
        ) {
          if (btn.getAttribute('data-state') !== 'off') {
            btn.setAttribute('data-state', 'off');
          }
          return;
        }

        let isActive = false;
        let matched = false;

        if (btnId === 'insert-canvas-table-btn' || svgHTML.includes('lucide-table') || ariaLabel.includes('table')) {
          isActive = activeStates.table;
          matched = true;
        } else if (svgHTML.includes('lucide-list-todo') || ariaLabel.includes('task') || ariaLabel.includes('todo') || ariaLabel.includes('checklist')) {
          isActive = activeStates.taskList;
          matched = true;
        } else if (svgHTML.includes('lucide-list-ordered') || ariaLabel.includes('ordered') || ariaLabel.includes('numbered')) {
          isActive = activeStates.orderedList;
          matched = true;
        } else if ((svgHTML.includes('lucide-list') && !svgHTML.includes('lucide-list-todo') && !svgHTML.includes('lucide-list-ordered')) || ariaLabel.includes('bullet')) {
          isActive = activeStates.bulletList;
          matched = true;
        } else if (svgHTML.includes('lucide-quote') || ariaLabel.includes('quote') || ariaLabel.includes('blockquote')) {
          isActive = activeStates.blockquote;
          matched = true;
        } else if (svgHTML.includes('lucide-code-xml') || svgHTML.includes('lucide-code') || ariaLabel.includes('code block') || ariaLabel.includes('codeblock')) {
          isActive = activeStates.codeBlock;
          matched = true;
        } else if (svgHTML.includes('lucide-bold') || ariaLabel.includes('bold')) {
          isActive = activeStates.bold;
          matched = true;
        } else if (svgHTML.includes('lucide-italic') || ariaLabel.includes('italic')) {
          isActive = activeStates.italic;
          matched = true;
        } else if (svgHTML.includes('lucide-underline') || ariaLabel.includes('underline')) {
          isActive = activeStates.underline;
          matched = true;
        } else if (svgHTML.includes('lucide-strikethrough') || ariaLabel.includes('strike')) {
          isActive = activeStates.strike;
          matched = true;
        } else if (svgHTML.includes('lucide-highlighter') || ariaLabel.includes('highlight')) {
          isActive = activeStates.highlight;
          matched = true;
        } else if (svgHTML.includes('lucide-heading') || ariaLabel.includes('heading')) {
          isActive = activeStates.heading;
          matched = true;
        } else if (svgHTML.includes('lucide-link') || ariaLabel.includes('link')) {
          isActive = activeStates.link;
          matched = true;
        }

        if (matched) {
          const nextState = isActive ? 'on' : 'off';
          if (btn.getAttribute('data-state') !== nextState) {
            btn.setAttribute('data-state', nextState);
          }
        }
      });
    };

    // Run initial sync
    updateToolbarActiveStates();

    // Subscribe to TipTap events for real-time reactive sync
    editor.on('selectionUpdate', updateToolbarActiveStates);
    editor.on('transaction', updateToolbarActiveStates);
    editor.on('update', updateToolbarActiveStates);
    editor.on('focus', updateToolbarActiveStates);
    editor.on('blur', updateToolbarActiveStates);

    return () => {
      editor.off('selectionUpdate', updateToolbarActiveStates);
      editor.off('transaction', updateToolbarActiveStates);
      editor.off('update', updateToolbarActiveStates);
      editor.off('focus', updateToolbarActiveStates);
      editor.off('blur', updateToolbarActiveStates);
    };
  }, [editor]);




  // Undo / Redo Stacks for Vector Strokes
  const handleStrokesChange = (nextStrokes: VectorStroke[]) => {
    setUndoStack((prev) => [...prev, strokes]);
    setRedoStack([]);
    setStrokes(nextStrokes);

    // Sync strokes with active page
    setPages((prev) => {
      const updated = [...prev];
      if (updated[activePageIndex]) {
        updated[activePageIndex] = {
          ...updated[activePageIndex],
          strokes: nextStrokes,
        };
      }
      return updated;
    });

    setSaveStatus('unsaved');
  };

  // Multi-Page Switching & Mutation Handlers
  const handleSelectPage = (newIndex: number) => {
    if (newIndex < 0 || newIndex >= pages.length || newIndex === activePageIndex) return;

    const currentHtml = editor ? editor.getHTML() : content;
    const updatedPages = [...pages];
    updatedPages[activePageIndex] = {
      ...updatedPages[activePageIndex],
      content: currentHtml,
      strokes: strokes,
    };

    setPages(updatedPages);
    setActivePageIndex(newIndex);

    const targetPage = updatedPages[newIndex];
    if (editor && !editor.isDestroyed) {
      editor.commands.setContent(targetPage.content || '<p></p>');
    }
    setStrokes(targetPage.strokes || []);
    setUndoStack([]);
    setRedoStack([]);
  };

  const handleAddPage = () => {
    const newPage: NotePageData = {
      id: `p-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      pageNumber: pages.length + 1,
      content: '<p></p>',
      strokes: [],
      paperTemplate: pages[activePageIndex]?.paperTemplate || 'blank',
    };
    const nextPages = [...pages, newPage];
    setPages(nextPages);
    handleSelectPage(nextPages.length - 1);
  };

  const handleDuplicatePage = (targetIndex: number) => {
    const pageToDup = pages[targetIndex];
    if (!pageToDup) return;

    const dupPage: NotePageData = {
      id: `p-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      pageNumber: targetIndex + 2,
      content: targetIndex === activePageIndex && editor ? editor.getHTML() : pageToDup.content,
      strokes: targetIndex === activePageIndex ? [...strokes] : [...(pageToDup.strokes || [])],
      paperTemplate: pageToDup.paperTemplate,
    };

    const nextPages = [...pages];
    nextPages.splice(targetIndex + 1, 0, dupPage);
    const reindexed = nextPages.map((p, idx) => ({ ...p, pageNumber: idx + 1 }));
    setPages(reindexed);
    handleSelectPage(targetIndex + 1);
  };

  const handleDeletePage = (targetIndex: number) => {
    if (pages.length <= 1) return;
    const nextPages = pages.filter((_, idx) => idx !== targetIndex);
    const reindexed = nextPages.map((p, idx) => ({ ...p, pageNumber: idx + 1 }));
    setPages(reindexed);
    const newActive = Math.min(activePageIndex, reindexed.length - 1);
    setActivePageIndex(newActive);
    const target = reindexed[newActive];
    if (editor && !editor.isDestroyed) {
      editor.commands.setContent(target.content || '<p></p>');
    }
    setStrokes(target.strokes || []);
  };

  const handleChangePaperTemplate = (tmpl: PaperTemplate) => {
    const nextPages = [...pages];
    nextPages[activePageIndex] = {
      ...nextPages[activePageIndex],
      paperTemplate: tmpl,
    };
    setPages(nextPages);
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
        const currentPages = [...pages];
        if (currentPages[activePageIndex]) {
          currentPages[activePageIndex] = {
            ...currentPages[activePageIndex],
            content: htmlContent,
            strokes: strokes,
          };
        }

        await fetch(`/api/notes/${initialNote.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            content: htmlContent,
            pages: currentPages,
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
    [editor, initialNote.id, title, pages, activePageIndex, tags, priority, isPinned, reminderAt, strokes]
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
      className={`note-editor-root min-h-screen w-full bg-[#0A0A0A] text-[#FAFAFA] flex flex-col font-sans select-text ${isZenMode ? 'fixed inset-0 z-[90] overflow-y-auto bg-[#0A0A0A]' : ''
        }`}
    >
      {/* Vertical Stylus Sidebar Dock */}
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
        onActivateStylusMode={handleActivateStylusMode}
        onDeactivateStylusMode={handleDeactivateStylusMode}
        onUndo={handleUndo}
        onRedo={handleRedo}
        isSidebarVisible={isSidebarVisible}
      />

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
        <header className="note-editor-header h-14 border-b border-[#262626] bg-[#0A0A0A]/98 backdrop-blur-md flex items-center justify-between sticky top-0 z-[40] font-sans overflow-x-auto no-scrollbar shrink-0">
          {/* Back Button Box — 100% aligned with left sidebar width (w-12 / 48px) */}
          <div className="w-12 h-14 shrink-0 flex items-center justify-center border-r border-[#262626] bg-[#0F0F0F]">
            <button
              onClick={() => router.push('/dashboard')}
              className="p-2 text-[#737373] hover:text-[#FAFAFA] hover:bg-[#1E1E1E] rounded-md transition-colors flex items-center justify-center"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-4 h-4 stroke-[1.5]" />
            </button>
          </div>

          {/* Right Header Controls Container */}
          <div className="flex items-center justify-between flex-1 min-w-0 px-3 sm:px-4 h-full gap-2">
            {/* Left Section: Inline Editable Title + Save Badge */}
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              {/* Inline Editable Title */}
              <input
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setSaveStatus('unsaved');
                }}
                placeholder="Untitled Note"
                className="bg-transparent font-sans font-bold text-sm tracking-tight text-[#FAFAFA] focus:outline-none placeholder:text-[#3a3a3a] min-w-0 flex-1 max-w-[320px] truncate hover:bg-[#1A1A1A]/50 focus:bg-[#1A1A1A]/80 px-2 py-1 transition-colors cursor-text"
                title="Click to rename note"
              />

              {/* Auto-save Status Badge */}
              <div className="hidden sm:flex items-center gap-1.5 font-mono text-[10px] shrink-0">
                {saveStatus === 'saving' ? (
                  <span className="flex items-center gap-1 text-[#FF3D00]">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span className="hidden md:inline">Saving</span>
                  </span>
                ) : saveStatus === 'saved' ? (
                  <span className="flex items-center gap-1 text-[#737373]">
                    <Check className="w-3 h-3 text-[#10b981]" />
                    <span className="hidden md:inline text-[#737373]">Saved</span>
                  </span>
                ) : (
                  <span className="text-[#FF3D00] text-[10px]">Unsaved</span>
                )}
              </div>
            </div>

            {/* Center Section: Stylus Tools Master Visibility Toggle */}
            <div className="flex items-center justify-center shrink-0">
              <button
                onClick={() => {
                  const nextVisible = !isSidebarVisible;
                  setIsSidebarVisible(nextVisible);
                  if (nextVisible) {
                    handleActivateStylusMode();
                  } else {
                    handleDeactivateStylusMode();
                  }
                }}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 rounded-full border text-[10px] sm:text-[11px] font-mono uppercase tracking-widest font-bold transition-all duration-200 ${isSidebarVisible
                    ? 'border-[#FF3D00] bg-[#FF3D00]/10 text-[#FF3D00] shadow-lg shadow-[#FF3D00]/15'
                    : 'border-[#262626] bg-[#0F0F0F] text-[#737373] hover:text-[#FAFAFA] hover:border-[#404040]'
                  }`}
                title="Toggle Stylus Sidebar Dock Visibility"
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full transition-all ${isSidebarVisible ? 'bg-[#FF3D00] shadow-sm shadow-[#FF3D00]' : 'bg-[#737373]'
                    }`}
                />
                <PenTool className="w-3 h-3" />
                <span className="hidden sm:inline">{isSidebarVisible ? 'Ink ON' : 'Ink'}</span>
              </button>
            </div>

            {/* Right Section: Action Icons */}
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              {/* Convert to Mind Map */}
              <button
                onClick={handleConvertToCanvas}
                disabled={isConverting}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-[#FF3D00] hover:bg-[#FF5722] active:bg-[#E64A19] text-[#0A0A0A] text-[10px] font-mono uppercase tracking-wider font-bold transition-all duration-150"
                title="Convert Note to Visual Mind Map Canvas"
              >
                {isConverting ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Network className="w-3 h-3 stroke-[2]" />
                )}
                <span>Mind Map</span>
              </button>

              {/* Pin Toggle */}
              <button
                onClick={() => {
                  const nextPinned = !isPinned;
                  setIsPinned(nextPinned);
                  saveNote({ isPinned: nextPinned });
                }}
                className={`p-2 border transition-all duration-150 ${isPinned
                    ? 'border-[#FF3D00] bg-[#FF3D00]/10 text-[#FF3D00]'
                    : 'border-[#262626] text-[#737373] hover:text-[#FAFAFA] hover:border-[#404040]'
                  }`}
                title={isPinned ? 'Unpin Note' : 'Pin Note'}
              >
                <Pin className="w-3.5 h-3.5 stroke-[1.5]" />
              </button>

              {/* Set Reminder */}
              <button
                onClick={() => setIsReminderOpen(true)}
                className={`p-2 border transition-all duration-150 ${reminderAt
                    ? 'border-[#FF3D00] bg-[#FF3D00]/10 text-[#FF3D00]'
                    : 'border-[#262626] text-[#737373] hover:text-[#FAFAFA] hover:border-[#404040]'
                  }`}
                title={reminderAt ? `Reminder: ${new Date(reminderAt).toLocaleDateString()}` : 'Set Note Reminder'}
              >
                <Bell className="w-3.5 h-3.5 stroke-[1.5]" />
              </button>

              {/* Full Screen */}
              <button
                onClick={toggleFullScreen}
                className={`p-2 border transition-all duration-150 ${isZenMode
                    ? 'border-[#FF3D00] bg-[#FF3D00]/10 text-[#FF3D00]'
                    : 'border-[#262626] text-[#737373] hover:text-[#FAFAFA] hover:border-[#404040]'
                  }`}
                title={isZenMode ? 'Exit Full Screen' : 'Full Screen'}
              >
                {isZenMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>

              {/* ⋯ More Overflow Trigger */}
              <button
                onClick={() => setIsEditorSettingsOpen(!isEditorSettingsOpen)}
                className={`p-2 border transition-all duration-150 editor-settings-trigger ${isEditorSettingsOpen
                    ? 'border-[#FF3D00] bg-[#1A1A1A] text-[#FF3D00]'
                    : 'border-[#262626] text-[#737373] hover:text-[#FAFAFA] hover:border-[#404040]'
                  }`}
                title="More Options"
              >
                <MoreHorizontal className="w-3.5 h-3.5 stroke-[1.5]" />
              </button>
            </div>
          </div>
        </header>
      )}

      {/* Editor Overflow Popover (More Options) */}
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
          onClick={toggleFullScreen}
          className="fixed top-4 right-6 z-[55] flex items-center gap-2 px-3 py-1.5 bg-[#0A0A0A]/90 border border-[#FF3D00] text-[#FF3D00] hover:bg-[#FF3D00] hover:text-[#0A0A0A] text-xs font-mono uppercase tracking-wider font-bold transition-all shadow-xl"
          title="Exit Full Screen Mode (or press Esc)"
        >
          <Minimize2 className="w-3.5 h-3.5" />
          <span>Exit Full Screen</span>
        </button>
      )}

      {/* Main Workspace */}
      <main
        className={`note-editor-main flex-1 w-full flex flex-col transition-all duration-200 ${isSidebarVisible ? 'pl-14' : 'pl-0'
          }`}
      >
        {/* Tag Manager Bar */}
        <div className={`note-editor-tagbar flex flex-wrap items-center gap-2 px-6 py-2 border-b border-[#1E1E1E] bg-[#0D0D0D] transition-all duration-200`}>
          <Tag className="w-3 h-3 text-[#FF3D00] shrink-0" />
          {tags.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#1A1A1A] border border-[#262626] text-[10px] font-mono text-[#FAFAFA]"
            >
              <span>#{t}</span>
              <button onClick={() => handleRemoveTag(t)} className="hover:text-[#FF3D00] ml-0.5 leading-none">
                ×
              </button>
            </span>
          ))}
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleAddTag}
            placeholder="+ add tag"
            className="bg-transparent border-none text-[10px] font-mono text-[#737373] focus:text-[#FAFAFA] focus:outline-none w-24"
          />

          {/* Right side: word/char/time stats */}
          <div className="ml-auto flex items-center gap-4 font-mono text-[10px] text-[#3a3a3a]">
            <span className="flex items-center gap-1">
              <FileText className="w-3 h-3 text-[#FF3D00]/60" />
              <span>{wordCount}w</span>
            </span>
            <span>{charCount}ch</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-[#737373]/60" />
              <span>~{readingTime}m</span>
            </span>
            <span className="hidden lg:inline text-[#262626] uppercase tracking-widest text-[9px]">
              {stylusSettings.isStylusModeActive ? '● Ink' : '● Text'}
            </span>
          </div>
        </div>

        {/* Sticky Unified Control Deck — Two-Row Full-Width Toolbar */}
        {editor && (
          <RichTextProvider editor={editor}>
            {/* ── Row 1: Page Controls ──────────────────────── */}
            <div className="note-editor-toolbar-row1 sticky top-14 z-[41] bg-[#111111] border-b border-[#1E1E1E] px-3 flex items-center gap-0 shadow-sm select-none overflow-x-auto no-scrollbar">
              <PageNavigationBar
                pages={pages}
                activePageIndex={activePageIndex}
                onSelectPage={handleSelectPage}
                onAddPage={handleAddPage}
                onDuplicatePage={handleDuplicatePage}
                onDeletePage={handleDeletePage}
                onChangePaperTemplate={handleChangePaperTemplate}
                stylusOnlyMode={stylusSettings.stylusOnlyMode}
                onToggleStylusOnlyMode={() =>
                  setStylusSettings((prev) => ({ ...prev, stylusOnlyMode: !prev.stylusOnlyMode }))
                }
              />
            </div>

            {/* ── Row 2: Text Formatting Toolbar ───────────── */}
            <div
              onClickCapture={handleDeactivateStylusMode}
              className="note-editor-toolbar-row2 sticky top-[calc(3.5rem+2.25rem)] z-[39] bg-[#0F0F0F] border-b border-[#1E1E1E] px-3 py-1 flex items-center gap-1 overflow-x-auto no-scrollbar shadow-md select-none"
            >
              {/* HISTORY group */}
              <span className="text-[8px] font-mono uppercase tracking-widest text-[#3a3a3a] px-1 shrink-0 hidden lg:inline">History</span>
              <RichTextUndo />
              <RichTextRedo />

              {/* FORMAT group */}
              <div className="h-4 w-px bg-[#1E1E1E] mx-1.5 shrink-0" />
              <span className="text-[8px] font-mono uppercase tracking-widest text-[#3a3a3a] px-1 shrink-0 hidden lg:inline">Format</span>
              <RichTextHeading />
              <RichTextBold />
              <RichTextItalic />
              <RichTextUnderline />
              <RichTextStrike />
              <RichTextColor />
              <RichTextHighlight />

              {/* LAYOUT group */}
              <div className="h-4 w-px bg-[#1E1E1E] mx-1.5 shrink-0" />
              <span className="text-[8px] font-mono uppercase tracking-widest text-[#3a3a3a] px-1 shrink-0 hidden lg:inline">Layout</span>
              <RichTextAlign />
              <RichTextBulletList />
              <RichTextOrderedList />
              <RichTextTaskList />
              <RichTextBlockquote />
              <RichTextHorizontalRule />

              {/* INSERT group */}
              <div className="h-4 w-px bg-[#1E1E1E] mx-1.5 shrink-0" />
              <span className="text-[8px] font-mono uppercase tracking-widest text-[#3a3a3a] px-1 shrink-0 hidden lg:inline">Insert</span>
              {/* Insert Table Button — wrapped in Radix Tooltip matching Code Block 1:1 */}
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <button
                    id="insert-canvas-table-btn"
                    disabled={!editor?.isEditable || stylusSettings.isStylusModeActive}
                    onClick={() => {
                      if (!editor?.isEditable || stylusSettings.isStylusModeActive) return;
                      setIsInsertTableOpen(true);
                    }}
                    className="richtext-inline-flex richtext-items-center richtext-justify-center richtext-rounded-md richtext-text-sm richtext-font-medium richtext-ring-offset-background richtext-transition-colors hover:richtext-bg-accent hover:richtext-text-accent-foreground focus-visible:richtext-outline-none disabled:richtext-pointer-events-none disabled:richtext-opacity-50 richtext-h-[32px] richtext-w-[32px] richtext-p-0"
                    type="button"
                  >
                    <Table className="richtext-size-4" />
                  </button>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content
                    side="top"
                    sideOffset={4}
                    className="richtext-z-50 richtext-overflow-hidden richtext-rounded-md !richtext-border-none richtext-bg-primary richtext-px-3 richtext-py-1.5 richtext-text-sm richtext-text-primary-foreground richtext-shadow-md richtext-animate-in richtext-fade-in-0 richtext-zoom-in-95 data-[side=bottom]:richtext-slide-in-from-top-2 data-[side=left]:richtext-slide-in-from-right-2 data-[side=right]:richtext-slide-in-from-left-2 data-[side=top]:richtext-slide-in-from-bottom-2"
                  >
                    <div className="richtext-flex richtext-max-w-24 richtext-flex-col richtext-items-center richtext-text-center">
                      <span>TABLE</span>
                    </div>
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
              <RichTextCodeBlock />
              <RichTextLink />
              <RichTextImage />
              <RichTextEmoji />

              {/* TOOLS group */}
              <div className="h-4 w-px bg-[#1E1E1E] mx-1.5 shrink-0" />
              <span className="text-[8px] font-mono uppercase tracking-widest text-[#3a3a3a] px-1 shrink-0 hidden lg:inline">Tools</span>
              <RichTextClear />
              <RichTextSearchAndReplace />
            </div>

            {/* Insert Table Modal */}
            <InsertTableModal
              isOpen={isInsertTableOpen}
              onClose={() => setIsInsertTableOpen(false)}
              onInsert={(r, c) => {
                editor?.commands.insertCanvasTable(r, c);
              }}
            />

            {/* Notebook Paper Workspace Scroll Area */}
            <div className="note-editor-canvas-area relative flex-1 bg-[#050505] overflow-auto" style={{ minHeight: 'calc(100vh - 160px)' }}>
              {/* Zoom Transform Wrapper — centers and scales the A4 paper sheet */}
              <div
                className={`py-10 flex ${lockCenter ? 'justify-center' : 'justify-start'} px-4 origin-top`}
                style={{
                  transform: `scale(${canvasZoom})`,
                  transformOrigin: 'top center',
                  minHeight: `${1100 * canvasZoom + 80}px`,
                }}
              >
                {/* Pure Clean Notebook Paper Canvas Sheet (Fixed A4 Boundaries: 850px x 1100px) */}
                <div
                  className="note-editor-paper border border-[#262626] bg-[#0F0F0F] shadow-2xl relative text-[#FAFAFA] overflow-hidden shrink-0"
                  style={{ width: '850px', height: '1100px' }}
                >
                  {/* Tiptap Core Editor Content (Layered dynamically based on mode & layerOrder) */}
                  <div
                    className={`p-8 ${!stylusSettings.isStylusModeActive || stylusSettings.layerOrder === 'text_above_ink'
                        ? 'relative z-30 pointer-events-auto select-text'
                        : 'relative z-20 pointer-events-none select-none'
                      }`}
                  >
                    <EditorContent editor={editor} />
                  </div>

                  {/* Native Freehand Stylus Overlay Canvas Container (Ignore pointers when in Text Mode) */}
                  <div
                    className={`absolute inset-0 ${stylusSettings.isStylusModeActive && stylusSettings.layerOrder === 'ink_above_text'
                        ? 'z-30 pointer-events-auto'
                        : stylusSettings.isStylusModeActive
                          ? 'z-20 pointer-events-auto'
                          : 'z-10 pointer-events-none'
                      }`}
                  >
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
                      paperTemplate={pages[activePageIndex]?.paperTemplate || 'blank'}
                    />
                  </div>
                </div>
              </div>

              {/* Floating Zoom Controls Pill */}
              <div className="fixed bottom-6 right-6 z-[45] flex items-center gap-0 bg-[#0A0A0A]/95 backdrop-blur-md border border-[#262626] shadow-2xl">
                {/* Zoom Out */}
                <button
                  onClick={() => setCanvasZoom((z) => Math.max(0.4, parseFloat((z - 0.1).toFixed(1))))}
                  className="p-2.5 text-[#737373] hover:text-[#FAFAFA] hover:bg-[#1A1A1A] transition-all border-r border-[#262626]"
                  title="Zoom Out"
                  disabled={canvasZoom <= 0.4}
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>

                {/* Zoom Level — click to reset */}
                <button
                  onClick={() => setCanvasZoom(1.0)}
                  className="px-3 py-2 font-mono text-[11px] text-[#FAFAFA] hover:text-[#FF3D00] hover:bg-[#1A1A1A] transition-all min-w-[52px] text-center border-r border-[#262626]"
                  title="Reset zoom to 100%"
                >
                  {Math.round(canvasZoom * 100)}%
                </button>

                {/* Zoom In */}
                <button
                  onClick={() => setCanvasZoom((z) => Math.min(2.0, parseFloat((z + 0.1).toFixed(1))))}
                  className="p-2.5 text-[#737373] hover:text-[#FAFAFA] hover:bg-[#1A1A1A] transition-all border-r border-[#262626]"
                  title="Zoom In"
                  disabled={canvasZoom >= 2.0}
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>

                {/* Lock Center Toggle */}
                <button
                  onClick={() => setLockCenter((prev) => !prev)}
                  className={`p-2.5 transition-all ${lockCenter
                      ? 'text-[#FF3D00] bg-[#FF3D00]/10 hover:bg-[#FF3D00]/20'
                      : 'text-[#737373] hover:text-[#FAFAFA] hover:bg-[#1A1A1A]'
                    }`}
                  title={lockCenter ? 'Center Lock ON — click to disable' : 'Lock canvas to center'}
                >
                  <Crosshair className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </RichTextProvider>
        )}
      </main>

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
