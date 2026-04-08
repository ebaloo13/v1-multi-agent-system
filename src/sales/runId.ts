import { randomBytes } from "node:crypto";

export function createSalesRunId(): string {
  const stamp = new Date().toISOString().replace(/[:-]/g, "").replace(/\.\d{3}Z/, "Z");
  const suffix = randomBytes(4).toString("hex");
  return `sales-${stamp}-${suffix}`;
}
