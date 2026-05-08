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

export type RunSdkEventMessage = {
  type: string;
  subtype?: string;
};

export type RunResultMetadata = {
  subtype: string;
  errors?: string[];
  total_cost_usd: number;
  num_turns: number;
  session_id?: string;
};

export type RunSdkFields = {
  subtype: string;
  errors?: string[];
  total_cost_usd: number;
  num_turns: number;
  session_id?: string;
};

type RunArtifactWithLocalTime<Artifact extends object> = Artifact & {
  local_time: string;
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

export function eventLineFromSdkMessage(message: RunSdkEventMessage): RunEventLine {
  const ts = new Date().toISOString();
  if (message.type === "result" && message.subtype !== undefined) {
    return {
      ts,
      type: message.type,
      subtype: message.subtype,
      summary: `result:${message.subtype}`,
    };
  }
  return { ts, type: message.type };
}

export async function writeRunJsonFile<Artifact extends object>(
  runDir: string,
  body: Artifact,
): Promise<void> {
  const filePath = path.join(runDir, "run.json");
  const withLocalTime: RunArtifactWithLocalTime<Artifact> = {
    ...body,
    local_time: new Date().toLocaleString(),
  };

  await fs.writeFile(filePath, `${JSON.stringify(withLocalTime, null, 2)}\n`, "utf8");
}

export function sdkFieldsFromResult(m: RunResultMetadata): RunSdkFields {
  if (m.subtype === "success") {
    return {
      subtype: m.subtype,
      total_cost_usd: m.total_cost_usd,
      num_turns: m.num_turns,
      session_id: m.session_id,
    };
  }
  return {
    subtype: m.subtype,
    errors: m.errors,
    total_cost_usd: m.total_cost_usd,
    num_turns: m.num_turns,
    session_id: m.session_id,
  };
}
