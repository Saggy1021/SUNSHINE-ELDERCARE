import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { AuthorizationService } from "@/lib/services/authorization";
import { CmsService } from "@/lib/services/cms";
import TestimonialsClient from "./TestimonialsClient";
import { Star, ShieldAlert } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Testimonials — Admin" };

export default async function AdminTestimonialsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/admin/content/testimonials");

  const canView = await AuthorizationService.can(session.user.id, 'CONTENT_VIEW');
  if (!canView) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#091329] flex items-center gap-2">
            <Star className="h-6 w-6 text-[#091329]" /> Testimonials Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">Manage public-facing testimonials and client reviews.</p>
        </div>

        <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-8 text-center space-y-3">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900">Access Restricted</h2>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            You do not have the required permission (<code className="font-mono text-xs bg-rose-100/80 px-1.5 py-0.5 rounded text-rose-700">CONTENT_VIEW</code>) to view Testimonials. Please contact an administrator or account owner to request access.
          </p>
          <div className="pt-2">
            <Link
              href="/admin/content"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
            >
              Return to Content Management
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const canManage = await AuthorizationService.can(session.user.id, 'CONTENT_MANAGE');
  const testimonials = await CmsService.getTestimonials(session.user.id);

  const serializedTestimonials = testimonials.map((t) => ({
    ...t,
    createdAt: t.createdAt instanceof Date ? t.createdAt.toISOString() : t.createdAt,
    updatedAt: t.updatedAt instanceof Date ? t.updatedAt.toISOString() : t.updatedAt,
  }));

  return <TestimonialsClient initialTestimonials={serializedTestimonials} canManage={canManage} />;
}
