import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { SDKResultMessage } from "@anthropic-ai/claude-agent-sdk";
import type { PreauditOutput } from "../schemas/preaudit.js";

export type PreauditRunArtifactStatus =
  | "success"
  | "sdk_error"
  | "parse_error"
  | "schema_error"
  | "input_error"
  | "unexpected_error";

export type PreauditRunArtifactV1 = {
  schema_version: 1;
  run_id: string;
  started_at: string;
  finished_at: string;
  status: PreauditRunArtifactStatus;
  exit_code: 0 | 1;
  model: string;
  preaudit_data_path: string;
  preaudit_data_sha256: string;
  preaudit_record_index?: number;
  git_commit: string | null;
  prompt_sha256: string;
  sdk?: {
    subtype: string;
    errors?: string[];
    total_cost_usd: number;
    num_turns: number;
    session_id?: string;
  };
  raw_model_output?: string | null;
  validated_output?: PreauditOutput;
  validation_errors?: unknown;
  parse_error_message?: string;
  unexpected_message?: string;
};

export type PreauditRunEventLine = {
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

export function preauditRunDirFor(repoRoot: string, runId: string): string {
  return path.join(repoRoot, "artifacts", "runs", runId);
}

export function preauditEventLineFromSdkMessage(message: {
  type: string;
  subtype?: string;
}): PreauditRunEventLine {
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

export async function writePreauditRunJson(
  runDir: string,
  body: PreauditRunArtifactV1,
): Promise<void> {
  const filePath = path.join(runDir, "run.json");
  const withLocalTime = {
    ...body,
    local_time: new Date().toLocaleString(),
  } as Record<string, unknown>;

  await fs.writeFile(filePath, `${JSON.stringify(withLocalTime, null, 2)}\n`, "utf8");
}

export async function appendPreauditRunEvent(
  runDir: string,
  event: PreauditRunEventLine,
): Promise<void> {
  const filePath = path.join(runDir, "events.ndjson");
  await fs.appendFile(filePath, `${JSON.stringify(event)}\n`, "utf8");
}

export function preauditSdkFieldsFromResult(
  m: SDKResultMessage,
): PreauditRunArtifactV1["sdk"] {
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
