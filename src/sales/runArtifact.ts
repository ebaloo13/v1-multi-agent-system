import fs from "node:fs/promises";
import path from "node:path";
import type { SalesOutput } from "../schemas/sales.js";
import { appendRunEvent as appendRuntimeRunEvent } from "../runtime/runArtifacts.js";
export {
  getGitCommit,
  resolveRepoRootFromModuleUrl,
  sha256Buffer,
  sha256Utf8,
} from "../runtime/runArtifacts.js";

export type SalesRunArtifactStatus =
  | "success"
  | "sdk_error"
  | "parse_error"
  | "schema_error"
  | "input_error"
  | "unexpected_error";

export type SalesRunArtifactV1 = {
  schema_version: 1;
  run_id: string;
  started_at: string;
  finished_at: string;
  status: SalesRunArtifactStatus;
  exit_code: 0 | 1;
  model: string;
  sales_data_path: string;
  sales_data_sha256: string;
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
  validated_output?: SalesOutput;
  validation_errors?: unknown;
  parse_error_message?: string;
  unexpected_message?: string;
};

export type SalesRunEventLine = {
  ts: string;
  type: string;
  subtype?: string;
  summary?: string;
};

export type SalesResultMessage = {
  subtype: string;
  errors?: string[];
  total_cost_usd: number;
  num_turns: number;
  session_id?: string;
};

export function salesRunDirFor(repoRoot: string, runId: string): string {
  return path.join(repoRoot, "artifacts", "runs", runId);
}

export function salesEventLineFromSdkMessage(message: {
  type: string;
  subtype?: string;
}): SalesRunEventLine {
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

export async function writeSalesRunJson(runDir: string, body: SalesRunArtifactV1): Promise<void> {
  const filePath = path.join(runDir, "run.json");
  const withLocalTime = {
    ...body,
    local_time: new Date().toLocaleString(),
  } as Record<string, unknown>;

  await fs.writeFile(filePath, `${JSON.stringify(withLocalTime, null, 2)}\n`, "utf8");
}

export async function appendSalesRunEvent(runDir: string, event: SalesRunEventLine): Promise<void> {
  await appendRuntimeRunEvent(runDir, event);
}

export function salesSdkFieldsFromResult(m: SalesResultMessage): SalesRunArtifactV1["sdk"] {
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
