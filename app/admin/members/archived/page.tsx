import { getMembers } from "@/app/actions/admin"
import { auth } from "@/auth"
import { AuthorizationService } from "@/lib/services/authorization"
import { MemberLifecycleActions } from "@/components/admin/member-lifecycle-actions"
import { MembersSearch } from "../members-search"
import { formatMembershipDate } from "../page"
import Link from "next/link"
import { Archive, Users, ChevronRight, ArrowUpDown, AlertCircle, ArrowLeft } from "lucide-react"

export default async function AdminArchivedMembersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; p?: string; sort?: string; dir?: string }>
}) {
  const { q, p, sort, dir } = await searchParams;
  const page = p ? parseInt(p, 10) : 1;
  const limit = 50;
  const sortDirection = dir === "desc" ? "desc" : "asc";

  const session = await auth();
  const currentUserId = session?.user?.id;
  const isOwner = currentUserId ? await AuthorizationService.isOwner(currentUserId) : false;

  // Query only archived members
  const { members, total, pages, archivedCount } = await getMembers(q, page, limit, sort, sortDirection, true);

  const baseParams = new URLSearchParams();
  if (q) baseParams.set("q", q);
  if (p) baseParams.set("p", p);

  const getSortUrl = (columnKey: string) => {
    const nextDir = sort === columnKey && sortDirection === "asc" ? "desc" : "asc";
    const params = new URLSearchParams(baseParams);
    params.set("sort", columnKey);
    params.set("dir", nextDir);
    return `/admin/members/archived?${params.toString()}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/members"
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-900 transition-colors"
              title="Back to Active Members"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-[#091329] flex items-center gap-2">
              <Archive className="h-6 w-6 text-amber-600" /> Archived Members
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1 pl-9">
            View archived members, restore them to the active roster, or permanently delete eligible accounts.
          </p>
        </div>
        <Link
          href="/admin/members"
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-800 text-sm font-semibold rounded-lg hover:bg-slate-200 transition-colors self-start sm:self-auto"
        >
          <Users className="h-4 w-4" /> View Active Members
        </Link>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <Link
          href="/admin/members"
          className="px-4 py-2 text-sm font-medium border-b-2 border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300 -mb-px flex items-center gap-2 transition-colors"
        >
          <span>Active Members</span>
        </Link>
        <Link
          href="/admin/members/archived"
          className="px-4 py-2 text-sm font-semibold border-b-2 border-amber-600 text-amber-700 -mb-px flex items-center gap-2"
        >
          <span>Archived Members</span>
          <span className="px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-800 font-semibold font-mono">
            {total}
          </span>
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-4 bg-slate-50/50">
          <MembersSearch />
          <div className="text-xs text-slate-500 font-medium">
            {total} {total === 1 ? "archived member" : "archived members"}
          </div>
        </div>

        {members.length === 0 ? (
          <div className="py-16 px-4 text-center">
            <Archive className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-900">No Archived Members</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto mt-1">
              There are currently no archived members in the system. Members archived from their detail page will appear here.
            </p>
            <div className="mt-5">
              <Link
                href="/admin/members"
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#091329] text-white text-xs font-semibold rounded-lg hover:bg-[#162850] transition-colors"
              >
                Go to Active Members
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-slate-50/95 backdrop-blur-xs z-10 border-b border-slate-200 text-slate-600 text-[11px] font-semibold uppercase tracking-wider shadow-2xs">
                <tr>
                  <th className="px-4 py-3 whitespace-nowrap">MID</th>
                  <th className="px-4 py-3 whitespace-nowrap">Member Name</th>
                  <th className="px-4 py-3 whitespace-nowrap">Email</th>
                  <th className="px-4 py-3 whitespace-nowrap">Primary Mobile</th>
                  <th className="px-4 py-3 whitespace-nowrap">Status</th>
                  <th className="px-4 py-3 whitespace-nowrap text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {members.map((member: any) => {
                  return (
                    <tr key={member.id} className="hover:bg-amber-50/30 transition-colors">
                      <td className="px-4 py-3 font-mono font-semibold text-slate-900 whitespace-nowrap">
                        {member.memberProfile?.memberId || "—"}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">
                        <Link
                          href={`/admin/members/${member.id}`}
                          className="inline-flex items-center gap-1.5 hover:text-[#B08A4A] transition-colors"
                        >
                          <span className="font-semibold">{member.name || "—"}</span>
                          <ChevronRight className="h-3.5 w-3.5 text-slate-400 hover:text-[#091329]" />
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-xs whitespace-nowrap">
                        {member.email || "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-700 font-mono text-xs whitespace-nowrap">
                        {member.memberProfile?.mobileNumber || "—"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                          <Archive className="h-3 w-3" /> ARCHIVED
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <div className="inline-flex justify-end">
                          <MemberLifecycleActions
                            memberUserId={member.id}
                            memberName={member.name || member.email}
                            memberId={member.memberProfile?.memberId || null}
                            status={member.status}
                            isOwner={isOwner}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {pages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50 text-sm">
            <div className="text-slate-500 text-xs sm:text-sm">
              Showing <span className="font-medium text-slate-900">{members.length}</span> of <span className="font-medium text-slate-900">{total}</span> archived members
            </div>
            <div className="flex gap-2">
              {page > 1 && (
                <Link
                  href={`/admin/members/archived?${q ? 'q=' + q + '&' : ''}${sort ? 'sort=' + sort + '&dir=' + sortDirection + '&' : ''}p=${page - 1}`}
                  className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 text-xs font-medium rounded-md hover:bg-slate-50 shadow-2xs transition-colors"
                >
                  Previous
                </Link>
              )}
              {page < pages && (
                <Link
                  href={`/admin/members/archived?${q ? 'q=' + q + '&' : ''}${sort ? 'sort=' + sort + '&dir=' + sortDirection + '&' : ''}p=${page + 1}`}
                  className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 text-xs font-medium rounded-md hover:bg-slate-50 shadow-2xs transition-colors"
                >
                  Next
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
