/**
 * Sunshine Eldercare Member App — Authoritative API Client
 * Connects directly to the existing Sunshine Eldercare backend.
 */

export interface ApiError {
  message: string;
  statusCode?: number;
  code?: string;
}

class ApiClient {
  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('sunshine_member_token');
  }

  private setToken(token: string | null) {
    if (typeof window === 'undefined') return;
    if (token) {
      localStorage.setItem('sunshine_member_token', token);
    } else {
      localStorage.removeItem('sunshine_member_token');
    }
  }

  async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(endpoint, {
      ...options,
      headers,
      credentials: 'include', // Support HttpOnly cookies alongside Bearer token
    });

    if (response.status === 401 && !endpoint.includes('/auth/login')) {
      // Invalidate session on 401
      this.setToken(null);
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login?expired=1';
      }
      throw new Error('Your session has expired. Please log in again.');
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const err = new Error(data.error || 'Request failed') as Error & { statusCode?: number; code?: string };
      err.statusCode = response.status;
      err.code = data.code;
      throw err;
    }

    return data as T;
  }

  async login(memberId: string, password: string) {
    const res = await this.request<{
      success: boolean;
      token: string;
      member: any;
      subscription: any;
    }>('/api/mobile/auth/login', {
      method: 'POST',
      body: JSON.stringify({ memberId, password }),
    });

    if (res.token) {
      this.setToken(res.token);
    }
    return res;
  }

  async getMe() {
    return this.request<{ success: boolean; member: any; subscription: any }>('/api/mobile/auth/me');
  }

  async getDashboard() {
    return this.request<{
      success: boolean;
      member: any;
      membership: any;
      recentReceipts: any[];
      systemNotifications: any[];
    }>('/api/mobile/dashboard');
  }

  async getProfile() {
    return this.request<{ success: boolean; profile: any }>('/api/mobile/profile');
  }

  async updateProfile(profileData: Record<string, any>) {
    return this.request<{ success: boolean; message: string }>('/api/mobile/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  }

  async getMembership() {
    return this.request<{
      success: boolean;
      currentMembership: any;
      history: any[];
      availablePlans: any[];
    }>('/api/mobile/membership');
  }

  async getDocuments() {
    return this.request<{ success: boolean; documents: any[] }>('/api/mobile/documents');
  }

  async triggerSos(telemetry: { latitude?: number | null; longitude?: number | null; accuracy?: number | null } = {}) {
    return this.request<{
      success: boolean;
      alertId: string;
      message: string;
      helpline: string;
      nationalEmergency: string;
      plan: string;
      timestamp: string;
    }>('/api/mobile/sos', {
      method: 'POST',
      body: JSON.stringify({
        ...telemetry,
        clientTimestamp: new Date().toISOString(),
      }),
    });
  }

  async logout() {
    try {
      await this.request('/api/mobile/auth/logout', { method: 'POST' });
    } finally {
      this.setToken(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('sunshine_member_app_session');
      }
    }
  }

  hasToken(): boolean {
    return !!this.getToken();
  }
}

export const api = new ApiClient();
