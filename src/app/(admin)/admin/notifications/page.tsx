'use client';

import React, { useState, useEffect } from 'react';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { Bell, CheckCircle2, AlertCircle } from 'lucide-react';

export default function AdminNotificationsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [filterChannel, setFilterChannel] = useState('ALL');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/admin/notifications');
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error('[Admin Notifications Fetch Error]:', err);
    }
  };

  const filteredLogs = logs.filter(
    (l) => filterChannel === 'ALL' || l.channel.toUpperCase() === filterChannel.toUpperCase()
  );

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#FAFAFA] flex flex-col font-sans">
      <AdminHeader />

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#262626]">
          <div>
            <div className="flex items-center gap-2 text-[#10B981] font-mono text-xs uppercase tracking-wider">
              <Bell className="w-4 h-4" />
              <span>Audit Log</span>
            </div>
            <h1 className="font-sans font-black text-2xl tracking-tight uppercase mt-1">
              Notification Dispatch Logs
            </h1>
          </div>

          {/* Filter Channel Selector */}
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="text-[#737373] uppercase">Channel:</span>
            <select
              value={filterChannel}
              onChange={(e) => setFilterChannel(e.target.value)}
              className="bg-[#1A1A1A] border border-[#262626] text-[#FAFAFA] p-1.5 outline-none"
            >
              <option value="ALL">All Channels</option>
              <option value="EMAIL">Email</option>
              <option value="DISCORD">Discord</option>
              <option value="TELEGRAM">Telegram</option>
              <option value="IN_APP">In-App</option>
              <option value="WEBHOOK">Webhook</option>
            </select>
          </div>
        </div>

        {/* Logs Table */}
        <div className="border border-[#262626] bg-[#0F0F0F] overflow-x-auto">
          <table className="w-full text-left font-sans text-xs">
            <thead className="bg-[#141414] border-b border-[#262626] font-mono text-[10px] uppercase tracking-wider text-[#737373]">
              <tr>
                <th className="p-3">Channel</th>
                <th className="p-3">Recipient</th>
                <th className="p-3">Title / Subject</th>
                <th className="p-3">Status</th>
                <th className="p-3">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#262626]">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-[#737373] font-mono text-xs">
                    No notification dispatch logs recorded.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((l) => (
                  <tr key={l.id} className="hover:bg-[#1A1A1A] transition-colors">
                    <td className="p-3">
                      <span className="font-mono text-[9px] uppercase px-2 py-0.5 border border-[#262626] text-[#737373]">
                        {l.channel}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-[#FAFAFA]">{l.target}</td>
                    <td className="p-3 font-semibold text-[#FAFAFA]">{l.title}</td>
                    <td className="p-3">
                      <span
                        className={`font-mono text-[9px] uppercase px-1.5 py-0.5 border ${
                          l.status === 'SENT' || l.status === 'DELIVERED'
                            ? 'border-[#10B981] text-[#10B981] bg-[#10B981]/10'
                            : 'border-[#FF3D00] text-[#FF3D00] bg-[#FF3D00]/10'
                        }`}
                      >
                        {l.status}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-[#737373]">
                      {new Date(l.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
