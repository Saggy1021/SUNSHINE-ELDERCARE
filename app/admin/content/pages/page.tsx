import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { AuthorizationService } from "@/lib/services/authorization";
import { CmsService } from "@/lib/services/cms";
import PagesClient from "./PagesClient";

export default async function AdminPagesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/admin/content/pages");

  try {
    await AuthorizationService.require(session.user.id, 'CONTENT_VIEW');
  } catch {
    redirect("/admin");
  }

  const canManage = await AuthorizationService.can(session.user.id, 'CONTENT_MANAGE');
  const pages = await CmsService.getPages(session.user.id);

  return <PagesClient initialPages={pages} canManage={canManage} />;
}
