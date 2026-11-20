import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { AuthorizationService } from "@/lib/services/authorization";
import { EmergencyService } from "@/lib/services/emergency";
import { db } from "@/lib/db";
import { AdminEmergencyMonitoringDashboard } from "@/components/emergency/AdminEmergencyMonitoringDashboard";

export const dynamic = "force-dynamic";

export default async function AdminEmergencyMonitoringPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/admin/emergencyos");
  }

  const isOwner = session.user.email === "info.sunshineeldercare@gmail.com";
  const hasAccess =
    isOwner ||
    (await AuthorizationService.hasEmergencyAccess(session.user.id, session.user.email)) ||
    (await AuthorizationService.hasAdminPortalAccess(session.user.id, session.user.email));

  if (!hasAccess) {
    redirect("/admin");
  }

  // Load live feed from EmergencyService
  const feed = await EmergencyService.getDashboardFeed();
  const activeIncidents = feed.activeIncidents || [];

  const codeRedCount = activeIncidents.filter((i) => i.classification === "CODE_RED").length;
  const codeYellowCount = activeIncidents.filter((i) => i.classification === "CODE_YELLOW").length;
  const codeGreenCount = activeIncidents.filter((i) => i.classification === "CODE_GREEN").length;

  // Count total historical resolved incidents in database
  const totalResolvedCount = await db.emergencyIncident.count({
    where: { status: "RESOLVED" },
  });

  const serializedIncidents = activeIncidents.map((i) => ({
    id: i.id,
    incidentNumber: i.incidentNumber,
    status: i.status,
    classification: i.classification,
    memberId: i.memberId,
    callerName: i.callerName,
    callerPhone: i.callerPhone,
    triggerSource: i.triggerSource,
    triggerNotes: i.triggerNotes,
    fallbackAddress: i.fallbackAddress,
    currentLatitude: i.currentLatitude ? Number(i.currentLatitude) : null,
    currentLongitude: i.currentLongitude ? Number(i.currentLongitude) : null,
    triggeredAt: i.triggeredAt.toISOString(),
    acknowledgedAt: i.acknowledgedAt ? i.acknowledgedAt.toISOString() : null,
    safetyConfirmedAt: i.safetyConfirmedAt ? i.safetyConfirmedAt.toISOString() : null,
    assignedEmployee: i.assignedEmployee
      ? {
          firstName: i.assignedEmployee.firstName,
          lastName: i.assignedEmployee.lastName,
          contactNumber: i.assignedEmployee.contactNumber,
        }
      : null,
  }));

  const initialMetrics = {
    activeCount: activeIncidents.length,
    codeRedCount,
    codeYellowCount,
    codeGreenCount,
    resolvedTodayCount: feed.metrics?.resolvedTodayCount || 0,
    totalResolvedCount,
  };

  return (
    <AdminEmergencyMonitoringDashboard
      initialIncidents={serializedIncidents}
      initialMetrics={initialMetrics}
    />
  );
}
