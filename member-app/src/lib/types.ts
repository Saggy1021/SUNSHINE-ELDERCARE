/**
 * Data contracts for Sunshine Eldercare Member App
 * Mirrors the canonical PostgreSQL schema from prisma/schema.prisma
 */

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: 'MEMBER' | 'USER' | 'ADMIN' | 'EMPLOYEE' | 'OWNER';
  status: 'ACTIVE' | 'PENDING_VERIFICATION' | 'INACTIVE';
}

export interface MemberProfile {
  id: string;
  userId: string;
  memberId: string; // e.g., SEC/S/1001/SAKR
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  gender?: string;
  bloodGroup?: string;
  serviceAddress?: string;
  nearestLandmark?: string;
  mobileNumber: string;
  alternateNumber?: string;
  email: string;
  medicalConditions?: string;
  idProofType?: string;
}

export interface CarePlanServiceItem {
  id: string;
  serviceName: string;
  serviceNote?: string | null;
}

export interface CarePlanVariant {
  id: string;
  variantType: 'SINGLE' | 'COUPLE';
  monthlyBasePrice: number;
  monthlyGst: number;
  monthlyTotal: number;
  services: CarePlanServiceItem[];
}

export interface CarePlan {
  id: string;
  slug: string;
  name: string; // e.g. "Shield Shine"
  active: boolean;
  variants: CarePlanVariant[];
}

export interface Subscription {
  id: string;
  userId: string;
  carePlanId: string;
  variantType: 'SINGLE' | 'COUPLE';
  durationMonths: number;
  startDate: string;
  endDate: string;
  status: 'ACTIVE' | 'PENDING' | 'SCHEDULED' | 'EXPIRED' | 'CANCELLED';
  carePlan: CarePlan;
}

export interface CareVisit {
  id: string;
  date: string;
  time: string;
  caregiverName: string;
  caregiverDesignation: string;
  caregiverPhone: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED';
  taskSummary: string;
  vitalVitalsTaken?: boolean;
}

export interface EmergencyContact {
  fullName: string;
  relationship: string;
  phone: string;
  alternatePhone?: string;
  email?: string;
  sosHospital?: string;
}

export interface Receipt {
  id: string;
  receiptNumber: string; // e.g., REC/2026-27/1001
  invoiceId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  paymentDate: string;
  relatedPlanName: string;
  downloadUrl: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string; // e.g., INV/2026-27/1001
  total: number;
  issueDate: string;
  status: 'PAID' | 'DRAFT' | 'ISSUED';
  downloadUrl: string;
}

export interface CommunityEvent {
  id: string;
  dateBadge: string; // e.g. "09 SAT"
  title: string;     // e.g. "Women's Day Celebration"
  category: string;  // e.g. "Community & Culture"
  time: string;      // e.g. "11:00 AM - 1:00 PM"
  location: string;  // e.g. "Salt Lake Community Hall"
  description: string;
}

export type IssueCategory =
  | 'SERVICE_COMPLAINT'
  | 'STAFF_COMPLAINT'
  | 'PAYMENT_ISSUE'
  | 'APPOINTMENT_ISSUE'
  | 'GENERAL_QUERY';

export interface SupportIssue {
  id: string;
  ticketNumber: string;
  category: IssueCategory;
  categoryLabel: string;
  subject: string;
  description: string;
  status: 'OPEN' | 'IN_REVIEW' | 'RESOLVED';
  createdAt: string;
}
