import { z } from "zod";
import { AuditOutputSchema } from "./audit.js";
import { CollectionsOutputSchema } from "./collections.js";
import { OperationsOutputSchema } from "./operations.js";
import { SalesOutputSchema } from "./sales.js";

export const OrchestratorAgentNameSchema = z.enum([
  "collections",
  "sales",
  "operations",
]);

export const OrchestratorOutputSchema = z.object({
  activated_agents: z.array(OrchestratorAgentNameSchema),
  reasoning_summary: z.string(),
  execution_priority: z.array(OrchestratorAgentNameSchema),
  recommended_next_step: z.string(),
});

export type OrchestratorOutput = z.infer<typeof OrchestratorOutputSchema>;

export const OrchestratorFinalResultsSchema = z.object({
  collections: CollectionsOutputSchema.optional(),
  sales: SalesOutputSchema.optional(),
  operations: OperationsOutputSchema.optional(),
});

export type OrchestratorFinalResults = z.infer<
  typeof OrchestratorFinalResultsSchema
>;

export const OrchestratorFinalOutputSchema = z
  .object({
    audit: AuditOutputSchema,
    orchestrator: OrchestratorOutputSchema,
    agents_executed: z.array(OrchestratorAgentNameSchema),
    results: OrchestratorFinalResultsSchema,
    top_findings: z.array(z.string()),
    quick_wins: z.array(z.string()),
    recommended_next_actions: z.array(z.string()),
    final_summary: z.string(),
  })
  .superRefine((data, ctx) => {
    for (const agent of data.agents_executed) {
      if (data.results[agent] === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Missing results for executed agent: ${agent}`,
          path: ["results", agent],
        });
      }
    }
    for (const key of OrchestratorAgentNameSchema.options) {
      if (
        data.results[key] !== undefined &&
        !data.agents_executed.includes(key)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Unexpected results entry for non-executed agent: ${key}`,
          path: ["results", key],
        });
      }
    }
  });

export type OrchestratorFinalOutput = z.infer<
  typeof OrchestratorFinalOutputSchema
>;
