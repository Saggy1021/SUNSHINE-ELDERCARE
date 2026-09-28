import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { AuthorizationService } from "@/lib/services/authorization";
import { CmsService } from "@/lib/services/cms";
import SettingsClient from "./SettingsClient";

export default async function AdminSettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/admin/content/settings");

  try {
    await AuthorizationService.require(session.user.id, 'CONTENT_VIEW');
  } catch {
    redirect("/admin");
  }

  const canManage = await AuthorizationService.can(session.user.id, 'CONTENT_MANAGE');
  const settings = await CmsService.getSettings(session.user.id);

  return <SettingsClient initialSettings={settings} canManage={canManage} />;
}
