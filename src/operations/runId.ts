import { createPrefixedRunId } from "../runtime/runIds.js";

export function createOperationsRunId(): string {
  return createPrefixedRunId("operations");
}
