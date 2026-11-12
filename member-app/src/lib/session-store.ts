'use client';

import { api } from './api-client';

const SESSION_KEY = 'sunshine_member_app_session';
const TOKEN_KEY = 'sunshine_member_token';

export interface AppSession {
  isAuthenticated: boolean;
  memberId: string;
  name: string;
  email: string;
  token?: string;
  profile?: any;
  subscription?: any;
}

export const SessionStore = {
  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEY);
  },

  getSession(): AppSession | null {
    if (typeof window === 'undefined') return null;
    const token = localStorage.getItem(TOKEN_KEY);
    const raw = localStorage.getItem(SESSION_KEY);

    if (!token && !raw) {
      return null;
    }

    try {
      if (raw) {
        const session = JSON.parse(raw);
        return { ...session, isAuthenticated: !!token || session.isAuthenticated };
      }
    } catch {
      return null;
    }

    return null;
  },

  setSession(session: AppSession) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    if (session.token) {
      localStorage.setItem(TOKEN_KEY, session.token);
    }
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
          token: res.token,
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
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(TOKEN_KEY);
      window.location.href = '/login';
    }
  },
};
