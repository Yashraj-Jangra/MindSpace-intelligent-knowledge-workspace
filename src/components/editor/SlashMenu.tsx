"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Editor } from "@tiptap/react";
import {
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Code,
  Quote,
  Table,
  Minus,
  Bell,
} from "lucide-react";

interface SlashMenuItem {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  category: "BASIC" | "FORMATTING" | "STRUCTURE" | "ADVANCED";
  command: (editor: Editor) => void;
  keywords: string[];
}

interface SlashMenuProps {
  editor: Editor | null;
  onOpenInsertTable?: () => void;
  onOpenReminder?: () => void;
}

export function SlashMenu({
  editor,
  onOpenInsertTable,
  onOpenReminder,
}: SlashMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  const menuItems: SlashMenuItem[] = [
    {
      id: "h1",
      title: "Heading 1",
      description: "Big section heading",
      icon: <Heading1 className="w-4 h-4 text-[#FF3D00]" />,
      category: "BASIC",
      keywords: ["h1", "heading", "title", "large"],
      command: (ed) => ed.chain().focus().toggleHeading({ level: 1 }).run(),
    },
    {
      id: "h2",
      title: "Heading 2",
      description: "Medium sub-section heading",
      icon: <Heading2 className="w-4 h-4 text-[#FF3D00]" />,
      category: "BASIC",
      keywords: ["h2", "heading", "subtitle", "medium"],
      command: (ed) => ed.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      id: "h3",
      title: "Heading 3",
      description: "Small section heading",
      icon: <Heading3 className="w-4 h-4 text-[#FF3D00]" />,
      category: "BASIC",
      keywords: ["h3", "heading", "subheading", "small"],
      command: (ed) => ed.chain().focus().toggleHeading({ level: 3 }).run(),
    },
    {
      id: "bullet-list",
      title: "Bullet List",
      description: "Create an un-ordered list",
      icon: <List className="w-4 h-4 text-[#FAFAFA]" />,
      category: "FORMATTING",
      keywords: ["bullet", "list", "unordered", "point"],
      command: (ed) => ed.chain().focus().toggleBulletList().run(),
    },
    {
      id: "numbered-list",
      title: "Numbered List",
      description: "Create an ordered sequence list",
      icon: <ListOrdered className="w-4 h-4 text-[#FAFAFA]" />,
      category: "FORMATTING",
      keywords: ["numbered", "order", "numeric", "sequence"],
      command: (ed) => ed.chain().focus().toggleOrderedList().run(),
    },
    {
      id: "task-list",
      title: "Task Checklist",
      description: "Track items with checkboxes",
      icon: <CheckSquare className="w-4 h-4 text-[#10B981]" />,
      category: "FORMATTING",
      keywords: ["task", "todo", "checklist", "checkbox", "done"],
      command: (ed) => ed.chain().focus().toggleTaskList().run(),
    },
    {
      id: "table",
      title: "Interactive Table",
      description: "Insert a 2D freeform table with resize handles",
      icon: <Table className="w-4 h-4 text-[#3B82F6]" />,
      category: "STRUCTURE",
      keywords: ["table", "grid", "column", "row", "cells"],
      command: () => {
        if (onOpenInsertTable) {
          onOpenInsertTable();
        }
      },
    },
    {
      id: "code-block",
      title: "Code Block",
      description: "Syntax highlighted code snippet",
      icon: <Code className="w-4 h-4 text-[#F59E0B]" />,
      category: "STRUCTURE",
      keywords: ["code", "snippet", "syntax", "programming", "developer"],
      command: (ed) => ed.chain().focus().toggleCodeBlock().run(),
    },
    {
      id: "blockquote",
      title: "Quote Block",
      description: "Capture a notable quote or callout",
      icon: <Quote className="w-4 h-4 text-[#8B5CF6]" />,
      category: "FORMATTING",
      keywords: ["quote", "callout", "blockquote", "citation"],
      command: (ed) => ed.chain().focus().toggleBlockquote().run(),
    },
    {
      id: "horizontal-rule",
      title: "Divider Line",
      description: "Visually separate content blocks",
      icon: <Minus className="w-4 h-4 text-[#737373]" />,
      category: "STRUCTURE",
      keywords: ["divider", "line", "hr", "horizontal", "separator"],
      command: (ed) => ed.chain().focus().setHorizontalRule().run(),
    },
    {
      id: "reminder",
      title: "Schedule Deadline / Reminder",
      description: "Set a multi-channel reminder for this note",
      icon: <Bell className="w-4 h-4 text-[#FF3D00]" />,
      category: "ADVANCED",
      keywords: ["reminder", "deadline", "due", "schedule", "alarm", "alert"],
      command: () => {
        if (onOpenReminder) {
          onOpenReminder();
        }
      },
    },
  ];

  // Filter items based on typed query
  const filteredItems = menuItems.filter((item) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.keywords.some((k) => k.toLowerCase().includes(q))
    );
  });

  // Execute an item
  const executeItem = useCallback(
    (item: SlashMenuItem) => {
      if (!editor) return;

      // Delete the slash trigger text (e.g. "/h1" or "/")
      const { state } = editor;
      const { selection } = state;
      const { $from } = selection;
      const lineText = $from.nodeBefore?.text || "";
      const slashIndex = lineText.lastIndexOf("/");

      if (slashIndex !== -1) {
        const deleteCount = lineText.length - slashIndex;
        editor
          .chain()
          .focus()
          .deleteRange({
            from: selection.from - deleteCount,
            to: selection.from,
          })
          .run();
      }

      // Execute command
      item.command(editor);
      setIsOpen(false);
      setQuery("");
    },
    [editor],
  );

  // Monitor editor keystrokes and selection to show/hide Slash Menu
  useEffect(() => {
    if (!editor) return;

    const handleUpdate = () => {
      const { state, view } = editor;
      const { selection } = state;
      const { $from } = selection;

      if (!selection.empty) {
        setIsOpen(false);
        return;
      }

      // Read text in current text block before cursor
      const textBefore = $from.parent.textBetween(
        0,
        $from.parentOffset,
        undefined,
        "\ufffc",
      );
      const slashMatch = textBefore.match(/(?:^|\s)\/([a-zA-Z0-9]*)$/);

      if (slashMatch) {
        const queryText = slashMatch[1] || "";
        setQuery(queryText);
        setSelectedIndex(0);

        // Get cursor viewport coordinates
        try {
          const coords = view.coordsAtPos(selection.from);
          const editorBounds = view.dom.getBoundingClientRect();

          // Position menu right below cursor
          const top = coords.bottom + 8;
          const left = Math.min(coords.left, editorBounds.right - 300);

          setPosition({ top, left });
          setIsOpen(true);
        } catch {
          setIsOpen(false);
        }
      } else {
        setIsOpen(false);
      }
    };

    editor.on("update", handleUpdate);
    editor.on("selectionUpdate", handleUpdate);

    return () => {
      editor.off("update", handleUpdate);
      editor.off("selectionUpdate", handleUpdate);
    };
  }, [editor]);

  // Handle keyboard events when Slash Menu is open
  useEffect(() => {
    if (!isOpen || !editor) return;

    const handleKeyDown = (_view: any, event: KeyboardEvent) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % (filteredItems.length || 1));
        return true;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelectedIndex(
          (prev) =>
            (prev - 1 + filteredItems.length) % (filteredItems.length || 1),
        );
        return true;
      }
      if (event.key === "Enter") {
        if (filteredItems.length > 0 && filteredItems[selectedIndex]) {
          event.preventDefault();
          executeItem(filteredItems[selectedIndex]);
          return true;
        }
      }
      if (event.key === "Escape") {
        event.preventDefault();
        setIsOpen(false);
        return true;
      }
      return false;
    };

    const dom = editor.view.dom;
    const listener = (e: KeyboardEvent) => {
      if (
        isOpen &&
        ["ArrowDown", "ArrowUp", "Enter", "Escape"].includes(e.key)
      ) {
        if (handleKeyDown(editor.view, e)) {
          e.stopPropagation();
        }
      }
    };

    dom.addEventListener("keydown", listener, true);
    return () => dom.removeEventListener("keydown", listener, true);
  }, [isOpen, editor, filteredItems, selectedIndex, executeItem]);

  if (!isOpen || filteredItems.length === 0) return null;

  return (
    <div
      ref={menuRef}
      style={{
        position: "fixed",
        top: `${position.top}px`,
        left: `${position.left}px`,
        zIndex: 90,
      }}
      className="w-72 max-h-80 bg-[#0F0F0F] border border-[#262626] shadow-2xl p-1 overflow-y-auto font-sans animate-in fade-in zoom-in-95 duration-100"
    >
      {/* Accent Header */}
      <div className="px-2 py-1.5 border-b border-[#1A1A1A] flex items-center justify-between font-mono text-[9px] text-[#737373] uppercase tracking-wider">
        <span>Insert Block</span>
        <span className="text-[#FF3D00] font-bold">/ {query}</span>
      </div>

      {/* Menu items */}
      <div className="py-1 space-y-0.5">
        {filteredItems.map((item, idx) => {
          const isSelected = idx === selectedIndex;
          return (
            <button
              key={item.id}
              onClick={() => executeItem(item)}
              onMouseEnter={() => setSelectedIndex(idx)}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 text-left transition-colors border ${
                isSelected
                  ? "bg-[#1A1A1A] border-[#FF3D00] text-[#FAFAFA]"
                  : "border-transparent text-[#FAFAFA]/90 hover:bg-[#141414]"
              }`}
            >
              <div className="p-1 bg-[#0A0A0A] border border-[#262626] shrink-0">
                {item.icon}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold font-sans truncate">
                  {item.title}
                </div>
                <div className="text-[10px] font-mono text-[#737373] truncate">
                  {item.description}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
