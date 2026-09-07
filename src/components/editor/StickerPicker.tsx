'use client';

import React, { useState } from 'react';
import { X, Search, Smile, Tag, ShieldAlert, Sparkles, Code2 } from 'lucide-react';

interface StickerPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSticker: (stickerText: string) => void;
}

const STICKER_CATEGORIES = [
  {
    id: 'badges',
    name: 'Status Badges',
    icon: Tag,
    items: [
      '🔥 [URGENT]',
      '⚡ [IN PROGRESS]',
      '✅ [COMPLETED]',
      '📌 [PINNED]',
      '💡 [IDEA]',
      '🚀 [RELEASE]',
      '⚠️ [IMPORTANT]',
      '🔒 [CONFIDENTIAL]',
    ],
  },
  {
    id: 'emojis',
    name: 'Reactions & Emojis',
    icon: Smile,
    items: ['🎯', '✨', '🧠', '📊', '🛠️', '📝', '⭐', '🔥', '💡', '🚀', '🎉', '⏳', '📌', '🏷️', '💻', '🎨'],
  },
  {
    id: 'tech',
    name: 'Tech & Architecture',
    icon: Code2,
    items: [
      '`[NEXT.JS]`',
      '`[REACT]`',
      '`[TYPESCRIPT]`',
      '`[PRISMA]`',
      '`[POSTGRES]`',
      '`[DOCKER]`',
      '`[TAILWIND]`',
      '`[REST API]`',
    ],
  },
  {
    id: 'callouts',
    name: 'Callout Banners',
    icon: Sparkles,
    items: [
      '> 💡 **PRO TIP:** ',
      '> ⚠️ **WARNING:** ',
      '> 📝 **NOTE:** ',
      '> 🚀 **ACTION ITEM:** ',
    ],
  },
];

export function StickerPicker({ isOpen, onClose, onSelectSticker }: StickerPickerProps) {
  const [activeTab, setActiveTab] = useState('badges');
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const activeCategory = STICKER_CATEGORIES.find((c) => c.id === activeTab) || STICKER_CATEGORIES[0];
  const filteredItems = activeCategory.items.filter((item) =>
    item.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-[#0A0A0A]/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-[#0F0F0F] border border-[#262626] flex flex-col font-sans animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#262626]">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#FF3D00]" />
            <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-[#FAFAFA]">
              Sticker & Accent Library
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 border border-[#262626] text-[#737373] hover:text-[#FAFAFA] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Input */}
        <div className="px-6 py-3 border-b border-[#262626] bg-[#0A0A0A] flex items-center gap-2">
          <Search className="w-4 h-4 text-[#737373]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter stickers..."
            className="w-full bg-transparent text-xs font-mono text-[#FAFAFA] focus:outline-none placeholder:text-[#737373]"
          />
        </div>

        {/* Category Tabs */}
        <div className="flex border-b border-[#262626] bg-[#0F0F0F] overflow-x-auto">
          {STICKER_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeTab === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveTab(cat.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-mono uppercase tracking-wider transition-colors border-b-2 whitespace-nowrap ${
                  isActive
                    ? 'border-[#FF3D00] text-[#FF3D00] bg-[#1A1A1A]'
                    : 'border-transparent text-[#737373] hover:text-[#FAFAFA]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>

        {/* Sticker Items Grid */}
        <div className="p-6 max-h-64 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {filteredItems.map((item, idx) => (
            <button
              key={idx}
              onClick={() => {
                onSelectSticker(item);
                onClose();
              }}
              className="px-3 py-2 bg-[#1A1A1A] border border-[#262626] hover:border-[#FF3D00] text-xs font-mono text-[#FAFAFA] hover:text-[#FF3D00] transition-colors text-left truncate"
            >
              {item}
            </button>
          ))}
          {filteredItems.length === 0 && (
            <div className="col-span-full py-8 text-center font-mono text-xs text-[#737373]">
              No matching stickers found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
