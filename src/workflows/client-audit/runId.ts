import { createPrefixedRunId } from "../../runtime/runIds.js";

export function createAuditRunId(): string {
  return createPrefixedRunId("audit");
}
