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

function seoBusinessMeaning(score: number): string {
  if (score >= 80) {
    return "discovery looks relatively healthy, although there is still room to capture more qualified demand.";
  }
  if (score >= 65) {
    return "the site has a workable base, but search visibility is still leaving discoverability on the table.";
  }
  if (score >= 50) {
    return "the site is likely underperforming in discovery and missing relevant search demand.";
  }
  return "the site is likely significantly underperforming in discovery and not capturing enough relevant search intent.";
}

function speedBusinessMeaning(score: number): string {
  if (score >= 80) {
    return "the experience is likely usable, but there is still room to reduce friction and improve engagement.";
  }
  if (score >= 65) {
    return "the site is usable, but technical friction is still likely reducing engagement.";
  }
  if (score >= 50) {
    return "technical friction is likely weakening first impressions and increasing drop-off risk.";
  }
  return "speed issues are likely creating meaningful drop-off before visitors ever reach inquiry or booking intent.";
}

function uxBusinessMeaning(score: number): string {
  if (score >= 80) {
    return "the journey is generally workable, but it is still leaving conversion opportunities untapped.";
  }
  if (score >= 65) {
    return "the path from visit to inquiry works, but still contains friction that can suppress conversions.";
  }
  if (score >= 50) {
    return "the path from visit to inquiry likely has noticeable friction that is holding back conversion.";
  }
  return "visitor friction is likely making it harder to turn attention into inquiries or bookings.";
}

export function generatePreauditReport(data: PreauditOutput): string {
  const companyName = deriveCompanyName(data.company_summary);
  const priorityAlerts = data.priority_alerts.slice(0, 5);

  return [
    `# ${companyName} — Pre-Audit Digital`,
    "",
    "## Executive Summary",
    `${companyName} has a functioning website, but it is likely underperforming as a commercial asset. The current setup suggests weaker discovery than it should have, a less efficient path from visit to inquiry, and limited visibility into what is actually driving results. In practical terms, the business is likely leaving value on the table today through missed search demand, conversion friction, and weak measurement. The upside is that the issues surfaced here are actionable and create a clear starting point for a deeper improvement plan.`,
    "",
    "---",
    "",
    "## Scores",
    `- SEO: ${data.seo_score}/100 — ${seoBusinessMeaning(data.seo_score)}`,
    `- Speed: ${data.speed_score}/100 — ${speedBusinessMeaning(data.speed_score)}`,
    `- UX: ${data.ux_score}/100 — ${uxBusinessMeaning(data.ux_score)}`,
    "",
    "---",
    "",
    "## Business Impact",
    "- Search visibility: current SEO gaps are likely leaving qualified demand on the table and making the business harder to find than it should be.",
    "- Conversion path: speed and UX friction create resistance in the path from visit to inquiry or booking.",
    "- Measurement: tracking gaps make it hard to know what is actually generating revenue, where leads are coming from, and what should be improved first.",
    "",
    "---",
    "",
    "## Why This Matters Now",
    "- Search visibility compounds over time, so weak foundations today continue to suppress future discovery.",
    "- If tracking is weak, growth decisions stay guesswork and marketing spend becomes harder to justify.",
    "- When conversion friction stays unresolved, existing traffic is underused before new traffic is even added.",
    "",
    "---",
    "",
    "## Key Opportunities",
    formatBulletList(priorityAlerts),
    "",
    "---",
    "",
    "## What could be achieved",
    "- Stronger visibility for relevant local and service-related demand.",
    "- Better conversion from existing traffic through a clearer path to inquiry or booking.",
    "- Better decisions once lead sources, inquiry actions, and conversion points are measured consistently.",
    "",
    "---",
    "",
    "## What a Deeper Audit Could Include",
    "- Social media and content positioning",
    "- Campaign and ads performance",
    "- Lead source analysis",
    "- Inquiry handling and follow-up process",
    "- Conversion tracking and funnel visibility",
    "- Sales and operations bottlenecks",
    "",
    "---",
    "",
    "## Next Step",
    "This pre-audit is based only on public website evidence, which is useful for surfacing visible gaps but does not yet include the internal context that usually determines where the biggest commercial upside sits. A deeper audit would become much more valuable with access to additional business inputs such as social media presence, campaign data, lead sources, inquiry or booking flow, and internal sales follow-up. The most practical next step is a focused consulting session that turns these visible issues into a prioritized action plan and identifies the highest-value opportunities across visibility, conversion, and revenue capture.",
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
  ].join("\n").trimEnd();
}
