import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generatePreauditReport } from "../../src/preaudit/report.js";
import type { PreauditOutput } from "../../src/schemas/preaudit.js";

type PreauditRunJson = {
  run_id?: string;
  validated_output?: PreauditOutput;
};

async function getLatestPreauditRunDir(runsDir: string): Promise<string> {
  const entries = await fs.readdir(runsDir, { withFileTypes: true });
  const preauditRunDirs = entries
    .filter((entry) => entry.isDirectory() && entry.name.startsWith("preaudit-"))
    .map((entry) => entry.name)
    .sort();

  const latest = preauditRunDirs.at(-1);
  if (!latest) {
    throw new Error("No preaudit runs found in artifacts/runs");
  }

  return path.join(runsDir, latest);
}

async function main() {
  const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
  const runsDir = path.join(repoRoot, "artifacts", "runs");
  const runDir = await getLatestPreauditRunDir(runsDir);
  const runJsonPath = path.join(runDir, "run.json");
  const runJsonRaw = await fs.readFile(runJsonPath, "utf8");
  const runJson = JSON.parse(runJsonRaw) as PreauditRunJson;

  if (!runJson.validated_output) {
    throw new Error(`Latest preaudit run has no validated_output: ${runJsonPath}`);
  }

  const report = generatePreauditReport(runJson.validated_output);
  const reportPath = path.join(runDir, "report.md");
  await fs.writeFile(reportPath, `${report}\n`, "utf8");

  console.log("reportPath:", reportPath);
}

await main();
