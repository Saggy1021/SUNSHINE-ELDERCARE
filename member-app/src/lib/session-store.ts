'use client';

import { api } from './api-client';

const DISPLAY_PROFILE_KEY = 'sunshine_member_display_profile';

export interface AppSession {
  isAuthenticated: boolean;
  memberId: string;
  name: string;
  email: string;
  profile?: any;
  subscription?: any;
}

export const SessionStore = {
  getSession(): AppSession | null {
    if (typeof window === 'undefined') return null;

    // Check sessionStorage first, then localStorage as fallback for display profile
    const raw = sessionStorage.getItem(DISPLAY_PROFILE_KEY) || localStorage.getItem(DISPLAY_PROFILE_KEY);
    if (!raw) return null;

    try {
      const data = JSON.parse(raw);
      if (data && data.memberId) {
        return {
          isAuthenticated: true,
          memberId: data.memberId,
          name: data.name || 'Sunshine Member',
          email: data.email || '',
          profile: data.profile || null,
          subscription: data.subscription || null,
        };
      }
    } catch {
      return null;
    }

    return null;
  },

  setSession(session: AppSession) {
    if (typeof window === 'undefined') return;
    // Store only non-sensitive display details (no tokens or passwords)
    const sanitized = {
      memberId: session.memberId,
      name: session.name,
      email: session.email,
      profile: session.profile,
      subscription: session.subscription,
    };
    const json = JSON.stringify(sanitized);
    sessionStorage.setItem(DISPLAY_PROFILE_KEY, json);
    localStorage.setItem(DISPLAY_PROFILE_KEY, json);
  },

  clearSession() {
    if (typeof window === 'undefined') return;
    sessionStorage.removeItem(DISPLAY_PROFILE_KEY);
    localStorage.removeItem(DISPLAY_PROFILE_KEY);
    // Also clean up any legacy keys
    localStorage.removeItem('sunshine_member_token');
    localStorage.removeItem('sunshine_member_app_session');
  },

  async login(identifier: string, password: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await api.login(identifier, password);
      if (res.success && res.member) {
        const session: AppSession = {
          isAuthenticated: true,
          memberId: res.member.memberId,
          name: res.member.name,
          email: res.member.email,
          profile: res.member,
          subscription: res.subscription,
        };
        this.setSession(session);
        return { success: true };
      }
      return { success: false, error: 'Authentication failed.' };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Invalid Member ID or password.',
      };
    }
  },

  async logout(): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
      await api.logout();
    } catch {
      // Ignore network errors during logout
    } finally {
      this.clearSession();
      window.location.href = '/login';
    }
  },
};
