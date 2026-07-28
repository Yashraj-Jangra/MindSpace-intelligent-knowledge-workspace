'use client';

import React, { useState, useEffect } from 'react';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { Key, Save, CheckCircle2, AlertCircle } from 'lucide-react';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({
    SMTP_HOST: '',
    SMTP_PORT: '587',
    SMTP_USER: '',
    SMTP_PASS: '',
    SMTP_FROM_EMAIL: '',
    DISCORD_BOT_TOKEN: '',
    DISCORD_CLIENT_ID: '',
    TELEGRAM_BOT_TOKEN: '',
    GEMINI_API_KEY: '',
    AI_ENABLED: 'true',
    MINIO_ENDPOINT: 'localhost',
    USER_STORAGE_LIMIT_MB: '100',
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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
      }
    } catch (err) {
      console.error('[Admin Settings Fetch Error]:', err);
    } finally {
      setIsLoading(false);
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

  const handleChange = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#FAFAFA] flex flex-col font-sans">
      <AdminHeader />

      <main className="flex-1 max-w-5xl w-full mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-[#262626]">
          <div>
            <div className="flex items-center gap-2 text-[#FF3D00] font-mono text-xs uppercase tracking-wider">
              <Key className="w-4 h-4" />
              <span>Credentials & Integrations</span>
            </div>
            <h1 className="font-sans font-black text-2xl tracking-tight uppercase mt-1">
              System Settings Configuration
            </h1>
          </div>

          <button
            type="submit"
            form="settings-form"
            disabled={isSaving || isLoading}
            className="flex items-center gap-2 px-5 py-2 bg-[#FF3D00] text-[#0A0A0A] font-mono text-xs font-bold uppercase tracking-wider hover:bg-[#FF5722] transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
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

        <form id="settings-form" onSubmit={handleSave} className="space-y-6">
          {/* SMTP Email Server Settings */}
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

          {/* Discord & Telegram Integrations */}
          <div className="p-5 bg-[#0F0F0F] border border-[#262626] space-y-4">
            <h3 className="font-mono text-xs uppercase tracking-wider text-[#4285F4] border-b border-[#262626] pb-2">
              🤖 Multi-Channel Bot Credentials
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-mono text-[10px] uppercase text-[#737373] tracking-wider mb-1">
                  Discord Bot Token
                </label>
                <input
                  type="password"
                  value={settings.DISCORD_BOT_TOKEN || ''}
                  onChange={(e) => handleChange('DISCORD_BOT_TOKEN', e.target.value)}
                  className="w-full bg-[#1A1A1A] border border-[#262626] focus:border-[#FF3D00] text-xs text-[#FAFAFA] p-2.5 outline-none"
                />
              </div>

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
        </form>
      </main>
    </div>
  );
}
