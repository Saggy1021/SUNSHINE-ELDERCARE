import { EmergencyService } from "@/lib/services/emergency";
import { EmergencyHistoryClient } from "@/components/emergency/EmergencyHistoryClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Incident Archive & History - EmergencyOS",
};

export default async function EmergencyHistoryPage() {
  const history = await EmergencyService.getIncidentHistory({
    page: 1,
    limit: 20,
  });

  const serializedIncidents = history.incidents.map((inc) => ({
    ...inc,
    triggeredAt: inc.triggeredAt.toISOString(),
    resolvedAt: inc.resolvedAt?.toISOString() || null,
  }));

  return (
    <EmergencyHistoryClient
      initialIncidents={serializedIncidents as any}
      initialTotal={history.total}
      initialPage={history.page}
      initialTotalPages={history.totalPages}
    />
  );
}
