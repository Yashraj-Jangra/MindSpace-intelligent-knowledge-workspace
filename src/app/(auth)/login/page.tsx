'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { signIn } from '@/lib/auth-client';
import { Network, ArrowRight, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const res = await signIn.email({
        email,
        password,
        callbackURL: '/',
      });

      if (res.error) {
        setError(res.error.message || 'Invalid email or password');
      }
    } catch (err) {
      setError('Failed to log in. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await signIn.social({
        provider: 'google',
        callbackURL: '/',
      });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0A0A0A] text-[#FAFAFA] flex flex-col justify-center items-center p-6 relative">
      <div className="w-full max-w-md bg-[#0F0F0F] border border-[#262626] p-8 shadow-2xl relative">
        <div className="h-1.5 w-20 bg-[#FF3D00] absolute top-0 left-0" />

        {/* Brand Logo */}
        <div className="flex items-center gap-2 mb-6">
          <div className="w-7 h-7 bg-[#FF3D00] flex items-center justify-center font-mono font-bold text-[#0A0A0A]">
            <Network className="w-4 h-4 stroke-[2.5]" />
          </div>
          <span className="font-sans font-black text-lg tracking-tighter uppercase">
            MIND<span className="text-[#FF3D00]">SPACE</span>
          </span>
        </div>

        <h2 className="font-sans font-black text-3xl tracking-tighter uppercase mb-2">
          AUTHENTICATE
        </h2>
        <p className="text-xs text-[#737373] font-sans mb-6">
          Log in to access your AI visual mind maps, RAG notes, and node reminders.
        </p>

        {error && (
          <div className="p-3 bg-[#FF3D00]/10 border border-[#FF3D00] text-[#FF3D00] text-xs font-mono mb-4">
            {error}
          </div>
        )}

        {/* Official Google OAuth Button */}
        <button
          onClick={handleGoogleLogin}
          className="w-full border border-[#262626] hover:border-[#FAFAFA] bg-[#1A1A1A] hover:bg-[#FAFAFA] hover:text-[#0A0A0A] text-[#FAFAFA] font-mono text-xs uppercase tracking-wider py-3.5 transition-colors mb-6 flex items-center justify-center gap-3 font-bold"
        >
          <svg className="w-5 h-5 shrink-0" viewBox="0 0 48 48" style={{ display: 'block' }}>
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
            <path fill="none" d="M0 0h48v48H0z"></path>
          </svg>
          <span>Continue with Google</span>
        </button>

        <div className="relative flex items-center justify-center mb-6">
          <div className="border-t border-[#262626] w-full" />
          <span className="bg-[#0F0F0F] px-3 text-[10px] font-mono text-[#737373] uppercase absolute">
            OR EMAIL
          </span>
        </div>

        {/* Email & Password Form */}
        <form onSubmit={handleEmailLogin} className="space-y-4">
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
                <span>Log In</span>
                <ArrowRight className="w-4 h-4 stroke-[2]" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-[#262626] text-center font-mono text-xs text-[#737373]">
          Don't have an account?{' '}
          <Link href="/register" className="text-[#FF3D00] hover:underline">
            Register here
          </Link>
        </div>
      </div>
    </div>
  );
}
