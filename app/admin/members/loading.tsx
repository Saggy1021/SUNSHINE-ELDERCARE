import { Users, Search } from "lucide-react"

export default function MembersLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-300 flex items-center gap-2">
            <Users className="h-6 w-6 text-slate-300" /> <div className="h-8 w-32 bg-slate-200 rounded"></div>
          </h1>
          <div className="h-4 w-64 bg-slate-200 rounded mt-2"></div>
        </div>
        <div className="h-10 w-36 bg-slate-200 rounded-lg"></div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center gap-4 bg-slate-50">
          <div className="relative flex-1 max-w-md h-10 bg-slate-200 rounded-lg"></div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white border-b border-slate-200">
              <tr>
                <th className="px-6 py-4"><div className="h-4 w-20 bg-slate-200 rounded"></div></th>
                <th className="px-6 py-4"><div className="h-4 w-32 bg-slate-200 rounded"></div></th>
                <th className="px-6 py-4"><div className="h-4 w-16 bg-slate-200 rounded"></div></th>
                <th className="px-6 py-4"><div className="h-4 w-24 bg-slate-200 rounded"></div></th>
                <th className="px-6 py-4"><div className="h-4 w-20 bg-slate-200 rounded"></div></th>
                <th className="px-6 py-4"><div className="h-4 w-12 bg-slate-200 rounded ml-auto"></div></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[1, 2, 3, 4, 5].map((i) => (
                <tr key={i}>
                  <td className="px-6 py-4"><div className="h-4 w-32 bg-slate-200 rounded"></div></td>
                  <td className="px-6 py-4"><div className="h-4 w-48 bg-slate-200 rounded"></div></td>
                  <td className="px-6 py-4"><div className="h-5 w-16 bg-slate-200 rounded-md"></div></td>
                  <td className="px-6 py-4"><div className="h-5 w-24 bg-slate-200 rounded-full"></div></td>
                  <td className="px-6 py-4"><div className="h-4 w-20 bg-slate-200 rounded"></div></td>
                  <td className="px-6 py-4"><div className="h-8 w-8 bg-slate-200 rounded-lg ml-auto"></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
