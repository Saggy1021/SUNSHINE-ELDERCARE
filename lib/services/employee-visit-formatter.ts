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
