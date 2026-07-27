'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AlertOctagon, X, ArrowRight } from 'lucide-react';
import { StoredTask } from '@/lib/task-storage';

interface CriticalZoneBannerProps {
  criticalTasks: StoredTask[];
}

export function CriticalZoneBanner({ criticalTasks }: CriticalZoneBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  if (criticalTasks.length === 0 || isDismissed) return null;

  const targetTask = criticalTasks[0]; // display the first critical task

  return (
    <div className="w-full bg-[#FF3D00] text-[#0A0A0A] px-4 py-3 relative font-sans flex items-center justify-between gap-3 animate-pulse border-b-2 border-[#0A0A0A]">
      <div className="flex items-center gap-2.5 min-w-0">
        <AlertOctagon className="w-5 h-5 shrink-0 animate-bounce" />
        <p className="text-xs font-mono font-black uppercase tracking-wider truncate">
          CRITICAL PRESSURE WARNING: "{targetTask.title}" IS OVERDUE / DUE NOW
        </p>
      </div>

      <div className="flex items-center gap-3 font-mono text-[10px] shrink-0">
        <Link
          href="/tasks"
          className="flex items-center gap-1 bg-[#0A0A0A] hover:bg-[#FAFAFA] text-[#FAFAFA] hover:text-[#0A0A0A] px-3 py-1 font-bold uppercase transition-colors"
        >
          <span>Acknowledge Tasks</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
        
        <button
          onClick={() => setIsDismissed(true)}
          className="p-1 text-[#0A0A0A] hover:text-[#FAFAFA] transition-colors"
          title="Dismiss warning"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
