"use client";

import React, { useState, useEffect } from "react";
import {
  CalendarDays,
  PlusCircle,
  MapPin,
  Clock,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  Eye,
  Loader2,
  AlertCircle,
  Users,
  Search,
  Filter,
} from "lucide-react";

interface CommunityEventItem {
  id: string;
  title: string;
  description: string;
  eventDate: string;
  startTime: string;
  endTime: string | null;
  venue: string;
  imageUrl: string | null;
  visibleToAll: boolean;
  status: "DRAFT" | "PUBLISHED" | "CANCELLED";
  createdAt: string;
  updatedAt: string;
}

export default function AdminEventsPage() {
  const [events, setEvents] = useState<CommunityEventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CommunityEventItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    eventDate: new Date().toISOString().split("T")[0],
    startTime: "10:00 AM",
    endTime: "01:00 PM",
    venue: "",
    imageUrl: "",
    visibleToAll: true,
    status: "PUBLISHED" as "DRAFT" | "PUBLISHED" | "CANCELLED",
  });

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/events?status=${statusFilter}`);
      const data = await res.json();
      if (res.ok && data.events) {
        setEvents(data.events);
      }
    } catch (e) {
      console.error("Failed to load events", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [statusFilter]);

  const openCreateModal = () => {
    setEditingEvent(null);
    setFormData({
      title: "",
      description: "",
      eventDate: new Date().toISOString().split("T")[0],
      startTime: "10:00 AM",
      endTime: "01:00 PM",
      venue: "",
      imageUrl: "",
      visibleToAll: true,
      status: "PUBLISHED",
    });
    setIsModalOpen(true);
  };

  const openEditModal = (ev: CommunityEventItem) => {
    setEditingEvent(ev);
    setFormData({
      title: ev.title,
      description: ev.description,
      eventDate: ev.eventDate ? ev.eventDate.split("T")[0] : "",
      startTime: ev.startTime,
      endTime: ev.endTime || "",
      venue: ev.venue,
      imageUrl: ev.imageUrl || "",
      visibleToAll: ev.visibleToAll,
      status: ev.status,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.venue.trim() || !formData.description.trim()) {
      alert("Please fill in Title, Description, Date, Time, and Venue.");
      return;
    }

    setSaving(true);
    try {
      const url = editingEvent ? `/api/admin/events/${editingEvent.id}` : `/api/admin/events`;
      const method = editingEvent ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (res.ok) {
        setIsModalOpen(false);
        fetchEvents();
      } else {
        alert(data.error || "Failed to save event");
      }
    } catch (err: any) {
      alert("Network error saving event: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleCancel = async (ev: CommunityEventItem) => {
    const newStatus = ev.status === "CANCELLED" ? "PUBLISHED" : "CANCELLED";
    if (
      !confirm(
        `Are you sure you want to ${
          newStatus === "CANCELLED" ? "cancel this event" : "re-publish this event"
        }?`
      )
    )
      return;

    try {
      const res = await fetch(`/api/admin/events/${ev.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchEvents();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this event?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/events/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchEvents();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setDeletingId(null);
    }
  };

  const filteredEvents = events.filter((ev) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      ev.title.toLowerCase().includes(q) ||
      ev.venue.toLowerCase().includes(q) ||
      ev.description.toLowerCase().includes(q)
    );
  });

  // Helper date formatter
  const formatEventDate = (dStr: string) => {
    try {
      const d = new Date(dStr);
      const day = d.getDate().toString().padStart(2, "0");
      const month = d.toLocaleString("en-US", { month: "short" }).toUpperCase();
      const year = d.getFullYear();
      return { day, month, year, full: d.toLocaleDateString("en-IN", { dateStyle: "medium" }) };
    } catch {
      return { day: "01", month: "JAN", year: 2026, full: dStr };
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/40">
        <div>
          <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <span>Admin</span>
            <span>/</span>
            <span className="text-[#091329] dark:text-amber-300 font-medium">Community Events</span>
          </nav>
          <h1 className="text-2xl font-bold tracking-tight text-[#091329] dark:text-white flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-[#B08A4A]" />
            Member Events & Activities
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Create, schedule and publish community gatherings, webinars, and wellness meetups for Sunshine Eldercare members.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#091329] hover:bg-[#162850] text-white text-sm font-semibold shadow-sm transition-all"
        >
          <PlusCircle className="w-4 h-4 text-[#B08A4A]" />
          Create New Event
        </button>
      </div>

      {/* Control Bar: Filters & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card border border-border/60 rounded-xl p-3 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search events by title or venue..."
            className="w-full pl-9 pr-4 py-1.5 text-sm rounded-lg border border-border/80 bg-background focus:outline-none focus:ring-2 focus:ring-[#B08A4A]/50"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          <Filter className="w-4 h-4 text-muted-foreground hidden sm:block" />
          {["ALL", "PUBLISHED", "DRAFT", "CANCELLED"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                statusFilter === st
                  ? "bg-[#091329] text-white"
                  : "bg-muted/40 hover:bg-muted text-muted-foreground"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Events Grid */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[#B08A4A]" />
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="text-center py-16 bg-card border border-border/60 rounded-2xl p-8">
          <CalendarDays className="w-12 h-12 text-[#B08A4A] mx-auto opacity-40 mb-3" />
          <h3 className="text-base font-bold text-[#091329] dark:text-white">No Events Found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
            {searchQuery
              ? "No events matched your search term."
              : "No community events have been created yet. Click below to publish your first member gathering."}
          </p>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-[#091329] text-white"
          >
            <PlusCircle className="w-4 h-4 text-[#B08A4A]" />
            Create First Event
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredEvents.map((ev) => {
            const { day, month, year } = formatEventDate(ev.eventDate);
            const isCancelled = ev.status === "CANCELLED";
            const isDraft = ev.status === "DRAFT";

            return (
              <div
                key={ev.id}
                className={`bg-card rounded-2xl border transition-all shadow-sm overflow-hidden flex flex-col justify-between ${
                  isCancelled
                    ? "border-red-200/60 opacity-70 bg-red-50/20"
                    : isDraft
                    ? "border-amber-200/60"
                    : "border-border/60 hover:border-[#B08A4A]/50"
                }`}
              >
                <div className="p-5 space-y-4">
                  {/* Top Row: Date Pill & Status Badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-[#091329] text-white shadow-sm">
                        <span className="text-base font-black leading-none">{day}</span>
                        <span className="text-[10px] font-bold text-[#B08A4A] tracking-wider">
                          {month}
                        </span>
                      </div>
                      <div>
                        <span className="text-[11px] font-semibold text-muted-foreground">
                          {year}
                        </span>
                        <div className="flex items-center gap-1 text-xs text-slate-700 font-medium">
                          <Clock className="w-3.5 h-3.5 text-[#B08A4A]" />
                          <span>
                            {ev.startTime} {ev.endTime ? `– ${ev.endTime}` : ""}
                          </span>
                        </div>
                      </div>
                    </div>

                    <span
                      className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider ${
                        ev.status === "PUBLISHED"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : ev.status === "DRAFT"
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : "bg-red-50 text-red-700 border border-red-200"
                      }`}
                    >
                      {ev.status}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="text-base font-bold text-[#091329] dark:text-white line-clamp-1">
                      {ev.title}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
                      {ev.description}
                    </p>
                  </div>

                  {/* Venue & Visibility */}
                  <div className="space-y-1.5 pt-2 border-t border-border/40 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-[#B08A4A] shrink-0" />
                      <span className="truncate">{ev.venue}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
                      <Users className="w-3.5 h-3.5 shrink-0" />
                      <span>{ev.visibleToAll ? "All Active Members" : "Private / Restricted"}</span>
                    </div>
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="p-3 bg-muted/20 border-t border-border/40 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => openEditModal(ev)}
                      className="p-1.5 rounded-lg border border-border/60 hover:bg-muted text-slate-600 transition-colors"
                      title="Edit Event"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(ev.id)}
                      disabled={deletingId === ev.id}
                      className="p-1.5 rounded-lg border border-border/60 hover:bg-red-50 text-red-600 transition-colors"
                      title="Delete Event"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    onClick={() => handleToggleCancel(ev)}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-colors ${
                      isCancelled
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                        : "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                    }`}
                  >
                    {isCancelled ? "Re-publish" : "Cancel Event"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT MODAL WITH LIVE PREVIEW */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-card border border-border/80 rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden my-8">
            <div className="p-5 border-b border-border/60 flex items-center justify-between bg-muted/10">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-[#091329] text-white">
                  <CalendarDays className="w-5 h-5 text-[#B08A4A]" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#091329] dark:text-white">
                    {editingEvent ? "Edit Community Event" : "Create Community Event"}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Define event details and preview how seniors will see it in the Sunshine Member App.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Form Fields Column */}
                <div className="lg:col-span-7 space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Event Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g. Senior Wellness & Health Checkup"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-border/80 bg-background focus:outline-none focus:ring-2 focus:ring-[#B08A4A]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Description <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Comprehensive geriatric vitals and social meetup for our members..."
                      className="w-full px-3 py-2 text-sm rounded-lg border border-border/80 bg-background focus:outline-none focus:ring-2 focus:ring-[#B08A4A]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={formData.eventDate}
                        onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-border/80 bg-background focus:outline-none focus:ring-2 focus:ring-[#B08A4A]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Start Time <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.startTime}
                        onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                        placeholder="10:00 AM"
                        className="w-full px-3 py-2 text-sm rounded-lg border border-border/80 bg-background focus:outline-none focus:ring-2 focus:ring-[#B08A4A]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">End Time</label>
                      <input
                        type="text"
                        value={formData.endTime}
                        onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                        placeholder="01:00 PM"
                        className="w-full px-3 py-2 text-sm rounded-lg border border-border/80 bg-background focus:outline-none focus:ring-2 focus:ring-[#B08A4A]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Venue / Online Meeting Link <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.venue}
                      onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                      placeholder="e.g. Salt Lake Community Centre / Home Visit"
                      className="w-full px-3 py-2 text-sm rounded-lg border border-border/80 bg-background focus:outline-none focus:ring-2 focus:ring-[#B08A4A]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Publish Status
                      </label>
                      <select
                        value={formData.status}
                        onChange={(e) =>
                          setFormData({ ...formData, status: e.target.value as any })
                        }
                        className="w-full px-3 py-2 text-sm rounded-lg border border-border/80 bg-background focus:outline-none focus:ring-2 focus:ring-[#B08A4A]"
                      >
                        <option value="PUBLISHED">Published (Visible to Seniors)</option>
                        <option value="DRAFT">Draft (Admin Only)</option>
                        <option value="CANCELLED">Cancelled</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2 pt-6">
                      <input
                        type="checkbox"
                        id="visibleToAll"
                        checked={formData.visibleToAll}
                        onChange={(e) =>
                          setFormData({ ...formData, visibleToAll: e.target.checked })
                        }
                        className="w-4 h-4 text-[#B08A4A] rounded border-border"
                      />
                      <label htmlFor="visibleToAll" className="text-xs font-semibold text-slate-700">
                        Visible to all active members (Default)
                      </label>
                    </div>
                  </div>
                </div>

                {/* Live Member App Preview Column */}
                <div className="lg:col-span-5 bg-slate-50 dark:bg-slate-900/50 p-5 rounded-2xl border border-border/60 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 pb-3 mb-4 border-b border-border/40">
                      <Eye className="w-4 h-4 text-[#B08A4A]" />
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                        Member App Live Preview
                      </span>
                    </div>

                    <p className="text-[11px] text-muted-foreground mb-4">
                      This is the card that will appear on seniors' mobile screens under{" "}
                      <strong>Upcoming Events & Activities</strong>:
                    </p>

                    {/* Member App Mock Card */}
                    <div className="bg-[#FAF7F2] border border-[#E5D7BE] rounded-2xl p-3.5 shadow-sm space-y-3">
                      <div className="flex items-start gap-3">
                        {/* Left Navy Date Box */}
                        <div className="w-12 h-12 rounded-xl bg-[#091329] flex flex-col items-center justify-center shrink-0">
                          <span className="text-base font-black text-white leading-none">
                            {formatEventDate(formData.eventDate).day}
                          </span>
                          <span className="text-[9px] font-bold text-[#E6C687] tracking-wider">
                            {formatEventDate(formData.eventDate).month}
                          </span>
                        </div>

                        {/* Right Content */}
                        <div className="space-y-1 min-w-0">
                          <h4 className="text-xs font-bold text-[#091329] truncate">
                            {formData.title || "Event Title Preview"}
                          </h4>
                          <p className="text-[10px] text-slate-600 line-clamp-2 leading-relaxed">
                            {formData.description || "Event description and details for elderly members..."}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 pt-1">
                            <span className="flex items-center gap-1 font-medium text-[#091329]">
                              <MapPin className="w-3 h-3 text-[#B08A4A]" />
                              <span className="truncate max-w-[120px]">
                                {formData.venue || "Venue Location"}
                              </span>
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-[#B08A4A]" />
                              <span>
                                {formData.startTime}
                                {formData.endTime ? ` - ${formData.endTime}` : ""}
                              </span>
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {formData.status !== "PUBLISHED" && (
                      <div className="mt-3 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                        <span>
                          Notice: Since status is <strong>{formData.status}</strong>, this event will
                          NOT appear on members' devices until published.
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-border/40 text-[11px] text-muted-foreground text-center">
                    Rendered with Sunshine Eldercare high-contrast senior palette
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-muted/20 border-t border-border/60 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg border border-border/80 hover:bg-muted text-slate-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-lg bg-[#091329] hover:bg-[#162850] text-white shadow-sm transition-all"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {editingEvent ? "Update Event" : "Publish Event"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
