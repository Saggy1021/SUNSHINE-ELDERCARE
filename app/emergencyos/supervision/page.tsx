import { auth } from "@/auth";
import { db } from "@/lib/db";
import { AuthorizationService } from "@/lib/services/authorization";
import { EmergencySupervisionClient } from "@/components/emergency/EmergencySupervisionClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Supervision & SLA Escalations - EmergencyOS",
};

export default async function EmergencySupervisionPage() {
  const session = await auth();
  const isSupervisor = session?.user?.id
    ? await AuthorizationService.isEmergencySupervisor(
        session.user.id,
        session.user.email
      )
    : false;

  const [downgradedIncidents, activeIncidents] = await Promise.all([
    db.emergencyIncident.findMany({
      where: {
        downgradedById: { not: null },
      },
      select: {
        id: true,
        incidentNumber: true,
        classification: true,
        previousClassification: true,
        callerName: true,
        memberId: true,
        downgradeReason: true,
        downgradeApprovedAt: true,
        downgradedBy: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: { downgradeApprovedAt: "desc" },
      take: 50,
    }),
    db.emergencyIncident.findMany({
      where: {
        status: { in: ["TRIGGERED", "ACKNOWLEDGED", "DISPATCHED"] },
      },
      select: {
        id: true,
        incidentNumber: true,
        classification: true,
        status: true,
        callerName: true,
        triggeredAt: true,
        dispatchedAt: true,
        responderArrivedAt: true,
      },
    }),
  ]);

  const now = Date.now();
  const slaBreaches: any[] = [];

  for (const inc of activeIncidents) {
    const elapsedMinutesFromTrigger = Math.floor(
      (now - inc.triggeredAt.getTime()) / (1000 * 60)
    );

    // Rule 1: Code Red unacknowledged > 120s (2m)
    if (inc.classification === "CODE_RED" && inc.status === "TRIGGERED") {
      if (now - inc.triggeredAt.getTime() > 120 * 1000) {
        slaBreaches.push({
          id: inc.id,
          incidentNumber: inc.incidentNumber,
          classification: inc.classification,
          status: inc.status,
          callerName: inc.callerName,
          triggeredAt: inc.triggeredAt.toISOString(),
          breachType: "UNACKNOWLEDGED_CODE_RED",
          elapsedMinutes: elapsedMinutesFromTrigger,
        });
        continue;
      }
    }

    // Rule 2: Delayed dispatch > 5m
    if (
      (inc.status === "TRIGGERED" || inc.status === "ACKNOWLEDGED") &&
      !inc.dispatchedAt
    ) {
      if (now - inc.triggeredAt.getTime() > 5 * 60 * 1000) {
        slaBreaches.push({
          id: inc.id,
          incidentNumber: inc.incidentNumber,
          classification: inc.classification,
          status: inc.status,
          callerName: inc.callerName,
          triggeredAt: inc.triggeredAt.toISOString(),
          breachType: "DELAYED_DISPATCH",
          elapsedMinutes: elapsedMinutesFromTrigger,
        });
        continue;
      }
    }

    // Rule 3: Delayed arrival > 30m
    if (inc.status === "DISPATCHED" && inc.dispatchedAt && !inc.responderArrivedAt) {
      if (now - inc.dispatchedAt.getTime() > 30 * 60 * 1000) {
        const elapsedDispatchedMin = Math.floor(
          (now - inc.dispatchedAt.getTime()) / (1000 * 60)
        );
        slaBreaches.push({
          id: inc.id,
          incidentNumber: inc.incidentNumber,
          classification: inc.classification,
          status: inc.status,
          callerName: inc.callerName,
          triggeredAt: inc.triggeredAt.toISOString(),
          breachType: "DELAYED_ARRIVAL",
          elapsedMinutes: elapsedDispatchedMin,
        });
      }
    }
  }

  const serializedDowngrades = downgradedIncidents.map((d) => ({
    ...d,
    downgradeApprovedAt: d.downgradeApprovedAt?.toISOString() || null,
  }));

  return (
    <EmergencySupervisionClient
      downgrades={serializedDowngrades as any}
      slaBreaches={slaBreaches}
      isSupervisor={isSupervisor}
    />
  );
}
