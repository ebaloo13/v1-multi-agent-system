import { runCollectionsAgent } from "../src/agents/collections-agent.js";

async function main() {
  console.log("Running batch...\n");

  for (let i = 0; i < 5; i++) {
    console.log(`--- Run ${i + 1} ---`);
    const result = await runCollectionsAgent();
    console.log("artifactDir:", result.artifactDir);
    console.log("\n");
  }

  console.log("Batch finished");
}

main().catch(console.error);