'use client';

import React, { useState } from 'react';
import { Download, FileText, Code2, Image, ChevronDown } from 'lucide-react';
import { Node as ReactFlowNode, Edge as ReactFlowEdge } from '@xyflow/react';
import { exportToMarkdown, exportToJson, downloadFile } from '@/lib/export';

interface ExportMenuProps {
  title: string;
  nodes: ReactFlowNode[];
  edges: ReactFlowEdge[];
}

export function ExportMenu({ title, nodes, edges }: ExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleExportMarkdown = () => {
    const content = exportToMarkdown(title, nodes);
    downloadFile(content, `${title.toLowerCase().replace(/\s+/g, '-')}.md`, 'text/markdown');
    setIsOpen(false);
  };

  const handleExportJson = () => {
    const content = exportToJson(title, nodes, edges);
    downloadFile(content, `${title.toLowerCase().replace(/\s+/g, '-')}.json`, 'application/json');
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 border border-[#262626] hover:border-[#FF3D00] text-xs font-mono uppercase tracking-wider text-[#FAFAFA] transition-colors"
      >
        <Download className="w-3.5 h-3.5 text-[#FF3D00]" />
        <span className="hidden sm:inline">Export</span>
        <ChevronDown className="w-3 h-3 text-[#737373]" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 z-50 w-48 bg-[#0F0F0F] border border-[#FF3D00] p-1 space-y-1">
          <button
            onClick={handleExportMarkdown}
            className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-mono text-[#FAFAFA] hover:bg-[#FF3D00] hover:text-[#0A0A0A] transition-colors"
          >
            <FileText className="w-4 h-4" />
            <span>Markdown (.MD)</span>
          </button>

          <button
            onClick={handleExportJson}
            className="w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-mono text-[#FAFAFA] hover:bg-[#FF3D00] hover:text-[#0A0A0A] transition-colors"
          >
            <Code2 className="w-4 h-4" />
            <span>JSON (.JSON)</span>
          </button>
        </div>
      )}
    </div>
  );
}
