'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Menu, WifiOff } from 'lucide-react';
import { MemberDrawer } from '@/components/app-shell/member-drawer';
import { SessionStore } from '@/lib/session-store';
import { usePwa } from '@/lib/pwa';

interface MobileHeaderProps {
  memberId?: string;
}

export function MobileHeader({ memberId }: MobileHeaderProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { isOnline } = usePwa();
  const session = SessionStore.getSession();

  const displayMemberId = memberId || session?.memberId || 'SEC/MEMBER';

  return (
    <>
      <header className="sticky top-0 z-30 bg-[#FAF9F5]/95 backdrop-blur-md px-4 pt-[calc(var(--sat)+10px)] pb-3 border-b border-[#D8C08A]/40 shadow-xs">
        {!isOnline && (
          <div className="bg-amber-500 text-amber-950 px-3 py-1 text-xs font-bold flex items-center justify-center gap-1.5 rounded-md mb-2">
            <WifiOff className="w-3.5 h-3.5" /> Offline Mode — Showing Cached Pass & Emergency Info
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          {/* Official Sunshine Eldercare Logo */}
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-36 sm:h-11 sm:w-40 shrink-0">
              <Image
                src="/images/logo-new.png"
                alt="Sunshine Eldercare"
                fill
                priority
                sizes="(max-width: 640px) 144px, 160px"
                className="object-contain object-left"
              />
            </div>
          </div>

          {/* Member Menu Trigger */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setDrawerOpen(true)}
              className="w-11 h-11 rounded-xl bg-white border border-[#D8C08A]/60 text-[#162850] hover:bg-[#F2F5F9] flex items-center justify-center shadow-2xs touch-target active:scale-95 transition-transform"
              aria-label="Open Member Menu"
            >
              <Menu className="w-6 h-6 stroke-[2.2px] text-[#162850]" />
            </button>
          </div>
        </div>
      </header>

      {/* Side Drawer with Live Member Details */}
      <MemberDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        session={session}
      />
    </>
  );
}
