'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SessionStore } from '@/lib/session-store';

export default function IndexPage() {
  const router = useRouter();

  useEffect(() => {
    const session = SessionStore.getSession();
    if (session?.isAuthenticated) {
      router.replace('/dashboard');
    } else {
      router.replace('/login');
    }
  }, [router]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[#091329] text-white">
      <div className="w-16 h-16 rounded-2xl bg-[#162850] border-2 border-[#B08A4A] flex items-center justify-center mb-4 shadow-xl animate-pulse">
        <span className="font-serif font-bold text-[#B08A4A] text-3xl">S</span>
      </div>
      <h1 className="font-serif font-bold text-xl tracking-wide text-white">
        SUNSHINE ELDERCARE
      </h1>
      <p className="text-xs text-[#B08A4A] tracking-widest uppercase mt-1">
        Loading Member Application...
      </p>
    </div>
  );
}

