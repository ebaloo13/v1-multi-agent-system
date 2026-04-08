import { SalesOutputSchema, type SalesOutput } from "../schemas/sales.js";
import { SalesRunError } from "./errors.js";

/**
 * Strict contract: JSON.parse the model string; tolerate common fence wrappers like collections.
 */
export function parseAndValidateSalesOutput(raw: string): SalesOutput {
  let parsed: unknown;
  try {
    const cleaned = raw
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    parsed = JSON.parse(cleaned);
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    throw new SalesRunError("OUTPUT_PARSE", { message, cause });
  }

  const result = SalesOutputSchema.safeParse(parsed);
  if (!result.success) {
    throw new SalesRunError("OUTPUT_SCHEMA", {
      flatten: result.error.flatten(),
    });
  }
  return result.data;
}
