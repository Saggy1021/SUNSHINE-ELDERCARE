import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { AuthorizationService } from "@/lib/services/authorization";
import { CmsService } from "@/lib/services/cms";
import FaqClient from "./FaqClient";

export default async function AdminFaqsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/admin/content/faqs");

  try {
    await AuthorizationService.require(session.user.id, 'CONTENT_VIEW');
  } catch {
    redirect("/admin");
  }

  const canManage = await AuthorizationService.can(session.user.id, 'CONTENT_MANAGE');
  const faqs = await CmsService.getFaqs(session.user.id);

  return <FaqClient initialFaqs={faqs} canManage={canManage} />;
}
