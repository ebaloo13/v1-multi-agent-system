import { AuditOutputSchema, type AuditOutput } from "../schemas/audit.js";
import { AuditRunError } from "./errors.js";

/**
 * Strict contract: JSON.parse the model string; tolerate common fence wrappers.
 */
export function parseAndValidateAuditOutput(raw: string): AuditOutput {
  let parsed: unknown;
  try {
    const cleaned = raw
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    parsed = JSON.parse(cleaned);
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    throw new AuditRunError("OUTPUT_PARSE", { message, cause });
  }

  const result = AuditOutputSchema.safeParse(parsed);
  if (!result.success) {
    throw new AuditRunError("OUTPUT_SCHEMA", {
      flatten: result.error.flatten(),
    });
  }
  return result.data;
}
