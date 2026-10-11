import { getMembers } from "@/app/actions/admin"
import Link from "next/link"
import { Users, Search, Shield, ChevronRight } from "lucide-react"
import { MembersSearch } from "./members-search"

export default async function AdminMembersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string, p?: string }>
}) {
  const { q, p } = await searchParams;
  const page = p ? parseInt(p, 10) : 1;
  const { members, total, pages } = await getMembers(q, page)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#091329] flex items-center gap-2">
            <Users className="h-6 w-6 text-[#091329]" /> Members
          </h1>
          <p className="text-sm text-slate-500 mt-1">Manage user accounts and eldercare memberships.</p>
        </div>
        <Link 
          href="/admin/members/new" 
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#091329] text-white text-sm font-medium rounded-lg hover:bg-[#162850] shadow-sm transition-colors self-start sm:self-auto"
        >
          + Create Member
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center gap-4 bg-slate-50/50">
          <MembersSearch />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/75 border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Name</th>
                <th className="px-5 py-3.5">Email</th>
                <th className="px-5 py-3.5">Role</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Joined</th>
                <th className="px-5 py-3.5 text-right">Action</th>
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
                <tr key={member.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-3.5 font-medium text-slate-900">
                    {member.name || "N/A"}
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">
                    {member.email}
                  </td>
                  <td className="px-5 py-3.5">
                    {member.role === "ADMIN" ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-[#091329] bg-[#091329]/5 border border-[#091329]/15 px-2 py-0.5 rounded-full">
                        <Shield className="h-3 w-3" /> Admin
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200/60">User</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    {member.subscriptions[0] ? (
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium tracking-wide
                        ${member.subscriptions[0].status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' :
                          member.subscriptions[0].status === 'PENDING' ? 'bg-amber-50 text-amber-700 border border-amber-200/60' :
                          member.subscriptions[0].status === 'SCHEDULED' ? 'bg-sky-50 text-sky-700 border border-sky-200/60' :
                          member.subscriptions[0].status === 'EXPIRED' ? 'bg-rose-50 text-rose-700 border border-rose-200/60' :
                          'bg-slate-100 text-slate-600 border border-slate-200'}`}
                      >
                        {member.subscriptions[0].status}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">None</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-slate-500 text-xs">
                    {member.createdAt.toLocaleDateString('en-GB')}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <Link 
                      href={`/admin/members/${member.id}`} 
                      className="inline-flex items-center justify-center p-1.5 text-slate-400 hover:text-[#091329] hover:bg-slate-100 rounded-lg transition-colors"
                      title="View Member Details"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50 text-sm">
          <div className="text-slate-500 text-xs sm:text-sm">
            Showing <span className="font-medium text-slate-900">{members.length}</span> of <span className="font-medium text-slate-900">{total}</span> members
          </div>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={`/admin/members?${q ? 'q=' + q + '&' : ''}p=${page - 1}`} className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 text-xs font-medium rounded-md hover:bg-slate-50 shadow-2xs transition-colors">
                Previous
              </Link>
            )}
            {page < pages && (
              <Link href={`/admin/members?${q ? 'q=' + q + '&' : ''}p=${page + 1}`} className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 text-xs font-medium rounded-md hover:bg-slate-50 shadow-2xs transition-colors">
                Next
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
