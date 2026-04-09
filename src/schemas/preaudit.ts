import { z } from "zod";

export const PreauditScoreSchema = z.number().int().min(0).max(100);

export const PreauditFindingListSchema = z.array(z.string()).min(1);

export const PreauditOutputSchema = z.object({
  company_summary: z.string(),
  seo_score: PreauditScoreSchema,
  speed_score: PreauditScoreSchema,
  ux_score: PreauditScoreSchema,
  priority_alerts: PreauditFindingListSchema,
  seo_findings: PreauditFindingListSchema,
  speed_findings: PreauditFindingListSchema,
  ux_findings: PreauditFindingListSchema,
  tracking_findings: PreauditFindingListSchema,
  quick_wins: PreauditFindingListSchema,
  summary: z.string(),
});

export type PreauditOutput = z.infer<typeof PreauditOutputSchema>;
