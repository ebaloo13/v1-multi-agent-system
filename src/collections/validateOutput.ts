import { CollectionsOutputSchema, type CollectionsOutput } from "../schemas/collections.js";
import { CollectionsRunError } from "./errors.js";

/**
 * Strict contract: JSON.parse the exact model string once — no trim, fence strip, or extraction.
 */
export function parseAndValidateCollectionsOutput(raw: string): CollectionsOutput {
  let parsed: unknown;
  try {
    const cleaned = raw
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    parsed = JSON.parse(cleaned);
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    throw new CollectionsRunError("OUTPUT_PARSE", { message, cause });
  }

  const result = CollectionsOutputSchema.safeParse(parsed);
  if (!result.success) {
    throw new CollectionsRunError("OUTPUT_SCHEMA", {
      flatten: result.error.flatten(),
    });
  }
  return result.data;
}
