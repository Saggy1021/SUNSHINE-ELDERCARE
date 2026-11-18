import { z } from "zod";

const mobileRegex = /^[0-9+\s-]{10,15}$/;

export const employeeSchema = z.object({
  firstName: z.string().trim().min(2, "First name must be at least 2 characters"),
  lastName: z.string().trim().min(1, "Last name is required"),
  designation: z.string().trim().min(2, "Designation is required"),
  employeeId: z.string().trim().optional().or(z.literal("")),
  contactNumber: z
    .string()
    .trim()
    .min(1, "Contact / Mobile number is required")
    .regex(mobileRegex, "Invalid contact number format")
    .refine(
      (val) => {
        const digits = val.replace(/\D/g, "");
        return (
          digits.length === 10 ||
          (digits.length === 12 && digits.startsWith("91")) ||
          (digits.length === 11 && digits.startsWith("0"))
        );
      },
      {
        message: "Mobile number must be a valid 10-digit number",
      }
    ),
  email: z
    .string()
    .trim()
    .min(1, "Email address is required")
    .email("Invalid email address"),
  dateOfBirth: z
    .string()
    .min(1, "Date of Birth is required")
    .refine(
      (val) => {
        const d = new Date(val);
        if (isNaN(d.getTime())) return false;
        const now = new Date();
        if (d > now) return false;
        if (d.getFullYear() < 1900) return false;
        return true;
      },
      {
        message: "Date of Birth must be a valid past date",
      }
    ),
  photoReference: z.string().optional().or(z.literal("")),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
  publicBiography: z.string().optional().or(z.literal("")),
});

export const updateEmployeeSchema = z.object({
  firstName: z.string().trim().min(2, "First name must be at least 2 characters"),
  lastName: z.string().trim().min(1, "Last name is required"),
  designation: z.string().trim().min(2, "Designation is required"),
  employeeId: z.string().trim().optional().or(z.literal("")),
  contactNumber: z
    .string()
    .trim()
    .min(1, "Contact / Mobile number is required")
    .regex(mobileRegex, "Invalid contact number format")
    .refine(
      (val) => {
        const digits = val.replace(/\D/g, "");
        return (
          digits.length === 10 ||
          (digits.length === 12 && digits.startsWith("91")) ||
          (digits.length === 11 && digits.startsWith("0"))
        );
      },
      {
        message: "Mobile number must be a valid 10-digit number",
      }
    ),
  email: z
    .string()
    .trim()
    .min(1, "Email address is required")
    .email("Invalid email address"),
  dateOfBirth: z
    .string()
    .min(1, "Date of Birth is required")
    .refine(
      (val) => {
        const d = new Date(val);
        if (isNaN(d.getTime())) return false;
        const now = new Date();
        if (d > now) return false;
        if (d.getFullYear() < 1900) return false;
        return true;
      },
      {
        message: "Date of Birth must be a valid past date",
      }
    ),
  photoReference: z.string().optional().or(z.literal("")),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  publicBiography: z.string().optional().or(z.literal("")),
});

export type EmployeeInput = z.infer<typeof employeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
