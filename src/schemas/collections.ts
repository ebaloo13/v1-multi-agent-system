import { z } from "zod";

export const AccountActionSchema = z.object({
  customer: z.string(),
  invoice_id: z.string(),
  risk_tier: z.enum(["low", "medium", "high"]),
  priority_score: z.number().min(0).max(100),
  suggested_action: z.string(),
  escalate: z.boolean(),
  email_draft: z.string(),
});

export const CollectionsOutputSchema = z.object({
  summary: z.string(),
  actions: z.array(AccountActionSchema),
});

export type CollectionsOutput = z.infer<typeof CollectionsOutputSchema>;