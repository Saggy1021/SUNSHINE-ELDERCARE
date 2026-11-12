'use client';

import React, { useState } from 'react';
import { ISSUE_CATEGORIES, MOCK_ISSUES } from '@/lib/mock-data';
import { IssueCategory, SupportIssue } from '@/lib/types';
import {
  MessageSquareWarning,
  PlusCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  Send,
  HelpCircle,
} from 'lucide-react';

export function RaiseAnIssueSection() {
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'NEW' | 'TRACK'>('NEW');
  const [selectedCategory, setSelectedCategory] = useState<IssueCategory>('SERVICE_COMPLAINT');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [issuesList, setIssuesList] = useState<SupportIssue[]>(MOCK_ISSUES);
  const [submittedMessage, setSubmittedMessage] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !description) return;

    const newTicket: SupportIssue = {
      id: `issue_${Date.now()}`,
      ticketNumber: `SEC-TKT-2026-${Math.floor(100 + Math.random() * 900)}`,
      category: selectedCategory,
      categoryLabel: ISSUE_CATEGORIES.find((c) => c.id === selectedCategory)?.label || 'General Query',
      subject,
      description,
      status: 'OPEN',
      createdAt: new Date().toISOString(),
    };

    setIssuesList([newTicket, ...issuesList]);
    setSubmittedMessage(`Your issue has been logged with reference #${newTicket.ticketNumber}. Our Member Support Officer will contact you within 4 hours.`);
    setSubject('');
    setDescription('');
    setActiveTab('TRACK');
  };

  return (
    <>
      <section className="bg-white rounded-[1.75rem] border border-[#D8C08A]/40 p-4.5 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#FAF9F5] border border-[#D8C08A]/40 flex items-center justify-center text-[#162850]">
              <MessageSquareWarning className="w-4 h-4 text-[#B08A4A]" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#162850]">Raise an Issue or Complaint</h3>
              <p className="text-[11px] text-slate-500">Dedicated Care Redressal & Support</p>
            </div>
          </div>

          <button
            onClick={() => {
              setModalOpen(true);
              setSubmittedMessage(null);
            }}
            className="px-3 py-1.5 bg-[#162850] hover:bg-[#0F2347] text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-2xs active:scale-95 transition-transform"
          >
            <PlusCircle className="w-3.5 h-3.5 text-[#D8C08A]" />
            <span>New Issue</span>
          </button>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          Encountering an issue with our care staff, scheduled visit, or invoice? Submit a ticket below for priority resolution by the Sunshine Care Operations Desk.
        </p>

        {/* Quick category triggers - Responsive, non-clipping senior-friendly cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          {ISSUE_CATEGORIES.slice(0, 4).map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setSelectedCategory(cat.id);
                setModalOpen(true);
                setSubmittedMessage(null);
              }}
              className="p-3 bg-[#FAF9F5] hover:bg-[#F2EFE8] border border-[#D8C08A]/50 rounded-xl min-h-[50px] h-auto flex items-center gap-2.5 text-left transition-all active:scale-[0.98] group"
            >
              <span className="w-2 h-2 rounded-full bg-[#B08A4A] shrink-0 group-hover:scale-125 transition-transform" />
              <span className="text-xs font-semibold text-[#162850] leading-snug break-words whitespace-normal flex-1">
                {cat.label}
              </span>
            </button>
          ))}
        </div>

        {/* Active Ticket Status Snippet */}
        {issuesList.length > 0 && (
          <div
            onClick={() => {
              setActiveTab('TRACK');
              setModalOpen(true);
            }}
            className="p-2.5 bg-amber-50/70 border border-amber-200/60 rounded-xl flex items-center justify-between text-xs cursor-pointer hover:bg-amber-100/60"
          >
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-[#B08A4A]" />
              <span className="font-bold text-amber-950">Active Ticket #{issuesList[0].ticketNumber}:</span>
              <span className="text-amber-900 truncate max-w-[140px]">{issuesList[0].subject}</span>
            </div>
            <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider bg-white px-2 py-0.5 rounded-full border border-amber-300">
              {issuesList[0].status}
            </span>
          </div>
        )}
      </section>

      {/* Raise Issue Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#091329]/80 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-[#FAF9F5] rounded-t-3xl sm:rounded-3xl p-5 max-h-[90vh] overflow-y-auto shadow-2xl border-t sm:border border-[#D8C08A]/50">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#D8C08A]/40 mb-3">
              <div className="flex items-center gap-2 text-[#162850]">
                <MessageSquareWarning className="w-5 h-5 text-[#B08A4A]" />
                <h3 className="font-bold text-base">Member Redressal Desk</h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tab switch (New Issue vs Track Existing) */}
            <div className="flex p-1 bg-slate-200/80 rounded-xl mb-4 text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveTab('NEW')}
                className={`flex-1 py-2 rounded-lg transition-colors ${
                  activeTab === 'NEW' ? 'bg-white text-[#162850] shadow-xs' : 'text-slate-500'
                }`}
              >
                Submit New Issue
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('TRACK')}
                className={`flex-1 py-2 rounded-lg transition-colors ${
                  activeTab === 'TRACK' ? 'bg-white text-[#162850] shadow-xs' : 'text-slate-500'
                }`}
              >
                Track Tickets ({issuesList.length})
              </button>
            </div>

            {submittedMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs mb-4 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{submittedMessage}</span>
              </div>
            )}

            {activeTab === 'NEW' ? (
              <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
                {/* Category Selector */}
                <div>
                  <label className="block font-bold text-[#162850] mb-1 uppercase tracking-wider text-[10px]">
                    Select Category
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value as IssueCategory)}
                    className="w-full p-3 bg-white border border-[#D8C08A]/60 rounded-xl text-xs font-semibold text-[#162850] focus:outline-none focus:border-[#B08A4A]"
                  >
                    {ISSUE_CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Subject */}
                <div>
                  <label className="block font-bold text-[#162850] mb-1 uppercase tracking-wider text-[10px]">
                    Subject / Concern Title
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Briefly state the issue..."
                    required
                    className="w-full p-3 bg-white border border-[#D8C08A]/60 rounded-xl text-xs text-[#162850] focus:outline-none focus:border-[#B08A4A]"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block font-bold text-[#162850] mb-1 uppercase tracking-wider text-[10px]">
                    Description & Observations
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Provide details so our Care Officer can assist..."
                    rows={4}
                    required
                    className="w-full p-3 bg-white border border-[#D8C08A]/60 rounded-xl text-xs text-[#162850] focus:outline-none focus:border-[#B08A4A]"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 bg-[#162850] hover:bg-[#0F2347] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-transform active:scale-[0.99]"
                >
                  <Send className="w-3.5 h-3.5 text-[#D8C08A]" />
                  <span>Submit Ticket for Review</span>
                </button>
              </form>
            ) : (
              <div className="space-y-3">
                {issuesList.map((ticket) => (
                  <div key={ticket.id} className="p-3.5 bg-white rounded-xl border border-slate-200 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-[#162850]">#{ticket.ticketNumber}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200 uppercase">
                        {ticket.status}
                      </span>
                    </div>
                    <p className="font-bold text-slate-900">{ticket.subject}</p>
                    <p className="text-slate-500 text-[11px] leading-relaxed">{ticket.description}</p>
                    <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                      <span>Category: {ticket.categoryLabel}</span>
                      <span>Logged: {new Date(ticket.createdAt).toLocaleDateString('en-IN')}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

