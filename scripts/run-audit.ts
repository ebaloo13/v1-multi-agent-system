import { AuditRunError } from "../src/audit/errors.js";
import { runAuditAgent } from "../src/agents/audit-agent.js";

try {
  const result = await runAuditAgent();
  console.log("artifactDir:", result.artifactDir);
} catch (err) {
  if (err instanceof AuditRunError) {
    console.error("AuditRunError:", err.code, err.details ?? "");
  } else {
    console.error(err);
  }
  process.exit(1);
}
