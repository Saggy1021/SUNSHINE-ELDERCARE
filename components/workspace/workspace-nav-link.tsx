'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface WorkspaceNavLinkProps {
  href: string
  icon: React.ReactNode
  children: React.ReactNode
}

export function WorkspaceNavLink({ href, icon, children }: WorkspaceNavLinkProps) {
  const pathname = usePathname()

  // Strict matching for root paths to prevent them from always highlighting
  const isRootPath = href === '/admin' || href === '/dashboard' || href === '/employee'
  const isActive = isRootPath
    ? pathname === href
    : pathname === href || pathname?.startsWith(`${href}/`)

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
        isActive
          ? 'bg-[#162850] text-[#B08A4A]'
          : 'text-slate-400 hover:bg-white/5 hover:text-white'
      }`}
    >
      <div className={`flex items-center justify-center ${isActive ? 'text-[#B08A4A]' : 'text-slate-400'}`}>
        {icon}
      </div>
      {children}
    </Link>
  )
}
