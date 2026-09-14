"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  FileUp,
  Link2,
  Calendar,
  AlertCircle,
  Tag,
  CheckSquare,
  FileText,
  Loader2,
  Sparkles,
} from "lucide-react";
import {
  parseQuickCapture,
  ParsedQuickCapture,
} from "@/lib/quick-capture-parser";

export function QuickCaptureInbox() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<ParsedQuickCapture>({
    rawText: "",
    cleanText: "",
    tags: [],
    urls: [],
    suggestedType: "NOTE",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Parse text in real-time
  useEffect(() => {
    setParsed(parseQuickCapture(text));
  }, [text]);

  // Auto-expand textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.max(80, textareaRef.current.scrollHeight)}px`;
    }
  }, [text]);

  const handleSaveToInbox = async () => {
    if (!text.trim() || isSaving) return;
    setIsSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/hub/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawText: text.trim(),
          sourceUrl: parsed.urls[0] || null,
        }),
      });

      if (res.ok) {
        setText("");
        setSuccessMessage("Saved to Inbox ✓");
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        const err = await res.json();
        setErrorMessage(err.error || "Failed to save capture.");
        setTimeout(() => setErrorMessage(null), 4000);
      }
    } catch (err) {
      console.error("Capture error:", err);
      setErrorMessage("Network error saving capture.");
      setTimeout(() => setErrorMessage(null), 4000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateTask = async () => {
    if (!text.trim() || isSaving) return;
    setIsSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: parsed.cleanText || text.trim(),
          priority: parsed.priority || "MEDIUM",
          dueAt: parsed.dueDate ? parsed.dueDate.toISOString() : null,
          tags: parsed.tags,
        }),
      });

      if (res.ok) {
        setText("");
        setSuccessMessage("Task Created ✓");
        setTimeout(() => setSuccessMessage(null), 3000);
        router.refresh();
      } else {
        const err = await res.json();
        setErrorMessage(err.error || "Failed to create task.");
        setTimeout(() => setErrorMessage(null), 4000);
      }
    } catch (err) {
      console.error("Task create error:", err);
      setErrorMessage("Network error creating task.");
      setTimeout(() => setErrorMessage(null), 4000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateNote = async () => {
    if (!text.trim() || isSaving) return;
    setIsSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: parsed.cleanText.slice(0, 60) || "Quick Note",
          content: `<p>${text.trim()}</p>`,
          tags: parsed.tags,
          priority:
            parsed.priority === "CRITICAL"
              ? "HIGH"
              : parsed.priority || "MEDIUM",
          reminderAt: parsed.dueDate ? parsed.dueDate.toISOString() : null,
        }),
      });

      if (res.ok) {
        const note = await res.json();
        setText("");
        setSuccessMessage("Note Created ✓");
        setTimeout(() => setSuccessMessage(null), 3000);
        router.push(`/notes/${note.id}`);
      } else {
        const err = await res.json();
        setErrorMessage(err.error || "Failed to create note.");
        setTimeout(() => setErrorMessage(null), 4000);
      }
    } catch (err) {
      console.error("Note create error:", err);
      setErrorMessage("Network error creating note.");
      setTimeout(() => setErrorMessage(null), 4000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleConvertToCanvas = async () => {
    if (!text.trim() || isSaving) return;
    setIsSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/hub/capture/structure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawText: text.trim(),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setText("");
        setSuccessMessage("Canvas Synthesized ✓");
        router.push(`/canvas/${data.canvasId}`);
      } else {
        const err = await res.json();
        setErrorMessage(err.error || "Failed to synthesize canvas.");
        setTimeout(() => setErrorMessage(null), 4000);
      }
    } catch (err) {
      console.error("Canvas conversion error:", err);
      setErrorMessage("Network error generating canvas.");
      setTimeout(() => setErrorMessage(null), 4000);
    } finally {
      setIsSaving(false);
    }
  };

  const formatDueDate = (d?: Date) => {
    if (!d) return null;
    return d.toLocaleString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="bg-[#0F0F0F] border border-[#262626] p-6 relative flex flex-col font-sans">
      <div className="h-1 w-12 bg-[#FF3D00] absolute top-0 left-0" />

      {/* Header */}
      <div className="flex items-center justify-between text-[#737373] mb-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs uppercase tracking-wider text-[#FAFAFA] font-bold">
            Quick Capture Inbox
          </span>
          <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 bg-[#1A1A1A] border border-[#262626] text-[#737373]">
            Natural Language AI
          </span>
        </div>
        <FileUp className="w-4 h-4 text-[#FF3D00]" />
      </div>

      {/* Textarea */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type thoughts, deadlines or links (e.g. 'Review pull request tomorrow 4pm !critical #dev')..."
          className="w-full bg-[#141414] border border-[#262626] focus:border-[#FF3D00] text-xs font-mono text-[#FAFAFA] p-3 focus:outline-none resize-none min-h-[80px] transition-colors"
        />

        {/* Live Parsed Extraction Chips */}
        {(parsed.priority ||
          parsed.dueDate ||
          parsed.tags.length > 0 ||
          parsed.urls.length > 0) && (
          <div className="flex flex-wrap items-center gap-1.5 pt-2 pb-1">
            {parsed.priority && (
              <span
                className={`flex items-center gap-1 px-2 py-0.5 font-mono text-[9px] uppercase font-bold border ${
                  parsed.priority === "CRITICAL"
                    ? "bg-red-950/40 border-red-600 text-red-400 animate-pulse"
                    : parsed.priority === "HIGH"
                      ? "bg-[#FF3D00]/10 border-[#FF3D00] text-[#FF3D00]"
                      : "bg-[#1A1A1A] border-[#262626] text-[#FAFAFA]"
                }`}
              >
                <AlertCircle className="w-3 h-3" />
                <span>{parsed.priority}</span>
              </span>
            )}

            {parsed.dueDate && (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-[#1A1A1A] border border-[#FF3D00] text-[#FF3D00] font-mono text-[9px] uppercase">
                <Calendar className="w-3 h-3" />
                <span>{formatDueDate(parsed.dueDate)}</span>
              </span>
            )}

            {parsed.tags.map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-1 px-1.5 py-0.5 bg-[#141414] border border-[#262626] font-mono text-[9px] text-[#737373]"
              >
                <Tag className="w-2.5 h-2.5 text-[#FF3D00]" />
                <span>#{tag}</span>
              </span>
            ))}

            {parsed.urls.map((url) => (
              <span
                key={url}
                className="flex items-center gap-1 px-1.5 py-0.5 bg-[#141414] border border-[#262626] font-mono text-[9px] text-blue-400 truncate max-w-[180px]"
              >
                <Link2 className="w-2.5 h-2.5 shrink-0" />
                <span className="truncate">{url}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Footer & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-[#1A1A1A] mt-2">
        <div className="flex items-center gap-2 text-[10px] font-mono text-[#737373]">
          <span>
            Hints: <code className="text-[#FF3D00]">!crit</code>{" "}
            <code className="text-[#FF3D00]">tomorrow 4pm</code>{" "}
            <code className="text-[#FF3D00]">in 2h</code>{" "}
            <code className="text-[#FF3D00]">#tag</code>
          </span>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {errorMessage && (
            <span className="text-[11px] font-mono text-red-500 animate-pulse mr-2">
              {errorMessage}
            </span>
          )}
          {successMessage && (
            <span className="text-[11px] font-mono text-[#10b981] animate-pulse mr-2">
              {successMessage}
            </span>
          )}

          {/* Convert to Mind Map AI Button */}
          <button
            type="button"
            onClick={handleConvertToCanvas}
            disabled={isSaving || !text.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 font-mono text-xs uppercase tracking-wider bg-[#141414] hover:bg-[#1A1A1A] border border-[#FF3D00] text-[#FF3D00] hover:text-[#FAFAFA] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#FF3D00]" />
            <span>AI Canvas</span>
          </button>

          {/* Create Task Button (if type matches or user wants task) */}
          <button
            type="button"
            onClick={handleCreateTask}
            disabled={isSaving || !text.trim()}
            className={`flex items-center gap-1.5 px-3 py-1.5 font-mono text-xs uppercase tracking-wider transition-colors border ${
              parsed.suggestedType === "TASK" && text.trim()
                ? "bg-[#10B981] hover:bg-[#FAFAFA] text-[#0A0A0A] font-bold border-[#10B981]"
                : "bg-[#141414] hover:bg-[#1A1A1A] border-[#262626] text-[#FAFAFA]/90"
            } disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>+ Task</span>
          </button>

          {/* Create Note Button */}
          <button
            type="button"
            onClick={handleCreateNote}
            disabled={isSaving || !text.trim()}
            className="flex items-center gap-1.5 px-3 py-1.5 font-mono text-xs uppercase tracking-wider bg-[#141414] hover:bg-[#1A1A1A] border border-[#262626] text-[#FAFAFA]/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>+ Note</span>
          </button>

          {/* Save to Inbox Primary */}
          <button
            type="button"
            onClick={handleSaveToInbox}
            disabled={isSaving || !text.trim()}
            className={`px-4 py-1.5 font-mono text-xs uppercase font-bold tracking-wider transition-colors ${
              text.trim()
                ? "bg-[#FF3D00] hover:bg-[#FAFAFA] text-[#0A0A0A]"
                : "bg-[#1A1A1A] border border-[#262626] text-[#737373] cursor-not-allowed"
            }`}
          >
            {isSaving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              "Save"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
