'use client';

import React from 'react';
import { Calendar, MapPin, Clock, Sparkles } from 'lucide-react';

export interface CalendarEvent {
  id: string;
  date: string; // e.g. "09"
  month: string; // e.g. "SEPT"
  title: string;
  description?: string;
  location?: string;
  time?: string;
}

interface UpcomingEventsSectionProps {
  events?: CalendarEvent[];
}

export function UpcomingEventsSection({ events = [] }: UpcomingEventsSectionProps) {
  const hasEvents = events && events.length > 0;

  return (
    <section className="bg-white p-4.5 rounded-[1.75rem] border border-[#D8C08A]/40 shadow-xs space-y-3.5">
      {/* Section Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#FAF9F5] border border-[#D8C08A]/40 flex items-center justify-center text-[#162850]">
            <Calendar className="w-4 h-4 text-[#B08A4A]" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-[#162850]">Upcoming Events & Activities</h3>
            <p className="text-[11px] text-slate-500">Community Gatherings & Wellness Meets</p>
          </div>
        </div>

        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FAF9F5] text-[#B08A4A] border border-[#D8C08A]/60 uppercase tracking-wider">
          Community
        </span>
      </div>

      {hasEvents ? (
        <div className="space-y-3">
          {events.map((evt) => (
            <div
              key={evt.id}
              className="p-3 bg-[#FAF9F5] rounded-2xl border border-slate-100 flex items-start gap-3.5 hover:border-[#D8C08A]/60 transition-colors"
            >
              {/* Compact Date Block on the Left */}
              <div className="w-14 h-14 rounded-xl bg-[#162850] text-[#D8C08A] border border-[#D8C08A]/30 flex flex-col items-center justify-center shrink-0 shadow-2xs">
                <span className="text-lg font-black font-mono leading-none text-[#FAF9F5]">
                  {evt.date}
                </span>
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#D8C08A] mt-0.5">
                  {evt.month}
                </span>
              </div>

              {/* Event Details on the Right */}
              <div className="flex-1 min-w-0 space-y-1">
                <h4 className="font-bold text-sm text-[#162850] leading-snug">
                  {evt.title}
                </h4>
                {evt.description && (
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {evt.description}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-[11px] text-slate-500">
                  {evt.location && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-[#B08A4A] shrink-0" />
                      <span className="truncate max-w-[180px]">{evt.location}</span>
                    </span>
                  )}
                  {evt.time && (
                    <span className="inline-flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3 text-[#B08A4A] shrink-0" />
                      <span>{evt.time}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Professional, Senior-Friendly Empty State */
        <div className="p-5 bg-[#FAF9F5] rounded-2xl border border-dashed border-[#D8C08A]/60 text-center space-y-2">
          <div className="w-10 h-10 rounded-full bg-white border border-[#D8C08A]/40 flex items-center justify-center mx-auto text-[#B08A4A] shadow-2xs">
            <Calendar className="w-5 h-5 text-[#B08A4A]" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-[#162850]">
              No Upcoming Events Scheduled
            </h4>
            <p className="text-[11px] text-slate-500 max-w-xs mx-auto mt-1 leading-relaxed">
              Outdoor group gatherings, senior wellness meets, and community celebrations organised by Sunshine Eldercare will be announced here.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
