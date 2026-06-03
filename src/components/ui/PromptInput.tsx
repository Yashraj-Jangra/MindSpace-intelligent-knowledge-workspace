'use client';

import React, { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';

interface PromptInputProps {
  onGenerate: (prompt: string) => Promise<void>;
  isLoading?: boolean;
}

export function PromptInput({ onGenerate, isLoading = false }: PromptInputProps) {
  const [prompt, setPrompt] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading) return;
    await onGenerate(prompt);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-2xl bg-[#0F0F0F] border border-[#262626] p-3 shadow-2xl transition-all duration-150 focus-within:border-[#FF3D00]"
    >
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Paste text dump, prompt, or notes to generate visual mind map..."
            className="w-full bg-[#1A1A1A] border border-[#262626] px-4 py-3 text-sm text-[#FAFAFA] placeholder-[#737373] focus:outline-none focus:border-[#FF3D00] font-sans"
            disabled={isLoading}
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || !prompt.trim()}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 text-xs font-mono uppercase tracking-wider font-semibold text-[#FF3D00] disabled:opacity-50 transition-all hover-underline-accent"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin stroke-[1.5]" />
              <span>Synthesizing...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 stroke-[1.5]" />
              <span>Generate Graph</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
