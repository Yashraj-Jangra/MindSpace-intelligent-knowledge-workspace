'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Network, User, Menu, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { AccountDrawer } from '@/components/ui/AccountDrawer';
import { MobileNavDrawer } from './MobileNavDrawer';

interface AppHeaderProps {
  title?: string;
  actions?: React.ReactNode;
}

export function AppHeader({ title, actions }: AppHeaderProps) {
  const { user } = useAuth();
  const pathname = usePathname();
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: '/', label: 'Hub', exact: true },
    { href: '/notes', label: 'Notes', exact: false },
    { href: '/tasks', label: 'Tasks', exact: false },
    { href: '/calendar', label: 'Calendar', exact: false },
    { href: '/reminders', label: 'Reminders', exact: false },
    { href: '/chat', label: 'Chat', exact: false },
    ...(user?.role === 'ADMIN'
      ? [{ href: '/admin', label: 'Admin', exact: false, isAdmin: true }]
      : []),
  ];

  return (
    <>
      <header className="h-14 border-b border-[#262626] bg-[#0A0A0A]/95 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40 font-sans">
        {/* Left: Brand Logo & Optional Page Title */}
        <div className="flex items-center gap-3 shrink-0">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 bg-[#FF3D00] flex items-center justify-center font-mono font-bold text-[#0A0A0A] shrink-0 group-hover:scale-105 transition-transform">
              <Network className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h1 className="font-sans font-black text-base tracking-tighter uppercase text-[#FAFAFA] flex items-center gap-1.5">
                <span>MIND</span>
                <span className="text-[#FF3D00]">SPACE</span>
              </h1>
            </div>
          </Link>

          {title && (
            <>
              <div className="h-4 w-px bg-[#262626] hidden sm:block" />
              <span className="font-mono text-xs uppercase tracking-wider text-[#737373] hidden sm:inline-block truncate max-w-[140px]">
                {title}
              </span>
            </>
          )}
        </div>

        {/* Center: Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 font-mono text-xs uppercase tracking-wider h-full">
          {navLinks.map((link) => {
            const isActive = link.exact
              ? pathname === link.href
              : pathname.startsWith(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative flex items-center h-full transition-colors ${
                  isActive ? 'text-[#FAFAFA] font-bold' : 'text-[#737373] hover:text-[#FAFAFA]'
                }`}
              >
                {link.isAdmin && <Shield className="w-3 h-3 text-[#FF3D00] mr-1" />}
                <span>{link.label}</span>
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FF3D00]" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right: Actions, Theme, Account & Mobile Hamburger */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Custom Page Action Slot */}
          {actions && <div className="flex items-center gap-2">{actions}</div>}

          {user ? (
            <div className="hidden sm:flex items-center gap-2">
              {/* Account Drawer Trigger */}
              <button
                onClick={() => setIsAccountOpen(true)}
                className="flex items-center gap-2 px-2.5 py-1.5 border border-[#262626] hover:border-[#FF3D00] bg-[#0F0F0F] hover:bg-[#1A1A1A] transition-colors"
              >
                <div className="w-4 h-4 bg-[#FF3D00] flex items-center justify-center font-mono font-bold text-[9px] text-[#0A0A0A]">
                  {user.name ? user.name[0].toUpperCase() : 'U'}
                </div>
                <span className="font-mono text-xs text-[#FAFAFA] hidden lg:inline truncate max-w-[100px]">
                  {user.name || user.email.split('@')[0]}
                </span>
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#262626] hover:border-[#FF3D00] bg-[#0F0F0F] font-mono text-xs text-[#FAFAFA] uppercase transition-colors"
            >
              Sign In
            </Link>
          )}

          {/* Mobile Menu Hamburger Button */}
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="md:hidden p-2 border border-[#262626] bg-[#0F0F0F] text-[#FAFAFA] hover:border-[#FF3D00] transition-colors"
            aria-label="Open Navigation Menu"
          >
            <Menu className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Account Drawer */}
      {user && (
        <AccountDrawer isOpen={isAccountOpen} onClose={() => setIsAccountOpen(false)} user={user} />
      )}

      {/* Mobile Navigation Drawer */}
      <MobileNavDrawer
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        onOpenAccount={() => setIsAccountOpen(true)}
      />
    </>
  );
}
