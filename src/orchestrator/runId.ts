import { createPrefixedRunId } from "../runtime/runIds.js";

export function createOrchestratorRunId(): string {
  return createPrefixedRunId("orchestrator");
}
