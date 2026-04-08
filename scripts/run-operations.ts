import { OperationsRunError } from "../src/operations/errors.js";
import { runOperationsAgent } from "../src/agents/operations-agent.js";

try {
  const result = await runOperationsAgent();
  console.log("artifactDir:", result.artifactDir);
} catch (err) {
  if (err instanceof OperationsRunError) {
    console.error("OperationsRunError:", err.code, err.details ?? "");
  } else {
    console.error(err);
  }
  process.exit(1);
}
