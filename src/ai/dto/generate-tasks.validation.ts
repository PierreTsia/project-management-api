import { z } from 'zod';

export const GeneratedTaskSchema = z.object({
  title: z.string().min(1).max(80),
  description: z.string().max(240).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
});

export const GenerateTasksResponseSchema = z.object({
  tasks: z.array(GeneratedTaskSchema).min(3).max(12),
});

export type GeneratedTaskValidation = z.infer<typeof GeneratedTaskSchema>;
export type GenerateTasksResponseValidation = z.infer<
  typeof GenerateTasksResponseSchema
>;
