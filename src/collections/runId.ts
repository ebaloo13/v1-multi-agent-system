import { createPrefixedRunId } from "../runtime/runIds.js";

export function createRunId(): string {
  return createPrefixedRunId("collections");
}
