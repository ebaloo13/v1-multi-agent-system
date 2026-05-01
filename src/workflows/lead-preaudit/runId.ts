import { randomBytes } from "node:crypto";

export function createPreauditRunId(): string {
  const stamp = new Date().toISOString().replace(/[:-]/g, "").replace(/\.\d{3}Z/, "Z");
  const suffix = randomBytes(4).toString("hex");
  return `preaudit-${stamp}-${suffix}`;
}
