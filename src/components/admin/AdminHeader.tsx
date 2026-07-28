'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Shield, Key, Users, Bell, Layers, MessageSquare } from 'lucide-react';
import { AppHeader } from '@/components/navigation/AppHeader';

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
    <>
      <AppHeader title="Admin Suite" />
      <div className="bg-[#0F0F0F] border-b border-[#262626] px-4 py-2 sticky top-14 z-30 font-sans">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Sub-Navigation Tabs Strip */}
          <nav className="flex items-center gap-1 overflow-x-auto py-1 no-scrollbar font-mono text-xs w-full">
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
      </div>
    </>
  );
}
