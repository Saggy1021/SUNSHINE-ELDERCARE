'use client'

import { useEffect } from 'react'

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('ADMIN_RENDER_ERROR:', error)
  }, [error])

  return (
    <div className="p-8 max-w-2xl mx-auto my-12 bg-red-50 border border-red-200 rounded-xl font-sans">
      <h2 className="text-xl font-bold text-red-700 mb-2">Admin Render Error Encountered</h2>
      <p className="font-semibold text-slate-800 mb-2">Message: {error?.message}</p>
      <p className="text-sm text-slate-600 mb-4">Digest: {error?.digest}</p>
      <pre className="bg-white p-4 rounded border border-red-100 text-xs overflow-auto max-h-60 mb-4">
        {error?.stack || 'No stack trace'}
      </pre>
      <button
        onClick={() => reset()}
        className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700"
      >
        Try again
      </button>
    </div>
  )
}
