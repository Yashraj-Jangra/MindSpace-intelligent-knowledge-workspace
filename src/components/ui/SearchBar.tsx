'use client';

import React, { useState } from 'react';
import { Search, Loader2, Sparkles, Crosshair } from 'lucide-react';

interface SearchResultNode {
  id: string;
  label: string;
  markdown?: string;
  positionX: number;
  positionY: number;
}

interface SearchBarProps {
  canvasId: string | null;
  onSelectNode: (node: SearchResultNode) => void;
}

export function SearchBar({ canvasId, onSelectNode }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<Array<{ node: SearchResultNode; score: number }>>([]);
  const [isOpen, setIsOpen] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isSearching) return;

    setIsSearching(true);
    setIsOpen(true);

    try {
      const res = await fetch('/api/rag/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, canvasId }),
      });

      if (res.ok) {
        const data = await res.json();
        setResults(data.matches || []);
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="relative w-72 sm:w-96">
      <form onSubmit={handleSearch} className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Semantic RAG search notes..."
          className="w-full bg-[#0F0F0F] border border-[#262626] focus:border-[#FF3D00] text-xs font-mono text-[#FAFAFA] placeholder-[#737373] pl-9 pr-8 py-2 focus:outline-none transition-colors"
        />
        <Search className="w-4 h-4 text-[#737373] absolute left-3 top-1/2 -translate-y-1/2 stroke-[1.5]" />
        {isSearching && (
          <Loader2 className="w-4 h-4 text-[#FF3D00] animate-spin absolute right-3 top-1/2 -translate-y-1/2 stroke-[1.5]" />
        )}
      </form>

      {/* Search Results Dropdown */}
      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-[#0F0F0F] border border-[#FF3D00] p-2 space-y-1 max-h-72 overflow-y-auto">
          <div className="flex items-center justify-between px-2 py-1 border-b border-[#262626] mb-1">
            <span className="font-mono text-[10px] uppercase tracking-widest text-[#FF3D00]">
              Semantic Matches ({results.length})
            </span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-[10px] font-mono text-[#737373] hover:text-[#FAFAFA]"
            >
              Close
            </button>
          </div>

          {results.map(({ node, score }) => (
            <button
              key={node.id}
              onClick={() => {
                onSelectNode(node);
                setIsOpen(false);
              }}
              className="w-full text-left p-2 hover:bg-[#1A1A1A] transition-colors border-l-2 border-[#FF3D00] flex items-start justify-between gap-2 group"
            >
              <div>
                <h5 className="font-sans font-bold text-xs text-[#FAFAFA] group-hover:text-[#FF3D00] transition-colors">
                  {node.label}
                </h5>
                {node.markdown && (
                  <p className="text-[11px] text-[#737373] font-sans line-clamp-1 mt-0.5">
                    {node.markdown}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1 text-[10px] font-mono text-[#FF3D00] shrink-0">
                <Crosshair className="w-3 h-3" />
                <span>{Math.round(score * 100)}%</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
