import { z } from "zod";

export const employeeSchema = z.object({
  firstName: z.string().trim().min(2, "First name must be at least 2 characters"),
  lastName: z.string().trim().min(1, "Last name is required"),
  designation: z.string().trim().min(2, "Designation is required"),
  employeeId: z.string().trim().optional().or(z.literal("")),
  contactNumber: z.string().trim().optional().or(z.literal("")),
  email: z
    .string()
    .trim()
    .email("Invalid email address")
    .optional()
    .or(z.literal("")),
  photoReference: z.string().optional().or(z.literal("")),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
  publicBiography: z.string().optional().or(z.literal("")),
});

export type EmployeeInput = z.infer<typeof employeeSchema>;
