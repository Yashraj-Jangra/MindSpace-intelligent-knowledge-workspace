'use client';

import React, { useState, useEffect } from 'react';
import { X, User, Shield, Terminal, Webhook, MessageSquare, Mail, Key, Trash2, Plus, Check, Loader2 } from 'lucide-react';
import { SessionUser } from '@/lib/session';

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
  const [activeTab, setActiveTab] = useState<'profile' | 'webhooks' | 'discord' | 'smtp'>('profile');
  const [copiedText, setCopiedText] = useState(false);

  // Webhooks Tab State
  const [webhooks, setWebhooks] = useState<WebhookItem[]>([]);
  const [isWebhooksLoading, setIsWebhooksLoading] = useState(false);
  const [whName, setWhName] = useState('');
  const [whUrl, setWhUrl] = useState('');
  const [whSecret, setWhSecret] = useState('');
  const [whEvents, setWhEvents] = useState<string[]>(['node.created', 'reminder.fired']);
  const [whError, setWhError] = useState('');
  const [whSuccess, setWhSuccess] = useState('');

  // Discord Tab State
  const [discordAccount, setDiscordAccount] = useState<any>(null);
  const [isDiscordLoading, setIsDiscordLoading] = useState(false);
  const [pairingCode, setPairingCode] = useState('');
  const [discordWebhookUrl, setDiscordWebhookUrl] = useState('');
  const [dcSuccess, setDcSuccess] = useState('');

  // SMTP Tab State
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [smtpFrom, setSmtpFrom] = useState('');
  const [isSmtpLoading, setIsSmtpLoading] = useState(false);
  const [smtpError, setSmtpError] = useState('');
  const [smtpSuccess, setSmtpSuccess] = useState('');

  // Copy API snippet helper
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

  // Fetch webhooks
  const fetchWebhooks = async () => {
    setIsWebhooksLoading(true);
    try {
      const res = await fetch('/api/webhooks');
      if (res.ok) {
        const data = await res.json();
        setWebhooks(data.webhooks || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsWebhooksLoading(false);
    }
  };

  // Register Webhook
  const handleAddWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    setWhError('');
    setWhSuccess('');
    if (!whUrl) return;

    try {
      const res = await fetch('/api/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: whName,
          targetUrl: whUrl,
          secret: whSecret,
          events: whEvents,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setWhSuccess('Webhook registered successfully!');
        setWhName('');
        setWhUrl('');
        setWhSecret('');
        fetchWebhooks();
      } else {
        setWhError(data.error || 'Failed to add webhook');
      }
    } catch (err) {
      setWhError('Server error while saving webhook.');
    }
  };

  // Delete Webhook
  const handleDeleteWebhook = async (id: string) => {
    try {
      const res = await fetch('/api/webhooks', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setWebhooks((prev) => prev.filter((w) => w.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch Discord Pairing Status
  const fetchDiscordStatus = async () => {
    setIsDiscordLoading(true);
    try {
      const res = await fetch('/api/discord/pair');
      if (res.ok) {
        const data = await res.json();
        setDiscordAccount(data.account || null);
        if (data.account?.webhookUrl) {
          setDiscordWebhookUrl(data.account.webhookUrl);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsDiscordLoading(false);
    }
  };

  // Generate Discord pairing code
  const handleGenerateDiscordCode = async () => {
    setPairingCode('');
    try {
      const res = await fetch('/api/discord/pair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate-code' }),
      });
      if (res.ok) {
        const data = await res.json();
        setPairingCode(data.pairingCode || '');
        fetchDiscordStatus();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Save Discord Webhook URL
  const handleSaveDiscordWebhook = async () => {
    setDcSuccess('');
    try {
      const res = await fetch('/api/discord/pair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set-webhook', webhookUrl: discordWebhookUrl }),
      });
      if (res.ok) {
        setDcSuccess('Discord notification webhook saved!');
        fetchDiscordStatus();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch SMTP configurations
  const fetchSmtpConfig = async () => {
    try {
      const res = await fetch('/api/auth/smtp');
      if (res.ok) {
        const data = await res.json();
        if (data.config) {
          setSmtpHost(data.config.host || '');
          setSmtpPort(String(data.config.port || '587'));
          setSmtpUser(data.config.username || '');
          setSmtpPass(data.config.password || '');
          setSmtpFrom(data.config.fromEmail || '');
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Save SMTP Settings
  const handleSaveSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSmtpError('');
    setSmtpSuccess('');
    setIsSmtpLoading(true);

    try {
      const res = await fetch('/api/auth/smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: smtpHost,
          port: Number(smtpPort),
          username: smtpUser,
          password: smtpPass,
          fromEmail: smtpFrom,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSmtpSuccess('SMTP configuration saved successfully!');
      } else {
        setSmtpError(data.error || 'Failed to save SMTP configuration');
      }
    } catch (err) {
      setSmtpError('Server error while saving.');
    } finally {
      setIsSmtpLoading(false);
    }
  };

  // Trigger loads when active tab changes
  useEffect(() => {
    if (!isOpen) return;
    if (activeTab === 'webhooks') fetchWebhooks();
    if (activeTab === 'discord') fetchDiscordStatus();
    if (activeTab === 'smtp') fetchSmtpConfig();
  }, [activeTab, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm select-none animate-in fade-in duration-200">
      {/* Background click dismiss */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Main Drawer Shell */}
      <div className="relative w-full max-w-lg h-full bg-[#0A0A0A] border-l border-[#262626] flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
        
        {/* Drawer Header */}
        <header className="p-6 border-b border-[#262626] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-[#FF3D00] flex items-center justify-center font-mono font-bold text-[#0A0A0A]">
              <User className="w-3.5 h-3.5" />
            </div>
            <h2 className="font-sans font-black text-lg tracking-tighter uppercase text-[#FAFAFA]">
              ACCOUNT & INTEGRATIONS
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 border border-[#262626] hover:border-[#FF3D00] text-[#737373] hover:text-[#FAFAFA] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        {/* Settings Navigation Tabs */}
        <nav className="flex border-b border-[#262626] shrink-0 overflow-x-auto no-scrollbar font-mono text-[10px] sm:text-xs uppercase font-bold bg-[#0F0F0F]">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 py-3.5 text-center border-r border-[#262626] transition-colors ${
              activeTab === 'profile' ? 'text-[#FF3D00] bg-[#0A0A0A]' : 'text-[#737373] hover:text-[#FAFAFA]'
            }`}
          >
            Profile & API
          </button>
          <button
            onClick={() => setActiveTab('webhooks')}
            className={`flex-1 py-3.5 text-center border-r border-[#262626] transition-colors ${
              activeTab === 'webhooks' ? 'text-[#FF3D00] bg-[#0A0A0A]' : 'text-[#737373] hover:text-[#FAFAFA]'
            }`}
          >
            Webhooks
          </button>
          <button
            onClick={() => setActiveTab('discord')}
            className={`flex-1 py-3.5 text-center border-r border-[#262626] transition-colors ${
              activeTab === 'discord' ? 'text-[#FF3D00] bg-[#0A0A0A]' : 'text-[#737373] hover:text-[#FAFAFA]'
            }`}
          >
            Discord
          </button>
          <button
            onClick={() => setActiveTab('smtp')}
            className={`flex-1 py-3.5 text-center transition-colors ${
              activeTab === 'smtp' ? 'text-[#FF3D00] bg-[#0A0A0A]' : 'text-[#737373] hover:text-[#FAFAFA]'
            }`}
          >
            SMTP Mail
          </button>
        </nav>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* TAB 1: Profile & REST API */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              {/* Credentials card */}
              <div className="bg-[#0F0F0F] border border-[#262626] p-5 relative">
                <div className="h-1 w-12 bg-[#FF3D00] absolute top-0 left-0" />
                <h3 className="font-mono text-xs text-[#737373] uppercase tracking-wider mb-4 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-[#FF3D00]" />
                  <span>User Profile</span>
                </h3>
                <div className="space-y-3 text-xs font-mono">
                  <div className="flex justify-between pb-2 border-b border-[#1A1A1A]">
                    <span className="text-[#737373]">NAME</span>
                    <span className="text-[#FAFAFA] font-bold">{user.name || 'Anonymous User'}</span>
                  </div>
                  <div className="flex justify-between pb-2 border-b border-[#1A1A1A]">
                    <span className="text-[#737373]">EMAIL</span>
                    <span className="text-[#FAFAFA] font-bold">{user.email}</span>
                  </div>
                  <div className="flex justify-between pb-2 border-b border-[#1A1A1A]">
                    <span className="text-[#737373]">ROLE</span>
                    <span className="text-[#FF3D00] font-black">{user.role}</span>
                  </div>
                  <div className="flex justify-between pb-1">
                    <span className="text-[#737373]">USER ID / API KEY</span>
                    <span className="text-[#FAFAFA] select-all font-bold text-[10px] break-all">{user.id}</span>
                  </div>
                </div>
              </div>

              {/* REST API integration card */}
              <div className="bg-[#0F0F0F] border border-[#262626] p-5 space-y-3">
                <h3 className="font-mono text-xs text-[#737373] uppercase tracking-wider flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-[#FF3D00]" />
                  <span>Public REST API Integration</span>
                </h3>
                <p className="text-[11px] text-[#737373] leading-relaxed">
                  Use your credentials to query or inject concept nodes into MindSpace canvases programmatically from terminal scripts.
                </p>
                <div className="bg-black border border-[#262626] p-3 text-[10px] font-mono text-[#FAFAFA] overflow-x-auto relative group">
                  <button
                    onClick={copyApiSnippet}
                    className="absolute top-2 right-2 px-2 py-0.5 border border-[#262626] hover:border-[#FF3D00] text-[#737373] hover:text-[#FAFAFA] text-[9px] transition-colors"
                  >
                    {copiedText ? 'Copied!' : 'Copy'}
                  </button>
                  <pre className="pr-12 text-[#10B981]">
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

          {/* TAB 2: Outbound Webhooks */}
          {activeTab === 'webhooks' && (
            <div className="space-y-6">
              {/* Webhook form */}
              <form onSubmit={handleAddWebhook} className="bg-[#0F0F0F] border border-[#262626] p-5 space-y-4">
                <h3 className="font-mono text-xs text-[#737373] uppercase tracking-wider flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-[#FF3D00]" />
                  <span>Register Outbound Webhook</span>
                </h3>

                {whError && <div className="p-2 border border-red-500 bg-red-500/10 text-red-500 text-[11px] font-mono">{whError}</div>}
                {whSuccess && <div className="p-2 border border-emerald-500 bg-emerald-500/10 text-emerald-500 text-[11px] font-mono">{whSuccess}</div>}

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block font-mono uppercase text-[#737373] text-[10px] mb-1">Webhook Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Local Server Receiver"
                      value={whName}
                      onChange={(e) => setWhName(e.target.value)}
                      className="w-full bg-[#1A1A1A] border border-[#262626] focus:border-[#FF3D00] p-2 text-xs font-mono text-[#FAFAFA] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-mono uppercase text-[#737373] text-[10px] mb-1">Target Endpoint URL</label>
                    <input
                      type="url"
                      required
                      placeholder="e.g. http://192.168.1.50:4000/webhook"
                      value={whUrl}
                      onChange={(e) => setWhUrl(e.target.value)}
                      className="w-full bg-[#1A1A1A] border border-[#262626] focus:border-[#FF3D00] p-2 text-xs font-mono text-[#FAFAFA] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-mono uppercase text-[#737373] text-[10px] mb-1">HMAC Shared Secret Key</label>
                    <input
                      type="text"
                      placeholder="e.g. secret_signature"
                      value={whSecret}
                      onChange={(e) => setWhSecret(e.target.value)}
                      className="w-full bg-[#1A1A1A] border border-[#262626] focus:border-[#FF3D00] p-2 text-xs font-mono text-[#FAFAFA] outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#FF3D00] text-[#0A0A0A] font-mono text-xs uppercase font-bold py-2 hover:bg-[#FAFAFA] transition-colors"
                >
                  Save Webhook Receiver
                </button>
              </form>

              {/* Registered webhooks list */}
              <div className="space-y-3">
                <h4 className="font-mono text-xs text-[#737373] uppercase tracking-wider flex items-center gap-1.5">
                  <Webhook className="w-3.5 h-3.5 text-[#FF3D00]" />
                  <span>Configured Webhooks ({webhooks.length})</span>
                </h4>

                {isWebhooksLoading ? (
                  <div className="text-center py-6">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#737373]" />
                  </div>
                ) : webhooks.length === 0 ? (
                  <div className="border border-[#262626] border-dashed p-6 text-center text-xs font-mono text-[#737373]">
                    No outbound webhooks registered.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {webhooks.map((w) => (
                      <div key={w.id} className="bg-[#0F0F0F] border border-[#262626] p-4 flex items-center justify-between gap-4">
                        <div className="min-w-0 flex-1 space-y-1">
                          <h5 className="font-sans font-bold text-xs text-[#FAFAFA] truncate">{w.name}</h5>
                          <p className="font-mono text-[10px] text-[#737373] truncate select-all">{w.targetUrl}</p>
                          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pt-1">
                            {w.events.map((ev) => (
                              <span key={ev} className="bg-black border border-[#262626] px-1.5 py-0.5 font-mono text-[8px] text-[#FF3D00] uppercase shrink-0">
                                {ev}
                              </span>
                            ))}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteWebhook(w.id)}
                          className="p-1.5 border border-[#262626] hover:border-red-500 hover:text-red-500 text-[#737373] transition-colors shrink-0"
                          title="Delete Webhook"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: Discord Integration */}
          {activeTab === 'discord' && (
            <div className="space-y-6">
              {/* Pairing Status */}
              <div className="bg-[#0F0F0F] border border-[#262626] p-5 space-y-4">
                <h3 className="font-mono text-xs text-[#737373] uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-[#FF3D00]" />
                  <span>Discord Bot Pairing</span>
                </h3>

                {isDiscordLoading ? (
                  <div className="text-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#737373]" />
                  </div>
                ) : discordAccount?.isPaired ? (
                  <div className="space-y-3 font-mono text-xs">
                    <div className="p-3 border border-emerald-500 bg-emerald-500/10 text-emerald-400 flex items-center gap-2">
                      <Check className="w-4 h-4" />
                      <span>PAIRED SUCCESSFULLY</span>
                    </div>
                    <div className="flex justify-between pb-2 border-b border-[#1A1A1A]">
                      <span className="text-[#737373]">DISCORD USER</span>
                      <span className="text-[#FAFAFA] font-bold">{discordAccount.discordUsername}</span>
                    </div>
                    <div className="flex justify-between pb-1">
                      <span className="text-[#737373]">DISCORD USER ID</span>
                      <span className="text-[#FAFAFA] select-all font-bold">{discordAccount.discordUserId}</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-3 border border-yellow-500 bg-yellow-500/5 text-yellow-500 text-xs font-mono leading-relaxed">
                      Your MindSpace account is not paired with a Discord profile. Generate a pairing code below, and message it to your server Discord bot to link them.
                    </div>

                    {pairingCode ? (
                      <div className="bg-black border border-[#FF3D00] p-4 text-center space-y-2">
                        <span className="block font-mono text-[10px] text-[#737373] uppercase">Pairing Code</span>
                        <div className="font-mono font-black text-2xl tracking-widest text-[#FF3D00] select-all">
                          {pairingCode}
                        </div>
                        <span className="block font-mono text-[8px] text-[#737373] uppercase">Valid for 10 minutes</span>
                      </div>
                    ) : (
                      <button
                        onClick={handleGenerateDiscordCode}
                        className="w-full bg-[#1A1A1A] border border-[#FF3D00] hover:bg-[#FF3D00] hover:text-[#0A0A0A] text-[#FF3D00] font-mono text-xs uppercase font-bold py-2.5 transition-colors"
                      >
                        Generate Pairing Code
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Notification Webhook */}
              <div className="bg-[#0F0F0F] border border-[#262626] p-5 space-y-4">
                <h3 className="font-mono text-xs text-[#737373] uppercase tracking-wider flex items-center gap-1.5">
                  <Webhook className="w-3.5 h-3.5 text-[#FF3D00]" />
                  <span>Discord Alert Relay Webhook</span>
                </h3>
                
                {dcSuccess && <div className="p-2 border border-emerald-500 bg-emerald-500/10 text-emerald-400 text-[11px] font-mono">{dcSuccess}</div>}

                <div className="space-y-3 text-xs">
                  <p className="text-[11px] text-[#737373] leading-relaxed">
                    Paste a Discord Channel Webhook URL here to receive direct visual canvas modification notifications into your Discord channel.
                  </p>
                  <div>
                    <input
                      type="url"
                      placeholder="https://discord.com/api/webhooks/..."
                      value={discordWebhookUrl}
                      onChange={(e) => setDiscordWebhookUrl(e.target.value)}
                      className="w-full bg-[#1A1A1A] border border-[#262626] focus:border-[#FF3D00] p-2 text-xs font-mono text-[#FAFAFA] outline-none"
                    />
                  </div>
                  <button
                    onClick={handleSaveDiscordWebhook}
                    className="w-full bg-[#FF3D00] text-[#0A0A0A] font-mono text-xs uppercase font-bold py-2 hover:bg-[#FAFAFA] transition-colors"
                  >
                    Save Discord Webhook URL
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SMTP Config */}
          {activeTab === 'smtp' && (
            <form onSubmit={handleSaveSmtp} className="bg-[#0F0F0F] border border-[#262626] p-5 space-y-4">
              <h3 className="font-mono text-xs text-[#737373] uppercase tracking-wider flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[#FF3D00]" />
                <span>SMTP Email Configuration</span>
              </h3>

              {smtpError && <div className="p-2 border border-red-500 bg-red-500/10 text-red-500 text-[11px] font-mono">{smtpError}</div>}
              {smtpSuccess && <div className="p-2 border border-emerald-500 bg-emerald-500/10 text-emerald-500 text-[11px] font-mono">{smtpSuccess}</div>}

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-mono uppercase text-[#737373] text-[10px] mb-1">SMTP Host</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. smtp.gmail.com"
                    value={smtpHost}
                    onChange={(e) => setSmtpHost(e.target.value)}
                    className="w-full bg-[#1A1A1A] border border-[#262626] focus:border-[#FF3D00] p-2 text-xs font-mono text-[#FAFAFA] outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-mono uppercase text-[#737373] text-[10px] mb-1">Port</label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 587"
                      value={smtpPort}
                      onChange={(e) => setSmtpPort(e.target.value)}
                      className="w-full bg-[#1A1A1A] border border-[#262626] focus:border-[#FF3D00] p-2 text-xs font-mono text-[#FAFAFA] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-mono uppercase text-[#737373] text-[10px] mb-1">Sender Email</label>
                    <input
                      type="email"
                      required
                      placeholder="noreply@mindspace.local"
                      value={smtpFrom}
                      onChange={(e) => setSmtpFrom(e.target.value)}
                      className="w-full bg-[#1A1A1A] border border-[#262626] focus:border-[#FF3D00] p-2 text-xs font-mono text-[#FAFAFA] outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-mono uppercase text-[#737373] text-[10px] mb-1">SMTP Username</label>
                  <input
                    type="text"
                    required
                    placeholder="username@gmail.com"
                    value={smtpUser}
                    onChange={(e) => setSmtpUser(e.target.value)}
                    className="w-full bg-[#1A1A1A] border border-[#262626] focus:border-[#FF3D00] p-2 text-xs font-mono text-[#FAFAFA] outline-none"
                  />
                </div>
                <div>
                  <label className="block font-mono uppercase text-[#737373] text-[10px] mb-1">SMTP Password</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••••••"
                    value={smtpPass}
                    onChange={(e) => setSmtpPass(e.target.value)}
                    className="w-full bg-[#1A1A1A] border border-[#262626] focus:border-[#FF3D00] p-2 text-xs font-mono text-[#FAFAFA] outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSmtpLoading}
                className="w-full bg-[#FF3D00] text-[#0A0A0A] font-mono text-xs uppercase font-bold py-2.5 hover:bg-[#FAFAFA] transition-colors flex items-center justify-center gap-2"
              >
                {isSmtpLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save SMTP Configuration'}
              </button>
            </form>
          )}

        </div>

      </div>
    </div>
  );
}
