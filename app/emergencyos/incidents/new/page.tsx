import { db } from "@/lib/db";
import { EmergencyNewIncidentClient } from "@/components/emergency/EmergencyNewIncidentClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "New Emergency Incident - EmergencyOS",
};

export default async function NewEmergencyIncidentPage() {
  const usersWithProfiles = await db.user.findMany({
    where: {
      memberProfile: { isNot: null },
    },
    include: {
      memberProfile: true,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const memberOptions = usersWithProfiles.map((u) => {
    const prof = u.memberProfile;
    const displayName = prof
      ? `${prof.salutation || ""} ${prof.firstName} ${prof.lastName}`.trim()
      : u.name || "Member";
    const address = prof?.serviceAddress || null;

    return {
      id: u.id,
      memberId: prof?.memberId || null,
      name: displayName,
      phone: prof?.mobileNumber || null,
      address,
    };
  });

  return <EmergencyNewIncidentClient members={memberOptions} />;
}
