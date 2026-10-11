'use client'

import React, { useState, useEffect } from 'react'
import { Menu, X, LogOut, ChevronRight } from 'lucide-react'
import { signOut } from 'next-auth/react'
import { usePathname } from 'next/navigation'

interface WorkspaceShellProps {
  portalName: string
  userDisplay: string
  sidebarNav: React.ReactNode
  children: React.ReactNode
}

export function WorkspaceShell({ portalName, userDisplay, sidebarNav, children }: WorkspaceShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()

  // Close sidebar on path change
  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  // Derive a basic page title from pathname
  const pathSegments = (pathname || '').split('/').filter(Boolean)
  const lastSegment = pathSegments[pathSegments.length - 1]
  const pageTitle = lastSegment
    ? lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1).replace(/-/g, ' ')
    : 'Overview'

  return (
    <div className="flex h-screen bg-[#FAF9F5] font-sans text-[#172033] overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-[#091329]/60 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#091329] text-white transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static flex flex-col border-r border-[#162850] shadow-xl lg:shadow-none ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 flex-shrink-0 items-center px-6 border-b border-[#162850]">
          <div className="flex items-center gap-3 text-[#B08A4A] font-serif font-bold text-lg">
             <div className="h-8 w-8 rounded bg-[#162850] flex items-center justify-center text-[#B08A4A] border border-[#B08A4A]/30">
               S
             </div>
             Sunshine Care
          </div>
          <button
            className="ml-auto lg:hidden text-slate-400 hover:text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-5 border-b border-[#162850] bg-[#091329]">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1.5">{portalName}</div>
          <div className="text-sm font-medium text-slate-200 truncate">{userDisplay}</div>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
          {sidebarNav}
        </nav>

        <div className="p-4 border-t border-[#162850] bg-[#0a152e]">
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="flex w-full items-center gap-3 px-3 py-2 text-sm font-medium text-slate-400 rounded-md hover:bg-[#162850] hover:text-white transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Workspace Header */}
        <header className="h-16 flex-shrink-0 flex items-center gap-4 border-b border-[#E2E8F0] bg-white px-4 sm:px-6 lg:px-8 shadow-sm z-10">
          <button
            className="lg:hidden text-slate-500 hover:text-[#162850]"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex items-center text-sm font-medium text-[#64748B]">
            <span className="hidden sm:inline-block">{portalName}</span>
            <ChevronRight className="h-4 w-4 mx-2 hidden sm:inline-block text-[#E2E8F0]" />
            <span className="text-[#162850] font-semibold">{pageTitle}</span>
          </div>
        </header>

        {/* Scrollable Content Area */}
        <main className="flex-1 overflow-auto bg-[#FAF9F5] p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-6xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
