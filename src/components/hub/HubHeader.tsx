'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Network, FileText, Bell, Shield, User, LogOut } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { AccountDrawer } from '@/components/ui/AccountDrawer';
import { useAuth } from '@/contexts/AuthContext';

export function HubHeader() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [isAccountOpen, setIsAccountOpen] = useState(false);

  if (!user) return null;

  return (
    <>
      <header className="min-h-[4rem] border-b border-[#262626] bg-[#0A0A0A]/95 px-4 sm:px-8 py-3 sm:py-0 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 z-30 font-sans">
        <div className="flex items-center justify-between sm:justify-start gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#FF3D00] flex items-center justify-center font-mono font-bold text-[#0A0A0A] shrink-0">
              <Network className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h1 className="font-sans font-black text-lg sm:text-xl tracking-tighter uppercase text-[#FAFAFA]">
                MIND<span className="text-[#FF3D00]">SPACE</span>
              </h1>
              <span className="font-mono text-[8px] sm:text-[9px] uppercase tracking-widest text-[#737373] block -mt-1">
                PERSONAL COCKPIT
              </span>
            </div>
          </div>
        </div>

        {/* Navigation links & Controls */}
        <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 font-mono text-xs overflow-x-auto py-1 sm:py-0 no-scrollbar">
          <div className="flex items-center gap-3 shrink-0 mr-2 sm:mr-4">
            <Link
              href="/"
              className={`uppercase tracking-wider transition-colors ${
                pathname === '/' ? 'text-[#FF3D00] font-bold' : 'text-[#737373] hover:text-[#FAFAFA]'
              }`}
            >
              Hub
            </Link>
            <Link
              href="/notes"
              className={`uppercase tracking-wider transition-colors ${
                pathname.startsWith('/notes') ? 'text-[#FF3D00] font-bold' : 'text-[#737373] hover:text-[#FAFAFA]'
              }`}
            >
              Notes
            </Link>
            <Link
              href="/tasks"
              className={`uppercase tracking-wider transition-colors ${
                pathname.startsWith('/tasks') ? 'text-[#FF3D00] font-bold' : 'text-[#737373] hover:text-[#FAFAFA]'
              }`}
            >
              Tasks
            </Link>
            <Link
              href="/calendar"
              className={`uppercase tracking-wider transition-colors ${
                pathname.startsWith('/calendar') ? 'text-[#FF3D00] font-bold' : 'text-[#737373] hover:text-[#FAFAFA]'
              }`}
            >
              Calendar
            </Link>
            <Link
              href="/reminders"
              className={`uppercase tracking-wider transition-colors ${
                pathname.startsWith('/reminders') ? 'text-[#FF3D00] font-bold' : 'text-[#737373] hover:text-[#FAFAFA]'
              }`}
            >
              Reminders
            </Link>
            {user.role === 'ADMIN' && (
              <Link
                href="/admin"
                className="text-[#737373] hover:text-[#FAFAFA] uppercase tracking-wider transition-colors flex items-center gap-1"
              >
                <Shield className="w-3.5 h-3.5 text-[#FF3D00]" />
                <span>Admin</span>
              </Link>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <ThemeToggle />

            {/* Profile trigger */}
            <button
              onClick={() => setIsAccountOpen(true)}
              className="flex items-center gap-1.5 bg-[#0F0F0F] border border-[#262626] hover:border-[#FF3D00] px-2.5 py-1.5 text-xs text-[#FAFAFA] transition-colors"
              title="View Profile & Settings"
            >
              <User className="w-3.5 h-3.5 text-[#FF3D00]" />
              <span className="max-w-[80px] sm:max-w-[100px] truncate">{user.name || user.email}</span>
            </button>

            <button
              onClick={logout}
              className="p-1.5 border border-[#262626] hover:border-[#FF3D00] text-[#737373] hover:text-[#FF3D00] transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4 stroke-[1.5]" />
            </button>
          </div>
        </div>
      </header>

      {/* Account Drawer Slide-Over */}
      <AccountDrawer isOpen={isAccountOpen} onClose={() => setIsAccountOpen(false)} user={user} />
    </>
  );
}
