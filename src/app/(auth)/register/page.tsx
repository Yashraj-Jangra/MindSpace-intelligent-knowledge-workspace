'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Network, ArrowRight, Loader2 } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const res = await register(name, email, password);
      if (!res.success) {
        setError(res.error || 'Registration failed');
      } else {
        router.push('/');
      }
    } catch (err) {
      setError('Failed to create account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0A0A0A] text-[#FAFAFA] flex flex-col justify-center items-center p-6 relative">
      <div className="w-full max-w-md bg-[#0F0F0F] border border-[#262626] p-8 relative">
        <div className="h-1.5 w-20 bg-[#FF3D00] absolute top-0 left-0" />

        <div className="flex items-center gap-2 mb-6">
          <div className="w-7 h-7 bg-[#FF3D00] flex items-center justify-center font-mono font-bold text-[#0A0A0A]">
            <Network className="w-4 h-4 stroke-[2.5]" />
          </div>
          <span className="font-sans font-black text-lg tracking-tighter uppercase">
            MIND<span className="text-[#FF3D00]">SPACE</span>
          </span>
        </div>

        <h2 className="font-sans font-black text-3xl tracking-tighter uppercase mb-2">
          CREATE ACCOUNT
        </h2>
        <p className="text-xs text-[#737373] font-sans mb-6">
          Join MindSpace to build AI-powered visual mind maps and RAG knowledge bases.
        </p>

        {error && (
          <div className="p-3 bg-[#FF3D00]/10 border border-[#FF3D00] text-[#FF3D00] text-xs font-mono mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-[#737373] mb-1">
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full bg-[#1A1A1A] border border-[#262626] focus:border-[#FF3D00] text-sm text-[#FAFAFA] px-4 py-3 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-[#737373] mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-[#1A1A1A] border border-[#262626] focus:border-[#FF3D00] text-sm text-[#FAFAFA] px-4 py-3 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-[#737373] mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-[#1A1A1A] border border-[#262626] focus:border-[#FF3D00] text-sm text-[#FAFAFA] px-4 py-3 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#FF3D00] text-[#0A0A0A] font-mono text-xs uppercase tracking-wider font-bold py-3.5 hover:bg-[#FAFAFA] transition-colors flex items-center justify-center gap-2 mt-6"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin stroke-[2]" />
            ) : (
              <>
                <span>Register</span>
                <ArrowRight className="w-4 h-4 stroke-[2]" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-[#262626] text-center font-mono text-xs text-[#737373]">
          Already have an account?{' '}
          <Link href="/login" className="text-[#FF3D00] hover:underline">
            Log in here
          </Link>
        </div>
      </div>
    </div>
  );
}
