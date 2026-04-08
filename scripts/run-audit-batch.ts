import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runAuditAgent } from "../src/agents/audit-agent.js";

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

async function main() {
  console.log("Running audit batch...\n");

  const auditDataPath = path.join(repoRoot, "data", "audit.json");
  let parsed: unknown;
  try {
    const raw = await fs.readFile(auditDataPath, "utf8");
    parsed = JSON.parse(raw);
  } catch (e) {
    console.error(
      "Failed to read or parse data/audit.json:",
      e instanceof Error ? e.message : e,
    );
    process.exit(1);
  }

  if (!Array.isArray(parsed)) {
    console.error("audit.json must be a JSON array");
    process.exit(1);
  }

  const n = Math.min(5, parsed.length);
  if (n === 0) {
    console.error("audit.json array is empty");
    process.exit(1);
  }

  for (let i = 0; i < n; i++) {
    console.log(`--- Run ${i + 1} (scenario index ${i}) ---`);
    const result = await runAuditAgent(i);
    console.log("artifactDir:", result.artifactDir);
    console.log("\n");
  }

  console.log("Audit batch finished");
}

main().catch(console.error);
