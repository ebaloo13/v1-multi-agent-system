import { PreauditRunError } from "../../src/preaudit/errors.js";
import { runPreauditAgent } from "../../src/agents/preaudit-agent.js";

try {
  const result = await runPreauditAgent();
  console.log("artifactDir:", result.artifactDir);
} catch (err) {
  if (err instanceof PreauditRunError) {
    console.error("PreauditRunError:", err.code, err.details ?? "");
  } else {
    console.error(err);
  }
  process.exit(1);
}
