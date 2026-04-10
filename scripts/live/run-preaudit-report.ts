import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generatePreauditReport } from "../../src/preaudit/report.js";
import type { PreauditOutput } from "../../src/schemas/preaudit.js";

type PreauditRunJson = {
  run_id?: string;
  display_run_id?: string;
  framework_fit?: "good" | "partial" | "poor";
  site_type?: string;
  validated_output?: PreauditOutput;
};

async function getLatestPreauditRunDir(runsDir: string): Promise<string> {
  const entries = await fs.readdir(runsDir, { withFileTypes: true });
  const preauditRunDirs = entries
    .filter((entry) => entry.isDirectory() && entry.name.startsWith("preaudit-"))
    .map((entry) => entry.name)
    .sort();

  for (let i = preauditRunDirs.length - 1; i >= 0; i--) {
    const candidate = preauditRunDirs[i];
    if (!candidate) {
      continue;
    }

    const runJsonPath = path.join(runsDir, candidate, "run.json");
    try {
      await fs.access(runJsonPath);
      return path.join(runsDir, candidate);
    } catch {
      continue;
    }
  }

  throw new Error("No completed preaudit runs with run.json found in artifacts/runs");
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

  const report = generatePreauditReport(runJson.validated_output, {
    framework_fit: runJson.framework_fit,
    site_type: runJson.site_type,
  });
  const reportPath = path.join(runDir, "report.md");
  const reportBody = runJson.display_run_id
    ? `<!-- display_run_id: ${runJson.display_run_id} -->\n\n${report}\n`
    : `${report}\n`;
  await fs.writeFile(reportPath, reportBody, "utf8");

  console.log("reportPath:", reportPath);
}

await main();
