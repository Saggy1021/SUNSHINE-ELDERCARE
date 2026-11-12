'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, CreditCard, Activity, FileText, User } from 'lucide-react';

interface TabItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const TABS: TabItem[] = [
  { name: 'Home', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Card', href: '/card', icon: CreditCard },
  { name: 'Care', href: '/care', icon: Activity },
  { name: 'Docs', href: '/documents', icon: FileText },
  { name: 'Profile', href: '/profile', icon: User },
];

export function BottomTabBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#E8E6DF] shadow-lg flex justify-center">
      <div className="w-full max-w-md flex items-center justify-around px-2 pt-2 pb-[calc(var(--sab)+8px)]">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = pathname === tab.href || (tab.href !== '/dashboard' && pathname.startsWith(tab.href));

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center justify-center flex-1 py-1 rounded-xl transition-all touch-target select-none ${
                isActive
                  ? 'text-[#091329] font-bold scale-105'
                  : 'text-slate-400 hover:text-slate-600 font-medium'
              }`}
            >
              <div
                className={`p-1.5 rounded-xl transition-colors ${
                  isActive ? 'bg-[#091329]/10 text-[#091329]' : 'text-slate-400'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
              </div>
              <span className={`text-[11px] mt-0.5 tracking-tight ${isActive ? 'text-[#091329]' : 'text-slate-500'}`}>
                {tab.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

