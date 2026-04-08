import { runOperationsAgent } from "../src/agents/operations-agent.js";

async function main() {
  console.log("Running operations batch...\n");

  for (let i = 0; i < 5; i++) {
    console.log(`--- Run ${i + 1} ---`);
    const result = await runOperationsAgent();
    console.log("artifactDir:", result.artifactDir);
    console.log("\n");
  }

  console.log("Operations batch finished");
}

main().catch(console.error);
