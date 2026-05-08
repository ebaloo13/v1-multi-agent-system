import { createPrefixedRunId } from "../../runtime/runIds.js";

export function createPreauditRunId(): string {
  return createPrefixedRunId("preaudit");
}
