'use client';

import React, { useState, useEffect } from 'react';
import { AdminHeader } from '@/components/admin/AdminHeader';
import {
  Key,
  Save,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  MessageSquare,
  Network,
  Users,
} from 'lucide-react';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({
    SMTP_HOST: '',
    SMTP_PORT: '587',
    SMTP_USER: '',
    SMTP_PASS: '',
    SMTP_FROM_EMAIL: '',
    DISCORD_BOT_TOKEN: '',
    DISCORD_CLIENT_ID: '',
    DISCORD_BOT_STATUS: 'Listening to /remind',
    TELEGRAM_BOT_TOKEN: '',
    GEMINI_API_KEY: '',
    AI_ENABLED: 'true',
    MINIO_ENDPOINT: 'localhost',
    USER_STORAGE_LIMIT_MB: '100',
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Discord Telemetry states
  const [botStatus, setBotStatus] = useState<any | null>(null);
  const [isBotLoading, setIsBotLoading] = useState(false);
  const [isSyncingCommands, setIsSyncingCommands] = useState(false);

  // Telegram Telemetry states
  const [tgBotStatus, setTgBotStatus] = useState<any | null>(null);
  const [isTgBotLoading, setIsTgBotLoading] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings((prev) => ({ ...prev, ...(data.settings || {}) }));
        // Trigger bot validation status load immediately
        fetchBotStatus();
        fetchTgBotStatus();
      }
    } catch (err) {
      console.error('[Admin Settings Fetch Error]:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBotStatus = async () => {
    setIsBotLoading(true);
    try {
      const res = await fetch('/api/admin/discord/status');
      if (res.ok) {
        const data = await res.json();
        setBotStatus(data);
      }
    } catch (err) {
      console.error('[Bot Status fetch error]:', err);
    } finally {
      setIsBotLoading(false);
    }
  };

  const fetchTgBotStatus = async () => {
    setIsTgBotLoading(true);
    try {
      const res = await fetch('/api/admin/telegram/status');
      if (res.ok) {
        const data = await res.json();
        setTgBotStatus(data);
      }
    } catch (err) {
      console.error('[Telegram Status fetch error]:', err);
    } finally {
      setIsTgBotLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMsg(null);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      });

      if (res.ok) {
        setStatusMsg({ type: 'success', text: 'System settings updated successfully.' });
        fetchBotStatus(); // Refresh bot details dynamically
        fetchTgBotStatus();
      } else {
        const data = await res.json();
        setStatusMsg({ type: 'error', text: data.error || 'Failed to save settings.' });
      }
    } catch (err) {
      setStatusMsg({ type: 'error', text: (err as Error).message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSyncCommands = async () => {
    setIsSyncingCommands(true);
    try {
      const res = await fetch('/api/discord/register', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        alert('Slash commands successfully registered/updated with Discord!');
      } else {
        alert(data.error || 'Failed to register slash commands.');
      }
    } catch (err) {
      alert('Error registering slash commands.');
    } finally {
      setIsSyncingCommands(false);
    }
  };

  const handleChange = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#FAFAFA] flex flex-col font-sans selection:bg-[#FF3D00] selection:text-[#0A0A0A]">
      <AdminHeader />

      <main className="flex-1 max-w-6xl w-full mx-auto p-6 space-y-6">
        {/* Page title header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#262626]">
          <div>
            <div className="flex items-center gap-2 text-[#FF3D00] font-mono text-xs uppercase tracking-wider">
              <Key className="w-4 h-4" />
              <span>Credentials & Integrations panel</span>
            </div>
            <h1 className="font-sans font-black text-3xl tracking-tighter uppercase mt-1">
              System Settings Configuration
            </h1>
          </div>

          <button
            type="submit"
            form="settings-form"
            disabled={isSaving || isLoading}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#FF3D00] text-[#0A0A0A] font-mono text-xs font-bold uppercase tracking-wider hover:bg-[#FF5722] transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving Configurations...' : 'Save Configurations'}</span>
          </button>
        </div>

        {statusMsg && (
          <div
            className={`p-3 border font-mono text-xs flex items-center gap-2 ${
              statusMsg.type === 'success'
                ? 'bg-[#10B981]/10 border-[#10B981] text-[#10B981]'
                : 'bg-[#FF3D00]/10 border-[#FF3D00] text-[#FF3D00]'
            }`}
          >
            {statusMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{statusMsg.text}</span>
          </div>
        )}

        {/* Dual Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Left Fields Column (2/3 width) */}
          <form id="settings-form" onSubmit={handleSave} className="lg:col-span-2 space-y-6">
            
            {/* SMTP Settings */}
            <div className="p-5 bg-[#0F0F0F] border border-[#262626] space-y-4">
              <h3 className="font-mono text-xs uppercase tracking-wider text-[#FF3D00] border-b border-[#262626] pb-2">
                📧 SMTP Email Dispatcher Settings
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-mono text-[10px] uppercase text-[#737373] tracking-wider mb-1">
                    SMTP Host
                  </label>
                  <input
                    type="text"
                    value={settings.SMTP_HOST || ''}
                    onChange={(e) => handleChange('SMTP_HOST', e.target.value)}
                    className="w-full bg-[#1A1A1A] border border-[#262626] focus:border-[#FF3D00] text-xs text-[#FAFAFA] p-2.5 outline-none"
                    placeholder="smtp.gmail.com"
                  />
                </div>

                <div>
                  <label className="block font-mono text-[10px] uppercase text-[#737373] tracking-wider mb-1">
                    SMTP Port
                  </label>
                  <input
                    type="text"
                    value={settings.SMTP_PORT || ''}
                    onChange={(e) => handleChange('SMTP_PORT', e.target.value)}
                    className="w-full bg-[#1A1A1A] border border-[#262626] focus:border-[#FF3D00] text-xs text-[#FAFAFA] p-2.5 outline-none"
                    placeholder="587"
                  />
                </div>

                <div>
                  <label className="block font-mono text-[10px] uppercase text-[#737373] tracking-wider mb-1">
                    SMTP Username
                  </label>
                  <input
                    type="text"
                    value={settings.SMTP_USER || ''}
                    onChange={(e) => handleChange('SMTP_USER', e.target.value)}
                    className="w-full bg-[#1A1A1A] border border-[#262626] focus:border-[#FF3D00] text-xs text-[#FAFAFA] p-2.5 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-mono text-[10px] uppercase text-[#737373] tracking-wider mb-1">
                    From Email Address
                  </label>
                  <input
                    type="email"
                    value={settings.SMTP_FROM_EMAIL || ''}
                    onChange={(e) => handleChange('SMTP_FROM_EMAIL', e.target.value)}
                    className="w-full bg-[#1A1A1A] border border-[#262626] focus:border-[#FF3D00] text-xs text-[#FAFAFA] p-2.5 outline-none"
                    placeholder="notifications@mindspace.app"
                  />
                </div>
              </div>
            </div>

            {/* AI & Storage Settings */}
            <div className="p-5 bg-[#0F0F0F] border border-[#262626] space-y-4">
              <h3 className="font-mono text-xs uppercase tracking-wider text-[#10B981] border-b border-[#262626] pb-2">
                ⚙️ Storage & AI Configuration
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-mono text-[10px] uppercase text-[#737373] tracking-wider mb-1">
                    Google Gemini API Key
                  </label>
                  <input
                    type="password"
                    value={settings.GEMINI_API_KEY || ''}
                    onChange={(e) => handleChange('GEMINI_API_KEY', e.target.value)}
                    className="w-full bg-[#1A1A1A] border border-[#262626] focus:border-[#FF3D00] text-xs text-[#FAFAFA] p-2.5 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-mono text-[10px] uppercase text-[#737373] tracking-wider mb-1">
                    User Storage Limit (MB)
                  </label>
                  <input
                    type="number"
                    value={settings.USER_STORAGE_LIMIT_MB || '100'}
                    onChange={(e) => handleChange('USER_STORAGE_LIMIT_MB', e.target.value)}
                    className="w-full bg-[#1A1A1A] border border-[#262626] focus:border-[#FF3D00] text-xs text-[#FAFAFA] p-2.5 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Telegram & Outbound Bot Tokens */}
            <div className="p-5 bg-[#0F0F0F] border border-[#262626] space-y-4">
              <h3 className="font-mono text-xs uppercase tracking-wider text-[#E0A030] border-b border-[#262626] pb-2">
                🤖 Alternate Integrations Credentials
              </h3>
              <div>
                <label className="block font-mono text-[10px] uppercase text-[#737373] tracking-wider mb-1">
                  Telegram Bot Token
                </label>
                <input
                  type="password"
                  value={settings.TELEGRAM_BOT_TOKEN || ''}
                  onChange={(e) => handleChange('TELEGRAM_BOT_TOKEN', e.target.value)}
                  className="w-full bg-[#1A1A1A] border border-[#262626] focus:border-[#FF3D00] text-xs text-[#FAFAFA] p-2.5 outline-none"
                />
              </div>
            </div>

          </form>

          {/* Right Column: Discord Bot Control & Info Card Dashboard (1/3 width) */}
          <div className="space-y-6">
            
            {/* Sleek Discord Bot Profile Card */}
            <div className="bg-[#1E1F22] border border-[#2B2D31] rounded-2xl overflow-hidden shadow-2xl relative">
              {/* Profile Top Banner */}
              <div className="h-16 bg-[#5865F2] w-full relative" />
              
              {/* Bot Profile Details Container */}
              <div className="px-4 pb-4 pt-12 relative">
                
                {/* Bot Avatar overlay with pulsing status dot */}
                <div className="absolute -top-9 left-4 border-6 border-[#1E1F22] rounded-full overflow-hidden bg-[#151617] w-20 h-20">
                  {botStatus?.bot?.avatarUrl ? (
                    <img
                      src={botStatus.bot.avatarUrl}
                      alt="Discord Bot Avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[#5865F2] text-[#FAFAFA] font-mono text-xl font-bold">
                      BOT
                    </div>
                  )}
                  {/* Status pulsing Dot */}
                  <span
                    className={`absolute bottom-0.5 right-0.5 w-4.5 h-4.5 border-3 border-[#1E1F22] rounded-full ${
                      botStatus?.status === 'ONLINE' ? 'bg-[#23A55A]' : 'bg-[#80848E]'
                    }`}
                  />
                </div>

                {/* Profile Title info */}
                <div className="mt-2 flex items-center gap-1.5">
                  <h3 className="font-sans font-black text-lg text-[#FAFAFA] tracking-tight">
                    {botStatus?.bot?.username || 'Discord Bot'}
                  </h3>
                  {botStatus?.bot?.discriminator && botStatus.bot.discriminator !== '0' && (
                    <span className="font-mono text-xs text-[#B5BAC1]">
                      #{botStatus.bot.discriminator}
                    </span>
                  )}
                  <span className="bg-[#5865F2] text-[#FAFAFA] font-mono text-[8px] uppercase tracking-wider font-extrabold px-1 rounded-sm">
                    BOT
                  </span>
                </div>

                {/* Bot Activity Custom Status */}
                <div className="mt-1 font-mono text-[10px] text-[#B5BAC1] uppercase tracking-wide flex items-center gap-1">
                  <span className="font-bold text-[#FAFAFA]">Custom Status:</span>
                  <span className="text-[#B5BAC1] truncate italic">
                    "{settings.DISCORD_BOT_STATUS || 'Listening to /remind'}"
                  </span>
                </div>

                <div className="h-px bg-[#2B2D31] my-4" />

                {/* Technical stats breakdown */}
                <div className="space-y-3 font-sans text-xs text-[#B5BAC1]">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase text-[#949BA4]">Status Connection</span>
                    <span
                      className={`font-mono text-[10px] uppercase font-black tracking-wider ${
                        botStatus?.status === 'ONLINE' ? 'text-[#23A55A]' : 'text-[#F23F43]'
                      }`}
                    >
                      {botStatus?.status || 'OFFLINE'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase text-[#949BA4]">Active Server Guilds</span>
                    <span className="text-[#FAFAFA] font-mono font-bold">
                      {botStatus?.bot?.serverCount ?? 0} servers
                    </span>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-mono uppercase text-[#949BA4]">Discord Bot Token</label>
                    <input
                      type="password"
                      value={settings.DISCORD_BOT_TOKEN || ''}
                      onChange={(e) => handleChange('DISCORD_BOT_TOKEN', e.target.value)}
                      placeholder="token credentials"
                      className="w-full bg-[#111214] border border-[#2B2D31] text-[11px] text-[#FAFAFA] p-2 outline-none rounded"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-mono uppercase text-[#949BA4]">Discord Client ID</label>
                    <input
                      type="text"
                      value={settings.DISCORD_CLIENT_ID || ''}
                      onChange={(e) => handleChange('DISCORD_CLIENT_ID', e.target.value)}
                      placeholder="client app ID"
                      className="w-full bg-[#111214] border border-[#2B2D31] text-[11px] text-[#FAFAFA] p-2 outline-none rounded"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-mono uppercase text-[#949BA4]">Custom Status Activity Text</label>
                    <input
                      type="text"
                      value={settings.DISCORD_BOT_STATUS || ''}
                      onChange={(e) => handleChange('DISCORD_BOT_STATUS', e.target.value)}
                      placeholder="Listening to /remind"
                      className="w-full bg-[#111214] border border-[#2B2D31] text-[11px] text-[#FAFAFA] p-2 outline-none rounded"
                    />
                  </div>
                </div>

                {/* Profile Card Footer Action Controls */}
                <div className="mt-4 pt-3 border-t border-[#2B2D31] space-y-2">
                  
                  {/* Sync slash commands */}
                  <button
                    type="button"
                    onClick={handleSyncCommands}
                    disabled={isSyncingCommands || !settings.DISCORD_BOT_TOKEN}
                    className="w-full py-2 bg-[#5865F2] hover:bg-[#4752C4] text-[#FAFAFA] font-sans text-xs font-bold uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncingCommands ? 'animate-spin' : ''}`} />
                    <span>Sync Slash Commands</span>
                  </button>

                  {/* 1-click Invite Link generator */}
                  {settings.DISCORD_CLIENT_ID ? (
                    <a
                      href={`https://discord.com/api/oauth2/authorize?client_id=${settings.DISCORD_CLIENT_ID}&permissions=8&scope=bot%20applications.commands`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2 bg-[#23A55A] hover:bg-[#1A7F43] text-[#FAFAFA] font-sans text-xs font-bold uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-1.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Generate Invite Link</span>
                    </a>
                  ) : (
                    <div className="w-full py-2 bg-[#2B2D31] text-[#949BA4] font-sans text-xs text-center rounded-lg select-none italic">
                      Generate Invite Link (needs Client ID)
                    </div>
                  )}

                  {/* Telemetry Refresh */}
                  <button
                    type="button"
                    onClick={fetchBotStatus}
                    disabled={isBotLoading}
                    className="w-full py-1.5 bg-transparent hover:bg-[#2B2D31] text-[#949BA4] hover:text-[#FAFAFA] border border-[#2B2D31] font-mono text-[9px] uppercase font-bold rounded-lg transition-colors flex items-center justify-center gap-1"
                  >
                    <RefreshCw className={`w-3 h-3 ${isBotLoading ? 'animate-spin' : ''}`} />
                    <span>Refresh Telemetry</span>
                  </button>

                </div>

              </div>
            </div>

            {/* Sleek Telegram Bot Profile Card */}
            <div className="bg-[#182533] border border-[#243343] rounded-2xl overflow-hidden shadow-2xl relative">
              {/* Profile Top Banner */}
              <div className="h-16 bg-[#229ED9] w-full relative" />
              
              {/* Bot Profile Details Container */}
              <div className="px-4 pb-4 pt-12 relative">
                
                {/* Bot Avatar overlay with pulsing status dot */}
                <div className="absolute -top-9 left-4 border-6 border-[#182533] rounded-full overflow-hidden bg-[#0e1621] w-20 h-20 flex items-center justify-center text-[#FAFAFA]">
                  <div className="w-full h-full flex items-center justify-center bg-[#229ED9] text-[#FAFAFA] font-mono text-xl font-bold">
                    TG
                  </div>
                  {/* Status pulsing Dot */}
                  <span
                    className={`absolute bottom-0.5 right-0.5 w-4.5 h-4.5 border-3 border-[#182533] rounded-full ${
                      tgBotStatus?.status === 'ONLINE' ? 'bg-[#35B2F0]' : 'bg-[#80848E]'
                    }`}
                  />
                </div>

                {/* Profile Title info */}
                <div className="mt-2 flex items-center gap-1.5">
                  <h3 className="font-sans font-black text-lg text-[#FAFAFA] tracking-tight">
                    {tgBotStatus?.bot?.firstName || 'Telegram Bot'}
                  </h3>
                  {tgBotStatus?.bot?.username && (
                    <span className="font-mono text-xs text-[#7B8B9A]">
                      @{tgBotStatus.bot.username}
                    </span>
                  )}
                  <span className="bg-[#229ED9] text-[#FAFAFA] font-mono text-[8px] uppercase tracking-wider font-extrabold px-1 rounded-sm">
                    BOT
                  </span>
                </div>

                <div className="h-px bg-[#243343] my-4" />

                {/* Technical stats breakdown */}
                <div className="space-y-3 font-sans text-xs text-[#7B8B9A]">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase text-[#7B8B9A]">Status Connection</span>
                    <span
                      className={`font-mono text-[10px] uppercase font-black tracking-wider ${
                        tgBotStatus?.status === 'ONLINE' ? 'text-[#35B2F0]' : 'text-[#F23F43]'
                      }`}
                    >
                      {tgBotStatus?.status || 'OFFLINE'}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-mono uppercase text-[#7B8B9A]">Telegram Bot Token</label>
                    <input
                      type="password"
                      value={settings.TELEGRAM_BOT_TOKEN || ''}
                      onChange={(e) => handleChange('TELEGRAM_BOT_TOKEN', e.target.value)}
                      placeholder="token credentials"
                      className="w-full bg-[#0e1621] border border-[#243343] text-[11px] text-[#FAFAFA] p-2 outline-none rounded"
                      required
                    />
                  </div>
                </div>

                {/* Profile Card Footer Action Controls */}
                <div className="mt-4 pt-3 border-t border-[#243343] space-y-2">
                  
                  {/* Chat with bot link */}
                  {tgBotStatus?.bot?.username ? (
                    <a
                      href={`https://t.me/${tgBotStatus.bot.username}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2 bg-[#229ED9] hover:bg-[#1C82B3] text-[#FAFAFA] font-sans text-xs font-bold uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-1.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Start Chat in Telegram</span>
                    </a>
                  ) : (
                    <div className="w-full py-2 bg-[#243343] text-[#7B8B9A] font-sans text-xs text-center rounded-lg select-none italic">
                      Start Chat (needs username)
                    </div>
                  )}

                  {/* Telemetry Refresh */}
                  <button
                    type="button"
                    onClick={fetchTgBotStatus}
                    disabled={isTgBotLoading}
                    className="w-full py-1.5 bg-transparent hover:bg-[#243343] text-[#7B8B9A] hover:text-[#FAFAFA] border border-[#243343] font-mono text-[9px] uppercase font-bold rounded-lg transition-colors flex items-center justify-center gap-1"
                  >
                    <RefreshCw className={`w-3 h-3 ${isTgBotLoading ? 'animate-spin' : ''}`} />
                    <span>Refresh Telemetry</span>
                  </button>

                </div>

              </div>
            </div>
            
          </div>

        </div>
      </main>
    </div>
  );
}
