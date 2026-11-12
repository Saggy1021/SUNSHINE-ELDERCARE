'use client';

import React, { useState } from 'react';
import { MOCK_COMMUNITY_EVENTS } from '@/lib/mock-data';
import { CommunityEvent } from '@/lib/types';
import { Calendar, Clock, MapPin, ChevronRight, X, Sparkles } from 'lucide-react';

export function EventsCalendarSection() {
  const [showAllModal, setShowAllModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CommunityEvent | null>(null);

  const displayedEvents = MOCK_COMMUNITY_EVENTS.slice(0, 2);

  return (
    <section className="space-y-3">
      {/* Section Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[#B08A4A]" />
          <h3 className="font-bold text-sm text-[#162850] uppercase tracking-wider">
            Events & Wellness Calendar
          </h3>
        </div>
        <button
          onClick={() => setShowAllModal(true)}
          className="text-xs font-bold text-[#B08A4A] hover:text-[#9B773D] flex items-center gap-0.5"
        >
          <span>View All</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Event Cards */}
      <div className="space-y-2.5">
        {displayedEvents.map((event) => (
          <div
            key={event.id}
            onClick={() => setSelectedEvent(event)}
            className="p-3.5 bg-white rounded-2xl border border-[#D8C08A]/40 shadow-xs flex items-start gap-3.5 hover:border-[#B08A4A] active:scale-[0.99] transition-all cursor-pointer"
          >
            {/* Date Badge */}
            <div className="w-13 h-14 rounded-xl bg-[#162850] text-white flex flex-col items-center justify-center shrink-0 border border-[#B08A4A]/50 shadow-xs">
              <span className="text-base font-black text-[#D8C08A] leading-tight">
                {event.dateBadge.split(' ')[0]}
              </span>
              <span className="text-[10px] font-bold tracking-wider uppercase text-slate-200">
                {event.dateBadge.split(' ')[1]}
              </span>
            </div>

            {/* Event Details */}
            <div className="flex-1 min-w-0">
              <span className="text-[10px] uppercase font-bold text-[#B08A4A] tracking-wider">
                {event.category}
              </span>
              <h4 className="font-bold text-sm text-[#162850] truncate leading-snug">
                {event.title}
              </h4>
              <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                {event.description}
              </p>
              <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-[#B08A4A]" />
                  {event.time.split('–')[0].trim()}
                </span>
                <span className="flex items-center gap-1 truncate">
                  <MapPin className="w-3 h-3 text-[#B08A4A]" />
                  {event.location.split(' ')[0]}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal: View All Events or Event Details */}
      {(showAllModal || selectedEvent) && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#091329]/80 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-[#FAF9F5] rounded-t-3xl sm:rounded-3xl p-5 max-h-[85vh] overflow-y-auto shadow-2xl border-t sm:border border-[#D8C08A]/50">
            <div className="flex items-center justify-between pb-3 border-b border-[#D8C08A]/40 mb-4">
              <div className="flex items-center gap-2 text-[#162850]">
                <Calendar className="w-5 h-5 text-[#B08A4A]" />
                <h3 className="font-bold text-base">
                  {selectedEvent ? 'Event Details' : 'Community Events Schedule'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowAllModal(false);
                  setSelectedEvent(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedEvent ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl bg-[#162850] text-[#D8C08A] flex flex-col items-center justify-center font-bold">
                    <span className="text-lg leading-tight">{selectedEvent.dateBadge.split(' ')[0]}</span>
                    <span className="text-[10px] uppercase text-white">{selectedEvent.dateBadge.split(' ')[1]}</span>
                  </div>
                  <div>
                    <span className="text-xs uppercase font-bold text-[#B08A4A]">{selectedEvent.category}</span>
                    <h4 className="font-bold text-base text-[#162850]">{selectedEvent.title}</h4>
                  </div>
                </div>

                <div className="p-3.5 bg-white rounded-xl border border-[#D8C08A]/40 space-y-2 text-xs text-slate-700">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#B08A4A]" />
                    <span><strong>Time:</strong> {selectedEvent.time}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#B08A4A]" />
                    <span><strong>Location:</strong> {selectedEvent.location}</span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed bg-white p-3.5 rounded-xl border border-slate-200">
                  {selectedEvent.description}
                </p>

                <button
                  onClick={() => {
                    alert(`RSVP Confirmed for "${selectedEvent.title}"! Our care coordinator will send details.`);
                    setSelectedEvent(null);
                  }}
                  className="w-full py-3 bg-[#162850] text-white rounded-xl text-xs font-bold hover:bg-[#0F2347] transition-colors"
                >
                  Confirm Free Member Attendance
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {MOCK_COMMUNITY_EVENTS.map((event) => (
                  <div
                    key={event.id}
                    onClick={() => setSelectedEvent(event)}
                    className="p-3 bg-white rounded-xl border border-[#D8C08A]/40 flex items-start gap-3 cursor-pointer hover:border-[#B08A4A]"
                  >
                    <div className="w-12 h-12 rounded-lg bg-[#162850] text-white flex flex-col items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-[#D8C08A]">{event.dateBadge.split(' ')[0]}</span>
                      <span className="text-[9px] uppercase">{event.dateBadge.split(' ')[1]}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-xs text-[#162850] truncate">{event.title}</h4>
                      <p className="text-[11px] text-slate-500 line-clamp-1">{event.time} • {event.location}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

