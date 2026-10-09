import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { AuthorizationService } from "@/lib/services/authorization";
import Link from "next/link";
import { FileText, MessageCircle, Settings, Users, Star } from "lucide-react";

export default async function ContentDashboard() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/admin/content");

  try {
    await AuthorizationService.require(session.user.id, 'CONTENT_VIEW');
  } catch {
    redirect("/admin");
  }

  const sections = [
    { title: "Website Pages", description: "Manage content for Home, About Us, Services, etc.", href: "/admin/content/pages", icon: FileText },
    { title: "FAQs", description: "Manage frequently asked questions", href: "/admin/content/faqs", icon: MessageCircle },
    { title: "Testimonials", description: "Manage client reviews and testimonials", href: "/admin/content/testimonials", icon: Star },
    { title: "Settings", description: "Manage global website settings (contact info, footer)", href: "/admin/content/settings", icon: Settings },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Content Management (CMS)</h1>
        <p className="mt-2 text-slate-500">Manage public-facing website content.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sections.map(section => (
          <Link key={section.href} href={section.href} className="block group">
            <div className="h-full p-6 bg-white rounded-xl shadow-sm border border-slate-200 transition-all hover:shadow-md hover:border-amber-400 group-hover:-translate-y-1">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-amber-50 text-amber-600 rounded-lg group-hover:bg-amber-100 transition-colors">
                  <section.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 group-hover:text-amber-600 transition-colors">{section.title}</h3>
              </div>
              <p className="text-slate-600 text-sm">{section.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
