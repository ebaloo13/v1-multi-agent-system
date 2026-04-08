import { z } from "zod";

export const OpportunityTypeSchema = z.enum([
  "upsell",
  "follow_up",
  "reactivation",
  "no_show_recovery",
  "cross_sell",
]);

export const SalesOpportunitySchema = z.object({
  customer: z.string(),
  type: OpportunityTypeSchema,
  priority_score: z.number().min(0).max(100),
  reason: z.string(),
  suggested_action: z.string(),
  message_draft: z.string(),
});

export const SalesOutputSchema = z.object({
  summary: z.string(),
  opportunities: z.array(SalesOpportunitySchema),
});

export type SalesOutput = z.infer<typeof SalesOutputSchema>;
