'use client';

import React, { useState, useEffect } from 'react';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { Layers, RefreshCw, Server } from 'lucide-react';

export default function AdminQueuesPage() {
  const [queues, setQueues] = useState<any[]>([]);
  const [redisStatus, setRedisStatus] = useState('CHECKING...');

  useEffect(() => {
    fetchQueues();
  }, []);

  const fetchQueues = async () => {
    try {
      const res = await fetch('/api/admin/queues');
      if (res.ok) {
        const data = await res.json();
        setQueues(data.queues || []);
        setRedisStatus(data.redisStatus || 'HEALTHY');
      }
    } catch (err) {
      console.error('[Admin Queues Fetch Error]:', err);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#FAFAFA] flex flex-col font-sans">
      <AdminHeader />

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-[#262626]">
          <div>
            <div className="flex items-center gap-2 text-[#8B5CF6] font-mono text-xs uppercase tracking-wider">
              <Layers className="w-4 h-4" />
              <span>BullMQ Queue Engine</span>
            </div>
            <h1 className="font-sans font-black text-2xl tracking-tight uppercase mt-1">
              Background Job Queue Monitor
            </h1>
          </div>

          <button
            onClick={fetchQueues}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-[#262626] hover:border-[#8B5CF6] font-mono text-xs text-[#737373] hover:text-[#8B5CF6] transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>

        {/* Redis Status Card */}
        <div className="p-4 bg-[#0F0F0F] border border-[#262626] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Server className="w-5 h-5 text-[#8B5CF6]" />
            <div>
              <div className="font-mono text-xs text-[#737373] uppercase">Redis / Valkey Broker Status</div>
              <div className="font-bold text-sm text-[#FAFAFA]">localhost:6379</div>
            </div>
          </div>
          <span className="font-mono text-xs uppercase px-2 py-0.5 border border-[#10B981] text-[#10B981] bg-[#10B981]/10 font-bold">
            {redisStatus}
          </span>
        </div>

        {/* Queues Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {queues.map((q) => (
            <div key={q.name} className="p-5 bg-[#0F0F0F] border border-[#262626] space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs uppercase tracking-wider text-[#8B5CF6] font-bold">
                  Queue: {q.name}
                </span>
                <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 border border-[#262626] text-[#737373]">
                  {q.status}
                </span>
              </div>

              <p className="text-xs text-[#737373] leading-relaxed min-h-[40px]">
                {q.description}
              </p>

              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[#262626] text-center font-mono">
                <div className="p-2 bg-[#141414]">
                  <div className="text-[10px] text-[#737373] uppercase">Active</div>
                  <div className="font-bold text-sm text-[#FAFAFA]">{q.active}</div>
                </div>
                <div className="p-2 bg-[#141414]">
                  <div className="text-[10px] text-[#737373] uppercase">Completed</div>
                  <div className="font-bold text-sm text-[#10B981]">{q.completed}</div>
                </div>
                <div className="p-2 bg-[#141414]">
                  <div className="text-[10px] text-[#737373] uppercase">Failed</div>
                  <div className="font-bold text-sm text-[#FF3D00]">{q.failed}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
