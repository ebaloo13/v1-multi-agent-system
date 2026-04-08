import { OperationsOutputSchema, type OperationsOutput } from "../schemas/operations.js";
import { OperationsRunError } from "./errors.js";

/**
 * Strict contract: JSON.parse the model string; tolerate common fence wrappers.
 */
export function parseAndValidateOperationsOutput(raw: string): OperationsOutput {
  let parsed: unknown;
  try {
    const cleaned = raw
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    parsed = JSON.parse(cleaned);
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    throw new OperationsRunError("OUTPUT_PARSE", { message, cause });
  }

  const result = OperationsOutputSchema.safeParse(parsed);
  if (!result.success) {
    throw new OperationsRunError("OUTPUT_SCHEMA", {
      flatten: result.error.flatten(),
    });
  }
  return result.data;
}
