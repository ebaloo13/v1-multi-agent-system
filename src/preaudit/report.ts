import type { PreauditOutput } from "../schemas/preaudit.js";

function deriveCompanyName(companySummary: string): string {
  const summary = companySummary.trim();
  if (summary.length === 0) {
    return "Company";
  }

  const match = summary.match(/^(.+?)(?:\s+operates\b|\s+is\b|\s+serves\b|[.,])/i);
  if (match?.[1]) {
    return match[1].trim();
  }

  return summary.split(/\s+/).slice(0, 4).join(" ");
}

function formatBulletList(items: string[]): string {
  return items.map((item) => `- ${item}`).join("\n");
}

export function generatePreauditReport(data: PreauditOutput): string {
  const companyName = deriveCompanyName(data.company_summary);
  const priorityAlerts = data.priority_alerts.slice(0, 5);

  return [
    `# ${companyName} — Pre-Audit Digital`,
    "",
    "## Executive Summary",
    data.summary,
    "",
    "---",
    "",
    "## Scores",
    `- SEO: ${data.seo_score}/100`,
    `- Speed: ${data.speed_score}/100`,
    `- UX: ${data.ux_score}/100`,
    "",
    "---",
    "",
    "## Key Issues (High Priority)",
    formatBulletList(priorityAlerts),
    "",
    "---",
    "",
    "## SEO Findings",
    formatBulletList(data.seo_findings),
    "",
    "---",
    "",
    "## Performance Findings",
    formatBulletList(data.speed_findings),
    "",
    "---",
    "",
    "## UX Findings",
    formatBulletList(data.ux_findings),
    "",
    "---",
    "",
    "## Tracking & Measurement Gaps",
    formatBulletList(data.tracking_findings),
    "",
    "---",
    "",
    "## Quick Wins (Immediate Actions)",
    formatBulletList(data.quick_wins),
    "",
    "---",
    "",
    "## Recommended Next Step",
    "Based on this analysis, the next step is to implement tracking and conversion measurement, followed by SEO optimization and UX improvements to increase lead generation and booking efficiency.",
    "",
  ].join("\n");
}
