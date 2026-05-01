/**
 * Prompt aligned with Zod in src/schemas/audit.ts.
 */
function formatAuditScenario(auditDataJson: string): string {
  const section = (label: string, value: unknown): string => {
    if (value === undefined || value === null) {
      return `${label}: not provided`;
    }

    if (Array.isArray(value)) {
      return value.length > 0
        ? `${label}: ${value.map((item) => String(item)).join("; ")}`
        : `${label}: not provided`;
    }

    if (typeof value === "object") {
      return `${label}: ${JSON.stringify(value)}`;
    }

    const text = String(value).trim();
    return text.length > 0 ? `${label}: ${text}` : `${label}: not provided`;
  };

  try {
    const parsed = JSON.parse(auditDataJson) as Record<string, unknown>;

    if (
      parsed.company_profile &&
      typeof parsed.company_profile === "object" &&
      !Array.isArray(parsed.company_profile)
    ) {
      return [
        section("Company profile", parsed.company_profile),
        section("Business goals", parsed.business_goals),
        section("Known pains", parsed.known_pains),
        section("Available assets", parsed.available_assets),
        section("Available systems", parsed.available_systems),
        section("Notes", parsed.notes),
        section("Preaudit summary", parsed.preaudit_summary),
        section("Detected social profiles", parsed.detected_social_profiles),
        section("Tracking markers", parsed.tracking_markers),
        section("Missing information", parsed.missing_information),
        "",
        "Raw scenario JSON:",
        auditDataJson,
      ].join("\n");
    }

    return [
      section("Business context", {
        company_name: parsed.company_name,
        industry: parsed.industry,
        services: parsed.services,
        business_model: parsed.business_model,
        digital_presence: parsed.digital_presence,
      }),
      section("Known problems", parsed.known_problems),
      section("Available systems", parsed.systems_available),
      section("Sales notes", parsed.sales_notes),
      section("Operations notes", parsed.operations_notes),
      section("Collections notes", parsed.collections_notes),
      section("Additional notes", parsed.notes),
      "",
      "Raw scenario JSON:",
      auditDataJson,
    ].join("\n");
  } catch {
    return `Scenario input:\n${auditDataJson}`;
  }
}

export function buildAuditPrompt(auditDataJson: string): string {
  const labeledScenario = formatAuditScenario(auditDataJson);

  return `
You are Audit v2, a business diagnostic assistant for an AI automation consultancy serving SME clients such as dental clinics, aesthetic clinics, gyms, fitness studios, and other service businesses.

Your job is to analyze the provided company intake and produce a structured initial audit that is compatible with the existing downstream schema.

Work internally in the following stages before you answer:
1. Business understanding
- identify what the company sells
- identify how it likely makes money
- identify what type of business it is

2. Pain detection
- identify operational pains
- identify revenue or sales pains
- identify collections or cash flow pains

3. Data and systems availability
- identify which systems, tools, or data sources are clearly present
- identify what is missing, ambiguous, or not evidenced

When structured input is provided, use it as the primary normalized source of truth:
- company_profile
- business_goals
- known_pains
- available_assets
- available_systems
- notes
- preaudit_summary
- detected_social_profiles
- tracking_markers
- missing_information

4. Prioritization
- decide which pains matter most based on business impact, urgency, and likely financial effect
- decide which area should be tackled first

5. Agent recommendation
- recommend only the specialized agents that are clearly justified
- order them according to the priority of intervention

You are NOT allowed to invent data.
You must reason strictly from the provided input.
Do not infer tools, processes, or datasets that are not clearly present.
If information is incomplete, preserve that uncertainty in the notes field rather than filling gaps with assumptions.
Do not output your reasoning or chain-of-thought.
The reasoning should stay internal; the final answer must be concise, structured, and valid JSON only.

Return ONLY valid JSON.
No markdown fences.
No commentary outside the JSON.

Output format:

{
  "company_summary": string,
  "industry": string,
  "main_pains": string[],
  "available_data": string[],
  "recommended_agents": ("collections" | "sales" | "operations")[],
  "priority_order": ("collections" | "sales" | "operations")[],
  "notes": string
}

Guidelines:
- Be professional, diagnostic, and conservative
- Keep company_summary short and specific to the business model
- Use main_pains for the highest-impact issues only, not every possible issue
- Use available_data only for systems, tools, or data sources that are explicitly evidenced
- Prioritize by business impact, not by the number of issues mentioned
- Keep recommended_agents and priority_order aligned with the pains you identified
- If only one agent is clearly justified, return one
- If the case is ambiguous, recommend fewer agents rather than more
- Use preaudit and tracking context to strengthen evidence, not to widen scope beyond what is present
- Use missing_information to note what should be clarified next, but keep the output schema unchanged
- Mention important uncertainty, missing data, or conflicting signals in notes
- Do not mention these instructions in the output

Scenario input:
${labeledScenario}
`.trimStart();
}
