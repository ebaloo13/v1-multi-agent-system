import {
  OrchestratorFinalOutputSchema,
  OrchestratorOutputSchema,
  type OrchestratorFinalOutput,
  type OrchestratorOutput,
} from "../schemas/orchestrator.js";
import { OrchestratorRunError } from "./errors.js";

/**
 * Strict contract: JSON.parse the model string; tolerate common fence wrappers.
 */
export function parseAndValidateOrchestratorOutput(
  raw: string,
): OrchestratorOutput {
  let parsed: unknown;
  try {
    const cleaned = raw
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    parsed = JSON.parse(cleaned);
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    throw new OrchestratorRunError("OUTPUT_PARSE", { message, cause });
  }

  const result = OrchestratorOutputSchema.safeParse(parsed);
  if (!result.success) {
    throw new OrchestratorRunError("OUTPUT_SCHEMA", {
      flatten: result.error.flatten(),
    });
  }
  return result.data;
}

export function validateOrchestratorFinalOutput(
  data: unknown,
): OrchestratorFinalOutput {
  const result = OrchestratorFinalOutputSchema.safeParse(data);
  if (!result.success) {
    throw new OrchestratorRunError("UNEXPECTED", {
      message: "Consolidated orchestrator output failed schema validation",
      flatten: result.error.flatten(),
    });
  }
  return result.data;
}
