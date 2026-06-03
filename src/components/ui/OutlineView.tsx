'use client';

import React from 'react';
import { Node as ReactFlowNode } from '@xyflow/react';
import { X, FileText, Share2, Edit3 } from 'lucide-react';
import { MindSpaceNodeData } from '@/lib/graph/transformer';

interface OutlineViewProps {
  isOpen: boolean;
  nodes: ReactFlowNode[];
  onClose: () => void;
  onUpdateNodeText?: (nodeId: string, label: string, markdown: string) => void;
}

export function OutlineView({ isOpen, nodes, onClose, onUpdateNodeText }: OutlineViewProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-full max-w-lg bg-[#0F0F0F] border-l border-[#262626] p-6 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
      <div className="flex items-center justify-between pb-4 border-b border-[#262626] mb-6">
        <div className="flex items-center gap-2 text-[#FF3D00]">
          <FileText className="w-5 h-5 stroke-[1.5]" />
          <span className="font-mono text-xs uppercase tracking-wider font-semibold">Live Bi-Directional Outline</span>
        </div>
        <button onClick={onClose} className="text-[#737373] hover:text-[#FAFAFA] transition-colors">
          <X className="w-5 h-5 stroke-[1.5]" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-6 pr-2">
        {nodes.length === 0 ? (
          <p className="text-sm font-mono text-[#737373]">No nodes in current mind map...</p>
        ) : (
          nodes.map((n, idx) => {
            const data = n.data as unknown as MindSpaceNodeData;
            return (
              <div key={n.id} className="border-l-2 border-[#FF3D00] pl-4 space-y-2 group">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-[#FF3D00]">{`0${idx + 1}.`}</span>
                  <input
                    type="text"
                    value={data.label}
                    onChange={(e) => onUpdateNodeText?.(n.id, e.target.value, data.markdown || '')}
                    className="flex-1 font-sans font-bold text-base bg-transparent text-[#FAFAFA] border-b border-transparent hover:border-[#262626] focus:border-[#FF3D00] focus:outline-none py-0.5 tracking-tight"
                  />
                </div>

                <textarea
                  value={data.markdown || ''}
                  onChange={(e) => onUpdateNodeText?.(n.id, data.label, e.target.value)}
                  placeholder="Add node notes..."
                  rows={3}
                  className="w-full bg-[#1A1A1A] border border-[#262626] focus:border-[#FF3D00] focus:outline-none p-2 text-sm text-[#737373] focus:text-[#FAFAFA] font-sans leading-relaxed resize-none"
                />
              </div>
            );
          })
        )}
      </div>

      <div className="pt-4 border-t border-[#262626] flex items-center justify-between">
        <div className="flex items-center gap-2 font-mono text-xs text-[#737373]">
          <Edit3 className="w-3.5 h-3.5 text-[#FF3D00]" />
          <span>{nodes.length} Live Sync Nodes</span>
        </div>
        <button
          onClick={() => {
            const textContent = nodes
              .map((n) => `# ${(n.data as unknown as MindSpaceNodeData).label}\n${(n.data as unknown as MindSpaceNodeData).markdown || ''}`)
              .join('\n\n');
            navigator.clipboard.writeText(textContent);
            alert('Markdown copied to clipboard!');
          }}
          className="flex items-center gap-2 px-4 py-2 border border-[#262626] hover:border-[#FF3D00] text-xs font-mono uppercase tracking-wider text-[#FAFAFA] transition-colors"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>Copy Markdown</span>
        </button>
      </div>
    </div>
  );
}
