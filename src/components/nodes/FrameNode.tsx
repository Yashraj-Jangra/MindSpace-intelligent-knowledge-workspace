"use client";

import { memo, useState } from "react";
import { NodeProps, NodeResizer } from "@xyflow/react";
import { Layout } from "lucide-react";

export interface FrameNodeData {
  label: string;
  color?: string;
  description?: string;
}

export const FrameNode = memo(({ data, selected }: NodeProps) => {
  // SAFETY: Node data passed from React Flow runtime conforms to FrameNodeData shape
  const frameData = (data || {}) as unknown as FrameNodeData;
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState(frameData.label || "Section Frame");
  const accentColor = frameData.color || "#FF3D00";

  return (
    <div
      className={`relative w-full h-full min-w-[340px] min-h-[220px] bg-[#0F0F0F]/30 border-2 transition-all ${
        selected
          ? "border-[#FF3D00] ring-1 ring-[#FF3D00]/50"
          : "border-dashed border-[#262626] hover:border-[#404040]"
      }`}
      style={{
        boxShadow: selected ? "0 0 0 1px #FF3D00" : "none",
      }}
    >
      <NodeResizer
        isVisible={selected}
        minWidth={280}
        minHeight={180}
        lineClassName="!border-[#FF3D00]"
        handleClassName="!w-2.5 !h-2.5 !bg-[#FF3D00] !border !border-[#0A0A0A] !rounded-none"
      />

      {/* Top Banner Tab */}
      <div
        className="absolute -top-7 left-0 flex items-center gap-2 px-3 py-1 font-mono text-xs uppercase font-bold tracking-wider text-[#0A0A0A] select-none cursor-move"
        style={{ backgroundColor: accentColor }}
      >
        <Layout className="w-3.5 h-3.5 stroke-[2.5]" />
        {isEditingTitle ? (
          <input
            type="text"
            value={title}
            autoFocus
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => setIsEditingTitle(false)}
            onKeyDown={(e) => e.key === "Enter" && setIsEditingTitle(false)}
            className="bg-transparent text-[#0A0A0A] font-bold outline-none border-b border-[#0A0A0A] px-0.5 text-xs font-mono"
          />
        ) : (
          <span
            onDoubleClick={() => setIsEditingTitle(true)}
            title="Double click to rename"
          >
            {title}
          </span>
        )}
      </div>

      {/* Subtle frame watermark in corner */}
      <div className="absolute bottom-2 right-3 font-mono text-[9px] uppercase tracking-widest text-[#737373]/30 pointer-events-none select-none">
        GROUP FRAME CONTAINER
      </div>
    </div>
  );
});

FrameNode.displayName = "FrameNode";
