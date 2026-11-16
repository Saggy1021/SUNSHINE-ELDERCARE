import { z } from "zod";

export const memberRegistrationSchema = z.object({
  // Auth fields
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters").max(128, "Password must not exceed 128 characters"),
  
  // SECTION A: MEMBER DETAILS
  firstName: z.string().min(1, "First Name is required"),
  lastName: z.string().min(1, "Surname / Last Name is required"),
  idProofType: z.enum(["Voter ID", "Passport", "PAN", "Driving Licence", "Other"], {
    message: "Invalid ID Proof Type"
  }).optional().or(z.literal('')),
  idProofNumber: z.string().min(1, "ID Proof Number is required").optional().or(z.literal('')),
  dateOfBirth: z.string().min(1, "Date of Birth is required"),
  gender: z.enum(["Male", "Female", "Other"], {
    error: "Please select a valid gender"
  }),
  serviceAddress: z.string().min(1, "Service Address is required"),
  nearestLandmark: z.string().optional().or(z.literal('')),
  mobileNumber: z.string().min(1, "Primary mobile number is required"),
  alternateNumber: z.string().optional().or(z.literal('')),

  // SPOUSE / SECOND MEMBER DETAILS (Optional for Couple memberships)
  spouseFirstName: z.string().optional().or(z.literal('')),
  spouseLastName: z.string().optional().or(z.literal('')),
  spouseDateOfBirth: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine(
      (val) => {
        if (!val) return true;
        const d = new Date(val);
        if (isNaN(d.getTime())) return false;
        const now = new Date();
        if (d > now) return false;
        if (d.getFullYear() < 1900) return false;
        return true;
      },
      {
        message: "Spouse Date of Birth must be a valid past date",
      }
    ),
  spouseGender: z.enum(["Male", "Female", "Other"]).optional().or(z.literal('')),
  spouseMobileNumber: z.string().optional().or(z.literal('')),
  spouseIdProofType: z.enum(["Voter ID", "Passport", "PAN", "Driving Licence", "Other"], {
    message: "Invalid Spouse ID Proof Type"
  }).optional().or(z.literal('')),
  spouseIdProofNumber: z.string().optional().or(z.literal('')),
  
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
