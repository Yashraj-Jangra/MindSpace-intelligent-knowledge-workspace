'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  ArrowLeft,
  CheckSquare,
  Bell,
  RefreshCw,
} from 'lucide-react';
import { CalendarEventCard } from '@/components/calendar/CalendarEventCard';
import { AppHeader } from '@/components/navigation/AppHeader';
import { EventDetailSlideOver } from '@/components/calendar/EventDetailSlideOver';
import { useSocket } from '@/hooks/useSocket';

type ViewMode = 'month' | 'week' | 'day';

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [isSlideOverOpen, setIsSlideOverOpen] = useState(false);

  // Compute month range for fetching
  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      
      const from = new Date(year, month - 1, 1).toISOString();
      const to = new Date(year, month + 2, 0).toISOString();

      const res = await fetch(`/api/calendar/events?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
      if (res.ok) {
        const data = await res.json();
        setEvents(data.events || []);
      }
    } catch (err) {
      console.error('[Calendar fetch error]:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentDate]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Real-time socket sync
  useSocket('calendar:updated', () => fetchEvents());
  useSocket('calendar:deleted', () => fetchEvents());
  useSocket('task:updated', () => fetchEvents());
  useSocket('task:done', () => fetchEvents());

  // Navigation handlers
  const handlePrev = () => {
    const next = new Date(currentDate);
    if (viewMode === 'month') next.setMonth(next.getMonth() - 1);
    else if (viewMode === 'week') next.setDate(next.getDate() - 7);
    else next.setDate(next.getDate() - 1);
    setCurrentDate(next);
  };

  const handleNext = () => {
    const next = new Date(currentDate);
    if (viewMode === 'month') next.setMonth(next.getMonth() + 1);
    else if (viewMode === 'week') next.setDate(next.getDate() + 7);
    else next.setDate(next.getDate() + 1);
    setCurrentDate(next);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Drag & Drop Reschedule Handler
  const handleDrop = async (e: React.DragEvent, targetDate: Date) => {
    e.preventDefault();
    try {
      const rawData = e.dataTransfer.getData('text/plain');
      if (!rawData) return;
      const { id, startAt: originalStartAt } = JSON.parse(rawData);

      // Preserve original time of day
      const origDate = new Date(originalStartAt);
      const newStart = new Date(targetDate);
      newStart.setHours(origDate.getHours(), origDate.getMinutes(), origDate.getSeconds());

      // Optimistic UI Update
      setEvents((prev) =>
        prev.map((ev) => (ev.id === id ? { ...ev, startAt: newStart.toISOString() } : ev))
      );

      // Execute PATCH API
      const res = await fetch(`/api/calendar/events/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startAt: newStart.toISOString() }),
      });

      if (!res.ok) {
        fetchEvents(); // rollback if failed
      }
    } catch (err) {
      console.error('[Drag Drop Error]:', err);
      fetchEvents();
    }
  };

  // Create Custom Event
  const handleCreateNewEvent = (targetDate?: Date) => {
    const start = targetDate || new Date();
    const end = new Date(start.getTime() + 60 * 60 * 1000);

    setSelectedEvent({
      sourceType: 'EVENT',
      title: '',
      description: '',
      startAt: start.toISOString(),
      endAt: end.toISOString(),
      color: '#4285F4',
      recurrence: 'NONE',
    });
    setIsSlideOverOpen(true);
  };

  const handleSaveEvent = async (updatedData: any) => {
    if (updatedData.id && !updatedData.id.startsWith('ev_')) {
      // Patch existing
      await fetch(`/api/calendar/events/${updatedData.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData),
      });
    } else {
      // Create new
      await fetch('/api/calendar/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData),
      });
    }
    fetchEvents();
  };

  const handleDeleteEvent = async (eventId: string) => {
    await fetch(`/api/calendar/events/${eventId}`, {
      method: 'DELETE',
    });
    fetchEvents();
  };

  // Generate Month Grid Days
  const generateMonthDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    // Monday-aligned (0 = Monday, 6 = Sunday)
    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const days: Date[] = [];

    // Days from previous month
    for (let i = startDayOfWeek; i > 0; i--) {
      days.push(new Date(year, month, 1 - i));
    }

    // Days of current month
    for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
      days.push(new Date(year, month, i));
    }

    // Days for next month to complete grid (multiples of 7)
    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
      for (let i = 1; i <= remaining; i++) {
        days.push(new Date(year, month + 1, i));
      }
    }

    return days;
  };

  const monthDays = generateMonthDays();
  const todayStr = new Date().toDateString();

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#FAFAFA] flex flex-col font-sans">
      <AppHeader
        title="Calendar Workspace"
        actions={
          <button
            onClick={() => handleCreateNewEvent()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FF3D00] text-[#0A0A0A] font-mono text-xs font-bold uppercase tracking-wider hover:bg-[#FF5722] transition-colors"
          >
            <Plus className="w-4 h-4 stroke-[2]" />
            <span className="hidden sm:inline">New Event</span>
          </button>
        }
      />

      {/* Control Bar: Month Navigation + View Switcher */}
      <div className="bg-[#0F0F0F] border-b border-[#262626] px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="font-semibold text-lg sm:text-xl tracking-tight text-[#FAFAFA]">
            {currentDate.toLocaleDateString([], { month: 'long', year: 'numeric' })}
          </h2>

          <div className="flex items-center border border-[#262626] bg-[#1A1A1A]">
            <button
              onClick={handlePrev}
              className="p-1.5 text-[#737373] hover:text-[#FAFAFA] hover:bg-[#262626] transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleToday}
              className="px-3 py-1 font-mono text-xs text-[#FAFAFA] hover:bg-[#262626] border-x border-[#262626] transition-colors"
            >
              Today
            </button>
            <button
              onClick={handleNext}
              className="p-1.5 text-[#737373] hover:text-[#FAFAFA] hover:bg-[#262626] transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Color Layer Legend */}
        <div className="hidden lg:flex items-center gap-4 font-mono text-[10px] uppercase tracking-wider text-[#737373]">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-[#4285F4]" />
            <span>Personal</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-[#10B981]" />
            <span>Tasks</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-[#FF3D00]" />
            <span>Reminders</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-[#8B5CF6]" />
            <span>Recurring</span>
          </div>
        </div>

        {/* View Mode Selector */}
        <div className="flex items-center border border-[#262626] bg-[#1A1A1A] p-0.5 font-mono text-xs">
          {(['month', 'week', 'day'] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1 uppercase tracking-wider transition-colors ${
                viewMode === mode
                  ? 'bg-[#FF3D00] text-[#0A0A0A] font-bold'
                  : 'text-[#737373] hover:text-[#FAFAFA]'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Main Calendar View Area */}
      <main className="flex-1 p-4 overflow-auto">
        {viewMode === 'month' && (
          <div className="h-full flex flex-col border border-[#262626] bg-[#0F0F0F]">
            {/* Weekday Header Row */}
            <div className="grid grid-cols-7 border-b border-[#262626] bg-[#141414] font-mono text-[11px] uppercase tracking-wider text-[#737373] text-center py-2.5">
              <div>Mon</div>
              <div>Tue</div>
              <div>Wed</div>
              <div>Thu</div>
              <div>Fri</div>
              <div>Sat</div>
              <div>Sun</div>
            </div>

            {/* Month Day Grid */}
            <div className="grid grid-cols-7 auto-rows-fr flex-1 bg-[#262626] gap-px">
              {monthDays.map((date, idx) => {
                const isCurrentMonth = date.getMonth() === currentDate.getMonth();
                const isToday = date.toDateString() === todayStr;

                // Match events for this date
                const dayEvents = events.filter((ev) => {
                  const evDate = new Date(ev.startAt);
                  return evDate.toDateString() === date.toDateString();
                });

                return (
                  <div
                    key={idx}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDrop(e, date)}
                    className={`min-h-[110px] p-2 flex flex-col justify-between group transition-colors ${
                      isCurrentMonth ? 'bg-[#0A0A0A]' : 'bg-[#0F0F0F]/60 text-[#404040]'
                    } ${isToday ? 'ring-1 ring-inset ring-[#FF3D00]' : ''}`}
                  >
                    {/* Day Number Header */}
                    <div className="flex items-center justify-between mb-1.5">
                      <span
                        className={`font-mono text-xs font-bold ${
                          isToday
                            ? 'text-[#FF3D00]'
                            : isCurrentMonth
                            ? 'text-[#FAFAFA]'
                            : 'text-[#525252]'
                        }`}
                      >
                        {date.getDate()}
                      </span>

                      <button
                        onClick={() => handleCreateNewEvent(date)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 text-[#737373] hover:text-[#FF3D00] transition-opacity"
                        title="Add event"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Event Cards List */}
                    <div className="flex-1 overflow-y-auto no-scrollbar space-y-1">
                      {dayEvents.map((ev) => (
                        <CalendarEventCard
                          key={ev.id}
                          event={ev}
                          onClick={() => {
                            setSelectedEvent(ev);
                            setIsSlideOverOpen(true);
                          }}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {viewMode === 'week' && (
          <div className="p-8 text-center text-[#737373] font-mono text-sm border border-[#262626] bg-[#0F0F0F]">
            📅 Week View — Filtered for 7 days ending{' '}
            {new Date(currentDate.getTime() + 6 * 86400000).toLocaleDateString()}
            <div className="mt-4 grid grid-cols-7 gap-2">
              {Array.from({ length: 7 }).map((_, i) => {
                const day = new Date(currentDate);
                day.setDate(day.getDate() + i);
                const dayEvs = events.filter(
                  (ev) => new Date(ev.startAt).toDateString() === day.toDateString()
                );
                return (
                  <div
                    key={i}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDrop(e, day)}
                    className="p-3 bg-[#0A0A0A] border border-[#262626] min-h-[300px] text-left"
                  >
                    <div className="font-mono text-xs text-[#FF3D00] font-bold mb-2">
                      {day.toLocaleDateString([], { weekday: 'short', day: 'numeric' })}
                    </div>
                    {dayEvs.map((ev) => (
                      <CalendarEventCard
                        key={ev.id}
                        event={ev}
                        onClick={() => {
                          setSelectedEvent(ev);
                          setIsSlideOverOpen(true);
                        }}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {viewMode === 'day' && (
          <div className="p-6 border border-[#262626] bg-[#0F0F0F] max-w-2xl mx-auto">
            <div className="font-mono text-sm text-[#FF3D00] font-bold mb-4">
              📅 Agenda for {currentDate.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
            <div className="space-y-2">
              {events
                .filter((ev) => new Date(ev.startAt).toDateString() === currentDate.toDateString())
                .map((ev) => (
                  <CalendarEventCard
                    key={ev.id}
                    event={ev}
                    onClick={() => {
                      setSelectedEvent(ev);
                      setIsSlideOverOpen(true);
                    }}
                  />
                ))}
            </div>
          </div>
        )}
      </main>

      {/* Detail & Editor Slide-Over Drawer */}
      <EventDetailSlideOver
        isOpen={isSlideOverOpen}
        onClose={() => setIsSlideOverOpen(false)}
        event={selectedEvent}
        onSaveEvent={handleSaveEvent}
        onDeleteEvent={handleDeleteEvent}
      />
    </div>
  );
}
