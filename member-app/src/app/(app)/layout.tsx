'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SessionStore, AppSession } from '@/lib/session-store';
import { api } from '@/lib/api-client';
import { MobileHeader } from '@/components/app-shell/mobile-header';
import { BottomTabBar } from '@/components/app-shell/bottom-tab-bar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [session, setSession] = useState<AppSession | null>(null);

  useEffect(() => {
    const currentSession = SessionStore.getSession();
    if (!currentSession?.isAuthenticated) {
      router.replace('/login');
      return;
    }

    setSession(currentSession);

    // Background verify token with live backend
    api.getMe().then((res) => {
      if (res.success && res.member) {
        const updatedSession: AppSession = {
          ...currentSession,
          memberId: res.member.memberId,
          name: res.member.name,
          email: res.member.email,
          profile: res.member,
          subscription: res.subscription,
        };
        SessionStore.setSession(updatedSession);
        setSession(updatedSession);
      }
    }).catch(() => {
      // Offline fallback: keep cached session active for PWA offline view
    });
  }, [router]);

  if (!session) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 bg-[#FAF9F5] min-h-screen">
        <div className="w-8 h-8 border-4 border-[#091329] border-t-[#B08A4A] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#FAF9F5] relative">
      <MobileHeader memberId={session.memberId} />
      <main className="flex-1 pb-24 overflow-y-auto">{children}</main>
      <BottomTabBar />
    </div>
  );
}
