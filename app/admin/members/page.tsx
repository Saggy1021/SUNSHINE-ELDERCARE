import { getMembers } from "@/app/actions/admin"
import Link from "next/link"
import { Users, ChevronRight, ArrowUpDown } from "lucide-react"
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
  searchParams: Promise<{ q?: string; p?: string; sort?: string; dir?: string }>
}) {
  const { q, p, sort, dir } = await searchParams;
  const page = p ? parseInt(p, 10) : 1;
  const limit = 50;
  const sortDirection = dir === "desc" ? "desc" : "asc";
  const { members, total, pages } = await getMembers(q, page, limit, sort, sortDirection);

  const baseParams = new URLSearchParams();
  if (q) baseParams.set("q", q);
  if (p) baseParams.set("p", p);

  const getSortUrl = (columnKey: string) => {
    const nextDir = sort === columnKey && sortDirection === "asc" ? "desc" : "asc";
    const params = new URLSearchParams(baseParams);
    params.set("sort", columnKey);
    params.set("dir", nextDir);
    return `/admin/members?${params.toString()}`;
  };

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

        {/* Compact, horizontally scrollable table with sticky headers */}
        <div className="overflow-x-auto max-h-[calc(100vh-240px)] overflow-y-auto">
          <table className="min-w-[1550px] w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-slate-50/95 backdrop-blur-xs z-10 border-b border-slate-200 text-slate-600 text-[11px] font-semibold uppercase tracking-wider shadow-2xs">
              <tr>
                {/* 1. Ser No */}
                <th className="px-3.5 py-3 text-center w-16">
                  <Link href={getSortUrl("serNo")} className="inline-flex items-center gap-1 hover:text-[#091329]">
                    <span>Ser No</span>
                    <ArrowUpDown className={`h-3 w-3 ${sort === 'serNo' ? 'text-[#091329]' : 'text-slate-400'}`} />
                  </Link>
                </th>

                {/* 2. MID */}
                <th className="px-3.5 py-3 whitespace-nowrap">
                  <Link href={getSortUrl("mid")} className="inline-flex items-center gap-1 hover:text-[#091329]">
                    <span>MID</span>
                    <ArrowUpDown className={`h-3 w-3 ${sort === 'mid' ? 'text-[#091329]' : 'text-slate-400'}`} />
                  </Link>
                </th>

                {/* 3. Name of Primary Member */}
                <th className="px-3.5 py-3 whitespace-nowrap">
                  <Link href={getSortUrl("primaryMember")} className="inline-flex items-center gap-1 hover:text-[#091329]">
                    <span>Name of Primary Member</span>
                    <ArrowUpDown className={`h-3 w-3 ${sort === 'primaryMember' ? 'text-[#091329]' : 'text-slate-400'}`} />
                  </Link>
                </th>

                {/* 4. Name of Secondary Member */}
                <th className="px-3.5 py-3 whitespace-nowrap">
                  <span>Name of Secondary Member</span>
                </th>

                {/* 5. DOE */}
                <th className="px-3.5 py-3 whitespace-nowrap">
                  <span>DOE</span>
                </th>

                {/* 6. Service */}
                <th className="px-3.5 py-3 whitespace-nowrap">
                  <span>Service</span>
                </th>

                {/* 7. From */}
                <th className="px-3.5 py-3 whitespace-nowrap">
                  <Link href={getSortUrl("from")} className="inline-flex items-center gap-1 hover:text-[#091329]">
                    <span>From</span>
                    <ArrowUpDown className={`h-3 w-3 ${sort === 'from' ? 'text-[#091329]' : 'text-slate-400'}`} />
                  </Link>
                </th>

                {/* 8. To */}
                <th className="px-3.5 py-3 whitespace-nowrap">
                  <Link href={getSortUrl("to")} className="inline-flex items-center gap-1 hover:text-[#091329]">
                    <span>To</span>
                    <ArrowUpDown className={`h-3 w-3 ${sort === 'to' ? 'text-[#091329]' : 'text-slate-400'}`} />
                  </Link>
                </th>

                {/* 9. Service Address */}
                <th className="px-3.5 py-3 whitespace-nowrap">
                  <span>Service Address</span>
                </th>

                {/* 10. Mobile No */}
                <th className="px-3.5 py-3 whitespace-nowrap">
                  <span>Mobile No</span>
                </th>

                {/* 11. Email ID */}
                <th className="px-3.5 py-3 whitespace-nowrap">
                  <span>Email ID</span>
                </th>

                {/* 12. Blood Group */}
                <th className="px-3.5 py-3 text-center whitespace-nowrap">
                  <span>Blood Group</span>
                </th>

                {/* 13. Medical Condition */}
                <th className="px-3.5 py-3 whitespace-nowrap">
                  <span>Medical Condition</span>
                </th>

                {/* 14. Health Insurance */}
                <th className="px-3.5 py-3 whitespace-nowrap">
                  <span>Health Insurance</span>
                </th>

                {/* 15. SCH Visit */}
                <th className="px-3.5 py-3 whitespace-nowrap">
                  <span>SCH Visit</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {members.length === 0 ? (
                <tr>
                  <td colSpan={15} className="px-6 py-12 text-center text-slate-500">
                    No members found.
                  </td>
                </tr>
              ) : members.map((member: any) => {
                const sub = member.subscriptions?.[0];
                return (
                  <tr key={member.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* 1. Ser No */}
                    <td className="px-3.5 py-3 text-center font-mono text-xs text-slate-500 whitespace-nowrap w-16">
                      {member.serialNumber !== null ? (
                        <span className="font-semibold text-slate-800">{member.serialNumber}</span>
                      ) : (
                        <span className="text-slate-400 font-mono">—</span>
                      )}
                    </td>

                    {/* 2. MID */}
                    <td className="px-3.5 py-3 whitespace-nowrap">
                      {member.memberProfile?.memberId ? (
                        <Link 
                          href={`/admin/members/${member.id}`}
                          className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-2 py-0.5 rounded hover:bg-indigo-100 hover:border-indigo-300 transition-colors"
                          title="View Member Details"
                        >
                          <span>{member.memberProfile.memberId}</span>
                          <ChevronRight className="h-3 w-3 text-indigo-400" />
                        </Link>
                      ) : (
                        <span className="text-slate-400 font-mono text-xs">—</span>
                      )}
                    </td>

                    {/* 3. Name of Primary Member */}
                    <td className="px-3.5 py-3 font-medium text-slate-900 whitespace-nowrap">
                      <Link 
                        href={`/admin/members/${member.id}`}
                        className="inline-flex items-center gap-1.5 hover:text-[#B08A4A] transition-colors"
                        title="View Member Details"
                      >
                        <span className="font-semibold">{member.name || "—"}</span>
                        <ChevronRight className="h-3.5 w-3.5 text-slate-400 hover:text-[#091329]" />
                      </Link>
                    </td>

                    {/* 4. Name of Secondary Member */}
                    <td className="px-3.5 py-3 text-slate-700 whitespace-nowrap">
                      {member.secondaryName || "—"}
                    </td>

                    {/* 5. DOE: Actual date of enrollment. Never substitute account creation date for DOE. */}
                    <td className="px-3.5 py-3 text-slate-600 text-xs whitespace-nowrap font-medium">
                      {member.memberProfile?.dateOfEnrollment ? formatMembershipDate(member.memberProfile.dateOfEnrollment) : "—"}
                    </td>

                    {/* 6. Service */}
                    <td className="px-3.5 py-3 text-slate-700 text-xs whitespace-nowrap">
                      {member.service || "—"}
                    </td>

                    {/* 7. From */}
                    <td className="px-3.5 py-3 text-slate-600 text-xs whitespace-nowrap font-medium">
                      {formatMembershipDate(sub?.startDate)}
                    </td>

                    {/* 8. To */}
                    <td className="px-3.5 py-3 text-slate-600 text-xs whitespace-nowrap font-medium">
                      {formatMembershipDate(sub?.endDate)}
                    </td>

                    {/* 9. Service Address */}
                    <td className="px-3.5 py-3 text-slate-600 text-xs max-w-xs truncate" title={member.memberProfile?.serviceAddress || ""}>
                      {member.memberProfile?.serviceAddress || "—"}
                    </td>

                    {/* 10. Mobile No */}
                    <td className="px-3.5 py-3 text-slate-700 font-mono text-xs whitespace-nowrap">
                      {member.memberProfile?.mobileNumber || "—"}
                    </td>

                    {/* 11. Email ID */}
                    <td className="px-3.5 py-3 text-slate-600 text-xs whitespace-nowrap">
                      {member.email || "—"}
                    </td>

                    {/* 12. Blood Group */}
                    <td className="px-3.5 py-3 text-center whitespace-nowrap">
                      {member.memberProfile?.bloodGroup ? (
                        <span className="inline-block bg-slate-100 text-slate-800 font-semibold font-mono px-2 py-0.5 rounded border border-slate-200">
                          {member.memberProfile.bloodGroup}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-mono">—</span>
                      )}
                    </td>

                    {/* 13. Medical Condition */}
                    <td className="px-3.5 py-3 text-slate-600 text-xs max-w-xs truncate" title={member.maskedMedicalConditions || ""}>
                      {member.maskedMedicalConditions || "—"}
                    </td>

                    {/* 14. Health Insurance */}
                    <td className="px-3.5 py-3 text-slate-600 text-xs whitespace-nowrap">
                      {member.insuranceProvider || "—"}
                    </td>

                    {/* 15. SCH Visit */}
                    <td className="px-3.5 py-3 text-slate-700 text-xs whitespace-nowrap font-medium">
                      {formatMembershipDate(member.scheduledVisitDate)}
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
              <Link href={`/admin/members?${q ? 'q=' + q + '&' : ''}${sort ? 'sort=' + sort + '&dir=' + sortDirection + '&' : ''}p=${page - 1}`} className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 text-xs font-medium rounded-md hover:bg-slate-50 shadow-2xs transition-colors">
                Previous
              </Link>
            )}
            {page < pages && (
              <Link href={`/admin/members?${q ? 'q=' + q + '&' : ''}${sort ? 'sort=' + sort + '&dir=' + sortDirection + '&' : ''}p=${page + 1}`} className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 text-xs font-medium rounded-md hover:bg-slate-50 shadow-2xs transition-colors">
                Next
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
