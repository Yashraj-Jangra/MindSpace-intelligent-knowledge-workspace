'use client';

import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, MapPin, AlignLeft, Trash2, ExternalLink, CheckSquare, Bell } from 'lucide-react';
import Link from 'next/link';

interface EventDetailSlideOverProps {
  isOpen: boolean;
  onClose: () => void;
  event: any | null;
  onSaveEvent: (updatedData: any) => Promise<void>;
  onDeleteEvent: (eventId: string) => Promise<void>;
}

export function EventDetailSlideOver({
  isOpen,
  onClose,
  event,
  onSaveEvent,
  onDeleteEvent,
}: EventDetailSlideOverProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [isAllDay, setIsAllDay] = useState(false);
  const [location, setLocation] = useState('');
  const [color, setColor] = useState('#4285F4');
  const [recurrence, setRecurrence] = useState('NONE');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (event) {
      setTitle(event.title || '');
      setDescription(event.description || '');
      setStartAt(event.startAt ? new Date(event.startAt).toISOString().slice(0, 16) : '');
      setEndAt(event.endAt ? new Date(event.endAt).toISOString().slice(0, 16) : '');
      setIsAllDay(event.isAllDay || false);
      setLocation(event.location || '');
      setColor(event.color || '#4285F4');
      setRecurrence(event.recurrence || 'NONE');
    }
  }, [event]);

  if (!isOpen || !event) return null;

  const isCustomEvent = event.sourceType === 'EVENT';

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSaveEvent({
        id: event.id,
        title,
        description,
        startAt: new Date(startAt).toISOString(),
        endAt: endAt ? new Date(endAt).toISOString() : null,
        isAllDay,
        location,
        color,
        recurrence,
      });
      onClose();
    } catch (err) {
      console.error('[EventDetailSlideOver Save Error]:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (confirm(`Delete event "${event.title}"?`)) {
      await onDeleteEvent(event.id);
      onClose();
    }
  };

  const colorSwatches = ['#4285F4', '#FF3D00', '#10B981', '#8B5CF6', '#F59E0B', '#EC4899'];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 flex justify-end">
      <div className="w-full max-w-md bg-[#0A0A0A] border-l border-[#262626] h-full flex flex-col justify-between p-6 animate-in slide-in-from-right duration-200">
        <div>
          {/* Header Bar */}
          <div className="flex items-center justify-between pb-4 border-b border-[#262626] mb-6">
            <div className="flex items-center gap-2">
              {event.sourceType === 'TASK' && <CheckSquare className="w-4 h-4 text-[#10B981]" />}
              {event.sourceType === 'NOTE' && <Bell className="w-4 h-4 text-[#FF3D00]" />}
              {event.sourceType === 'EVENT' && <Calendar className="w-4 h-4 text-[#4285F4]" />}
              <span className="font-mono text-xs uppercase tracking-wider text-[#737373]">
                {event.sourceType} Details
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-[#737373] hover:text-[#FAFAFA] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form / Details Container */}
          {isCustomEvent ? (
            <form id="event-form" onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block font-mono text-[10px] uppercase text-[#737373] tracking-wider mb-1">
                  Title
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-[#1A1A1A] border border-[#262626] focus:border-[#FF3D00] text-sm text-[#FAFAFA] p-2.5 outline-none transition-colors"
                  placeholder="Event title"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-mono text-[10px] uppercase text-[#737373] tracking-wider mb-1">
                    Start Time
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={startAt}
                    onChange={(e) => setStartAt(e.target.value)}
                    className="w-full bg-[#1A1A1A] border border-[#262626] focus:border-[#FF3D00] text-xs text-[#FAFAFA] p-2 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-mono text-[10px] uppercase text-[#737373] tracking-wider mb-1">
                    End Time
                  </label>
                  <input
                    type="datetime-local"
                    value={endAt}
                    onChange={(e) => setEndAt(e.target.value)}
                    className="w-full bg-[#1A1A1A] border border-[#262626] focus:border-[#FF3D00] text-xs text-[#FAFAFA] p-2 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-mono text-[10px] uppercase text-[#737373] tracking-wider mb-1">
                  Location
                </label>
                <div className="flex items-center bg-[#1A1A1A] border border-[#262626] focus-within:border-[#FF3D00] px-2.5 py-2">
                  <MapPin className="w-4 h-4 text-[#737373] mr-2" />
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full bg-transparent text-xs text-[#FAFAFA] outline-none"
                    placeholder="Location or room"
                  />
                </div>
              </div>

              <div>
                <label className="block font-mono text-[10px] uppercase text-[#737373] tracking-wider mb-1">
                  Recurrence
                </label>
                <select
                  value={recurrence}
                  onChange={(e) => setRecurrence(e.target.value)}
                  className="w-full bg-[#1A1A1A] border border-[#262626] focus:border-[#FF3D00] text-xs text-[#FAFAFA] p-2.5 outline-none"
                >
                  <option value="NONE">Does not repeat</option>
                  <option value="DAILY">Daily</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="MONTHLY">Monthly</option>
                  <option value="YEARLY">Yearly</option>
                </select>
              </div>

              <div>
                <label className="block font-mono text-[10px] uppercase text-[#737373] tracking-wider mb-1.5">
                  Color Layer
                </label>
                <div className="flex items-center gap-2">
                  {colorSwatches.map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      onClick={() => setColor(hex)}
                      className={`w-6 h-6 border transition-transform ${
                        color === hex ? 'border-[#FAFAFA] scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: hex }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-mono text-[10px] uppercase text-[#737373] tracking-wider mb-1">
                  Description
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-[#1A1A1A] border border-[#262626] focus:border-[#FF3D00] text-xs text-[#FAFAFA] p-2.5 outline-none resize-none"
                  placeholder="Notes or description..."
                />
              </div>
            </form>
          ) : (
            /* Read-Only / Task / Note Detail View */
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg text-[#FAFAFA] mb-1">{event.title}</h3>
                <p className="font-mono text-xs text-[#737373]">
                  {new Date(event.startAt).toLocaleString()}
                </p>
              </div>

              {event.sourceType === 'TASK' && (
                <div className="p-3 bg-[#0F0F0F] border border-[#262626] space-y-2">
                  <div className="flex items-center justify-between font-mono text-xs">
                    <span className="text-[#737373]">Priority:</span>
                    <span className="text-[#10B981] font-bold">[{event.priority}]</span>
                  </div>
                  <div className="flex items-center justify-between font-mono text-xs">
                    <span className="text-[#737373]">Status:</span>
                    <span className="text-[#FAFAFA]">{event.status}</span>
                  </div>
                  {event.description && (
                    <div className="pt-2 border-t border-[#262626] text-xs text-[#737373]">
                      {event.description}
                    </div>
                  )}
                  <div className="pt-2">
                    <Link
                      href="/tasks"
                      className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-[#FF3D00] hover:underline"
                    >
                      <span>Open Task Board</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              )}

              {event.sourceType === 'NOTE' && (
                <div className="p-3 bg-[#0F0F0F] border border-[#262626] space-y-2">
                  {event.description && (
                    <div className="text-xs text-[#737373] line-clamp-4">
                      {event.description}
                    </div>
                  )}
                  <div className="pt-2">
                    <Link
                      href={`/notes/${event.sourceId}`}
                      className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-[#FF3D00] hover:underline"
                    >
                      <span>Open Note Editor</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Action Buttons */}
        <div className="pt-4 border-t border-[#262626] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleDelete}
            className="flex items-center gap-1.5 px-3 py-2 border border-[#262626] hover:border-[#FF3D00] text-xs font-mono text-[#737373] hover:text-[#FF3D00] transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span>Remove</span>
          </button>

          {isCustomEvent && (
            <button
              type="submit"
              form="event-form"
              disabled={isSaving}
              className="px-5 py-2 bg-[#FF3D00] text-[#0A0A0A] font-mono text-xs font-bold uppercase tracking-wider hover:bg-[#FF5722] transition-colors disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Event'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
