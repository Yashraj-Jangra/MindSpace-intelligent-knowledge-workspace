'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Shield, Key, Users, Bell, Layers, MessageSquare, ArrowLeft } from 'lucide-react';

export function AdminHeader() {
  const pathname = usePathname();

  const navItems = [
    { href: '/admin', label: 'Overview', icon: Shield },
    { href: '/admin/settings', label: 'System Settings', icon: Key },
    { href: '/admin/users', label: 'User Management', icon: Users },
    { href: '/admin/notifications', label: 'Dispatch Logs', icon: Bell },
    { href: '/admin/queues', label: 'Queue Monitor', icon: Layers },
    { href: '/admin/chat', label: 'Chat Moderation', icon: MessageSquare },
  ];

  return (
    <header className="bg-[#0F0F0F] border-b border-[#262626] px-4 py-3 sticky top-0 z-40 font-sans">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
        {/* Left Title & Hub Link */}
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-1.5 p-1.5 hover:bg-[#1A1A1A] border border-transparent hover:border-[#262626] transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-[#737373]" />
            <span className="font-mono text-xs text-[#737373] uppercase tracking-wider hidden sm:inline">
              Hub
            </span>
          </Link>
          <div className="h-4 w-px bg-[#262626]" />
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#FF3D00]" />
            <div>
              <h1 className="font-black text-sm uppercase tracking-tight text-[#FAFAFA]">
                MindSpace Admin Suite
              </h1>
            </div>
          </div>
        </div>

        {/* Sub-Navigation Tabs */}
        <nav className="flex items-center gap-1 overflow-x-auto py-1 no-scrollbar font-mono text-xs">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === '/admin'
                ? pathname === '/admin'
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 uppercase tracking-wider transition-colors shrink-0 ${
                  isActive
                    ? 'bg-[#FF3D00] text-[#0A0A0A] font-bold'
                    : 'text-[#737373] hover:text-[#FAFAFA] hover:bg-[#1A1A1A]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
