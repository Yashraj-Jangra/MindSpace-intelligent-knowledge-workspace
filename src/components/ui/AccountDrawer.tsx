'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Shield,
  Terminal,
  Webhook,
  MessageSquare,
  Key,
  Trash2,
  Plus,
  Check,
  Loader2,
  Database,
  Info,
  Copy,
  CheckCircle2,
  Bot,
  Zap,
} from 'lucide-react';
import { SessionUser } from '@/lib/session';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

interface AccountDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  user: SessionUser;
}

interface WebhookItem {
  id: string;
  name: string;
  targetUrl: string;
  events: string[];
  isActive: boolean;
}

export function AccountDrawer({ isOpen, onClose, user }: AccountDrawerProps) {
  const { checkSession } = useAuth();
  const [activeTab, setActiveTab] = useState<
    'profile' | 'info' | 'security' | 'quota' | 'webhooks' | 'discord'
  >('profile');
  const [copiedText, setCopiedText] = useState(false);

  // Edit Info Tab State
  const [editName, setEditName] = useState(user.name || '');
  const [editEmail, setEditEmail] = useState(user.email || '');
  const [infoError, setInfoError] = useState('');
  const [infoSuccess, setInfoSuccess] = useState('');
  const [isInfoLoading, setIsInfoLoading] = useState(false);

  // Password Tab State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [securityError, setSecurityError] = useState('');
  const [securitySuccess, setSecuritySuccess] = useState('');
  const [isSecurityLoading, setIsSecurityLoading] = useState(false);

  // Usage & Quota State
  const [usageStats, setUsageStats] = useState({
    canvasCount: 0,
    noteCount: 0,
    nodeCount: 0,
    storageUsed: 0,
    storageLimit: 100.0,
  });
  const [isUsageLoading, setIsUsageLoading] = useState(false);

  // Webhooks Tab State
  const [webhooks, setWebhooks] = useState<WebhookItem[]>([]);
  const [isWebhooksLoading, setIsWebhooksLoading] = useState(false);
  const [whName, setWhName] = useState('');
  const [whUrl, setWhUrl] = useState('');
  const [whSecret, setWhSecret] = useState('');
  const [whEvents, setWhEvents] = useState<string[]>(['node.created', 'reminder.fired']);
  const [whError, setWhError] = useState('');
  const [whSuccess, setWhSuccess] = useState('');

  // Discord / Telegram State
  const [discordAccount, setDiscordAccount] = useState<any>(null);
  const [telegramAccount, setTelegramAccount] = useState<any>(null);
  const [pairingCode, setPairingCode] = useState('');
  const [dcSuccess, setDcSuccess] = useState('');

  useEffect(() => {
    setEditName(user.name || '');
    setEditEmail(user.email || '');
  }, [user]);

  const copyApiSnippet = () => {
    const snippet = `curl -X POST http://localhost:3000/api/v1/nodes \\
  -H "Content-Type: application/json" \\
  -d '{
    "canvasId": "YOUR_CANVAS_ID",
    "label": "New API Node",
    "markdown": "Injected programmatically via public REST API endpoint."
  }'`;
    navigator.clipboard.writeText(snippet);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const fetchUsageStats = async () => {
    setIsUsageLoading(true);
    try {
      const res = await fetch('/api/auth/usage');
      if (res.ok) {
        const data = await res.json();
        setUsageStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch usage stats:', err);
    } finally {
      setIsUsageLoading(false);
    }
  };

  const fetchWebhooks = async () => {
    setIsWebhooksLoading(true);
    try {
      const res = await fetch('/api/webhooks');
      if (res.ok) {
        const data = await res.json();
        setWebhooks(data.webhooks || []);
      }
    } catch (err) {
      console.error('Failed to fetch webhooks:', err);
    } finally {
      setIsWebhooksLoading(false);
    }
  };

  const fetchBotAccounts = async () => {
    try {
      const res = await fetch('/api/auth/profile');
      if (res.ok) {
        const data = await res.json();
        setDiscordAccount(data.discordAccount || null);
        setTelegramAccount(data.telegramAccount || null);
      }
    } catch (err) {
      console.error('Failed to fetch bot pairing info:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (activeTab === 'quota') fetchUsageStats();
      if (activeTab === 'webhooks') fetchWebhooks();
      if (activeTab === 'discord') fetchBotAccounts();
    }
  }, [isOpen, activeTab]);

  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setInfoError('');
    setInfoSuccess('');
    setIsInfoLoading(true);

    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, email: editEmail }),
      });
      const data = await res.json();

      if (!res.ok) {
        setInfoError(data.error || 'Failed to update profile info');
      } else {
        setInfoSuccess('Profile updated successfully');
        await checkSession();
      }
    } catch (err) {
      setInfoError('A network error occurred.');
    } finally {
      setIsInfoLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityError('');
    setSecuritySuccess('');

    if (newPassword !== confirmPassword) {
      setSecurityError('New passwords do not match.');
      return;
    }

    setIsSecurityLoading(true);
    try {
      const res = await fetch('/api/auth/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();

      if (!res.ok) {
        setSecurityError(data.error || 'Failed to update password');
      } else {
        setSecuritySuccess('Password updated successfully');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      setSecurityError('A network error occurred.');
    } finally {
      setIsSecurityLoading(false);
    }
  };

  const handleAddWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    setWhError('');
    setWhSuccess('');

    if (!whName.trim() || !whUrl.trim()) {
      setWhError('Name and Target URL are required');
      return;
    }

    try {
      const res = await fetch('/api/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: whName.trim(),
          targetUrl: whUrl.trim(),
          secret: whSecret.trim() || null,
          events: whEvents,
        }),
      });

      if (res.ok) {
        setWhSuccess('Webhook registered successfully');
        setWhName('');
        setWhUrl('');
        setWhSecret('');
        fetchWebhooks();
      } else {
        const data = await res.json();
        setWhError(data.error || 'Failed to add webhook');
      }
    } catch (err) {
      setWhError('Failed to add webhook');
    }
  };

  const handleDeleteWebhook = async (id: string) => {
    try {
      const res = await fetch(`/api/webhooks?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchWebhooks();
      }
    } catch (err) {
      console.error('Failed to delete webhook:', err);
    }
  };

  const handleGeneratePairCode = async () => {
    try {
      const res = await fetch('/api/telegram/pair', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setPairingCode(data.code);
        setDcSuccess('Pairing code generated. Send command to Telegram bot.');
      }
    } catch (err) {
      console.error('Failed to generate pairing code:', err);
    }
  };

  if (!isOpen) return null;

  const storagePct = Math.min(
    100,
    Math.round((usageStats.storageUsed / usageStats.storageLimit) * 100)
  );

  return (
    <div className="fixed inset-0 z-50 overflow-hidden font-sans">
      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Main Drawer Shell */}
      <div className="absolute right-0 top-0 w-full sm:max-w-lg h-[100dvh] bg-[#0A0A0A] border-l border-[#262626] flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Header Bar */}
        <header className="p-4 sm:p-5 border-b border-[#262626] flex items-center justify-between shrink-0 bg-[#0F0F0F]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[#FF3D00] flex items-center justify-center font-mono font-bold text-[#0A0A0A]">
              <User className="w-4 h-4 stroke-[2.5]" />
            </div>
            <h2 className="font-sans font-black text-base tracking-tighter uppercase text-[#FAFAFA]">
              ACCOUNT & GOVERNANCE
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 border border-[#262626] hover:border-[#FF3D00] text-[#737373] hover:text-[#FAFAFA] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* User Profile Hero Card */}
        <div className="p-4 sm:p-5 border-b border-[#262626] bg-[#0A0A0A] space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-[#FF3D00] font-black text-xl text-[#0A0A0A] flex items-center justify-center font-sans uppercase shrink-0">
                {user.name ? user.name[0].toUpperCase() : 'U'}
              </div>
              <div className="truncate">
                <div className="font-bold text-sm text-[#FAFAFA] truncate">
                  {user.name || 'MindSpace User'}
                </div>
                <div className="font-mono text-xs text-[#737373] truncate">{user.email}</div>
                <span className="inline-block mt-1 font-mono text-[9px] uppercase px-1.5 py-0.5 border border-[#262626] text-[#FF3D00] bg-[#FF3D00]/10 font-bold">
                  {user.role} ROLE
                </span>
              </div>
            </div>

            {/* Integrated Theme Switcher */}
            <div className="flex flex-col items-end gap-1 shrink-0">
              <span className="font-mono text-[9px] uppercase tracking-wider text-[#737373]">
                Appearance
              </span>
              <ThemeToggle />
            </div>
          </div>

          {/* Quick Storage Quota Bar */}
          <div className="p-3 bg-[#0F0F0F] border border-[#262626] space-y-1.5">
            <div className="flex justify-between font-mono text-[10px] uppercase">
              <span className="text-[#737373]">Storage Capacity</span>
              <span className="text-[#FAFAFA] font-bold">
                {usageStats.storageUsed.toFixed(1)} MB / {usageStats.storageLimit} MB ({storagePct}%)
              </span>
            </div>
            <div className="w-full h-1.5 bg-[#1A1A1A] overflow-hidden">
              <div
                className="h-full bg-[#FF3D00] transition-all duration-300"
                style={{ width: `${storagePct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Segmented Icon Navigation Control Bar */}
        <nav className="flex border-b border-[#262626] shrink-0 overflow-x-auto no-scrollbar font-mono text-xs uppercase bg-[#0F0F0F]">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 py-3 px-3 min-h-[44px] flex items-center justify-center gap-1.5 border-r border-[#262626] transition-colors whitespace-nowrap ${
              activeTab === 'profile'
                ? 'text-[#FF3D00] bg-[#0A0A0A] font-bold border-b-2 border-b-[#FF3D00]'
                : 'text-[#737373] hover:text-[#FAFAFA]'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Profile</span>
          </button>
          <button
            onClick={() => setActiveTab('info')}
            className={`flex-1 py-3 px-3 min-h-[44px] flex items-center justify-center gap-1.5 border-r border-[#262626] transition-colors whitespace-nowrap ${
              activeTab === 'info'
                ? 'text-[#FF3D00] bg-[#0A0A0A] font-bold border-b-2 border-b-[#FF3D00]'
                : 'text-[#737373] hover:text-[#FAFAFA]'
            }`}
          >
            <Info className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Settings</span>
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`flex-1 py-3 px-3 min-h-[44px] flex items-center justify-center gap-1.5 border-r border-[#262626] transition-colors whitespace-nowrap ${
              activeTab === 'security'
                ? 'text-[#FF3D00] bg-[#0A0A0A] font-bold border-b-2 border-b-[#FF3D00]'
                : 'text-[#737373] hover:text-[#FAFAFA]'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Security</span>
          </button>
          <button
            onClick={() => setActiveTab('quota')}
            className={`flex-1 py-3 px-3 min-h-[44px] flex items-center justify-center gap-1.5 border-r border-[#262626] transition-colors whitespace-nowrap ${
              activeTab === 'quota'
                ? 'text-[#FF3D00] bg-[#0A0A0A] font-bold border-b-2 border-b-[#FF3D00]'
                : 'text-[#737373] hover:text-[#FAFAFA]'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Quotas</span>
          </button>
          <button
            onClick={() => setActiveTab('webhooks')}
            className={`flex-1 py-3 px-3 min-h-[44px] flex items-center justify-center gap-1.5 border-r border-[#262626] transition-colors whitespace-nowrap ${
              activeTab === 'webhooks'
                ? 'text-[#FF3D00] bg-[#0A0A0A] font-bold border-b-2 border-b-[#FF3D00]'
                : 'text-[#737373] hover:text-[#FAFAFA]'
            }`}
          >
            <Webhook className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Hooks</span>
          </button>
          <button
            onClick={() => setActiveTab('discord')}
            className={`flex-1 py-3 px-3 min-h-[44px] flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'discord'
                ? 'text-[#FF3D00] bg-[#0A0A0A] font-bold border-b-2 border-b-[#FF3D00]'
                : 'text-[#737373] hover:text-[#FAFAFA]'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Bots</span>
          </button>
        </nav>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* TAB 1: Profile & REST API */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div className="bg-[#0F0F0F] border border-[#262626] p-5 space-y-4">
                <h3 className="font-mono text-xs text-[#737373] uppercase tracking-wider flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-[#FF3D00]" />
                  <span>User Account Credentials</span>
                </h3>
                <div className="space-y-3 text-xs font-mono">
                  <div className="flex justify-between pb-2 border-b border-[#1A1A1A]">
                    <span className="text-[#737373]">User ID</span>
                    <span className="text-[#FAFAFA] font-bold select-all">{user.id}</span>
                  </div>
                  <div className="flex justify-between pb-2 border-b border-[#1A1A1A]">
                    <span className="text-[#737373]">Email Address</span>
                    <span className="text-[#FAFAFA] font-bold">{user.email}</span>
                  </div>
                  <div className="flex justify-between pb-2 border-b border-[#1A1A1A]">
                    <span className="text-[#737373]">Account Role</span>
                    <span className="text-[#FF3D00] font-black">{user.role}</span>
                  </div>
                </div>
              </div>

              {/* REST API Integration */}
              <div className="bg-[#0F0F0F] border border-[#262626] p-5 space-y-3">
                <h3 className="font-mono text-xs text-[#737373] uppercase tracking-wider flex items-center gap-1.5">
                  <Terminal className="w-4 h-4 text-[#FF3D00]" />
                  <span>Public REST API Snippet</span>
                </h3>
                <p className="text-xs text-[#737373] leading-relaxed">
                  Query or inject concept nodes programmatically into MindSpace canvases from terminal scripts.
                </p>
                <div className="bg-black border border-[#262626] p-3 text-[11px] font-mono text-[#FAFAFA] overflow-x-auto relative">
                  <button
                    onClick={copyApiSnippet}
                    className="absolute top-2 right-2 px-2.5 py-1 border border-[#262626] hover:border-[#FF3D00] text-[#737373] hover:text-[#FAFAFA] text-[10px] uppercase font-bold transition-colors flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3 text-[#FF3D00]" />
                    <span>{copiedText ? 'Copied!' : 'Copy'}</span>
                  </button>
                  <pre className="pr-16 text-[#10B981]">
{`curl -X POST http://localhost:3000/api/v1/nodes \\
  -H "Content-Type: application/json" \\
  -d '{
    "canvasId": "YOUR_CANVAS_ID",
    "label": "New API Node",
    "markdown": "Injected programmatically"
  }'`}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Account Settings */}
          {activeTab === 'info' && (
            <form onSubmit={handleSaveInfo} className="bg-[#0F0F0F] border border-[#262626] p-5 space-y-4">
              <h3 className="font-mono text-xs text-[#737373] uppercase tracking-wider flex items-center gap-1.5">
                <Info className="w-4 h-4 text-[#FF3D00]" />
                <span>Update Account Information</span>
              </h3>

              {infoError && (
                <div className="p-3 border border-[#FF3D00] bg-[#FF3D00]/10 text-[#FF3D00] text-xs font-mono">
                  {infoError}
                </div>
              )}
              {infoSuccess && (
                <div className="p-3 border border-[#10B981] bg-[#10B981]/10 text-[#10B981] text-xs font-mono flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{infoSuccess}</span>
                </div>
              )}

              <div className="space-y-4 text-xs font-mono">
                <div>
                  <label className="block text-[#737373] uppercase tracking-wider mb-1.5">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-[#1A1A1A] border border-[#262626] focus:border-[#FF3D00] text-[#FAFAFA] p-3 outline-none min-h-[44px]"
                    placeholder="Your Display Name"
                  />
                </div>

                <div>
                  <label className="block text-[#737373] uppercase tracking-wider mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full bg-[#1A1A1A] border border-[#262626] focus:border-[#FF3D00] text-[#FAFAFA] p-3 outline-none min-h-[44px]"
                    placeholder="your@email.com"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isInfoLoading}
                  className="w-full py-3 bg-[#FF3D00] text-[#0A0A0A] font-bold uppercase tracking-wider hover:bg-[#FF5722] transition-colors min-h-[44px] flex items-center justify-center gap-2"
                >
                  {isInfoLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Save Profile Settings</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: Security */}
          {activeTab === 'security' && (
            <form onSubmit={handleUpdatePassword} className="bg-[#0F0F0F] border border-[#262626] p-5 space-y-4">
              <h3 className="font-mono text-xs text-[#737373] uppercase tracking-wider flex items-center gap-1.5">
                <Key className="w-4 h-4 text-[#FF3D00]" />
                <span>Security & Password</span>
              </h3>

              {securityError && (
                <div className="p-3 border border-[#FF3D00] bg-[#FF3D00]/10 text-[#FF3D00] text-xs font-mono">
                  {securityError}
                </div>
              )}
              {securitySuccess && (
                <div className="p-3 border border-[#10B981] bg-[#10B981]/10 text-[#10B981] text-xs font-mono flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{securitySuccess}</span>
                </div>
              )}

              <div className="space-y-4 text-xs font-mono">
                <div>
                  <label className="block text-[#737373] uppercase tracking-wider mb-1.5">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full bg-[#1A1A1A] border border-[#262626] focus:border-[#FF3D00] text-[#FAFAFA] p-3 outline-none min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="block text-[#737373] uppercase tracking-wider mb-1.5">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-[#1A1A1A] border border-[#262626] focus:border-[#FF3D00] text-[#FAFAFA] p-3 outline-none min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="block text-[#737373] uppercase tracking-wider mb-1.5">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-[#1A1A1A] border border-[#262626] focus:border-[#FF3D00] text-[#FAFAFA] p-3 outline-none min-h-[44px]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSecurityLoading}
                  className="w-full py-3 bg-[#FF3D00] text-[#0A0A0A] font-bold uppercase tracking-wider hover:bg-[#FF5722] transition-colors min-h-[44px] flex items-center justify-center gap-2"
                >
                  {isSecurityLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Update Password</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 4: Storage Quotas */}
          {activeTab === 'quota' && (
            <div className="space-y-4">
              <div className="bg-[#0F0F0F] border border-[#262626] p-5 space-y-4">
                <h3 className="font-mono text-xs text-[#737373] uppercase tracking-wider flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-[#FF3D00]" />
                  <span>Object Storage & Quotas</span>
                </h3>

                {isUsageLoading ? (
                  <div className="py-6 text-center text-[#737373] font-mono text-xs">
                    Calculating storage metrics...
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 text-center font-mono">
                    <div className="p-3 bg-[#141414] border border-[#262626]">
                      <div className="text-[10px] text-[#737373] uppercase">Canvases</div>
                      <div className="font-bold text-base text-[#FAFAFA]">{usageStats.canvasCount}</div>
                    </div>
                    <div className="p-3 bg-[#141414] border border-[#262626]">
                      <div className="text-[10px] text-[#737373] uppercase">Notes</div>
                      <div className="font-bold text-base text-[#FAFAFA]">{usageStats.noteCount}</div>
                    </div>
                    <div className="p-3 bg-[#141414] border border-[#262626]">
                      <div className="text-[10px] text-[#737373] uppercase">Concept Nodes</div>
                      <div className="font-bold text-base text-[#FAFAFA]">{usageStats.nodeCount}</div>
                    </div>
                    <div className="p-3 bg-[#141414] border border-[#262626]">
                      <div className="text-[10px] text-[#737373] uppercase">Storage Used</div>
                      <div className="font-bold text-base text-[#FF3D00]">{usageStats.storageUsed.toFixed(1)} MB</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: Webhooks */}
          {activeTab === 'webhooks' && (
            <div className="space-y-6">
              <form onSubmit={handleAddWebhook} className="bg-[#0F0F0F] border border-[#262626] p-5 space-y-4">
                <h3 className="font-mono text-xs text-[#737373] uppercase tracking-wider flex items-center gap-1.5">
                  <Webhook className="w-4 h-4 text-[#FF3D00]" />
                  <span>Register Outbound Webhook</span>
                </h3>

                {whError && (
                  <div className="p-3 border border-[#FF3D00] bg-[#FF3D00]/10 text-[#FF3D00] text-xs font-mono">
                    {whError}
                  </div>
                )}
                {whSuccess && (
                  <div className="p-3 border border-[#10B981] bg-[#10B981]/10 text-[#10B981] text-xs font-mono">
                    {whSuccess}
                  </div>
                )}

                <div className="space-y-3 text-xs font-mono">
                  <div>
                    <label className="block text-[#737373] uppercase mb-1">Webhook Name</label>
                    <input
                      type="text"
                      value={whName}
                      onChange={(e) => setWhName(e.target.value)}
                      placeholder="e.g. Zapier Trigger"
                      className="w-full bg-[#1A1A1A] border border-[#262626] text-[#FAFAFA] p-2.5 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[#737373] uppercase mb-1">Target Endpoint URL</label>
                    <input
                      type="url"
                      value={whUrl}
                      onChange={(e) => setWhUrl(e.target.value)}
                      placeholder="https://your-domain.com/webhook"
                      className="w-full bg-[#1A1A1A] border border-[#262626] text-[#FAFAFA] p-2.5 outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-[#FF3D00] text-[#0A0A0A] font-bold uppercase tracking-wider hover:bg-[#FF5722] transition-colors"
                  >
                    Add Webhook
                  </button>
                </div>
              </form>

              {/* Webhooks List */}
              <div className="space-y-3">
                <h4 className="font-mono text-xs uppercase text-[#737373]">Active Webhooks</h4>
                {webhooks.length === 0 ? (
                  <div className="p-4 bg-[#0F0F0F] border border-[#262626] text-center text-[#737373] font-mono text-xs">
                    No outbound webhooks registered.
                  </div>
                ) : (
                  webhooks.map((wh) => (
                    <div key={wh.id} className="p-4 bg-[#0F0F0F] border border-[#262626] flex items-center justify-between">
                      <div>
                        <div className="font-bold text-xs text-[#FAFAFA]">{wh.name}</div>
                        <div className="font-mono text-[10px] text-[#737373] truncate max-w-[200px]">
                          {wh.targetUrl}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteWebhook(wh.id)}
                        className="p-1 text-[#737373] hover:text-[#FF3D00] transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 6: Bot Integrations */}
          {activeTab === 'discord' && (
            <div className="space-y-6 font-mono text-xs">
              <div className="bg-[#0F0F0F] border border-[#262626] p-5 space-y-4">
                <h3 className="font-mono text-xs text-[#737373] uppercase tracking-wider flex items-center gap-1.5">
                  <Bot className="w-4 h-4 text-[#FF3D00]" />
                  <span>Discord & Telegram Companion</span>
                </h3>

                {dcSuccess && (
                  <div className="p-3 border border-[#10B981] bg-[#10B981]/10 text-[#10B981] text-xs font-mono">
                    {dcSuccess}
                  </div>
                )}

                <div className="p-4 bg-[#141414] border border-[#262626] space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[#737373] uppercase">Telegram Pair Code</span>
                    {pairingCode ? (
                      <span className="font-bold text-sm text-[#FF3D00] select-all">{pairingCode}</span>
                    ) : (
                      <button
                        onClick={handleGeneratePairCode}
                        className="px-3 py-1 bg-[#FF3D00] text-[#0A0A0A] font-bold uppercase text-[10px]"
                      >
                        Generate Code
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] text-[#737373] leading-relaxed">
                    Send <code className="text-[#FAFAFA]">/pair &lt;code&gt;</code> to the Telegram Bot to pair your account.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
