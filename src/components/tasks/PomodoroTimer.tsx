'use client';

import React, { useState } from 'react';
import { Play, Pause, RotateCcw, ArrowRight, X, Maximize2, Minimize2 } from 'lucide-react';
import { usePomodoro } from '@/contexts/PomodoroContext';

export function PomodoroTimer() {
  const { state, pause, resume, reset, skipBreak } = usePomodoro();
  const [isExpanded, setIsExpanded] = useState(false);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getBorderColor = () => {
    if (state.mode === 'focus') return 'border-[#FF3D00]';
    if (state.mode === 'break') return 'border-[#10b981]';
    return 'border-[#262626]';
  };

  const getModeLabel = () => {
    if (state.mode === 'focus') return 'Focus Session';
    if (state.mode === 'break') return 'Break Session';
    return 'Pomodoro Timer';
  };

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className={`fixed bottom-6 right-6 z-[80] flex items-center gap-2 bg-[#0F0F0F] border p-3 font-mono text-xs uppercase tracking-wider text-[#FAFAFA] hover:text-[#FF3D00] transition-colors shadow-2xl ${getBorderColor()}`}
      >
        <span className="animate-pulse">🍅</span>
        <span>
          {state.mode === 'idle'
            ? 'Idle'
            : `${state.mode === 'focus' ? 'Focus' : 'Break'} [${formatTime(state.secondsRemaining)}]`}
        </span>
        <Maximize2 className="w-3 h-3 text-[#737373]" />
      </button>
    );
  }

  return (
    <div
      className={`fixed bottom-6 right-6 z-[80] w-[260px] bg-[#0F0F0F] border p-4 flex flex-col justify-between font-sans shadow-2xl transition-all ${getBorderColor()}`}
    >
      {/* Accent Bar */}
      <div
        className={`h-1 w-12 absolute top-0 left-0 ${
          state.mode === 'focus' ? 'bg-[#FF3D00]' : state.mode === 'break' ? 'bg-[#10b981]' : 'bg-[#737373]'
        }`}
      />

      {/* Header */}
      <div className="flex items-center justify-between text-[#737373] mb-3">
        <span className="font-mono text-[9px] uppercase tracking-wider">{getModeLabel()}</span>
        <button
          onClick={() => setIsExpanded(false)}
          className="p-0.5 hover:text-[#FAFAFA] transition-colors"
          title="Minimize"
        >
          <Minimize2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Timer digits */}
      <div className="text-center py-4">
        <div
          className={`font-mono text-4xl font-black tracking-tighter ${
            state.mode === 'focus'
              ? 'text-[#FF3D00]'
              : state.mode === 'break'
              ? 'text-[#10b981]'
              : 'text-[#FAFAFA]'
          }`}
        >
          {formatTime(state.secondsRemaining)}
        </div>
        <div className="font-mono text-[9px] text-[#737373] mt-1 uppercase tracking-widest">
          Session #{state.sessionCount}
        </div>
      </div>

      {/* Linked task */}
      {state.linkedTaskTitle && (
        <div className="border-t border-[#1A1A1A] pt-2.5 pb-2.5 mb-2 flex items-center justify-between min-w-0">
          <div className="min-w-0 flex-1">
            <span className="font-mono text-[8px] uppercase tracking-wider text-[#737373] block">
              Active Focus
            </span>
            <span className="text-xs text-[#FAFAFA] font-bold block truncate">
              {state.linkedTaskTitle}
            </span>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 border-t border-[#1A1A1A] pt-3">
        {state.isRunning ? (
          <button
            onClick={pause}
            className="p-2 border border-[#FF3D00] text-[#FF3D00] hover:bg-[#FF3D00]/10 transition-colors"
            title="Pause Timer"
          >
            <Pause className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={resume}
            disabled={state.mode === 'idle'}
            className={`p-2 border transition-colors ${
              state.mode === 'idle'
                ? 'border-[#262626] text-[#737373] cursor-not-allowed'
                : 'border-[#10b981] text-[#10b981] hover:bg-[#10b981]/10'
            }`}
            title="Resume Timer"
          >
            <Play className="w-4 h-4" />
          </button>
        )}

        <button
          onClick={reset}
          className="p-2 border border-[#262626] text-[#737373] hover:text-[#FAFAFA] hover:border-[#FAFAFA] transition-colors"
          title="Reset Pomodoro"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {state.mode === 'break' && (
          <button
            onClick={skipBreak}
            className="flex items-center gap-1 px-2.5 py-1.5 border border-[#10b981] text-[#10b981] hover:bg-[#10b981]/10 font-mono text-[10px] uppercase font-bold transition-colors"
            title="Skip break, start focus"
          >
            <span>Skip</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}
