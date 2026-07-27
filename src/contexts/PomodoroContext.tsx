'use client';

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

export interface PomodoroState {
  isRunning: boolean;
  mode: 'focus' | 'break' | 'idle';
  secondsRemaining: number;
  focusDuration: number;
  breakDuration: number;
  sessionCount: number;
  linkedTaskId: string | null;
  linkedTaskTitle: string | null;
}

interface PomodoroContextType {
  state: PomodoroState;
  startFocus: (taskId?: string | null, taskTitle?: string | null) => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  skipBreak: () => void;
}

const PomodoroContext = createContext<PomodoroContextType | undefined>(undefined);

export function PomodoroProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PomodoroState>({
    isRunning: false,
    mode: 'idle',
    secondsRemaining: 1500, // 25 min default
    focusDuration: 1500,
    breakDuration: 300, // 5 min default
    sessionCount: 0,
    linkedTaskId: null,
    linkedTaskTitle: null,
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (state.isRunning && state.secondsRemaining > 0) {
      intervalRef.current = setInterval(() => {
        setState((prev) => {
          if (prev.secondsRemaining <= 1) {
            clearInterval(intervalRef.current!);
            
            // Handle timer end of cycle
            if (prev.mode === 'focus') {
              return {
                ...prev,
                isRunning: true,
                mode: 'break',
                secondsRemaining: prev.breakDuration,
                sessionCount: prev.sessionCount + 1,
              };
            } else if (prev.mode === 'break') {
              return {
                ...prev,
                isRunning: false,
                mode: 'idle',
                secondsRemaining: prev.focusDuration,
              };
            }
          }
          return {
            ...prev,
            secondsRemaining: prev.secondsRemaining - 1,
          };
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [state.isRunning, state.mode, state.secondsRemaining]);

  const startFocus = (taskId?: string | null, taskTitle?: string | null) => {
    setState((prev) => ({
      ...prev,
      isRunning: true,
      mode: 'focus',
      secondsRemaining: prev.focusDuration,
      linkedTaskId: taskId || null,
      linkedTaskTitle: taskTitle || null,
    }));
  };

  const pause = () => {
    setState((prev) => ({ ...prev, isRunning: false }));
  };

  const resume = () => {
    setState((prev) => ({ ...prev, isRunning: true }));
  };

  const reset = () => {
    setState((prev) => ({
      ...prev,
      isRunning: false,
      mode: 'idle',
      secondsRemaining: prev.focusDuration,
      linkedTaskId: null,
      linkedTaskTitle: null,
    }));
  };

  const skipBreak = () => {
    setState((prev) => ({
      ...prev,
      isRunning: true,
      mode: 'focus',
      secondsRemaining: prev.focusDuration,
    }));
  };

  return (
    <PomodoroContext.Provider value={{ state, startFocus, pause, resume, reset, skipBreak }}>
      {children}
    </PomodoroContext.Provider>
  );
}

export function usePomodoro() {
  const context = useContext(PomodoroContext);
  if (context === undefined) {
    throw new Error('usePomodoro must be used within a PomodoroProvider');
  }
  return context;
}
