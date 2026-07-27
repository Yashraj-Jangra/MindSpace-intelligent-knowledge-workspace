'use client';

import React, { useState, useEffect, useRef } from 'react';
import { FileUp, Link2 } from 'lucide-react';

export function QuickCaptureInbox() {
  const [text, setText] = useState('');
  const [isUrl, setIsUrl] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Simple URL detection regex
  const urlRegex = /^(https?:\/\/[^\s]+)$/i;

  useEffect(() => {
    setIsUrl(urlRegex.test(text.trim()));
  }, [text]);

  // Auto-expand textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [text]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    setIsSaving(true);
    setSuccessMessage(null);

    try {
      const res = await fetch('/api/hub/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawText: text,
          sourceUrl: isUrl ? text.trim() : null,
        }),
      });

      if (res.ok) {
        setText('');
        setSuccessMessage('Saved to Inbox ✓');
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        const errData = await res.json();
        alert(errData.error || 'Failed to save capture.');
      }
    } catch (err) {
      console.error('Capture save error:', err);
      alert('Error saving capture.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-[#0F0F0F] border border-[#262626] p-6 relative flex flex-col font-sans">
      <div className="h-1 w-12 bg-[#FF3D00] absolute top-0 left-0" />
      <div className="flex items-center justify-between text-[#737373] mb-4">
        <span className="font-mono text-xs uppercase tracking-wider">Quick Capture Inbox</span>
        <FileUp className="w-4 h-4 text-[#FF3D00]" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <textarea
            ref={textareaRef}
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type anything to dump to your inbox... paste links, logs, or thoughts here."
            className="w-full bg-[#1A1A1A] border border-[#262626] focus:border-[#FF3D00] text-xs font-mono text-[#FAFAFA] p-3 focus:outline-none resize-none min-h-[80px]"
          />
          
          {isUrl && (
            <div className="absolute right-3 bottom-3 flex items-center gap-1.5 px-2 py-0.5 bg-[#FF3D00]/10 border border-[#FF3D00]/30 text-[9px] font-mono uppercase tracking-wider text-[#FF3D00]">
              <Link2 className="w-3 h-3" />
              <span>Link Detected</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="text-[10px] font-mono text-[#737373]">
            {text.length > 0 && <span>{text.length} characters</span>}
          </div>

          <div className="flex items-center gap-3">
            {successMessage && (
              <span className="text-[11px] font-mono text-[#10b981] animate-pulse">
                {successMessage}
              </span>
            )}
            <button
              type="submit"
              disabled={isSaving || !text.trim()}
              className={`px-4 py-2 font-mono text-xs uppercase font-bold tracking-wider transition-colors ${
                text.trim()
                  ? 'bg-[#FF3D00] hover:bg-[#FAFAFA] text-[#0A0A0A]'
                  : 'bg-[#1A1A1A] border border-[#262626] text-[#737373] cursor-not-allowed'
              }`}
            >
              {isSaving ? 'Saving...' : 'Save to Inbox'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
