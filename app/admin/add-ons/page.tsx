import { getAddOns } from "@/app/actions/admin"
import { Package, AlertCircle } from "lucide-react"

export default async function AdminAddOnsPage() {
  const addOns = await getAddOns()

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#091329] flex items-center gap-2">
            <Package className="h-6 w-6 text-[#091329]" /> Add-ons Catalog
          </h1>
          <p className="text-sm text-slate-500 mt-1">View available membership add-ons and ancillary services.</p>
        </div>
      </div>

      <div className="bg-amber-50/70 border border-amber-200/80 p-4 rounded-xl flex gap-3 text-amber-900">
        <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-amber-700" />
        <div className="text-sm">
          <p className="font-semibold mb-0.5">Catalog Governance Notice</p>
          <p className="text-amber-800">These add-ons are managed centrally. Modifying unit prices or changing commercial tiers is restricted to authoritative Care Plan catalog releases.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Name</th>
                <th className="px-5 py-3.5">Description</th>
                <th className="px-5 py-3.5">Price</th>
                <th className="px-5 py-3.5">Status</th>
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
                <tr key={addon.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-3.5 font-medium text-slate-900">
                    {addon.name}
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">
                    {addon.description || "N/A"}
                  </td>
                  <td className="px-5 py-3.5 font-semibold text-[#091329]">
                    ₹{addon.price}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                      ${addon.active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}
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
