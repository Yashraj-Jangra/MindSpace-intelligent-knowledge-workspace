"use client";

import { useState } from "react";
import { Sparkles, X, Loader2, CheckSquare } from "lucide-react";

interface SubtaskProposal {
  title: string;
  description?: string;
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  daysOffset: number;
  tags: string[];
}

interface BreakdownProposal {
  macroTitle: string;
  macroDescription: string;
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  tags: string[];
  subtasks: SubtaskProposal[];
}

interface TaskBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: () => void;
}

export function TaskBreakdownModal({
  isOpen,
  onClose,
  onImportSuccess,
}: TaskBreakdownModalProps) {
  const [goal, setGoal] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [proposal, setProposal] = useState<BreakdownProposal | null>(null);
  const [selectedSubtasks, setSelectedSubtasks] = useState<number[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!goal.trim() || isGenerating) return;
    setIsGenerating(true);
    setErrorMessage(null);
    setProposal(null);

    try {
      const res = await fetch("/api/tasks/breakdown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal: goal.trim(), importImmediately: false }),
      });

      if (res.ok) {
        const data = await res.json();
        setProposal(data.breakdown);
        setSelectedSubtasks(
          data.breakdown.subtasks.map((_: any, i: number) => i),
        );
      } else {
        const err = await res.json();
        setErrorMessage(err.error || "Failed to generate task breakdown.");
      }
    } catch (err) {
      console.error("Task breakdown generation error:", err);
      setErrorMessage("Network error during AI breakdown.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleImport = async () => {
    if (!proposal || isImporting) return;
    setIsImporting(true);
    setErrorMessage(null);

    const filteredProposal = {
      ...proposal,
      subtasks: proposal.subtasks.filter((_, idx) =>
        selectedSubtasks.includes(idx),
      ),
    };

    try {
      const res = await fetch("/api/tasks/breakdown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal: proposal.macroTitle,
          importImmediately: true,
          proposalOverride: filteredProposal,
        }),
      });

      if (res.ok) {
        onImportSuccess();
        onClose();
      } else {
        const err = await res.json();
        setErrorMessage(err.error || "Failed to import tasks.");
      }
    } catch (err) {
      console.error("Import tasks error:", err);
      setErrorMessage("Network error during task import.");
    } finally {
      setIsImporting(false);
    }
  };

  const toggleSubtaskSelection = (idx: number) => {
    setSelectedSubtasks((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx],
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-[#0F0F0F] border border-[#262626] relative flex flex-col max-h-[85vh] font-sans shadow-2xl">
        {/* Accent Bar */}
        <div className="h-1 w-full bg-[#FF3D00] absolute top-0 left-0" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#262626]">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-[#FF3D00] flex items-center justify-center text-[#0A0A0A]">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <h2 className="font-sans font-bold text-sm text-[#FAFAFA] uppercase tracking-wider">
              AI Goal & Milestone Decomposer
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[#1A1A1A] text-[#737373] hover:text-[#FAFAFA] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Goal Input Section */}
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-wider text-[#737373] mb-1.5">
              High-Level Objective / Vision
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                placeholder="e.g., 'Migrate database to PostgreSQL with zero downtime' or 'Launch mobile dark mode'..."
                className="flex-1 bg-[#141414] border border-[#262626] focus:border-[#FF3D00] text-xs font-mono text-[#FAFAFA] px-3 py-2.5 focus:outline-none transition-colors"
              />
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating || !goal.trim()}
                className="px-4 py-2 bg-[#FF3D00] hover:bg-[#FAFAFA] text-[#0A0A0A] font-mono text-xs uppercase font-bold tracking-wider transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0 flex items-center gap-1.5"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Decomposing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Break Down</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 bg-red-950/40 border border-red-800 text-red-400 font-mono text-xs">
              {errorMessage}
            </div>
          )}

          {/* Generated Proposal Preview */}
          {proposal && (
            <div className="space-y-4 pt-2 border-t border-[#1A1A1A]">
              {/* Macro Task Preview Card */}
              <div className="p-4 bg-[#141414] border border-[#262626]">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono text-[9px] uppercase tracking-widest text-[#FF3D00] font-bold">
                    Macro Task Container
                  </span>
                  <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 border border-[#262626] text-[#737373]">
                    {proposal.priority} Priority
                  </span>
                </div>
                <div className="font-bold text-sm text-[#FAFAFA] mb-1">
                  {proposal.macroTitle}
                </div>
                <p className="text-xs text-[#737373]">
                  {proposal.macroDescription}
                </p>
              </div>

              {/* Subtasks List */}
              <div>
                <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-[#737373] mb-2">
                  <span>
                    Decomposed Milestones ({proposal.subtasks.length})
                  </span>
                  <span>Select items to import</span>
                </div>

                <div className="space-y-2">
                  {proposal.subtasks.map((sub, idx) => {
                    const isChecked = selectedSubtasks.includes(idx);
                    return (
                      <div
                        key={idx}
                        onClick={() => toggleSubtaskSelection(idx)}
                        className={`p-3 border transition-colors cursor-pointer flex items-start gap-3 ${
                          isChecked
                            ? "bg-[#141414] border-[#FF3D00]/60 text-[#FAFAFA]"
                            : "bg-[#0A0A0A] border-[#1F1F1F] text-[#737373] opacity-60"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="mt-0.5 accent-[#FF3D00]"
                        />

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-xs font-sans truncate">
                              {sub.title}
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="font-mono text-[8px] uppercase px-1 py-0.5 border border-[#262626] text-[#737373]">
                                +{sub.daysOffset}d
                              </span>
                              <span className="font-mono text-[8px] uppercase px-1 py-0.5 bg-[#FF3D00]/10 text-[#FF3D00] border border-[#FF3D00]/30">
                                {sub.priority}
                              </span>
                            </div>
                          </div>

                          {sub.description && (
                            <p className="text-[11px] text-[#737373] mt-0.5">
                              {sub.description}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#262626] bg-[#0A0A0A] flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 font-mono text-xs text-[#737373] hover:text-[#FAFAFA] transition-colors"
          >
            Cancel
          </button>

          {proposal && (
            <button
              type="button"
              onClick={handleImport}
              disabled={isImporting || selectedSubtasks.length === 0}
              className="px-5 py-2 bg-[#10B981] hover:bg-[#FAFAFA] text-[#0A0A0A] font-mono text-xs uppercase font-bold tracking-wider transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {isImporting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Importing Tasks...</span>
                </>
              ) : (
                <>
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>Import {selectedSubtasks.length} Tasks to Board</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
