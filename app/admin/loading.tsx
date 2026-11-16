export default function AdminLoading() {
  return (
    <div className="space-y-8 animate-pulse" aria-busy="true" aria-label="Loading admin dashboard">
      {/* Page Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <div className="h-8 w-56 bg-slate-200 rounded-lg" />
          <div className="h-4 w-80 bg-slate-100 rounded" />
        </div>
        <div className="h-10 w-40 bg-slate-200 rounded-lg" />
      </div>

      {/* Metrics Grid Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-sm flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-3 w-24 bg-slate-200 rounded" />
              <div className="h-7 w-12 bg-slate-200 rounded-md" />
            </div>
            <div className="h-10 w-10 bg-slate-100 rounded-lg" />
          </div>
        ))}
      </div>

      {/* Content Grid Skeleton */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Needs Attention Skeleton */}
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col h-full">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="h-4 w-32 bg-slate-200 rounded" />
            <div className="h-4 w-16 bg-slate-100 rounded-full" />
          </div>
          <div className="p-6 space-y-6 flex-1">
            {[1, 2, 3].map((section) => (
              <div key={section} className="space-y-3">
                <div className="flex justify-between">
                  <div className="h-3 w-36 bg-slate-200 rounded" />
                  <div className="h-3 w-12 bg-slate-100 rounded" />
                </div>
                <div className="h-16 bg-slate-50 border border-slate-100 rounded-lg" />
              </div>
            ))}
          </div>
        </div>

        {/* Lifecycle Status & Inquiries Skeleton */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm p-6 space-y-4">
            <div className="h-4 w-48 bg-slate-200 rounded" />
            <div className="divide-y divide-slate-100">
              {[1, 2, 3].map((row) => (
                <div key={row} className="flex justify-between items-center py-3">
                  <div className="h-4 w-40 bg-slate-100 rounded" />
                  <div className="h-5 w-10 bg-slate-100 rounded-full" />
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm p-6 space-y-4">
            <div className="flex justify-between items-center">
              <div className="h-4 w-36 bg-slate-200 rounded" />
              <div className="h-3 w-12 bg-slate-100 rounded" />
            </div>
            <div className="h-16 bg-slate-50 border border-slate-100 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  )
}
