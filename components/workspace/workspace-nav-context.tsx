'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'

interface WorkspaceNavContextType {
  pendingHref: string | null
  startNavigation: (href: string) => void
  isNavigating: boolean
}

const WorkspaceNavContext = createContext<WorkspaceNavContextType>({
  pendingHref: null,
  startNavigation: () => {},
  isNavigating: false,
})

export function useWorkspaceNavigation() {
  return useContext(WorkspaceNavContext)
}

export function WorkspaceNavigationProvider({ children }: { children: React.ReactNode }) {
  const [pendingHref, setPendingHref] = useState<string | null>(null)
  const pathname = usePathname()

  // Clear pending state on pathname change
  useEffect(() => {
    setPendingHref(null)
  }, [pathname])

  // Safety fallback timeout to prevent stuck loading states
  useEffect(() => {
    if (!pendingHref) return
    const timer = setTimeout(() => {
      setPendingHref(null)
    }, 10000)
    return () => clearTimeout(timer)
  }, [pendingHref])

  const startNavigation = useCallback((href: string) => {
    setPendingHref(href)
  }, [])

  return (
    <WorkspaceNavContext.Provider
      value={{
        pendingHref,
        startNavigation,
        isNavigating: pendingHref !== null,
      }}
    >
      {children}
    </WorkspaceNavContext.Provider>
  )
}
