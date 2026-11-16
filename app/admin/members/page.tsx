import { getMembers } from "@/app/actions/admin"
import Link from "next/link"
import { Users, Shield, ChevronRight } from "lucide-react"
import { MembersSearch } from "./members-search"

export function formatMembershipDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function AdminMembersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string, p?: string }>
}) {
  const { q, p } = await searchParams;
  const page = p ? parseInt(p, 10) : 1;
  const limit = 50;
  const { members, total, pages } = await getMembers(q, page, limit)

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
                <th className="px-4 py-3.5 text-center w-16">S. No.</th>
                <th className="px-5 py-3.5">Name</th>
                <th className="px-5 py-3.5 whitespace-nowrap">Member ID</th>
                <th className="px-5 py-3.5">Email</th>
                <th className="px-5 py-3.5 whitespace-nowrap">Joined</th>
                <th className="px-5 py-3.5 whitespace-nowrap">End date</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {members.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                    No members found.
                  </td>
                </tr>
              ) : members.map((member: any) => {
                const sub = member.subscriptions[0];
                return (
                  <tr key={member.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* 1. S. No. */}
                    <td className="px-4 py-3.5 text-center font-mono text-xs text-slate-500 w-16">
                      {member.serialNumber !== null ? (
                        <span className="font-semibold text-slate-700">{member.serialNumber}</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* 2. Name */}
                    <td className="px-5 py-3.5 font-medium text-slate-900 whitespace-nowrap">
                      {member.name || "N/A"}
                    </td>

                    {/* 3. Member ID */}
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      {member.memberProfile?.memberId ? (
                        <span className="inline-block font-mono text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-2 py-0.5 rounded">
                          {member.memberProfile.memberId}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-mono text-xs">—</span>
                      )}
                    </td>

                    {/* 4. Email */}
                    <td className="px-5 py-3.5 text-slate-600">
                      {member.email}
                    </td>

                    {/* 5. Joined (Membership Start Date) */}
                    <td className="px-5 py-3.5 text-slate-600 text-xs whitespace-nowrap font-medium">
                      {formatMembershipDate(sub?.startDate)}
                    </td>

                    {/* 6. End date (Membership End Date) */}
                    <td className="px-5 py-3.5 text-slate-600 text-xs whitespace-nowrap font-medium">
                      {formatMembershipDate(sub?.endDate)}
                    </td>

                    {/* 7. Status */}
                    <td className="px-5 py-3.5">
                      {sub ? (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium tracking-wide
                          ${sub.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' :
                            sub.status === 'PENDING' ? 'bg-amber-50 text-amber-700 border border-amber-200/60' :
                            sub.status === 'SCHEDULED' ? 'bg-sky-50 text-sky-700 border border-sky-200/60' :
                            sub.status === 'EXPIRED' ? 'bg-rose-50 text-rose-700 border border-rose-200/60' :
                            'bg-slate-100 text-slate-600 border border-slate-200'}`}
                        >
                          {sub.status}
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-slate-400">—</span>
                      )}
                    </td>

                    {/* 8. Action */}
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
                );
              })}
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
