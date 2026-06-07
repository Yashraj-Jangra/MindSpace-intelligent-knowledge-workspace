import React from 'react';
import { prisma } from '@/lib/db';
import { Users, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function UserManagementPage() {
  let users: any[] = [];

  try {
    users = await prisma.user.findMany({
      include: {
        _count: {
          select: { canvases: true, notifications: true, webhooks: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  } catch (error) {
    // Fallback if DB isn't initialized or connected yet
    users = [
      {
        id: 'fallback-admin',
        name: 'MindSpace Admin',
        email: 'admin@mindspace.local',
        role: 'ADMIN',
        createdAt: new Date(),
        _count: { canvases: 0, notifications: 0, webhooks: 0 },
      },
    ];
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 bg-[#0A0A0A] text-[#FAFAFA]">
      <div className="flex items-center justify-between pb-6 border-b border-[#262626]">
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-[#737373] hover:text-[#FAFAFA] transition-colors">
            <ArrowLeft className="w-6 h-6 stroke-[1.5]" />
          </Link>
          <div>
            <div className="flex items-center gap-2 text-[#FF3D00] font-mono text-xs uppercase tracking-widest">
              <Users className="w-4 h-4" />
              <span>USER MANAGEMENT</span>
            </div>
            <h1 className="font-sans font-black text-3xl tracking-tighter uppercase mt-1">
              Registered Accounts ({users.length})
            </h1>
          </div>
        </div>
      </div>

      {/* Users Data Table */}
      <div className="bg-[#0F0F0F] border border-[#262626] overflow-x-auto">
        <table className="w-full text-left font-mono text-xs">
          <thead className="bg-[#1A1A1A] text-[#737373] uppercase tracking-wider border-b border-[#262626]">
            <tr>
              <th className="p-4">User</th>
              <th className="p-4">Email</th>
              <th className="p-4">Role</th>
              <th className="p-4">Canvases</th>
              <th className="p-4">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#262626]">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-[#1A1A1A]/50 transition-colors">
                <td className="p-4 font-bold text-[#FAFAFA]">{u.name || 'Anonymous User'}</td>
                <td className="p-4 text-[#737373]">{u.email}</td>
                <td className="p-4">
                  <span
                    className={`inline-block px-2 py-0.5 font-bold ${
                      u.role === 'ADMIN' ? 'bg-[#FF3D00] text-[#0A0A0A]' : 'bg-[#262626] text-[#FAFAFA]'
                    }`}
                  >
                    {u.role}
                  </span>
                </td>
                <td className="p-4 text-[#FAFAFA]">{u._count?.canvases || 0} maps</td>
                <td className="p-4 text-[#737373]">{new Date(u.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
