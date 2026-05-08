import path from "node:path";
import type { AuditOutput } from "../schemas/audit.js";
import { artifactRunPath } from "../shared/clientArtifacts.js";
import { appendRunEvent as appendRuntimeRunEvent } from "../runtime/runArtifacts.js";
import { sdkFieldsFromResult as runtimeSdkFieldsFromResult } from "../runtime/runArtifacts.js";
import { writeRunJsonFile } from "../runtime/runArtifacts.js";
export {
  getGitCommit,
  resolveRepoRootFromModuleUrl,
  sha256Buffer,
  sha256Utf8,
} from "../runtime/runArtifacts.js";

export type AuditRunArtifactStatus =
  | "success"
  | "sdk_error"
  | "parse_error"
  | "schema_error"
  | "input_error"
  | "unexpected_error";

export type AuditRunArtifactV1 = {
  schema_version: 1;
  run_id: string;
  display_run_id?: string;
  client_slug?: string;
  input_source?: "mock" | "live";
  runtime?: "claude-sdk" | "pi-ai";
  started_at: string;
  finished_at: string;
  duration_ms?: number;
  status: AuditRunArtifactStatus;
  exit_code: 0 | 1;
  model: string;
  audit_data_path: string;
  audit_data_sha256: string;
  /** Index into the `audit.json` top-level array for this run (one scenario per run). */
  audit_record_index?: number;
  audit_variant: "baseline" | "pi-ai";
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
  validated_output?: AuditOutput;
  validation_errors?: unknown;
  parse_error_message?: string;
  unexpected_message?: string;
  score_source?: "llm" | "deterministic";
  audit_input_source?: "mock" | "structured";
  intake_path?: string;
  artifact_client_path?: string;
  artifact_agent_path?: string;
  source_preaudit_run_id?: string;
  source_preaudit_display_run_id?: string;
  source_preaudit_path?: string;
};

export type AuditRunEventLine = {
  ts: string;
  type: string;
  subtype?: string;
  summary?: string;
};

export type AuditResultMessage = {
  subtype: string;
  errors?: string[];
  total_cost_usd: number;
  num_turns: number;
  session_id?: string;
};

export function auditRunDirFor(
  repoRoot: string,
  params: {
    runId: string;
    clientSlug?: string;
    displayRunId?: string;
  },
): string {
  return artifactRunPath(repoRoot, {
    runId: params.runId,
    clientSlug: params.clientSlug,
    displayRunId: params.displayRunId,
    agent: "audit",
  });
}

export function auditEventLineFromSdkMessage(message: {
  type: string;
  subtype?: string;
}): AuditRunEventLine {
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

export async function writeAuditRunJson(
  runDir: string,
  body: AuditRunArtifactV1,
): Promise<void> {
  await writeRunJsonFile(runDir, body);
}

export async function appendAuditRunEvent(
  runDir: string,
  event: AuditRunEventLine,
): Promise<void> {
  await appendRuntimeRunEvent(runDir, event);
}

export function auditSdkFieldsFromResult(
  m: AuditResultMessage,
): AuditRunArtifactV1["sdk"] {
  return runtimeSdkFieldsFromResult(m);
}
