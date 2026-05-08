import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export type RunEventLine = {
  ts: string;
  type: string;
  subtype?: string;
  summary?: string;
};

export function resolveRepoRootFromModuleUrl(moduleUrl: string): string {
  const file = fileURLToPath(moduleUrl);
  return path.join(path.dirname(file), "..", "..");
}

export function sha256Buffer(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

export function sha256Utf8(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

export function getGitCommit(repoRoot: string): string | null {
  try {
    const out = execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: repoRoot,
      encoding: "utf8",
    });
    const trimmed = out.trim();
    return trimmed.length > 0 ? trimmed : null;
  } catch {
    return null;
  }
}

export async function appendRunEvent(runDir: string, event: RunEventLine): Promise<void> {
  const filePath = path.join(runDir, "events.ndjson");
  await fs.appendFile(filePath, `${JSON.stringify(event)}\n`, "utf8");
}
