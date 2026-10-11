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
        <h1 className="text-2xl font-bold tracking-tight text-[#091329]">Content Management (CMS)</h1>
        <p className="mt-1 text-sm text-slate-500">Manage public-facing website content, FAQs, reviews, and settings.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {sections.map(section => (
          <Link key={section.href} href={section.href} className="block group">
            <div className="h-full p-5 bg-white rounded-xl shadow-sm border border-slate-200/90 transition-all hover:shadow-md hover:border-[#B08A4A]/50 group-hover:-translate-y-0.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2.5 bg-[#B08A4A]/10 text-[#B08A4A] rounded-lg group-hover:bg-[#091329] group-hover:text-white transition-colors">
                    <section.icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-semibold text-[#091329] group-hover:text-[#B08A4A] transition-colors">{section.title}</h3>
                </div>
                <p className="text-slate-500 text-sm">{section.description}</p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center text-xs font-medium text-[#B08A4A]">
                <span>Manage section</span>
                <span className="ml-1 transition-transform group-hover:translate-x-1">→</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
