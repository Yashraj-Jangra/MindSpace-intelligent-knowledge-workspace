import React, { memo, useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Sparkles, AlarmClock, ChevronDown, ChevronUp, BellRing, Wand2, FileText, Link2 } from 'lucide-react';
import { MindSpaceNodeData } from '@/lib/graph/transformer';

export const ConceptNode = memo(({ id, data, selected }: NodeProps) => {
  const nodeData = data as unknown as MindSpaceNodeData;

  const [isExpanded, setIsExpanded] = useState(false);
  const [showCopilotMenu, setShowCopilotMenu] = useState(false);
  const accentColor = nodeData.color || '#FF3D00';

  return (
    <div
      className={`group relative min-w-[260px] max-w-[340px] bg-[#0F0F0F] text-[#FAFAFA] border transition-colors duration-150 ${
        selected ? 'border-[#FF3D00] ring-2 ring-[#FF3D00] ring-offset-2 ring-offset-[#0A0A0A]' : 'border-[#262626] hover:border-[#737373]'
      }`}
      style={{ borderRadius: '0px' }}
    >
      {/* Top Accent Anchor Bar */}
      <div className="h-1 w-16" style={{ backgroundColor: accentColor }} />

      {/* Target & Source Connection Handles */}
      <Handle
        type="target"
        position={Position.Left}
        aria-label={`Target connection handle for node ${nodeData.label}`}
        className="!w-3 !h-3 !bg-[#FF3D00] !border-2 !border-[#0A0A0A] !rounded-none"
      />
      <Handle
        type="source"
        position={Position.Right}
        aria-label={`Source connection handle for node ${nodeData.label}`}
        className="!w-3 !h-3 !bg-[#FF3D00] !border-2 !border-[#0A0A0A] !rounded-none"
      />

      <div className="p-4">
        {/* Monospace Badge & Reminder Marker */}
        <div className="flex items-center justify-between mb-2">
          <span className="font-mono text-[11px] uppercase tracking-wider text-[#737373]">
            {nodeData.type || 'CONCEPT'}
          </span>
          {nodeData.reminderAt && (
            <div className="flex items-center gap-1 text-[11px] font-mono text-[#FF3D00] border border-[#FF3D00]/30 px-1.5 py-0.5">
              <AlarmClock className="w-3 h-3 stroke-[1.5]" />
              <span>{new Date(nodeData.reminderAt).toLocaleDateString()}</span>
            </div>
          )}
        </div>

        {/* Node Headline */}
        <h3 className="font-sans font-bold text-lg leading-tight tracking-tight text-[#FAFAFA] mb-2">
          {nodeData.label}
        </h3>

        {/* Collapsible Body Content */}
        {nodeData.markdown && (
          <div>
            <div className={`text-sm text-[#737373] leading-normal font-sans ${isExpanded ? 'block' : 'line-clamp-2'}`}>
              {nodeData.markdown}
            </div>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="mt-1 flex items-center gap-1 text-xs text-[#737373] hover:text-[#FAFAFA] transition-colors"
            >
              {isExpanded ? (
                <>
                  <span>Less</span>
                  <ChevronUp className="w-3 h-3" />
                </>
              ) : (
                <>
                  <span>More</span>
                  <ChevronDown className="w-3 h-3" />
                </>
              )}
            </button>
          </div>
        )}

        {/* Action Toolbar */}
        <div className="mt-3 pt-3 border-t border-[#262626] flex items-center justify-between gap-2 relative">
          <button
            onClick={() => nodeData.onExpandTopic?.(id, nodeData.label, nodeData.markdown || '')}
            className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-[#FF3D00] hover:text-[#FAFAFA] transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 stroke-[1.5]" />
            <span className="hover-underline-accent">Expand</span>
          </button>

          {/* AI Copilot Menu Toggle */}
          <div className="relative">
            <button
              onClick={() => setShowCopilotMenu(!showCopilotMenu)}
              className="flex items-center gap-1 text-xs font-mono uppercase tracking-wider text-[#FAFAFA] hover:text-[#FF3D00] transition-colors"
            >
              <Wand2 className="w-3.5 h-3.5 stroke-[1.5]" />
              <span>Copilot</span>
            </button>

            {showCopilotMenu && (
              <div className="absolute right-0 bottom-6 z-50 w-44 bg-[#0F0F0F] border border-[#FF3D00] p-1 shadow-2xl space-y-1">
                <button
                  onClick={() => {
                    setShowCopilotMenu(false);
                    nodeData.onCopilotAction?.('summarize', id, nodeData.label, nodeData.markdown);
                  }}
                  className="w-full text-left flex items-center gap-2 px-2.5 py-1.5 text-xs font-mono text-[#FAFAFA] hover:bg-[#FF3D00] hover:text-[#0A0A0A] transition-colors"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Summarize Notes</span>
                </button>

                <button
                  onClick={() => {
                    setShowCopilotMenu(false);
                    nodeData.onCopilotAction?.('rewrite', id, nodeData.label, nodeData.markdown);
                  }}
                  className="w-full text-left flex items-center gap-2 px-2.5 py-1.5 text-xs font-mono text-[#FAFAFA] hover:bg-[#FF3D00] hover:text-[#0A0A0A] transition-colors"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>Rewrite Tone</span>
                </button>

                <button
                  onClick={() => {
                    setShowCopilotMenu(false);
                    nodeData.onCopilotAction?.('auto-link', id, nodeData.label, nodeData.markdown);
                  }}
                  className="w-full text-left flex items-center gap-2 px-2.5 py-1.5 text-xs font-mono text-[#FAFAFA] hover:bg-[#FF3D00] hover:text-[#0A0A0A] transition-colors"
                >
                  <Link2 className="w-3.5 h-3.5" />
                  <span>Auto-Link Map</span>
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => nodeData.onSetReminder?.(id, nodeData.label)}
            className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-[#737373] hover:text-[#FF3D00] transition-colors"
          >
            <BellRing className="w-3.5 h-3.5 stroke-[1.5]" />
            <span>Remind</span>
          </button>
        </div>
      </div>
    </div>
  );
});

ConceptNode.displayName = 'ConceptNode';
