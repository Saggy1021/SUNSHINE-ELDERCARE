import { EmergencyNewIncidentClient } from "@/components/emergency/EmergencyNewIncidentClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "New Emergency Incident - EmergencyOS",
};

export default function NewEmergencyIncidentPage() {
  return <EmergencyNewIncidentClient />;
}
