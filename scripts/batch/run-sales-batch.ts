import { runSalesAgent } from "../../src/agents/sales-agent.js";

async function main() {
  console.log("Running sales batch...\n");

  for (let i = 0; i < 5; i++) {
    console.log(`--- Run ${i + 1} ---`);
    const result = await runSalesAgent();
    console.log("artifactDir:", result.artifactDir);
    console.log("\n");
  }

  console.log("Sales batch finished");
}

main().catch(console.error);
