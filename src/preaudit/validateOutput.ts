import { PreauditOutputSchema, type PreauditOutput } from "../schemas/preaudit.js";
import { PreauditRunError } from "./errors.js";

/**
 * Strict contract: JSON.parse the model string; tolerate common fence wrappers.
 */
export function parseAndValidatePreauditOutput(raw: string): PreauditOutput {
  let parsed: unknown;
  try {
    const cleaned = raw
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    parsed = JSON.parse(cleaned);
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    throw new PreauditRunError("OUTPUT_PARSE", { message, cause });
  }

  const result = PreauditOutputSchema.safeParse(parsed);
  if (!result.success) {
    throw new PreauditRunError("OUTPUT_SCHEMA", {
      flatten: result.error.flatten(),
    });
  }
  return result.data;
}
