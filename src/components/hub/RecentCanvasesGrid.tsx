'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Network, Plus, Trash2, Edit2, Check, X } from 'lucide-react';

export interface CanvasListItem {
  id: string;
  userId: string;
  title: string;
  description?: string | null;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
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
    if (!confirm(`Are you sure you want to delete the canvas "${title}"? This cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/canvas/${canvasId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setCanvases((prev) => prev.filter((c) => c.id !== canvasId));
      } else {
        alert('Failed to delete canvas.');
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
    <div className="bg-[#0F0F0F] border border-[#262626] p-6 relative flex flex-col font-sans h-full">
      <div className="h-1 w-12 bg-[#FF3D00] absolute top-0 left-0" />
      <div className="flex items-center justify-between text-[#737373] mb-6">
        <span className="font-mono text-xs uppercase tracking-wider">Recent Canvases</span>
        <button
          onClick={handleCreateCanvas}
          disabled={isCreating}
          className="flex items-center gap-1.5 px-3 py-1 bg-[#FF3D00] hover:bg-[#FAFAFA] text-[#0A0A0A] font-mono text-[11px] uppercase font-bold transition-colors"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2]" />
          <span>{isCreating ? 'Creating...' : 'New Canvas'}</span>
        </button>
      </div>

      {canvases.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-12 text-center border border-dashed border-[#262626] p-6">
          <Network className="w-8 h-8 text-[#737373] mb-3 stroke-[1.5]" />
          <h3 className="font-sans font-bold text-sm uppercase text-[#FAFAFA] mb-1">No Canvases Yet</h3>
          <p className="text-xs font-mono text-[#737373] max-w-xs mb-4">
            Build a visual mind map, expand topics, and convert notes using the canvas workspace.
          </p>
          <button
            onClick={handleCreateCanvas}
            disabled={isCreating}
            className="px-6 py-2.5 bg-[#FF3D00] hover:bg-[#FAFAFA] text-[#0A0A0A] font-mono text-xs uppercase font-bold tracking-wider transition-colors"
          >
            Create New Canvas
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 flex-1">
          {canvases.map((canvas) => (
            <div
              key={canvas.id}
              className="bg-[#0A0A0A] border border-[#262626] hover:border-[#FF3D00] p-5 relative flex flex-col justify-between group transition-all"
            >
              <div className="h-1 w-12 bg-[#FF3D00] absolute top-0 left-0" />
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-[9px] uppercase tracking-wider text-[#737373]">
                    Canvas Map
                  </span>
                  
                  {/* Hover Edit / Delete actions */}
                  <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => startRename(e, canvas.id, canvas.title)}
                      className="p-1 border border-[#262626] hover:border-[#FF3D00] text-[#737373] hover:text-[#FF3D00] transition-colors"
                      title="Rename Canvas"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleDeleteCanvas(e, canvas.id, canvas.title)}
                      className="p-1 border border-[#262626] hover:border-[#ef4444] text-[#737373] hover:text-[#ef4444] transition-colors"
                      title="Delete Canvas"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {editingId === canvas.id ? (
                  <div className="flex items-center gap-1.5 mb-2" onClick={(e) => e.preventDefault()}>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="bg-[#1A1A1A] border border-[#FF3D00] text-xs font-mono text-[#FAFAFA] px-2 py-1 focus:outline-none w-full"
                      autoFocus
                    />
                    <button
                      onClick={() => handleRename(canvas.id)}
                      className="p-1 border border-[#10b981] text-[#10b981] hover:bg-[#10b981]/10"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="p-1 border border-[#ef4444] text-[#ef4444] hover:bg-[#ef4444]/10"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <Link href={`/canvas/${canvas.id}`} className="block">
                    <h3 className="font-sans font-bold text-base text-[#FAFAFA] group-hover:text-[#FF3D00] transition-colors mb-2 line-clamp-1">
                      {canvas.title}
                    </h3>
                  </Link>
                )}
              </div>

              <div className="flex items-center justify-between text-[10px] font-mono text-[#737373] pt-4 border-t border-[#1A1A1A] mt-4">
                <span>Edited {new Date(canvas.updatedAt).toLocaleDateString()}</span>
                <span className="px-1.5 py-0.5 bg-[#1A1A1A] border border-[#262626] text-[9px] font-mono uppercase tracking-wider text-[#FAFAFA]">
                  Open Map →
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
