import { getMembers } from "@/app/actions/admin"
import Link from "next/link"
import { Users, Search, Shield, ChevronRight } from "lucide-react"
import { MembersSearch } from "./members-search"

export default async function AdminMembersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams;
  const members = await getMembers(q)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="h-6 w-6 text-blue-600" /> Members
          </h1>
          <p className="text-slate-600 mt-1">Manage user accounts and memberships.</p>
        </div>
        <Link 
          href="/admin/members/new" 
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          Create Member
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center gap-4 bg-slate-50">
          <MembersSearch />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Joined</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {members.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    No members found.
                  </td>
                </tr>
              ) : members.map((member) => (
                <tr key={member.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900">
                    {member.name || "N/A"}
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    {member.email}
                  </td>
                  <td className="px-6 py-4">
                    {member.role === "ADMIN" ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-purple-700 bg-purple-100 px-2 py-1 rounded-md">
                        <Shield className="h-3 w-3" /> Admin
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-md">User</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {member.subscriptions[0] ? (
                      <span className={`px-2 py-1 rounded-full text-xs font-medium tracking-wide
                        ${member.subscriptions[0].status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-600' : 
                          member.subscriptions[0].status === 'PENDING' ? 'bg-amber-500/10 text-amber-600' :
                          member.subscriptions[0].status === 'SCHEDULED' ? 'bg-blue-500/10 text-blue-600' :
                          member.subscriptions[0].status === 'EXPIRED' ? 'bg-red-500/10 text-red-600' :
                          'bg-slate-500/10 text-slate-600'}`}
                      >
                        {member.subscriptions[0].status}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">None</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-slate-500 text-xs">
                    {member.createdAt.toLocaleDateString('en-GB')}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link 
                      href={`/admin/members/${member.id}`} 
                      className="inline-flex items-center justify-center p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </Link>
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
