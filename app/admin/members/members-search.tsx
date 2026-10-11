'use client'

import { Search } from 'lucide-react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useTransition, useState, useEffect } from 'react'

export function MembersSearch() {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const { replace } = useRouter()
  const [isPending, startTransition] = useTransition()

  const defaultQuery = searchParams.get('q')?.toString() || ''
  const [searchTerm, setSearchTerm] = useState(defaultQuery)

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      startTransition(() => {
        const params = new URLSearchParams(searchParams)
        if (searchTerm) {
          params.set('q', searchTerm)
        } else {
          params.delete('q')
        }
        replace(`${pathname}?${params.toString()}`)
      })
    }, 300)

    return () => clearTimeout(delayDebounceFn)
  }, [searchTerm, pathname, replace, searchParams])

  return (
    <div className="relative flex-1 max-w-md">
      <Search className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${isPending ? 'text-[#B08A4A] animate-pulse' : 'text-slate-400'}`} />
      <input 
        type="text" 
        placeholder="Search members by name or email..." 
        className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#091329] focus:ring-1 focus:ring-[#091329] transition-all shadow-xs"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
    </div>
  )
}
