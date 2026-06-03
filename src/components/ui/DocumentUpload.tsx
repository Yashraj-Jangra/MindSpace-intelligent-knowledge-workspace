'use client';

import React, { useState } from 'react';
import { FileUp, X, Loader2, FileText, CheckCircle } from 'lucide-react';

interface DocumentUploadProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: (data: { canvasId: string; title: string; nodes: any[]; edges: any[] }) => void;
}

export function DocumentUpload({ isOpen, onClose, onUploadSuccess }: DocumentUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || isUploading) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/parse-document', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Document parsing failed');

      const data = await res.json();
      onUploadSuccess(data);
      onClose();
    } catch (err) {
      console.error(err);
      alert('Failed to parse document. Please check file format.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-[#0F0F0F] border border-[#FF3D00] p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#737373] hover:text-[#FAFAFA] transition-colors"
        >
          <X className="w-5 h-5 stroke-[1.5]" />
        </button>

        <div className="flex items-center gap-2 text-[#FF3D00] mb-4">
          <FileUp className="w-5 h-5 stroke-[1.5]" />
          <span className="font-mono text-xs uppercase tracking-wider font-semibold">Document Graph Parser</span>
        </div>

        <h3 className="font-sans text-xl font-bold text-[#FAFAFA] mb-2 tracking-tight">
          Upload PDF or Text Document
        </h3>
        <p className="text-xs text-[#737373] font-sans mb-6">
          MindSpace AI will extract document structure, chapters, and concepts into an interactive node map.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="border-2 border-dashed border-[#262626] hover:border-[#FF3D00] p-8 flex flex-col items-center justify-center cursor-pointer transition-colors bg-[#1A1A1A]">
            <FileText className="w-8 h-8 text-[#FF3D00] mb-2 stroke-[1.5]" />
            <span className="text-sm font-mono text-[#FAFAFA] mb-1">
              {file ? file.name : 'Click or drop file to upload'}
            </span>
            <span className="text-xs text-[#737373] font-mono uppercase">
              Supports .TXT, .MD, .PDF, .JSON
            </span>
            <input
              type="file"
              onChange={handleFileChange}
              accept=".txt,.md,.pdf,.json"
              className="hidden"
            />
          </label>

          {file && (
            <div className="flex items-center gap-2 text-xs font-mono text-[#10b981]">
              <CheckCircle className="w-4 h-4" />
              <span>Ready for AI extraction ({Math.round(file.size / 1024)} KB)</span>
            </div>
          )}

          <div className="pt-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-mono uppercase tracking-wider text-[#737373] hover:text-[#FAFAFA]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading || !file}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#FF3D00] text-[#0A0A0A] font-mono text-xs uppercase tracking-wider font-bold hover:bg-[#FAFAFA] transition-colors disabled:opacity-50"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin stroke-[2]" />
                  <span>Extracting Tree...</span>
                </>
              ) : (
                <>
                  <FileUp className="w-4 h-4 stroke-[2]" />
                  <span>Parse into Canvas</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
