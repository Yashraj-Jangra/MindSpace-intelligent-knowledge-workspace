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
      {/* Background Noise Texture */}
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

        {/* Google OAuth Button */}
        <button
          onClick={handleGoogleLogin}
          className="w-full border border-[#FAFAFA] hover:bg-[#FAFAFA] hover:text-[#0A0A0A] text-[#FAFAFA] font-mono text-xs uppercase tracking-wider py-3.5 transition-colors mb-6 flex items-center justify-center gap-2 font-bold"
        >
          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
            <path d="M12.24 10.285V13.4h6.887c-.58 3.033-2.923 5.405-6.887 5.405-4.137 0-7.5-3.363-7.5-7.5s3.363-7.5 7.5-7.5c1.88 0 3.58.683 4.908 1.933l2.42-2.42C17.487 1.583 15.02 0 12.24 0 5.48 0 0 5.48 0 12.24s5.48 12.24 12.24 12.24c6.98 0 12.24-5.26 12.24-12.24 0-.75-.07-1.48-.19-2.205H12.24z" />
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
