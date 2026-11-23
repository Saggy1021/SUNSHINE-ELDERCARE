import { z } from "zod";

export const memberRegistrationSchema = z.object({
  // Auth fields
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters").max(128, "Password must not exceed 128 characters"),
  
  // SECTION A: MEMBER DETAILS
  salutation: z.string().trim().optional().or(z.literal('')),
  firstName: z.string().min(1, "First Name is required").trim(),
  lastName: z.string().min(1, "Surname / Last Name is required").trim(),
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
  spouseSalutation: z.string().trim().optional().or(z.literal('')),
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
  sponsorSalutation: z.string().trim().optional().or(z.literal('')),
  sponsorFirstName: z.string().trim().optional().or(z.literal('')),
  sponsorLastName: z.string().trim().optional().or(z.literal('')),
  sponsorName: z.string().trim().optional().or(z.literal('')),
  sponsorRelationship: z.string().optional().or(z.literal('')),
  sponsorMobile: z.string().optional().or(z.literal('')),
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

  // SECTION G: PREFERRED CARE VISIT SCHEDULE
  preferredVisitDay: z.enum([
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ]).optional().or(z.literal('')),
  preferredVisitTime: z.string().trim().optional().or(z.literal('')),
  preferredVisitFrequency: z.enum(["WEEKLY", "FORTNIGHTLY"]).optional().or(z.literal('')),
  preferredVisitFortnightlyPattern: z.enum(["WEEK_1_3", "WEEK_2_4"]).optional().or(z.literal('')),
});

export type MemberRegistrationInput = z.infer<typeof memberRegistrationSchema>;
