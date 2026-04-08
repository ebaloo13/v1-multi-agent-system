/**
 * Single source for prompt wording aligned with Zod in src/schemas/collections.ts.
 * priority_score: integer 0–100 (not a placeholder 0).
 */
export function buildCollectionsPrompt(invoicesJson: string): string {
  return `
You are a B2B collections agent.

Analyze the invoice data and return valid JSON only with this structure:

{
  "summary": "string",
  "actions": [
    {
      "customer": "string",
      "invoice_id": "string",
      "risk_tier": "low | medium | high",
      "priority_score": 50,
      "suggested_action": "string",
      "escalate": false,
      "email_draft": "string"
    }
  ]
}

Rules:
- priority_score must be an integer from 0 to 100 (higher = more urgent).
- Higher amount + more overdue + longer since last contact = higher priority_score.
- risk_tier must be exactly one of: low, medium, high.
- Keep email_draft short, professional, and polite.
- Return JSON only. No markdown. No commentary.

Invoice data:
${invoicesJson}
`.trimStart();
}
