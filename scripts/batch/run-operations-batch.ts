import { runOperationsAgent } from "../../src/agents/operations-agent.js";

function usage(): string {
  return "Usage: npm run operations:batch -- --confirm-provider-cost [--max-runs=N]";
}

function failUsage(message: string): never {
  console.error(message);
  console.error(usage());
  process.exit(1);
}

function parseMaxRuns(argv: string[]): number {
  if (!argv.includes("--confirm-provider-cost")) {
    failUsage("Missing required --confirm-provider-cost flag.");
  }

  const maxRunsArgs = argv.filter((arg) => arg === "--max-runs" || arg.startsWith("--max-runs="));
  if (maxRunsArgs.length === 0) {
    return 1;
  }

  const maxRunsArg = maxRunsArgs[0];
  if (!maxRunsArg || !maxRunsArg.startsWith("--max-runs=")) {
    failUsage("Invalid --max-runs value.");
  }

  const value = maxRunsArg.slice("--max-runs=".length);
  const maxRuns = Number(value);
  if (!Number.isInteger(maxRuns) || maxRuns < 1 || maxRuns > 5) {
    failUsage("Invalid --max-runs value. Use an integer from 1 to 5.");
  }

  return maxRuns;
}

async function main() {
  const maxRuns = parseMaxRuns(process.argv.slice(2));

  console.log("Running operations batch...\n");

  for (let i = 0; i < maxRuns; i++) {
    console.log(`--- Run ${i + 1} ---`);
    const result = await runOperationsAgent();
    console.log("artifactDir:", result.artifactDir);
    console.log("\n");
  }

  console.log("Operations batch finished");
}

main().catch(console.error);
