import { z } from "zod";

export const sprintCreateSchema = z
  .object({
    name: z.string().min(1),
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
    status: z.enum(["PLANNING", "ACTIVE", "COMPLETED"]).optional(),
    projectId: z.string(),
  })
  .refine((data) => new Date(data.endDate) >= new Date(data.startDate), {
    message: "endDate must be greater than or equal to startDate",
    path: ["endDate"],
  });

export const sprintUpdateSchema = z
  .object({
    name: z.string().min(1).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    status: z.enum(["PLANNING", "ACTIVE", "COMPLETED"]).optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return new Date(data.endDate) >= new Date(data.startDate);
      }
      return true;
    },
    {
      message: "endDate must be greater than or equal to startDate",
      path: ["endDate"],
    }
  );
