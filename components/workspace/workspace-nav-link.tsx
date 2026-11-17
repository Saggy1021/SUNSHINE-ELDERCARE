'use client'

import React, { useTransition } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useWorkspaceNavigation } from './workspace-nav-context'

interface WorkspaceNavLinkProps {
  href: string
  icon: React.ReactNode
  children: React.ReactNode
}

export function WorkspaceNavLink({ href, icon, children }: WorkspaceNavLinkProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const { pendingHref, startNavigation } = useWorkspaceNavigation()

  // Strict matching for root paths to prevent them from always highlighting
  const isRootPath = href === '/admin' || href === '/dashboard' || href === '/employee'
  const isCurrentRoute = isRootPath
    ? pathname === href
    : pathname === href || pathname?.startsWith(`${href}/`)

  const isNavigatingTarget = pendingHref === href || (isPending && pendingHref === href)
  const isActive = isCurrentRoute || isNavigatingTarget

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // If clicking the currently active page or already navigating to this page, ignore to prevent duplicate cancellations
    if (isCurrentRoute || isNavigatingTarget) {
      e.preventDefault()
      return
    }

    // Immediately trigger instant visual feedback (<16ms)
    startNavigation(href)

    startTransition(() => {
      router.push(href)
    })
  }

  const handlePrefetch = () => {
    router.prefetch(href)
  }

  return (
    <Link
      href={href}
      prefetch={true}
      onClick={handleClick}
      onMouseEnter={handlePrefetch}
      onTouchStart={handlePrefetch}
      className={`group relative flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-all duration-150 select-none ${
        isActive
          ? 'bg-[#162850] text-[#B08A4A] shadow-xs'
          : 'text-slate-300 hover:bg-white/5 hover:text-white'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className={`flex items-center justify-center transition-colors ${isActive ? 'text-[#B08A4A]' : 'text-slate-400 group-hover:text-slate-200'}`}>
          {icon}
        </div>
        <span className="truncate">{children}</span>
      </div>

      {isNavigatingTarget && (
        <span className="flex h-2 w-2 relative shrink-0" title="Loading...">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#B08A4A] opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#B08A4A]" />
        </span>
      )}
    </Link>
  )
}
