'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Network, Plus, Trash2, Edit2, Check, X, Clock, ArrowUpRight, Sparkles } from 'lucide-react';

export interface CanvasListItem {
  id: string;
  userId: string;
  title: string;
  description?: string | null;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    nodes: number;
  };
}

interface RecentCanvasesGridProps {
  initialCanvases: CanvasListItem[];
}

export function RecentCanvasesGrid({ initialCanvases }: RecentCanvasesGridProps) {
  const router = useRouter();
  const [canvases, setCanvases] = useState<CanvasListItem[]>(initialCanvases);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateCanvas = async () => {
    setIsCreating(true);
    try {
      const res = await fetch('/api/canvas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Untitled MindSpace',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.canvas && data.canvas.id) {
          router.push(`/canvas/${data.canvas.id}`);
        }
      } else {
        alert('Failed to create canvas.');
      }
    } catch (err) {
      console.error('Error creating canvas:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteCanvas = async (e: React.MouseEvent, canvasId: string, title: string) => {
    e.stopPropagation();
    e.preventDefault();
    if (!confirm(`Are you sure you want to delete "${title}"? This cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/canvas/${canvasId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setCanvases((prev) => prev.filter((c) => c.id !== canvasId));
      }
    } catch (err) {
      console.error('Error deleting canvas:', err);
    }
  };

  const startRename = (e: React.MouseEvent, canvasId: string, currentTitle: string) => {
    e.stopPropagation();
    e.preventDefault();
    setEditingId(canvasId);
    setEditTitle(currentTitle);
  };

  const handleRename = async (canvasId: string) => {
    if (!editTitle.trim()) return;

    try {
      const res = await fetch(`/api/canvas/${canvasId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle.trim(),
        }),
      });

      if (res.ok) {
        setCanvases((prev) =>
          prev.map((c) => (c.id === canvasId ? { ...c, title: editTitle.trim() } : c))
        );
        setEditingId(null);
      }
    } catch (err) {
      console.error('Error renaming canvas:', err);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-mono text-xs text-[#FF3D00] uppercase tracking-wider">
          <Network className="w-4 h-4" />
          <span>Mind Map Canvases</span>
          <span className="text-[#737373] font-normal">({canvases.length})</span>
        </div>

        <button
          onClick={handleCreateCanvas}
          disabled={isCreating}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FF3D00] hover:bg-[#FF5722] text-[#0A0A0A] font-mono text-xs font-bold uppercase tracking-wider transition-colors"
        >
          <Plus className="w-4 h-4 stroke-[2]" />
          <span>New Canvas</span>
        </button>
      </div>

      {/* Canvases Grid */}
      {canvases.length === 0 ? (
        <div className="p-8 bg-[#0F0F0F] border border-[#262626] text-center space-y-3">
          <div className="w-10 h-10 bg-[#FF3D00]/10 border border-[#FF3D00] text-[#FF3D00] mx-auto flex items-center justify-center font-bold">
            <Network className="w-5 h-5" />
          </div>
          <p className="font-mono text-xs text-[#737373] uppercase">No canvases created yet.</p>
          <button
            onClick={handleCreateCanvas}
            className="px-4 py-2 bg-[#FF3D00] text-[#0A0A0A] font-mono text-xs font-bold uppercase tracking-wider"
          >
            Create First Mind Map
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {canvases.map((c) => (
            <div
              key={c.id}
              className="group relative bg-[#0F0F0F] border border-[#262626] hover:border-[#FF3D00] p-5 flex flex-col justify-between space-y-4 transition-all duration-200"
            >
              {/* Top Accent Line */}
              <div className="h-1 w-12 bg-[#FF3D00] absolute top-0 left-0" />

              {/* Title & Options */}
              <div className="flex items-start justify-between gap-3 pt-1">
                {editingId === c.id ? (
                  <div className="flex items-center gap-1.5 flex-1">
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="bg-[#1A1A1A] border border-[#FF3D00] text-[#FAFAFA] text-xs font-bold px-2 py-1 outline-none w-full"
                      autoFocus
                    />
                    <button
                      onClick={() => handleRename(c.id)}
                      className="p-1 bg-[#10B981] text-[#0A0A0A]"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="p-1 bg-[#262626] text-[#FAFAFA]"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <Link href={`/canvas/${c.id}`} className="block group-hover:text-[#FF3D00] transition-colors">
                    <h3 className="font-sans font-black text-lg tracking-tight uppercase text-[#FAFAFA] group-hover:text-[#FF3D00] line-clamp-1">
                      {c.title}
                    </h3>
                  </Link>
                )}

                {/* Actions Menu */}
                {editingId !== c.id && (
                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => startRename(e, c.id, c.title)}
                      className="p-1 text-[#737373] hover:text-[#FAFAFA] transition-colors"
                      title="Rename Canvas"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleDeleteCanvas(e, c.id, c.title)}
                      className="p-1 text-[#737373] hover:text-[#FF3D00] transition-colors"
                      title="Delete Canvas"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Card Graph Texture Footer */}
              <div className="pt-3 border-t border-[#1A1A1A] flex items-center justify-between font-mono text-[10px] text-[#737373]">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-[#737373]" />
                  <span>{new Date(c.updatedAt).toLocaleDateString()}</span>
                </div>

                <Link
                  href={`/canvas/${c.id}`}
                  className="flex items-center gap-1 text-[#FAFAFA] group-hover:text-[#FF3D00] font-bold uppercase transition-colors"
                >
                  <span>Open Canvas</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
