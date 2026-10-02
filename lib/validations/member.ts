import { z } from "zod";

export const memberRegistrationSchema = z.object({
  // Auth fields
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  
  // SECTION A: MEMBER DETAILS
  firstName: z.string().min(1, "First Name is required"),
  lastName: z.string().min(1, "Surname / Last Name is required"),
  idProofType: z.string().optional(),
  idProofNumber: z.string().optional(),
  dateOfBirth: z.string().min(1, "Date of Birth is required"),
  gender: z.enum(["Male", "Female", "Other"], {
    error: "Please select a valid gender"
  }),
  serviceAddress: z.string().min(1, "Service Address is required"),
  nearestLandmark: z.string().optional(),
  mobileNumber: z.string().min(1, "Primary mobile number is required"),
  alternateNumber: z.string().optional(),
  
  // SECTION B: EMERGENCY CONTACT
  emergencyContactName: z.string().min(1, "Emergency Contact Name is required"),
  emergencyContactRelationship: z.string().min(1, "Emergency Contact Relationship is required"),
  emergencyContactMobile: z.string().min(1, "Emergency Contact Primary Mobile is required"),
  emergencyContactOther: z.string().optional(),
  emergencyContactEmail: z.string().email("Invalid email").optional().or(z.literal('')),
  
  // SECTION C: SPONSOR DETAILS
  sponsorName: z.string().min(1, "Sponsor Name is required"),
  sponsorRelationship: z.string().min(1, "Sponsor Relationship is required"),
  sponsorMobile: z.string().min(1, "Sponsor Mobile is required"),
  sponsorOther: z.string().optional(),
  sponsorEmail: z.string().email("Invalid email").optional().or(z.literal('')),
  
  // SECTION D: HEALTH INSURANCE
  insuranceProvider: z.string().optional(),
  policyNumber: z.string().optional(),
  coverageAmount: z.string().optional(),
  
  // SECTION E: MEDICAL ALERT / HOSPITAL AUTHORIZATION
  hospitalForSos: z.string().optional(),
  nomineeLocalContact: z.string().optional(),
  shiftAuthorization: z.boolean().default(false),

  // SECTION F: HEALTH / MEDICAL INFORMATION (PHASE 20)
  medicalConditions: z.string().optional(),
  bloodGroup: z.string().optional(),
});

export type MemberRegistrationInput = z.infer<typeof memberRegistrationSchema>;
