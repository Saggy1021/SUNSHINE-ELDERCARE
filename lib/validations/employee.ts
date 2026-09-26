import { z } from "zod";

export const employeeSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  designation: z.string().min(2, "Designation is required"),
  contactNumber: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  photoReference: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});

export type EmployeeInput = z.infer<typeof employeeSchema>;
