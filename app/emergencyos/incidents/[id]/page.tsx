import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { AuthorizationService } from "@/lib/services/authorization";
import { EmergencyService } from "@/lib/services/emergency";
import { EmergencyIncidentConsoleClient } from "@/components/emergency/EmergencyIncidentConsoleClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const incident = await EmergencyService.getIncidentById(id);
  if (!incident) {
    return { title: "Incident Not Found - EmergencyOS" };
  }
  return {
    title: `${incident.incidentNumber} - EmergencyOS Command Console`,
  };
}

export default async function EmergencyIncidentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  const [incident, responders, isSupervisor] = await Promise.all([
    EmergencyService.getIncidentById(id),
    EmergencyService.getAvailableResponders(),
    session?.user?.id
      ? AuthorizationService.isEmergencySupervisor(
          session.user.id,
          session.user.email
        )
      : false,
  ]);

  if (!incident) {
    notFound();
  }

  // Serialize dates for client
  const serializedIncident = {
    ...incident,
    triggeredAt: incident.triggeredAt.toISOString(),
    acknowledgedAt: incident.acknowledgedAt?.toISOString() || null,
    dispatchedAt: incident.dispatchedAt?.toISOString() || null,
    responderArrivedAt: incident.responderArrivedAt?.toISOString() || null,
    resolvedAt: incident.resolvedAt?.toISOString() || null,
    safetyConfirmedAt: incident.safetyConfirmedAt?.toISOString() || null,
    downgradeApprovedAt: incident.downgradeApprovedAt?.toISOString() || null,
    locationTimestamp: incident.locationTimestamp?.toISOString() || null,
    logs: ((incident as any).logs || []).map((l: any) => ({
      ...l,
      createdAt: l.createdAt.toISOString(),
    })),
  };

  const currentUserName =
    session?.user?.name || session?.user?.email || "Emergency Operator";

  return (
    <EmergencyIncidentConsoleClient
      initialIncident={serializedIncident as any}
      responders={responders}
      isSupervisor={isSupervisor}
      currentUserName={currentUserName}
    />
  );
}
