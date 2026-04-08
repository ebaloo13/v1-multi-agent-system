import { SalesRunError } from "../src/sales/errors.js";
import { runSalesAgent } from "../src/agents/sales-agent.js";

try {
  const result = await runSalesAgent();
  console.log("artifactDir:", result.artifactDir);
} catch (err) {
  if (err instanceof SalesRunError) {
    console.error("SalesRunError:", err.code, err.details ?? "");
  } else {
    console.error(err);
  }
  process.exit(1);
}
