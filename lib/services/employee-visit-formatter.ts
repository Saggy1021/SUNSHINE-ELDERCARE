// Unified CareVisit Formatter for Employee App API

export const careVisitEmployeeIncludes = {
  careCase: {
    include: {
      elder: {
        include: {
          user: {
            include: {
              memberProfile: true,
            },
          },
        },
      },
    },
  },
  assignments: true,
  assignedEmp: true,
};

export function formatTime12HourIST(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

export function formatDateIST(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatEmployeeVisit(v: any) {
  const elder = v.careCase?.elder;
  const memberUser = elder?.user;
  const profile = memberUser?.memberProfile;

  // Primary member name with salutation
  const primaryName =
    [
      profile?.salutation?.trim(),
      profile?.firstName?.trim() || memberUser?.name,
      profile?.lastName?.trim(),
    ]
      .filter(Boolean)
      .join(" ")
      .trim() || "Member";

  // Spouse full name with salutation, or null
  const hasSpouse = Boolean(
    profile?.spouseFirstName?.trim() || profile?.spouseLastName?.trim()
  );
  const spouseNameDisplay = hasSpouse
    ? [
        profile?.spouseSalutation?.trim(),
        profile?.spouseFirstName?.trim(),
        profile?.spouseLastName?.trim(),
      ]
        .filter(Boolean)
        .join(" ")
        .trim()
    : null;

  const scheduledWindowDisplay = `${formatTime12HourIST(v.scheduledStart)} – ${formatTime12HourIST(v.scheduledEnd)}`;

  return {
    id: v.id,
    memberId: profile?.memberId || "",
    primaryMemberName: primaryName,
    spouseName: spouseNameDisplay,
    primaryMobile: profile?.mobileNumber || "",
    serviceAddress: profile?.serviceAddress || "",
    scheduledDate: formatDateIST(v.scheduledStart),
    scheduledStartTime: formatTime12HourIST(v.scheduledStart),
    scheduledEndTime: formatTime12HourIST(v.scheduledEnd),
    scheduledWindowDisplay,
    actualArrivalDisplay: v.actualStart ? formatTime12HourIST(v.actualStart) : null,
    actualDepartureDisplay: v.actualEnd ? formatTime12HourIST(v.actualEnd) : null,
    workDescription: v.workDescription || null,
    status: v.status,
    completedAt: v.completedAt ? v.completedAt.toISOString() : null,
    isEmergency: false,
    emergencyClassification: null as string | null,

    // Nested structures for full backward compatibility:
    member: {
      primaryName,
      spouseName: spouseNameDisplay || "—",
      memberId: profile?.memberId || null,
      mobileNumber: profile?.mobileNumber || null,
      serviceAddress: profile?.serviceAddress || null,
    },
    scheduled: {
      start: v.scheduledStart.toISOString(),
      end: v.scheduledEnd.toISOString(),
      dateDisplay: formatDateIST(v.scheduledStart),
      timeDisplay: scheduledWindowDisplay,
      startTimeDisplay: formatTime12HourIST(v.scheduledStart),
      endTimeDisplay: formatTime12HourIST(v.scheduledEnd),
    },
    actual: {
      arrival: v.actualStart ? v.actualStart.toISOString() : null,
      departure: v.actualEnd ? v.actualEnd.toISOString() : null,
      arrivalDisplay: v.actualStart ? formatTime12HourIST(v.actualStart) : null,
      departureDisplay: v.actualEnd ? formatTime12HourIST(v.actualEnd) : null,
      arrivalDateDisplay: v.actualStart ? formatDateIST(v.actualStart) : null,
      departureDateDisplay: v.actualEnd ? formatDateIST(v.actualEnd) : null,
    },
    operationalNotes: v.operationalNotes || null,
  };
}

export function formatEmergencyIncidentAsVisit(incident: any) {
  const profile = incident.user?.memberProfile;
  const name =
    incident.callerName ||
    (profile ? `${profile.firstName || ""} ${profile.lastName || ""}`.trim() : "Member");
  const phone = incident.callerPhone || profile?.mobileNumber || "";
  const address =
    incident.fallbackAddress || profile?.serviceAddress || "Emergency Location Provided";
  const start = incident.dispatchedAt || incident.triggeredAt || new Date();

  return {
    id: incident.id,
    memberId: incident.memberId || profile?.memberId || "EMERGENCY",
    primaryMemberName: name,
    spouseName: null,
    primaryMobile: phone,
    serviceAddress: address,
    scheduledDate: formatDateIST(start),
    scheduledStartTime: formatTime12HourIST(start),
    scheduledEndTime: "IMMEDIATE",
    scheduledWindowDisplay: "EMERGENCY DISPATCH",
    actualArrivalDisplay: incident.responderArrivedAt
      ? formatTime12HourIST(incident.responderArrivedAt)
      : null,
    actualDepartureDisplay: incident.resolvedAt
      ? formatTime12HourIST(incident.resolvedAt)
      : null,
    workDescription: `🚨 CODE RED EMERGENCY DISPATCH: ${incident.incidentNumber}${
      incident.dispatchNotes ? " - " + incident.dispatchNotes : ""
    }`,
    status:
      incident.status === "RESOLVED"
        ? "COMPLETED"
        : incident.status === "CANCELLED"
        ? "CANCELLED"
        : "IN_PROGRESS",
    completedAt: incident.resolvedAt ? incident.resolvedAt.toISOString() : null,
    isEmergency: true,
    emergencyClassification: incident.classification || "CODE_RED",
    incidentNumber: incident.incidentNumber,
    member: {
      primaryName: name,
      spouseName: "—",
      memberId: incident.memberId || profile?.memberId || "EMERGENCY",
      mobileNumber: phone,
      serviceAddress: address,
    },
    scheduled: {
      start: start.toISOString(),
      end: start.toISOString(),
      dateDisplay: formatDateIST(start),
      timeDisplay: "EMERGENCY DISPATCH",
      startTimeDisplay: formatTime12HourIST(start),
      endTimeDisplay: "IMMEDIATE",
    },
    actual: {
      arrival: incident.responderArrivedAt
        ? incident.responderArrivedAt.toISOString()
        : null,
      departure: incident.resolvedAt ? incident.resolvedAt.toISOString() : null,
      arrivalDisplay: incident.responderArrivedAt
        ? formatTime12HourIST(incident.responderArrivedAt)
        : null,
      departureDisplay: incident.resolvedAt
        ? formatTime12HourIST(incident.resolvedAt)
        : null,
      arrivalDateDisplay: incident.responderArrivedAt
        ? formatDateIST(incident.responderArrivedAt)
        : null,
      departureDateDisplay: incident.resolvedAt
        ? formatDateIST(incident.resolvedAt)
        : null,
    },
    operationalNotes: incident.dispatchNotes || incident.triggerNotes || null,
  };
}
