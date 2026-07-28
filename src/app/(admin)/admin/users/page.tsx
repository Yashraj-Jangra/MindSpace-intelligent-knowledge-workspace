'use client';

import React, { useState, useEffect } from 'react';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { Users, Shield, ShieldAlert, CheckCircle2 } from 'lucide-react';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error('[Admin Users Fetch Error]:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'ADMIN' ? 'USER' : 'ADMIN';
    if (confirm(`Change user role to ${newRole}?`)) {
      try {
        const res = await fetch('/api/admin/users', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, role: newRole }),
        });

        if (res.ok) {
          fetchUsers();
        }
      } catch (err) {
        console.error('[Toggle Role Error]:', err);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#FAFAFA] flex flex-col font-sans">
      <AdminHeader />

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-[#262626]">
          <div>
            <div className="flex items-center gap-2 text-[#4285F4] font-mono text-xs uppercase tracking-wider">
              <Users className="w-4 h-4" />
              <span>User Governance</span>
            </div>
            <h1 className="font-sans font-black text-2xl tracking-tight uppercase mt-1">
              Registered User Management
            </h1>
          </div>
        </div>

        {/* Users Table */}
        <div className="border border-[#262626] bg-[#0F0F0F] overflow-x-auto">
          <table className="w-full text-left font-sans text-xs">
            <thead className="bg-[#141414] border-b border-[#262626] font-mono text-[10px] uppercase tracking-wider text-[#737373]">
              <tr>
                <th className="p-3">User</th>
                <th className="p-3">Email</th>
                <th className="p-3">Role</th>
                <th className="p-3">Bot Pairings</th>
                <th className="p-3">Registered</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#262626]">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-[#1A1A1A] transition-colors">
                  <td className="p-3 font-semibold text-[#FAFAFA]">
                    {u.name || u.username || 'User'}
                    <div className="font-mono text-[9px] text-[#737373]">{u.id}</div>
                  </td>
                  <td className="p-3 font-mono text-[#FAFAFA]">{u.email}</td>
                  <td className="p-3">
                    <span
                      className={`font-mono text-[9px] uppercase px-2 py-0.5 border ${
                        u.role === 'ADMIN'
                          ? 'border-[#FF3D00] text-[#FF3D00] bg-[#FF3D00]/10 font-bold'
                          : 'border-[#262626] text-[#737373]'
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="p-3 font-mono text-[10px] text-[#737373]">
                    {u.discordAccount?.isPaired ? 'Discord ✓ ' : ''}
                    {u.telegramAccount?.isPaired ? 'Telegram ✓' : ''}
                    {!u.discordAccount?.isPaired && !u.telegramAccount?.isPaired ? 'None' : ''}
                  </td>
                  <td className="p-3 font-mono text-[#737373]">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => handleToggleRole(u.id, u.role)}
                      className="px-3 py-1 border border-[#262626] hover:border-[#FF3D00] font-mono text-[10px] uppercase text-[#FAFAFA] hover:text-[#FF3D00] transition-colors"
                    >
                      {u.role === 'ADMIN' ? 'Demote to User' : 'Promote to Admin'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
