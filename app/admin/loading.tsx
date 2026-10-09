import { Activity } from "lucide-react"

export default function AdminLoading() {
  return (
    <div className="h-full w-full flex items-center justify-center min-h-[50vh]">
      <div className="flex flex-col items-center gap-4 text-slate-400">
        <Activity className="h-8 w-8 animate-pulse text-amber-600" />
        <p className="text-sm font-medium animate-pulse text-amber-600/70">Loading...</p>
      </div>
    </div>
  )
}
