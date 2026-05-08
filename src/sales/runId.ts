import { createPrefixedRunId } from "../runtime/runIds.js";

export function createSalesRunId(): string {
  return createPrefixedRunId("sales");
}
