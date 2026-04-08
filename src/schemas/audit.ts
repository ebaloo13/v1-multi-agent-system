import { z } from "zod";

export const AuditAgentNameSchema = z.enum(["collections", "sales", "operations"]);

export const AuditOutputSchema = z.object({
  company_summary: z.string(),
  industry: z.string(),
  main_pains: z.array(z.string()),
  available_data: z.array(z.string()),
  recommended_agents: z.array(AuditAgentNameSchema),
  priority_order: z.array(AuditAgentNameSchema),
  notes: z.string(),
});

export type AuditOutput = z.infer<typeof AuditOutputSchema>;
