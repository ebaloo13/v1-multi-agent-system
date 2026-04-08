import { z } from "zod";

export const OperationsIssueTypeSchema = z.enum([
  "schedule_gap",
  "no_show",
  "idle_capacity",
  "overbooking",
  "coordination_issue",
]);

export const OperationsIssueSchema = z.object({
  entity: z.string(),
  type: OperationsIssueTypeSchema,
  priority_score: z.number().min(0).max(100),
  reason: z.string(),
  suggested_action: z.string(),
  message_draft: z.string(),
});

export const OperationsOutputSchema = z.object({
  summary: z.string(),
  issues: z.array(OperationsIssueSchema),
});

export type OperationsOutput = z.infer<typeof OperationsOutputSchema>;
