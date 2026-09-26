import { z } from "zod";

export const customPlanSchema = z.object({
  userId: z.string(),
  name: z.string().min(2, "Name must be at least 2 characters"),
  description: z.string().optional(),
  amount: z.number().min(0, "Amount must be positive"),
  currency: z.string().default("INR"),
  durationType: z.enum(["DAYS", "MONTHS", "YEARS"]),
  durationValue: z.number().int().min(1, "Duration must be at least 1"),
  startDate: z.string().or(z.date()).optional().transform(val => val ? new Date(val) : new Date())
});

export type CustomPlanInput = z.infer<typeof customPlanSchema>;
