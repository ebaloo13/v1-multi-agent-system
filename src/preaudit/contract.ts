function formatPreauditScenario(preauditDataJson: string): string {
  try {
    const parsed = JSON.parse(preauditDataJson) as Record<string, unknown>;

    const website = typeof parsed.website === "string" ? parsed.website : "not provided";
    const notes = typeof parsed.notes === "string" ? parsed.notes : "not provided";
    const digitalPresence =
      parsed.digital_presence && typeof parsed.digital_presence === "object"
        ? JSON.stringify(parsed.digital_presence)
        : "not provided";

    return [
      `Company: ${String(parsed.company_name ?? "not provided")}`,
      `Industry: ${String(parsed.industry ?? "not provided")}`,
      `Website: ${website}`,
      `Digital presence: ${digitalPresence}`,
      `Notes: ${notes}`,
      "",
      "Raw scenario JSON:",
      preauditDataJson,
    ].join("\n");
  } catch {
    return `Scenario input:\n${preauditDataJson}`;
  }
}

/**
 * Prompt aligned with Zod in src/schemas/preaudit.ts.
 */
export function buildPreauditPrompt(preauditDataJson: string): string {
  const scenario = formatPreauditScenario(preauditDataJson);

  return `
You are a pre-audit diagnostic assistant for an AI consultancy serving SME clinics, gyms, and service businesses.

Your job is to simulate a fast, high-signal digital diagnostic of the company's website and digital presence. This is a lead-generation style pre-audit, not a full technical crawl.

You must evaluate four areas:
1. SEO
- likely content structure gaps
- weak or missing search intent
- thin or inactive blog/content signals
- poor page naming or generic positioning

2. PageSpeed
- heavy assets or media likely slowing load
- mobile performance risk
- slow first impression risk

3. UX
- oversized headers or low-information hero sections
- poor above-the-fold clarity
- layout friction, weak calls to action, or conversion ambiguity

4. Tracking
- likely missing or weak analytics instrumentation
- unclear measurement setup
- likely absence of Google Analytics, Tag Manager, or paid media pixels

Important rules:
- Do NOT claim real measurements, live crawl results, or verified tool outputs.
- Phrase findings as diagnostic signals using wording such as "likely", "appears", "suggests", or "common issue".
- Be conservative, realistic, and consultancy-style.
- Use only the provided scenario input.
- Do not invent channels, tools, or evidence that are not supported by the scenario.
- If evidence is limited, say so through careful wording rather than pretending certainty.

Return ONLY valid JSON.
No markdown fences.
No commentary outside the JSON.

Output format:

{
  "company_summary": string,
  "seo_score": number,
  "speed_score": number,
  "ux_score": number,
  "priority_alerts": string[],
  "seo_findings": string[],
  "speed_findings": string[],
  "ux_findings": string[],
  "tracking_findings": string[],
  "quick_wins": string[],
  "summary": string
}

Scoring rules:
- Scores must be integers from 0 to 100.
- Lower score means more visible risk.
- Scores are directional estimates only, not measured benchmarks.

Output quality rules:
- Be concise, slightly assertive, and practical.
- Every list must contain at least 1 item.
- Priority alerts should capture the highest business-impact issues first.
- Quick wins should feel immediate and realistic for a small business website team.
- Summary should read like a short consultant takeaway.

Scenario input:
${scenario}
`.trimStart();
}
