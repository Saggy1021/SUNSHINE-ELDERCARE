import { getAddOns } from "@/app/actions/admin"
import { Package, AlertCircle } from "lucide-react"

export default async function AdminAddOnsPage() {
  const addOns = await getAddOns()

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Package className="h-6 w-6 text-indigo-600" /> Add-ons
          </h1>
          <p className="text-slate-600 mt-1">View available membership add-ons.</p>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex gap-3 text-blue-800">
        <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-semibold mb-1">Temporary Placeholders</p>
          <p>These add-ons are currently temporary placeholders. Creating, editing prices, or changing core commercial details is restricted until the final care catalog is released.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Description</th>
                <th className="px-6 py-4">Price</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {addOns.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                    No add-ons found.
                  </td>
                </tr>
              ) : addOns.map((addon) => (
                <tr key={addon.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-semibold text-slate-900">
                    {addon.name}
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {addon.description || "N/A"}
                  </td>
                  <td className="px-6 py-4 font-semibold text-slate-900">
                    ₹{addon.price}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-md text-xs font-semibold
                      ${addon.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}
                    >
                      {addon.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
