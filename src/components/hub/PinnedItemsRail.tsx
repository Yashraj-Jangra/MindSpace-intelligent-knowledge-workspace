'use client';

import React from 'react';
import Link from 'next/link';
import { Pin, ArrowRight } from 'lucide-react';

export interface PinnedItem {
  id: string;
  type: 'note' | 'task';
  title: string;
  priority: string;
  updatedAt: string;
  url: string;
  content?: string;
}

interface PinnedItemsRailProps {
  pinnedItems: PinnedItem[];
}

export function PinnedItemsRail({ pinnedItems }: PinnedItemsRailProps) {
  if (pinnedItems.length === 0) return null;

  return (
    <div className="space-y-4 font-sans">
      <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-[#FF3D00]">
        <Pin className="w-4 h-4 text-[#FF3D00]" />
        <span>PINNED SHELF</span>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
        {pinnedItems.map((item) => (
          <Link
            key={item.id}
            href={item.url}
            className="flex-shrink-0 w-[240px] bg-[#0F0F0F] border border-[#262626] hover:border-[#FF3D00] p-4 relative group transition-colors flex flex-col justify-between"
          >
            <div className="h-1 w-8 bg-[#FF3D00] absolute top-0 left-0" />
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-mono text-[9px] uppercase tracking-wider text-[#737373]">
                  {item.priority} {item.type}
                </span>
                <Pin className="w-3.5 h-3.5 text-[#FF3D00]" />
              </div>
              <h3 className="font-sans font-bold text-sm text-[#FAFAFA] group-hover:text-[#FF3D00] transition-colors mb-2 line-clamp-1">
                {item.title}
              </h3>
              {item.type === 'note' ? (
                <p className="text-[11px] text-[#737373] line-clamp-2 leading-relaxed mb-3">
                  {item.content || 'Empty note...'}
                </p>
              ) : (
                <p className="text-[11px] font-mono text-[#FF3D00] uppercase tracking-wider mb-3">
                  Checklist Objective
                </p>
              )}
            </div>
            <div className="flex items-center justify-between text-[9px] font-mono text-[#737373] pt-2 border-t border-[#1A1A1A]">
              <span>{new Date(item.updatedAt).toLocaleDateString()}</span>
              <span className="group-hover:text-[#FF3D00] transition-colors flex items-center gap-0.5">
                Open {item.type === 'task' ? 'Tasks' : 'Note'} <ArrowRight className="w-2.5 h-2.5" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
