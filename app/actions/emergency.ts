"use server";

import { auth } from "@/auth";
import { AuthorizationService } from "@/lib/services/authorization";
import {
  EmergencyService,
  EmergencyClassification,
  EmergencyStatus,
} from "@/lib/services/emergency";
import { revalidatePath } from "next/cache";

async function requireEmergencyUser() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized: Please sign in");
  }

  const hasAccess = await AuthorizationService.hasEmergencyAccess(
    session.user.id,
    session.user.email
  );
  if (!hasAccess) {
    throw new Error("Unauthorized: EmergencyOS operational access required");
  }

  const isSupervisor = await AuthorizationService.isEmergencySupervisor(
    session.user.id,
    session.user.email
  );

  return {
    userId: session.user.id,
    userName: session.user.name || session.user.email || "Emergency Operator",
    email: session.user.email,
    isSupervisor,
  };
}

export async function getEmergencyDashboardAction() {
  await requireEmergencyUser();
  return EmergencyService.getDashboardFeed();
}

export async function getEmergencyIncidentAction(id: string) {
  await requireEmergencyUser();
  return EmergencyService.getIncidentById(id);
}

export async function getEmergencyRespondersAction() {
  await requireEmergencyUser();
  return EmergencyService.getAvailableResponders();
}

export async function acknowledgeEmergencyIncidentAction(incidentId: string) {
  const user = await requireEmergencyUser();
  const res = await EmergencyService.acknowledgeIncident(
    incidentId,
    user.userId,
    user.userName
  );
  revalidatePath("/emergencyos");
  revalidatePath(`/emergencyos/incidents/${incidentId}`);
  return { success: true, incident: res };
}

export async function classifyEmergencyIncidentAction(
  incidentId: string,
  newClassification: EmergencyClassification,
  reason: string
) {
  const user = await requireEmergencyUser();
  const res = await EmergencyService.classifyIncident({
    incidentId,
    newClassification,
    reason,
    actorId: user.userId,
    actorName: user.userName,
    isSupervisor: user.isSupervisor,
  });
  revalidatePath("/emergencyos");
  revalidatePath(`/emergencyos/incidents/${incidentId}`);
  return { success: true, incident: res };
}

export async function dispatchEmergencyResponderAction(
  incidentId: string,
  employeeId: string,
  notes?: string
) {
  const user = await requireEmergencyUser();
  const res = await EmergencyService.dispatchResponder({
    incidentId,
    employeeId,
    notes,
    actorId: user.userId,
    actorName: user.userName,
  });
  revalidatePath("/emergencyos");
  revalidatePath(`/emergencyos/incidents/${incidentId}`);
  return { success: true, incident: res };
}

export async function recordEmergencyArrivalAction(
  incidentId: string,
  notes?: string
) {
  const user = await requireEmergencyUser();
  const res = await EmergencyService.recordArrival({
    incidentId,
    notes,
    actorId: user.userId,
    actorName: user.userName,
  });
  revalidatePath("/emergencyos");
  revalidatePath(`/emergencyos/incidents/${incidentId}`);
  return { success: true, incident: res };
}

export async function recordEmergencySafetyAction(
  incidentId: string,
  confirmedBy: string,
  safetyNotes: string
) {
  const user = await requireEmergencyUser();
  const res = await EmergencyService.recordSafetyConfirmation({
    incidentId,
    confirmedBy,
    safetyNotes,
    actorId: user.userId,
    actorName: user.userName,
  });
  revalidatePath("/emergencyos");
  revalidatePath(`/emergencyos/incidents/${incidentId}`);
  return { success: true, incident: res };
}

export async function logEmergencyCallAction(
  incidentId: string,
  recipient: string,
  phone: string,
  outcome: "ANSWERED" | "BUSY" | "NO_ANSWER" | "VOICEMAIL" | "FAILED",
  details: string
) {
  const user = await requireEmergencyUser();
  const res = await EmergencyService.logCall({
    incidentId,
    recipient,
    phone,
    outcome,
    details,
    actorId: user.userId,
    actorName: user.userName,
  });
  revalidatePath(`/emergencyos/incidents/${incidentId}`);
  return { success: true, log: res };
}

export async function addEmergencyNoteAction(incidentId: string, note: string) {
  const user = await requireEmergencyUser();
  const res = await EmergencyService.addNote({
    incidentId,
    note,
    actorId: user.userId,
    actorName: user.userName,
  });
  revalidatePath(`/emergencyos/incidents/${incidentId}`);
  return { success: true, log: res };
}

export async function resolveEmergencyIncidentAction(
  incidentId: string,
  resolutionNotes: string
) {
  const user = await requireEmergencyUser();
  const res = await EmergencyService.resolveIncident({
    incidentId,
    resolutionNotes,
    actorId: user.userId,
    actorName: user.userName,
  });
  revalidatePath("/emergencyos");
  revalidatePath(`/emergencyos/incidents/${incidentId}`);
  revalidatePath("/emergencyos/history");
  return { success: true, incident: res };
}

export async function getEmergencyHistoryAction(params: {
  query?: string;
  classification?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}) {
  await requireEmergencyUser();
  return EmergencyService.getIncidentHistory({
    query: params.query,
    classification: params.classification,
    status: params.status,
    fromDate: params.fromDate ? new Date(params.fromDate) : undefined,
    toDate: params.toDate ? new Date(params.toDate) : undefined,
    page: params.page,
    limit: params.limit,
  });
}
