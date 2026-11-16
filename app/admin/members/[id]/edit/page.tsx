import { getMemberDetails } from "@/app/actions/admin"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, UserCog } from "lucide-react"
import { carePricingService } from "@/lib/services/care-plans"
import { MemberEditForm } from "./member-edit-form"

export default async function AdminMemberEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params;
  const member = await getMemberDetails(id);

  if (!member) {
    notFound();
  }

  const catalog = await carePricingService.getCatalog();

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex items-center gap-3">
        <Link
          href={`/admin/members/${member.id}`}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500 hover:text-slate-900"
          title="Back to Member Details"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-[#091329] flex items-center gap-2">
              <UserCog className="h-6 w-6 text-[#091329]" /> Edit Member
            </h1>
            {member.memberProfile?.memberId && (
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                {member.memberProfile.memberId}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Updating details for <span className="font-semibold text-slate-700">{member.name || member.email}</span> (System ID: <code className="font-mono">{member.id}</code>)
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8">
        <MemberEditForm member={member} catalog={catalog} />
      </div>
    </div>
  );
}
