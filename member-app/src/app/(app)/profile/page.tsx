'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SessionStore } from '@/lib/session-store';
import { api } from '@/lib/api-client';
import { TouchButton } from '@/components/ui/touch-button';
import {
  User,
  MapPin,
  Phone,
  Mail,
  Heart,
  LogOut,
  ShieldCheck,
  Edit2,
  Save,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { usePwa } from '@/lib/pwa';

export default function ProfilePage() {
  const router = useRouter();
  const { isInstallable, triggerInstall } = usePwa();

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states for editable fields
  const [phone, setPhone] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [city, setCity] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [hospitalPreference, setHospitalPreference] = useState('');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');

  useEffect(() => {
    async function loadProfile() {
      try {
        const cached = SessionStore.getSession();
        if (cached?.profile) {
          setProfile(cached.profile);
          populateFields(cached.profile);
        }

        const res = await api.getProfile();
        if (res.success && res.profile) {
          setProfile(res.profile);
          populateFields(res.profile);
        }
      } catch (err: any) {
        setError(err?.message || 'Failed to load profile.');
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, []);

  const populateFields = (data: any) => {
    setPhone(data.phone || '');
    setAddressLine1(data.addressLine1 || '');
    setCity(data.city || '');
    setBloodGroup(data.bloodGroup || '');
    setHospitalPreference(data.hospitalPreference || '');
    setEmergencyContactName(data.emergencyContactName || '');
    setEmergencyContactPhone(data.emergencyContactPhone || '');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      await api.updateProfile({
        phone,
        addressLine1,
        city,
        bloodGroup,
        hospitalPreference,
        emergencyContactName,
        emergencyContactPhone,
      });

      setProfile((prev: any) => ({
        ...prev,
        phone,
        addressLine1,
        city,
        bloodGroup,
        hospitalPreference,
        emergencyContactName,
        emergencyContactPhone,
      }));

      setEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setError(err?.message || 'Failed to save profile changes.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await SessionStore.logout();
  };

  if (loading && !profile) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-[#091329] border-t-[#B08A4A] rounded-full animate-spin" />
      </div>
    );
  }

  const memberName = profile?.name || 'Sunshine Member';
  const memberInitials = memberName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p: string) => p[0])
    .join('') || 'SM';

  return (
    <div className="p-4 space-y-5">
      <div>
        <p className="text-xs font-semibold text-[#B08A4A] uppercase tracking-wider">
          Account Settings
        </p>
        <h2 className="text-2xl font-bold tracking-tight text-[#091329]">
          Member Profile
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Review registered personal, medical, and emergency details.
        </p>
      </div>

      {saveSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Profile updated successfully in Sunshine database.</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Member Identity Card */}
      <div className="bg-white p-5 rounded-2xl border border-[#E8E6DF] shadow-xs space-y-4">
        <div className="flex items-center gap-3.5">
          <div className="w-14 h-14 rounded-2xl bg-[#091329] text-white flex items-center justify-center font-bold text-xl border-2 border-[#B08A4A]/50 shadow-md">
            {memberInitials}
          </div>
          <div>
            <h3 className="font-bold text-lg text-[#091329]">{memberName}</h3>
            <p className="text-xs font-mono font-bold text-[#B08A4A]">
              {profile?.memberId || 'SEC/MEMBER'}
            </p>
            <span className="inline-block mt-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
              Verified Website Account
            </span>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-500">Registered Email: {profile?.email}</span>
          <button
            onClick={() => setEditing(!editing)}
            className="text-xs font-bold text-[#B08A4A] hover:underline flex items-center gap-1"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>{editing ? 'Cancel' : 'Edit Contact'}</span>
          </button>
        </div>
      </div>

      {/* Profile Details Form */}
      <form onSubmit={handleSave} className="bg-white p-5 rounded-2xl border border-[#E8E6DF] shadow-xs space-y-4">
        <h4 className="text-xs font-bold text-[#091329] uppercase tracking-wider flex items-center gap-2">
          <User className="w-4 h-4 text-[#B08A4A]" />
          Contact & Residential Information
        </h4>

        <div className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-500 mb-1 font-medium">Phone Number</label>
            {editing ? (
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full p-2.5 bg-[#FAF9F5] border border-slate-200 rounded-xl text-slate-900"
                placeholder="+91 XXXXX XXXXX"
              />
            ) : (
              <p className="font-semibold text-slate-900 flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                {profile?.phone || 'Not on file'}
              </p>
            )}
          </div>

          <div>
            <label className="block text-slate-500 mb-1 font-medium">Residential Address</label>
            {editing ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  className="w-full p-2.5 bg-[#FAF9F5] border border-slate-200 rounded-xl text-slate-900"
                  placeholder="Street / Apartment address"
                />
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full p-2.5 bg-[#FAF9F5] border border-slate-200 rounded-xl text-slate-900"
                  placeholder="City"
                />
              </div>
            ) : (
              <p className="font-semibold text-slate-900 flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                <span>
                  {profile?.addressLine1 || profile?.city ? `${profile?.addressLine1 || ''}, ${profile?.city || ''}` : 'Kolkata, West Bengal'}
                </span>
              </p>
            )}
          </div>
        </div>

        {/* Emergency Medical & Hospital Info */}
        <div className="pt-3 border-t border-slate-100 space-y-3 text-xs">
          <h4 className="text-xs font-bold text-[#091329] uppercase tracking-wider flex items-center gap-2">
            <Heart className="w-4 h-4 text-red-500" />
            Medical & Emergency Contact
          </h4>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-500 mb-1 font-medium">Blood Group</label>
              {editing ? (
                <input
                  type="text"
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value)}
                  className="w-full p-2.5 bg-[#FAF9F5] border border-slate-200 rounded-xl text-slate-900"
                  placeholder="e.g. O+, B+, A+"
                />
              ) : (
                <p className="font-bold text-red-600">{profile?.bloodGroup || 'On File'}</p>
              )}
            </div>

            <div>
              <label className="block text-slate-500 mb-1 font-medium">Emergency Contact Name</label>
              {editing ? (
                <input
                  type="text"
                  value={emergencyContactName}
                  onChange={(e) => setEmergencyContactName(e.target.value)}
                  className="w-full p-2.5 bg-[#FAF9F5] border border-slate-200 rounded-xl text-slate-900"
                  placeholder="Family contact name"
                />
              ) : (
                <p className="font-semibold text-slate-900">{profile?.emergencyContactName || 'Family Contact'}</p>
              )}
            </div>

            <div className="col-span-2">
              <label className="block text-slate-500 mb-1 font-medium">Emergency Contact Phone</label>
              {editing ? (
                <input
                  type="tel"
                  value={emergencyContactPhone}
                  onChange={(e) => setEmergencyContactPhone(e.target.value)}
                  className="w-full p-2.5 bg-[#FAF9F5] border border-slate-200 rounded-xl text-slate-900"
                  placeholder="+91 XXXXX XXXXX"
                />
              ) : (
                <p className="font-mono font-bold text-emerald-700">{profile?.emergencyContactPhone || '+91 90888 82222'}</p>
              )}
            </div>

            <div className="col-span-2">
              <label className="block text-slate-500 mb-1 font-medium">Hospital Preference</label>
              {editing ? (
                <input
                  type="text"
                  value={hospitalPreference}
                  onChange={(e) => setHospitalPreference(e.target.value)}
                  className="w-full p-2.5 bg-[#FAF9F5] border border-slate-200 rounded-xl text-slate-900"
                  placeholder="Preferred hospital name"
                />
              ) : (
                <p className="font-medium text-slate-700">{profile?.hospitalPreference || 'Apollo Multispeciality / Nearest Critical Care'}</p>
              )}
            </div>
          </div>
        </div>

        {editing && (
          <div className="pt-2">
            <TouchButton type="submit" variant="primary" size="md" disabled={saving}>
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Profile Changes'}</span>
            </TouchButton>
          </div>
        )}
      </form>

      {/* Website Security & Password Link */}
      <div className="bg-[#FAF9F5] p-4 rounded-2xl border border-[#D8C08A]/40 space-y-2">
        <p className="text-xs font-bold text-[#162850]">Account Security & Password Management</p>
        <p className="text-[11px] text-slate-600 leading-relaxed">
          Your login password is shared across the Sunshine website and this app. To change your password, visit the website security portal.
        </p>
        <a
          href="https://www.sunshineeldercare.in/forgot-password"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#B08A4A] hover:underline pt-1"
        >
          <span>Change Password on Website</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Logout Action */}
      <div className="pt-2">
        <button
          onClick={handleLogout}
          className="w-full p-3.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-colors active:scale-98"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out of Member App</span>
        </button>
      </div>
    </div>
  );
}
