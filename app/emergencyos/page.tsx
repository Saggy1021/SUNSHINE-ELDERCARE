import { auth } from "@/auth";
import { AuthorizationService } from "@/lib/services/authorization";
import { EmergencyService } from "@/lib/services/emergency";
import { EmergencyDashboardClient } from "@/components/emergency/EmergencyDashboardClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "EmergencyOS - Operational Incident Command",
};

export default async function EmergencyOSDashboardPage() {
  const session = await auth();
  const isSupervisor = session?.user?.id
    ? await AuthorizationService.isEmergencySupervisor(
        session.user.id,
        session.user.email
      )
    : false;

  const feed = await EmergencyService.getDashboardFeed();

  // Convert Date objects to ISO strings for client props
  const serializedIncidents = feed.activeIncidents.map((inc) => ({
    ...inc,
    triggeredAt: inc.triggeredAt.toISOString(),
    acknowledgedAt: inc.acknowledgedAt?.toISOString() || null,
    safetyConfirmedAt: inc.safetyConfirmedAt?.toISOString() || null,
    dispatchedAt: inc.dispatchedAt?.toISOString() || null,
    responderArrivedAt: inc.responderArrivedAt?.toISOString() || null,
  }));

  return (
    <EmergencyDashboardClient
      initialIncidents={serializedIncidents as any}
      initialMetrics={feed.metrics}
      isSupervisor={isSupervisor}
    />
  );
}
