'use client';

import React, { useState, useEffect } from 'react';
import { AdminHeader } from '@/components/admin/AdminHeader';
import {
  Users,
  Shield,
  ShieldAlert,
  CheckCircle2,
  Trash2,
  Edit2,
  Key,
  X,
  Check,
  FileText,
  Network,
  CheckSquare,
  AlertTriangle,
} from 'lucide-react';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Selected user for detailed configuration
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  
  // Edit Form Fields
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<'USER' | 'ADMIN'>('USER');
  const [newPassword, setNewPassword] = useState('');
  
  const [formSuccess, setFormSuccess] = useState('');
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

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

  const handleSelectUser = (user: any) => {
    setSelectedUser(user);
    setEditName(user.name || '');
    setEditEmail(user.email || '');
    setEditRole(user.role || 'USER');
    setNewPassword('');
    setFormSuccess('');
    setFormError('');
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    
    setIsSaving(true);
    setFormSuccess('');
    setFormError('');

    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser.id,
          name: editName,
          email: editEmail,
          role: editRole,
          password: newPassword || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setFormSuccess('User configuration saved successfully!');
        setNewPassword('');
        fetchUsers();
        // Update local object stats
        setSelectedUser((prev: any) => ({
          ...prev,
          name: editName,
          email: editEmail,
          role: editRole,
        }));
      } else {
        setFormError(data.error || 'Failed to update user config.');
      }
    } catch (err) {
      setFormError('Network connection error.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteUser = async (userId: string, name: string) => {
    if (!confirm(`CRITICAL WARNING: Are you sure you want to completely delete "${name}"? This will permanently delete all notes, mind map nodes, and tasks associated with this user. This action is irreversible.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/users?userId=${userId}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (res.ok) {
        alert('User successfully deleted.');
        setSelectedUser(null);
        fetchUsers();
      } else {
        alert(data.error || 'Failed to delete user.');
      }
    } catch (err) {
      console.error('Delete user error:', err);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#FAFAFA] flex flex-col font-sans selection:bg-[#FF3D00] selection:text-[#0A0A0A]">
      <AdminHeader />

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#262626]">
          <div>
            <div className="flex items-center gap-2 text-[#FF3D00] font-mono text-xs uppercase tracking-wider">
              <Users className="w-4 h-4" />
              <span>User Governance cockpit</span>
            </div>
            <h1 className="font-sans font-black text-3xl tracking-tighter uppercase mt-1">
              Registered User Controls
            </h1>
          </div>
        </div>

        {/* Dynamic Dual-Layout Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Left Table Panel (2/3 width) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="border border-[#262626] bg-[#0F0F0F] overflow-x-auto">
              <table className="w-full text-left font-sans text-xs">
                <thead className="bg-[#141414] border-b border-[#262626] font-mono text-[10px] uppercase tracking-wider text-[#737373]">
                  <tr>
                    <th className="p-3">User & ID</th>
                    <th className="p-3">Email Address</th>
                    <th className="p-3">Role</th>
                    <th className="p-3">Registered</th>
                    <th className="p-3 text-right">Inspect</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#262626]">
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center font-mono text-[#737373]">
                        Loading system users...
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center font-mono text-[#737373]">
                        No system users registered.
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => (
                      <tr
                        key={u.id}
                        onClick={() => handleSelectUser(u)}
                        className={`cursor-pointer transition-colors ${
                          selectedUser?.id === u.id ? 'bg-[#FF3D00]/5 hover:bg-[#FF3D00]/10' : 'hover:bg-[#1A1A1A]'
                        }`}
                      >
                        <td className="p-3">
                          <div className="font-bold text-[#FAFAFA]">{u.name || u.username}</div>
                          <div className="font-mono text-[9px] text-[#737373]">{u.id}</div>
                        </td>
                        <td className="p-3 font-mono text-[#FAFAFA]">{u.email}</td>
                        <td className="p-3">
                          <span
                            className={`font-mono text-[9px] uppercase px-1.5 py-0.5 border ${
                              u.role === 'ADMIN'
                                ? 'border-[#FF3D00] text-[#FF3D00] bg-[#FF3D00]/10 font-bold'
                                : 'border-[#262626] text-[#737373]'
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-[#737373]">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectUser(u);
                            }}
                            className="px-2.5 py-1 bg-[#1A1A1A] hover:bg-[#FF3D00] text-[#737373] hover:text-[#0A0A0A] border border-[#262626] hover:border-[#FF3D00] font-mono text-[10px] uppercase font-bold transition-all"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Configuration Inspector Side Panel (1/3 width) */}
          <div className="space-y-6">
            {!selectedUser ? (
              <div className="p-8 bg-[#0F0F0F] border border-[#262626] text-center space-y-3 font-mono text-xs text-[#737373]">
                <Users className="w-8 h-8 text-[#FF3D00] mx-auto opacity-40" />
                <p className="uppercase">Select a user to inspect, modify settings, or purge their account data.</p>
              </div>
            ) : (
              <div className="bg-[#0F0F0F] border border-[#262626] p-5 space-y-6 relative">
                <div className="h-1 w-16 bg-[#FF3D00] absolute top-0 left-0" />
                
                {/* Header Profile Info */}
                <div className="flex items-start justify-between border-b border-[#262626] pb-4">
                  <div>
                    <h2 className="font-sans font-black text-xl uppercase tracking-tight text-[#FAFAFA]">
                      {selectedUser.name || selectedUser.username}
                    </h2>
                    <div className="font-mono text-[10px] text-[#737373] mt-1 select-all">{selectedUser.id}</div>
                  </div>
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="p-1 border border-[#262626] hover:border-[#FF3D00] text-[#737373] hover:text-[#FAFAFA] transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Telemetry counters */}
                <div className="grid grid-cols-3 gap-2 font-mono text-[10px] uppercase text-[#737373]">
                  <div className="bg-[#141414] border border-[#262626] p-2.5 text-center">
                    <Network className="w-3.5 h-3.5 mx-auto mb-1 text-[#FF3D00]" />
                    <div>Canvases</div>
                    <div className="font-bold text-[#FAFAFA] mt-1 text-xs">
                      {selectedUser._count?.canvases ?? 0}
                    </div>
                  </div>
                  <div className="bg-[#141414] border border-[#262626] p-2.5 text-center">
                    <FileText className="w-3.5 h-3.5 mx-auto mb-1 text-[#4285F4]" />
                    <div>Notes</div>
                    <div className="font-bold text-[#FAFAFA] mt-1 text-xs">
                      {selectedUser._count?.notes ?? 0}
                    </div>
                  </div>
                  <div className="bg-[#141414] border border-[#262626] p-2.5 text-center">
                    <CheckSquare className="w-3.5 h-3.5 mx-auto mb-1 text-[#10B981]" />
                    <div>Tasks</div>
                    <div className="font-bold text-[#FAFAFA] mt-1 text-xs">
                      {selectedUser._count?.tasks ?? 0}
                    </div>
                  </div>
                </div>

                {/* Edit Form */}
                <form onSubmit={handleSaveUser} className="space-y-4">
                  {formSuccess && (
                    <div className="p-3 border border-[#10B981] bg-[#10B981]/10 text-[#10B981] text-[10px] font-mono flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{formSuccess}</span>
                    </div>
                  )}

                  {formError && (
                    <div className="p-3 border border-[#FF3D00] bg-[#FF3D00]/10 text-[#FF3D00] text-[10px] font-mono">
                      {formError}
                    </div>
                  )}

                  <div className="space-y-3 font-mono text-[10px] uppercase">
                    <div>
                      <label className="block text-[#737373] mb-1">Display Name</label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full bg-[#1A1A1A] border border-[#262626] focus:border-[#FF3D00] text-[#FAFAFA] p-2 outline-none text-xs"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[#737373] mb-1">Email Address</label>
                      <input
                        type="email"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        className="w-full bg-[#1A1A1A] border border-[#262626] focus:border-[#FF3D00] text-[#FAFAFA] p-2 outline-none text-xs"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[#737373] mb-1">User Role</label>
                      <select
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value as 'USER' | 'ADMIN')}
                        className="w-full bg-[#1A1A1A] border border-[#262626] focus:border-[#FF3D00] text-[#FAFAFA] p-2 outline-none text-xs"
                      >
                        <option value="USER">USER</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[#737373] mb-1 flex items-center gap-1">
                        <Key className="w-3 h-3 text-[#FF3D00]" />
                        <span>Force Reset Password</span>
                      </label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Leave blank to keep current"
                        className="w-full bg-[#1A1A1A] border border-[#262626] focus:border-[#FF3D00] text-[#FAFAFA] p-2 outline-none text-xs"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSaving}
                    className="w-full py-2.5 bg-[#FF3D00] hover:bg-[#FF5722] text-[#0A0A0A] font-mono text-xs font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-1.5"
                  >
                    <span>Save Configurations</span>
                  </button>
                </form>

                {/* Danger Zone */}
                <div className="pt-4 border-t border-[#262626] space-y-3">
                  <div className="flex items-center gap-1.5 text-[#FF3D00] font-mono text-[10px] uppercase font-bold">
                    <AlertTriangle className="w-4 h-4 animate-pulse" />
                    <span>Danger Governance Zone</span>
                  </div>

                  <button
                    onClick={() => handleDeleteUser(selectedUser.id, selectedUser.name || selectedUser.username)}
                    className="w-full py-2 bg-transparent hover:bg-[#FF3D00] text-[#FF3D00] hover:text-[#0A0A0A] border border-[#FF3D00] font-mono text-[10px] uppercase font-bold transition-all flex items-center justify-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Purge User Account</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
