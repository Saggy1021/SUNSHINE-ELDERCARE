import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { AuthorizationService } from "@/lib/services/authorization";
import { CmsService } from "@/lib/services/cms";
import TestimonialsClient from "./TestimonialsClient";

export default async function AdminTestimonialsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/admin/content/testimonials");

  try {
    await AuthorizationService.require(session.user.id, 'CONTENT_VIEW');
  } catch {
    redirect("/admin");
  }

  const canManage = await AuthorizationService.can(session.user.id, 'CONTENT_MANAGE');
  const testimonials = await CmsService.getTestimonials(session.user.id);

  return <TestimonialsClient initialTestimonials={testimonials} canManage={canManage} />;
}
