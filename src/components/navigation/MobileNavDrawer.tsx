'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  X,
  Network,
  Home,
  FileText,
  CheckSquare,
  Calendar,
  Bell,
  Shield,
  Plus,
  User,
  LogOut,
  Zap,
  MessageSquare,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

interface MobileNavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAccount: () => void;
}

export function MobileNavDrawer({ isOpen, onClose, onOpenAccount }: MobileNavDrawerProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  if (!isOpen) return null;

  const navLinks = [
    { href: '/', label: 'Hub Dashboard', icon: Home, exact: true },
    { href: '/notes', label: 'Notes Workspace', icon: FileText, exact: false },
    { href: '/tasks', label: 'Tasks Engine', icon: CheckSquare, exact: false },
    { href: '/calendar', label: 'Calendar Cockpit', icon: Calendar, exact: false },
    { href: '/reminders', label: 'Reminders Feed', icon: Bell, exact: false },
    { href: '/chat', label: 'Community Chat', icon: MessageSquare, exact: false },
    ...(user?.role === 'ADMIN'
      ? [{ href: '/admin', label: 'Admin Governance', icon: Shield, exact: false }]
      : []),
  ];

  const handleQuickCreateNote = () => {
    onClose();
    router.push('/notes');
  };

  const handleQuickCreateTask = () => {
    onClose();
    router.push('/tasks');
  };

  const handleQuickCreateEvent = () => {
    onClose();
    router.push('/calendar');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/70 backdrop-blur-md flex justify-end font-sans">
      <div className="w-full max-w-sm bg-[#0A0A0A] border-l border-[#262626] h-full flex flex-col justify-between p-6 animate-in slide-in-from-right duration-200">
        <div>
          {/* Header Bar */}
          <div className="flex items-center justify-between pb-4 border-b border-[#262626] mb-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#FF3D00] flex items-center justify-center font-mono font-bold text-[#0A0A0A] shrink-0">
                <Network className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <h2 className="font-sans font-black text-lg tracking-tighter uppercase text-[#FAFAFA]">
                  MIND<span className="text-[#FF3D00]">SPACE</span>
                </h2>
                <span className="font-mono text-[8px] uppercase tracking-widest text-[#737373] block -mt-1">
                  NAVIGATION MENU
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1 text-[#737373] hover:text-[#FAFAFA] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User Account Summary Card */}
          {user && (
            <div className="p-3 bg-[#0F0F0F] border border-[#262626] mb-6 flex items-center justify-between">
              <div
                onClick={() => {
                  onClose();
                  onOpenAccount();
                }}
                className="flex items-center gap-3 cursor-pointer group"
              >
                <div className="w-8 h-8 bg-[#1A1A1A] border border-[#262626] group-hover:border-[#FF3D00] flex items-center justify-center font-mono font-bold text-xs text-[#FAFAFA] transition-colors">
                  {user.name ? user.name[0].toUpperCase() : 'U'}
                </div>
                <div>
                  <div className="font-bold text-xs text-[#FAFAFA] group-hover:text-[#FF3D00] transition-colors truncate max-w-[150px]">
                    {user.name || user.email}
                  </div>
                  <div className="font-mono text-[9px] uppercase tracking-wider text-[#737373]">
                    {user.role} Account
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quick Create Actions */}
          <div className="mb-6">
            <div className="font-mono text-[10px] uppercase tracking-wider text-[#737373] mb-2 flex items-center gap-1">
              <Zap className="w-3 h-3 text-[#FF3D00]" />
              <span>Quick Actions</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={handleQuickCreateNote}
                className="p-2 bg-[#0F0F0F] hover:bg-[#1A1A1A] border border-[#262626] hover:border-[#FF3D00] text-center font-mono text-[10px] uppercase text-[#FAFAFA] transition-colors flex flex-col items-center gap-1"
              >
                <Plus className="w-4 h-4 text-[#FF3D00]" />
                <span>Note</span>
              </button>

              <button
                onClick={handleQuickCreateTask}
                className="p-2 bg-[#0F0F0F] hover:bg-[#1A1A1A] border border-[#262626] hover:border-[#FF3D00] text-center font-mono text-[10px] uppercase text-[#FAFAFA] transition-colors flex flex-col items-center gap-1"
              >
                <Plus className="w-4 h-4 text-[#10B981]" />
                <span>Task</span>
              </button>

              <button
                onClick={handleQuickCreateEvent}
                className="p-2 bg-[#0F0F0F] hover:bg-[#1A1A1A] border border-[#262626] hover:border-[#FF3D00] text-center font-mono text-[10px] uppercase text-[#FAFAFA] transition-colors flex flex-col items-center gap-1"
              >
                <Plus className="w-4 h-4 text-[#4285F4]" />
                <span>Event</span>
              </button>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="space-y-1">
            <div className="font-mono text-[10px] uppercase tracking-wider text-[#737373] mb-2">
              Workspaces & Tools
            </div>
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = link.exact
                ? pathname === link.href
                : pathname.startsWith(link.href);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={onClose}
                  className={`flex items-center justify-between p-3 border transition-colors ${
                    isActive
                      ? 'bg-[#1A1A1A] border-[#FF3D00] text-[#FAFAFA] font-bold'
                      : 'bg-[#0F0F0F] border-[#262626] text-[#737373] hover:text-[#FAFAFA] hover:bg-[#1A1A1A]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-[#FF3D00]' : 'text-[#737373]'}`} />
                    <span className="font-mono text-xs uppercase tracking-wider">{link.label}</span>
                  </div>
                  {isActive && <span className="w-1.5 h-1.5 bg-[#FF3D00]" />}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Footer Logout */}
        <div className="pt-4 border-t border-[#262626]">
          <button
            onClick={() => {
              onClose();
              logout();
            }}
            className="w-full flex items-center justify-center gap-2 p-2.5 border border-[#262626] hover:border-[#FF3D00] font-mono text-xs uppercase tracking-wider text-[#737373] hover:text-[#FF3D00] transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
}
