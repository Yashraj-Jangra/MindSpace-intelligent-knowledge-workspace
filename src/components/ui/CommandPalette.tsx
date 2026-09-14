"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  FileText,
  Network,
  CheckSquare,
  Calendar,
  Bell,
  MessageSquare,
  Shield,
  Play,
  SunMoon,
  Command,
  ArrowRight,
  Loader2,
  Sparkles,
  LayoutDashboard,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePomodoro } from "@/contexts/PomodoroContext";

interface SearchResultItem {
  id: string;
  type: "action" | "nav" | "note" | "canvas" | "task";
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  url?: string;
  action?: () => void;
  badge?: string;
}

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [apiResults, setApiResults] = useState<{
    notes: Array<{
      id: string;
      title: string;
      tags: string[];
      priority: string;
    }>;
    canvases: Array<{ id: string; title: string }>;
    tasks: Array<{
      id: string;
      title: string;
      status: string;
      priority: string;
    }>;
  }>({ notes: [], canvases: [], tasks: [] });

  const router = useRouter();
  const { user } = useAuth();
  const pomodoro = usePomodoro();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcut listener: Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        setIsOpen(false);
      }
    };

    const handleCustomOpen = () => setIsOpen(true);

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("mindspace:open-command-palette", handleCustomOpen);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener(
        "mindspace:open-command-palette",
        handleCustomOpen,
      );
    };
  }, [isOpen]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Debounced API search when query changes
  useEffect(() => {
    if (!query.trim()) {
      setApiResults({ notes: [], canvases: [], tasks: [] });
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(query.trim())}`,
        );
        if (res.ok) {
          const data = await res.json();
          setApiResults(data);
        }
      } catch (err) {
        console.error("Command palette search error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 180);

    return () => clearTimeout(timeout);
  }, [query]);

  // Actions
  const handleCreateNote = async () => {
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: query.trim() || "Untitled Note",
          content: "",
        }),
      });
      if (res.ok) {
        const note = await res.json();
        setIsOpen(false);
        router.push(`/notes/${note.id}`);
      }
    } catch (err) {
      console.error("Failed to create note:", err);
    }
  };

  const handleCreateCanvas = async () => {
    try {
      const res = await fetch("/api/canvas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: query.trim() || "Untitled MindSpace" }),
      });
      if (res.ok) {
        const canvas = await res.json();
        setIsOpen(false);
        router.push(`/canvas/${canvas.id}`);
      }
    } catch (err) {
      console.error("Failed to create canvas:", err);
    }
  };

  const handleToggleTheme = () => {
    const isDark = document.documentElement.classList.contains("dark");
    if (isDark) {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("mindspace-theme", "light");
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("mindspace-theme", "dark");
    }
    setIsOpen(false);
  };

  // Static Action & Nav Items
  const quickActions: SearchResultItem[] = [
    {
      id: "action-new-canvas",
      type: "action",
      title: query.trim() ? `Create canvas "${query.trim()}"` : "New Canvas",
      subtitle: "Create a new infinite visual mind map",
      icon: <Network className="w-4 h-4 text-[#FF3D00]" />,
      action: handleCreateCanvas,
      badge: "CANVAS",
    },
    {
      id: "action-new-note",
      type: "action",
      title: query.trim() ? `Create note "${query.trim()}"` : "New Note",
      subtitle: "Open advanced TipTap rich block editor",
      icon: <FileText className="w-4 h-4 text-[#FF3D00]" />,
      action: handleCreateNote,
      badge: "NOTE",
    },
    {
      id: "action-new-task",
      type: "action",
      title: "New Macro / Micro Task",
      subtitle: "Add a new prioritized deadline task",
      icon: <CheckSquare className="w-4 h-4 text-[#10B981]" />,
      url: "/tasks",
      badge: "TASK",
    },
    {
      id: "action-pomodoro",
      type: "action",
      title:
        pomodoro.state.mode === "focus"
          ? "Pause Pomodoro Timer"
          : "Start Pomodoro Focus Session",
      subtitle: "25-minute uninterrupted productivity timer",
      icon: <Play className="w-4 h-4 text-[#F59E0B]" />,
      action: () => {
        if (pomodoro.state.mode === "focus") {
          pomodoro.pause();
        } else {
          pomodoro.resume();
        }
        setIsOpen(false);
      },
      badge: "FOCUS",
    },
    {
      id: "action-theme",
      type: "action",
      title: "Toggle Light / Dark Mode",
      subtitle: "Switch application color theme",
      icon: <SunMoon className="w-4 h-4 text-[#8B5CF6]" />,
      action: handleToggleTheme,
      badge: "THEME",
    },
  ];

  const navDestinations: SearchResultItem[] = [
    {
      id: "nav-hub",
      type: "nav",
      title: "Hub Dashboard",
      subtitle: "Telemetry cockpits, timeline & inbox",
      icon: <LayoutDashboard className="w-4 h-4 text-[#FAFAFA]" />,
      url: "/",
    },
    {
      id: "nav-notes",
      type: "nav",
      title: "Notes Archive",
      subtitle: "All saved documents & stylus notes",
      icon: <FileText className="w-4 h-4 text-[#FAFAFA]" />,
      url: "/notes",
    },
    {
      id: "nav-tasks",
      type: "nav",
      title: "Tasks Board",
      subtitle: "Macro & micro progress checklists",
      icon: <CheckSquare className="w-4 h-4 text-[#FAFAFA]" />,
      url: "/tasks",
    },
    {
      id: "nav-calendar",
      type: "nav",
      title: "Calendar Workspace",
      subtitle: "Month, week and day drag-and-drop schedule",
      icon: <Calendar className="w-4 h-4 text-[#FAFAFA]" />,
      url: "/calendar",
    },
    {
      id: "nav-reminders",
      type: "nav",
      title: "Reminders & Bot Matrix",
      subtitle: "Discord, Telegram and multi-channel dispatch",
      icon: <Bell className="w-4 h-4 text-[#FAFAFA]" />,
      url: "/reminders",
    },
    {
      id: "nav-chat",
      type: "nav",
      title: "Community Chat",
      subtitle: "WhatsApp-style group and direct messaging",
      icon: <MessageSquare className="w-4 h-4 text-[#FAFAFA]" />,
      url: "/chat",
    },
    ...(user?.role === "ADMIN"
      ? [
          {
            id: "nav-admin",
            type: "nav" as const,
            title: "System Administration",
            subtitle: "User governance, queues & bot settings",
            icon: <Shield className="w-4 h-4 text-[#FF3D00]" />,
            url: "/admin",
            badge: "ADMIN",
          },
        ]
      : []),
  ];

  // Compile full items array
  const filteredActions = query.trim()
    ? quickActions.filter(
        (a) =>
          a.title.toLowerCase().includes(query.toLowerCase()) ||
          (a.subtitle &&
            a.subtitle.toLowerCase().includes(query.toLowerCase())),
      )
    : quickActions;

  const filteredNav = query.trim()
    ? navDestinations.filter(
        (n) =>
          n.title.toLowerCase().includes(query.toLowerCase()) ||
          (n.subtitle &&
            n.subtitle.toLowerCase().includes(query.toLowerCase())),
      )
    : navDestinations;

  const dynamicNoteItems: SearchResultItem[] = apiResults.notes.map((n) => ({
    id: `note-${n.id}`,
    type: "note",
    title: n.title || "Untitled Note",
    subtitle: n.tags.length > 0 ? `#${n.tags.join(" #")}` : "Note Document",
    icon: <FileText className="w-4 h-4 text-[#FF3D00]" />,
    url: `/notes/${n.id}`,
    badge: n.priority,
  }));

  const dynamicCanvasItems: SearchResultItem[] = apiResults.canvases.map(
    (c) => ({
      id: `canvas-${c.id}`,
      type: "canvas",
      title: c.title || "Untitled Canvas",
      subtitle: "Visual MindSpace Map",
      icon: <Network className="w-4 h-4 text-[#FF3D00]" />,
      url: `/canvas/${c.id}`,
    }),
  );

  const dynamicTaskItems: SearchResultItem[] = apiResults.tasks.map((t) => ({
    id: `task-${t.id}`,
    type: "task",
    title: t.title,
    subtitle: `Status: ${t.status} · Priority: ${t.priority}`,
    icon: <CheckSquare className="w-4 h-4 text-[#10B981]" />,
    url: "/tasks",
    badge: t.priority,
  }));

  const allVisibleItems: SearchResultItem[] = query.trim()
    ? [
        ...dynamicCanvasItems,
        ...dynamicNoteItems,
        ...dynamicTaskItems,
        ...filteredActions,
        ...filteredNav,
      ]
    : [...quickActions, ...navDestinations];

  // Execute selected item
  const executeItem = useCallback(
    (item: SearchResultItem) => {
      setIsOpen(false);
      if (item.action) {
        item.action();
      } else if (item.url) {
        router.push(item.url);
      }
    },
    [router],
  );

  // Arrow navigation & enter key
  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (allVisibleItems.length || 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(
        (prev) =>
          (prev - 1 + allVisibleItems.length) % (allVisibleItems.length || 1),
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      const selected = allVisibleItems[selectedIndex];
      if (selected) {
        executeItem(selected);
      }
    }
  };

  // Scroll active item into view
  useEffect(() => {
    const list = listRef.current;
    if (list) {
      const activeEl = list.children[selectedIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      {/* Modal Container */}
      <div
        className="w-full max-w-2xl bg-[#0F0F0F] border border-[#262626] shadow-2xl relative flex flex-col max-h-[80vh] font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Accent Top Bar */}
        <div className="h-1 w-full bg-[#FF3D00] absolute top-0 left-0" />

        {/* Input Header */}
        <div className="flex items-center px-4 py-3.5 border-b border-[#262626] gap-3">
          <Search className="w-5 h-5 text-[#737373] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleInputKeyDown}
            placeholder="Type a command or search notes, canvases, tasks..."
            className="flex-1 bg-transparent text-[#FAFAFA] font-mono text-sm placeholder-[#737373] focus:outline-none"
          />
          {isSearching && (
            <Loader2 className="w-4 h-4 text-[#FF3D00] animate-spin shrink-0" />
          )}
          <span className="font-mono text-[10px] text-[#737373] uppercase border border-[#262626] px-1.5 py-0.5 hidden sm:inline-block">
            ESC
          </span>
        </div>

        {/* Results List */}
        <div ref={listRef} className="overflow-y-auto p-2 space-y-1 flex-1">
          {allVisibleItems.length === 0 ? (
            <div className="py-12 text-center">
              <Sparkles className="w-6 h-6 text-[#737373] mx-auto mb-2" />
              <p className="font-mono text-xs text-[#737373] uppercase tracking-wider">
                No matching results found for &quot;{query}&quot;
              </p>
            </div>
          ) : (
            allVisibleItems.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={item.id}
                  onClick={() => executeItem(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors border ${
                    isSelected
                      ? "bg-[#1A1A1A] border-[#FF3D00] text-[#FAFAFA]"
                      : "border-transparent text-[#FAFAFA]/90 hover:bg-[#141414]"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-1.5 bg-[#0A0A0A] border border-[#262626] shrink-0">
                      {item.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold font-sans truncate">
                        {item.title}
                      </div>
                      {item.subtitle && (
                        <div className="text-[11px] font-mono text-[#737373] truncate">
                          {item.subtitle}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    {item.badge && (
                      <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 border border-[#262626] text-[#737373]">
                        {item.badge}
                      </span>
                    )}
                    {isSelected && (
                      <ArrowRight className="w-3.5 h-3.5 text-[#FF3D00]" />
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer Navigation Hints */}
        <div className="px-4 py-2 border-t border-[#262626] bg-[#0A0A0A] flex items-center justify-between font-mono text-[10px] text-[#737373]">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="px-1 py-0.5 bg-[#141414] border border-[#262626] text-[#FAFAFA]">
                ↑↓
              </kbd>{" "}
              Navigate
            </span>
            <span>
              <kbd className="px-1 py-0.5 bg-[#141414] border border-[#262626] text-[#FAFAFA]">
                ↵
              </kbd>{" "}
              Select
            </span>
            <span>
              <kbd className="px-1 py-0.5 bg-[#141414] border border-[#262626] text-[#FAFAFA]">
                ESC
              </kbd>{" "}
              Close
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[#FF3D00]">
            <Command className="w-3 h-3" />
            <span className="font-bold">MINDSPACE COMMAND</span>
          </div>
        </div>
      </div>
    </div>
  );
}
