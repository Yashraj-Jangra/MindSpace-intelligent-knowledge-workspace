import React from 'react';
import Link from 'next/link';
import { prisma, isDbDisabled } from '@/lib/db';
import { countUsers } from '@/lib/auth-storage';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { Users, FileText, Network, CheckSquare, Key, Bell, Layers, MessageSquare, ShieldCheck, Server } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  let userCount = 0;
  let canvasCount = 0;
  let noteCount = 0;
  let taskCount = 0;
  let dbStatus = 'CONNECTED';

  if (!isDbDisabled()) {
    try {
      userCount = await prisma.user.count();
      canvasCount = await prisma.canvas.count();
      noteCount = await prisma.note.count();
      taskCount = await prisma.task.count();
    } catch {
      dbStatus = 'OFFLINE / CIRCUIT BROKEN';
      userCount = await countUsers();
    }
  } else {
    dbStatus = 'OFFLINE / LOCAL FALLBACK';
    userCount = await countUsers();
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#FAFAFA] flex flex-col font-sans">
      <AdminHeader />

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-8">
        {/* System Health Banner */}
        <div className="p-4 bg-[#0F0F0F] border border-[#262626] flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Server className="w-5 h-5 text-[#FF3D00]" />
            <div>
              <div className="font-mono text-xs uppercase tracking-wider text-[#737373]">
                System Deployment Environment
              </div>
              <div className="font-semibold text-sm text-[#FAFAFA]">
                Windows 11 + WSL2 (Ubuntu Docker Microservices)
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 font-mono text-xs">
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${dbStatus === 'CONNECTED' ? 'bg-[#10B981]' : 'bg-[#FF3D00]'}`} />
              <span className="text-[#737373]">PostgreSQL:</span>
              <span className="font-bold text-[#FAFAFA]">{dbStatus}</span>
            </div>
          </div>
        </div>

        {/* Metrics Overview Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-[#0F0F0F] border border-[#262626] p-6 relative">
            <div className="h-1 w-12 bg-[#FF3D00] absolute top-0 left-0" />
            <div className="flex items-center justify-between text-[#737373] mb-2">
              <span className="font-mono text-xs uppercase tracking-wider">Total Users</span>
              <Users className="w-5 h-5 text-[#FF3D00]" />
            </div>
            <div className="font-sans font-black text-4xl text-[#FAFAFA]">{userCount}</div>
          </div>

          <div className="bg-[#0F0F0F] border border-[#262626] p-6 relative">
            <div className="h-1 w-12 bg-[#4285F4] absolute top-0 left-0" />
            <div className="flex items-center justify-between text-[#737373] mb-2">
              <span className="font-mono text-xs uppercase tracking-wider">Mind Map Canvases</span>
              <Network className="w-5 h-5 text-[#4285F4]" />
            </div>
            <div className="font-sans font-black text-4xl text-[#FAFAFA]">{canvasCount}</div>
          </div>

          <div className="bg-[#0F0F0F] border border-[#262626] p-6 relative">
            <div className="h-1 w-12 bg-[#10B981] absolute top-0 left-0" />
            <div className="flex items-center justify-between text-[#737373] mb-2">
              <span className="font-mono text-xs uppercase tracking-wider">Rich Text Notes</span>
              <FileText className="w-5 h-5 text-[#10B981]" />
            </div>
            <div className="font-sans font-black text-4xl text-[#FAFAFA]">{noteCount}</div>
          </div>

          <div className="bg-[#0F0F0F] border border-[#262626] p-6 relative">
            <div className="h-1 w-12 bg-[#8B5CF6] absolute top-0 left-0" />
            <div className="flex items-center justify-between text-[#737373] mb-2">
              <span className="font-mono text-xs uppercase tracking-wider">Active Tasks</span>
              <CheckSquare className="w-5 h-5 text-[#8B5CF6]" />
            </div>
            <div className="font-sans font-black text-4xl text-[#FAFAFA]">{taskCount}</div>
          </div>
        </div>

        {/* Administration Governance Modules */}
        <div>
          <h2 className="font-mono text-xs uppercase tracking-wider text-[#737373] mb-4">
            Governance & Modules
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link
              href="/admin/settings"
              className="group p-6 bg-[#0F0F0F] hover:bg-[#1A1A1A] border border-[#262626] hover:border-[#FF3D00] transition-colors"
            >
              <div className="flex items-center gap-3 mb-2">
                <Key className="w-5 h-5 text-[#FF3D00]" />
                <h3 className="font-bold text-base text-[#FAFAFA] group-hover:text-[#FF3D00]">
                  System Settings
                </h3>
              </div>
              <p className="text-xs text-[#737373] leading-relaxed">
                Configure global system credentials, SMTP email server, Discord/Telegram bot tokens, and Gemini AI models.
              </p>
            </Link>

            <Link
              href="/admin/users"
              className="group p-6 bg-[#0F0F0F] hover:bg-[#1A1A1A] border border-[#262626] hover:border-[#FF3D00] transition-colors"
            >
              <div className="flex items-center gap-3 mb-2">
                <Users className="w-5 h-5 text-[#4285F4]" />
                <h3 className="font-bold text-base text-[#FAFAFA] group-hover:text-[#4285F4]">
                  User Management
                </h3>
              </div>
              <p className="text-xs text-[#737373] leading-relaxed">
                Inspect registered user accounts, toggle administrator privileges, view storage quota usage, and check bot pairings.
              </p>
            </Link>

            <Link
              href="/admin/notifications"
              className="group p-6 bg-[#0F0F0F] hover:bg-[#1A1A1A] border border-[#262626] hover:border-[#FF3D00] transition-colors"
            >
              <div className="flex items-center gap-3 mb-2">
                <Bell className="w-5 h-5 text-[#10B981]" />
                <h3 className="font-bold text-base text-[#FAFAFA] group-hover:text-[#10B981]">
                  Dispatch Logs
                </h3>
              </div>
              <p className="text-xs text-[#737373] leading-relaxed">
                View central audit logs of all outgoing email, Discord DM, Telegram, in-app, and webhook notifications.
              </p>
            </Link>

            <Link
              href="/admin/queues"
              className="group p-6 bg-[#0F0F0F] hover:bg-[#1A1A1A] border border-[#262626] hover:border-[#FF3D00] transition-colors"
            >
              <div className="flex items-center gap-3 mb-2">
                <Layers className="w-5 h-5 text-[#8B5CF6]" />
                <h3 className="font-bold text-base text-[#FAFAFA] group-hover:text-[#8B5CF6]">
                  Queue Monitor
                </h3>
              </div>
              <p className="text-xs text-[#737373] leading-relaxed">
                Inspect real-time BullMQ background workers processing reminders, daily digests, and retry jobs.
              </p>
            </Link>

            <Link
              href="/admin/chat"
              className="group p-6 bg-[#0F0F0F] hover:bg-[#1A1A1A] border border-[#262626] hover:border-[#FF3D00] transition-colors"
            >
              <div className="flex items-center gap-3 mb-2">
                <MessageSquare className="w-5 h-5 text-[#F59E0B]" />
                <h3 className="font-bold text-base text-[#FAFAFA] group-hover:text-[#F59E0B]">
                  Chat Moderation
                </h3>
              </div>
              <p className="text-xs text-[#737373] leading-relaxed">
                Monitor community DMs and group chat messages, review reported content, and moderate message histories.
              </p>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
