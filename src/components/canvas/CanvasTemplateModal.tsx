"use client";

import React, { useState } from "react";
import {
  Layout,
  Sparkles,
  X,
  Loader2,
  ArrowRight,
  ShieldCheck,
  Server,
  AlertTriangle,
  ListTodo,
  Rocket,
} from "lucide-react";

interface CanvasTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (templateKey: string) => Promise<void>;
  onGenerateCustom: (prompt: string) => Promise<void>;
}

export function CanvasTemplateModal({
  isOpen,
  onClose,
  onSelectTemplate,
  onGenerateCustom,
}: CanvasTemplateModalProps) {
  const [customPrompt, setCustomPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const templates = [
    {
      key: "system-architecture",
      title: "Cloud Distributed Architecture",
      desc: "API Gateway, Auth service, message queue, PostgreSQL, and MinIO storage.",
      icon: <Server className="w-5 h-5 text-[#3B82F6]" />,
      badge: "BACKEND",
    },
    {
      key: "root-cause-analysis",
      title: "5-Whys Root Cause Analysis",
      desc: "Incident breakdown moving from surface symptoms to root cause & CI mitigations.",
      icon: <AlertTriangle className="w-5 h-5 text-[#D32F2F]" />,
      badge: "DIAGNOSTICS",
    },
    {
      key: "sprint-planning",
      title: "Agile Sprint Execution Map",
      desc: "Sprint goal broken into vertical epics, deliverables, and test gates.",
      icon: <ListTodo className="w-5 h-5 text-[#10B981]" />,
      badge: "AGILE",
    },
    {
      key: "product-launch",
      title: "GTM Product Launch Plan",
      desc: "Value prop, marketing funnels, beta rollout, and conversion metrics.",
      icon: <Rocket className="w-5 h-5 text-[#FF3D00]" />,
      badge: "PRODUCT",
    },
  ];

  const handleApplyPreset = async (key: string) => {
    setSelectedKey(key);
    setIsLoading(true);
    try {
      await onSelectTemplate(key);
      onClose();
    } catch (err) {
      console.error("Template apply error:", err);
    } finally {
      setIsLoading(false);
      setSelectedKey(null);
    }
  };

  const handleApplyCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPrompt.trim() || isLoading) return;
    setIsLoading(true);
    try {
      await onGenerateCustom(customPrompt.trim());
      onClose();
    } catch (err) {
      console.error("Custom template error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[105] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-3xl bg-[#0F0F0F] border border-[#262626] relative flex flex-col max-h-[85vh] font-sans shadow-2xl">
        {/* Top Accent Bar */}
        <div className="h-1 w-full bg-[#FF3D00] absolute top-0 left-0" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#262626]">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-[#FF3D00] flex items-center justify-center text-[#0A0A0A]">
              <Layout className="w-3.5 h-3.5" />
            </div>
            <h2 className="font-sans font-bold text-sm text-[#FAFAFA] uppercase tracking-wider">
              Canvas Blueprints & AI Templates
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-[#1A1A1A] text-[#737373] hover:text-[#FAFAFA] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Custom AI Prompt Section */}
          <form onSubmit={handleApplyCustom} className="space-y-2">
            <label className="block font-mono text-[10px] uppercase tracking-wider text-[#737373]">
              Generate Custom Mind Map with AI
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="e.g. 'Event-driven payment processing pipeline with stripe webhooks'..."
                className="flex-1 bg-[#141414] border border-[#262626] focus:border-[#FF3D00] text-xs font-mono text-[#FAFAFA] px-3 py-2.5 focus:outline-none transition-colors"
              />
              <button
                type="submit"
                disabled={isLoading || !customPrompt.trim()}
                className="px-4 py-2 bg-[#FF3D00] hover:bg-[#FAFAFA] text-[#0A0A0A] font-mono text-xs uppercase font-bold tracking-wider transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 shrink-0"
              >
                {isLoading && !selectedKey ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Generate Map</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Built-in Preset Grid */}
          <div className="space-y-3">
            <span className="block font-mono text-[10px] uppercase tracking-wider text-[#737373]">
              Or Choose an Architecture Blueprint
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {templates.map((tmpl) => {
                const isSelected = selectedKey === tmpl.key;
                return (
                  <button
                    key={tmpl.key}
                    type="button"
                    onClick={() => handleApplyPreset(tmpl.key)}
                    disabled={isLoading}
                    className={`p-4 bg-[#141414] border text-left transition-all flex flex-col justify-between group ${
                      isSelected
                        ? "border-[#FF3D00] bg-[#1A1A1A]"
                        : "border-[#262626] hover:border-[#FF3D00] hover:bg-[#181818]"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="p-2 bg-[#0A0A0A] border border-[#262626] group-hover:border-[#FF3D00]/50 transition-colors">
                          {tmpl.icon}
                        </div>
                        <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 border border-[#262626] text-[#737373]">
                          {tmpl.badge}
                        </span>
                      </div>

                      <h3 className="font-bold text-sm text-[#FAFAFA] mb-1">
                        {tmpl.title}
                      </h3>
                      <p className="text-xs text-[#737373] leading-relaxed">
                        {tmpl.desc}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#1E1E1E] flex items-center justify-between font-mono text-[10px] text-[#FF3D00]">
                      <span>
                        {isSelected ? "Loading Template..." : "Load Blueprint"}
                      </span>
                      {isSelected ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#262626] bg-[#0A0A0A] flex items-center justify-between font-mono text-[10px] text-[#737373]">
          <span>Templates are auto-arranged with ELK hierarchical layout</span>
          <span className="text-[#FF3D00] font-bold">MINDSPACE BLUEPRINTS</span>
        </div>
      </div>
    </div>
  );
}
