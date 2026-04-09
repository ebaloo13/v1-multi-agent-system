import { OrchestratorRunError } from "../../src/orchestrator/errors.js";
import { runOrchestratorAgent } from "../../src/agents/orchestrator-agent.js";

try {
  const result = await runOrchestratorAgent();
  console.log("artifactDir:", result.artifactDir);
} catch (err) {
  if (err instanceof OrchestratorRunError) {
    console.error("OrchestratorRunError:", err.code, err.details ?? "");
  } else {
    console.error(err);
  }
  process.exit(1);
}
