import { runOrchestratorAgent } from "../src/agents/orchestrator-agent.js";

async function main() {
  console.log("Running orchestrator batch...\n");

  for (let i = 0; i < 5; i++) {
    console.log(`--- Run ${i + 1} ---`);
    const result = await runOrchestratorAgent();
    console.log("artifactDir:", result.artifactDir);
    console.log("\n");
  }

  console.log("Orchestrator batch finished");
}

main().catch(console.error);
