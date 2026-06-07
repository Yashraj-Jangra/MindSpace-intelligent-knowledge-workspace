import React from 'react';
import { prisma } from '@/lib/db';
import { Users, Network, Bell, Shield, Key } from 'lucide-react';
import Link from 'next/link';

export default async function AdminDashboard() {
  const userCount = await prisma.user.count();
  const canvasCount = await prisma.canvas.count();
  const nodeCount = await prisma.node.count();
  const webhookCount = await prisma.webhook.count();
  const discordCount = await prisma.discordAccount.count({ where: { isPaired: true } });

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 bg-[#0A0A0A] text-[#FAFAFA]">
      {/* Dashboard Title Header */}
      <div className="flex items-center justify-between pb-6 border-b border-[#262626]">
        <div>
          <div className="flex items-center gap-2 text-[#FF3D00] font-mono text-xs uppercase tracking-widest">
            <Shield className="w-4 h-4" />
            <span>SYSTEM CONTROL PANEL</span>
          </div>
          <h1 className="font-sans font-black text-4xl tracking-tighter uppercase mt-1">
            ADMIN DASHBOARD
          </h1>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">
          <Link
            href="/admin/users"
            className="px-4 py-2 border border-[#262626] hover:border-[#FF3D00] text-[#FAFAFA] transition-colors"
          >
            User Management
          </Link>
          <Link
            href="/admin/settings"
            className="px-4 py-2 bg-[#FF3D00] text-[#0A0A0A] font-bold hover:bg-[#FAFAFA] transition-colors"
          >
            System Settings
          </Link>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-[#0F0F0F] border border-[#262626] p-6 relative">
          <div className="h-1 w-12 bg-[#FF3D00] absolute top-0 left-0" />
          <div className="flex items-center justify-between text-[#737373] mb-4">
            <span className="font-mono text-xs uppercase tracking-wider">Total Users</span>
            <Users className="w-5 h-5 text-[#FF3D00]" />
          </div>
          <div className="font-sans font-black text-4xl text-[#FAFAFA] tracking-tight">{userCount}</div>
        </div>

        <div className="bg-[#0F0F0F] border border-[#262626] p-6 relative">
          <div className="h-1 w-12 bg-[#3b82f6] absolute top-0 left-0" />
          <div className="flex items-center justify-between text-[#737373] mb-4">
            <span className="font-mono text-xs uppercase tracking-wider">Mind Maps</span>
            <Network className="w-5 h-5 text-[#3b82f6]" />
          </div>
          <div className="font-sans font-black text-4xl text-[#FAFAFA] tracking-tight">{canvasCount}</div>
        </div>

        <div className="bg-[#0F0F0F] border border-[#262626] p-6 relative">
          <div className="h-1 w-12 bg-[#10b981] absolute top-0 left-0" />
          <div className="flex items-center justify-between text-[#737373] mb-4">
            <span className="font-mono text-xs uppercase tracking-wider">Total Nodes</span>
            <Bell className="w-5 h-5 text-[#10b981]" />
          </div>
          <div className="font-sans font-black text-4xl text-[#FAFAFA] tracking-tight">{nodeCount}</div>
        </div>

        <div className="bg-[#0F0F0F] border border-[#262626] p-6 relative">
          <div className="h-1 w-12 bg-[#8b5cf6] absolute top-0 left-0" />
          <div className="flex items-center justify-between text-[#737373] mb-4">
            <span className="font-mono text-xs uppercase tracking-wider">Discord Paired</span>
            <Key className="w-5 h-5 text-[#8b5cf6]" />
          </div>
          <div className="font-sans font-black text-4xl text-[#FAFAFA] tracking-tight">{discordCount}</div>
        </div>
      </div>

      {/* Integration Status Table */}
      <div className="bg-[#0F0F0F] border border-[#262626] p-6">
        <h3 className="font-mono text-xs uppercase tracking-wider text-[#FF3D00] mb-4">
          SYSTEM INTEGRATIONS STATUS
        </h3>

        <div className="space-y-4 font-mono text-sm">
          <div className="flex items-center justify-between py-2 border-b border-[#262626]">
            <span>Google OAuth Login</span>
            <span className="text-[#10b981] font-bold">CONFIGURED</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-[#262626]">
            <span>PostgreSQL + pgvector Local DB</span>
            <span className="text-[#10b981] font-bold">CONNECTED</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-[#262626]">
            <span>Outbound Webhooks Active</span>
            <span className="text-[#FAFAFA]">{webhookCount} Active Endpoints</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span>MinIO Local S3 Storage</span>
            <span className="text-[#10b981] font-bold">ONLINE</span>
          </div>
        </div>
      </div>
    </div>
  );
}
