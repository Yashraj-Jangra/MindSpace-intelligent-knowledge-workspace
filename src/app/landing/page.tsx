import React from 'react';
import Link from 'next/link';
import { Network, ArrowRight, Sparkles, FileText, Bell, Shield, Wand2, Key } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen w-full bg-[#0A0A0A] text-[#FAFAFA] flex flex-col font-sans selection:bg-[#FF3D00] selection:text-[#0A0A0A] overflow-x-hidden">
      {/* Header Bar */}
      <header className="h-20 border-b border-[#262626] px-8 flex items-center justify-between z-30 max-w-7xl w-full mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#FF3D00] flex items-center justify-center font-mono font-bold text-[#0A0A0A]">
            <Network className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="font-sans font-black text-xl tracking-tighter uppercase text-[#FAFAFA]">
              MIND<span className="text-[#FF3D00]">SPACE</span>
            </h1>
            <span className="font-mono text-[9px] uppercase tracking-widest text-[#737373] block -mt-1">
              AI VISUAL KNOWLEDGE PLATFORM
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="px-4 py-2 border border-[#262626] hover:border-[#FAFAFA] text-xs font-mono uppercase tracking-wider text-[#FAFAFA] transition-colors"
          >
            Log In
          </Link>

          <Link
            href="/register"
            className="px-6 py-2.5 bg-[#FF3D00] hover:bg-[#FAFAFA] text-[#0A0A0A] text-xs font-mono uppercase tracking-wider font-bold transition-colors"
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero Section - Poster Design Style */}
      <section className="py-24 px-8 max-w-6xl mx-auto flex flex-col items-start relative border-b border-[#262626]">
        <div className="flex items-center gap-2 text-[#FF3D00] font-mono text-xs uppercase tracking-widest mb-6">
          <Sparkles className="w-4 h-4 stroke-[1.5]" />
          <span>VISUAL NOTE-TAKING REINVENTED FOR BROWSERS</span>
        </div>

        <h1 className="font-sans font-black text-5xl sm:text-7xl lg:text-8xl tracking-tighter uppercase leading-[0.95] text-[#FAFAFA] mb-8">
          UNSTRUCTURED NOTES. <br />
          <span className="text-[#FF3D00]">STRUCTURED MIND MAPS.</span>
        </h1>

        <p className="text-lg sm:text-xl text-[#737373] max-w-2xl font-sans leading-relaxed mb-10">
          Dump text prompts, web clippings, and document files. MindSpace AI automatically converts raw context into interactive, interconnected visual node graphs with local vector RAG search.
        </p>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto">
          <Link
            href="/register"
            className="inline-flex items-center justify-center gap-3 px-8 py-4 bg-[#FF3D00] text-[#0A0A0A] font-mono text-sm uppercase tracking-wider font-bold hover:bg-[#FAFAFA] transition-colors group"
          >
            <span>Start Building Mind Maps</span>
            <ArrowRight className="w-4 h-4 stroke-[2] group-hover:translate-x-1 transition-transform" />
          </Link>

          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 border border-[#262626] text-[#FAFAFA] font-mono text-sm uppercase tracking-wider hover:border-[#FF3D00] transition-colors"
          >
            <span>Launch Canvas Demo</span>
          </Link>
        </div>
      </section>

      {/* Feature Section Grid */}
      <section className="py-24 px-8 max-w-6xl mx-auto w-full">
        <span className="font-mono text-xs uppercase tracking-widest text-[#FF3D00] block mb-2">
          ENGINEERING FEATURES
        </span>
        <h2 className="font-sans font-black text-3xl sm:text-4xl tracking-tighter uppercase mb-12">
          BUILT FOR SPEED & DEEP CONTEXT
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-[#0F0F0F] border border-[#262626] p-8 relative">
            <div className="h-1 w-16 bg-[#FF3D00] absolute top-0 left-0" />
            <Sparkles className="w-6 h-6 text-[#FF3D00] mb-4 stroke-[1.5]" />
            <h3 className="font-sans font-bold text-xl uppercase mb-2">AI Text-to-Graph</h3>
            <p className="text-sm text-[#737373] leading-relaxed font-sans">
              Vercel AI SDK + Zod graph validation automatically transforms unstructured prompts into clean node graphs.
            </p>
          </div>

          <div className="bg-[#0F0F0F] border border-[#262626] p-8 relative">
            <div className="h-1 w-16 bg-[#3b82f6] absolute top-0 left-0" />
            <FileText className="w-6 h-6 text-[#3b82f6] mb-4 stroke-[1.5]" />
            <h3 className="font-sans font-bold text-xl uppercase mb-2">Local pgvector RAG</h3>
            <p className="text-sm text-[#737373] leading-relaxed font-sans">
              Search notes using OpenAI embeddings stored locally in PostgreSQL `pgvector` with instant canvas node spotlighting.
            </p>
          </div>

          <div className="bg-[#0F0F0F] border border-[#262626] p-8 relative">
            <div className="h-1 w-16 bg-[#10b981] absolute top-0 left-0" />
            <Bell className="w-6 h-6 text-[#10b981] mb-4 stroke-[1.5]" />
            <h3 className="font-sans font-bold text-xl uppercase mb-2">Node Reminders & Bot</h3>
            <p className="text-sm text-[#737373] leading-relaxed font-sans">
              Schedule deadline timestamps on nodes with visual toast alerts and outbound Discord webhook dispatches.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-[#262626] py-8 px-8 max-w-6xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between font-mono text-xs text-[#737373]">
        <div>© 2026 MINDSPACE AI. ALL RIGHTS RESERVED.</div>
        <div className="flex items-center gap-6 mt-4 sm:mt-0">
          <Link href="/login" className="hover:text-[#FAFAFA]">LOG IN</Link>
          <Link href="/register" className="hover:text-[#FF3D00]">REGISTER</Link>
          <Link href="/admin" className="hover:text-[#FAFAFA]">ADMIN PANEL</Link>
        </div>
      </footer>
    </div>
  );
}
