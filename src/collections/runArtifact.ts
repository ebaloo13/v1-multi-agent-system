import path from "node:path";
import type { CollectionsOutput } from "../schemas/collections.js";
import { appendRunEvent as appendRuntimeRunEvent } from "../runtime/runArtifacts.js";
import { eventLineFromSdkMessage as runtimeEventLineFromSdkMessage } from "../runtime/runArtifacts.js";
import { sdkFieldsFromResult as runtimeSdkFieldsFromResult } from "../runtime/runArtifacts.js";
import { writeRunJsonFile } from "../runtime/runArtifacts.js";
export {
  getGitCommit,
  resolveRepoRootFromModuleUrl,
  sha256Buffer,
  sha256Utf8,
} from "../runtime/runArtifacts.js";

export type RunArtifactStatus =
  | "success"
  | "sdk_error"
  | "parse_error"
  | "schema_error"
  | "input_error"
  | "unexpected_error";

export type RunArtifactV1 = {
  schema_version: 1;
  run_id: string;
  started_at: string;
  finished_at: string;
  status: RunArtifactStatus;
  exit_code: 0 | 1;
  model: string;
  invoice_path: string;
  invoice_sha256: string;
  git_commit: string | null;
  prompt_sha256: string;
  sdk?: {
    subtype: string;
    errors?: string[];
    total_cost_usd: number;
    num_turns: number;
    session_id?: string;
  };
  /** Present on success (collections run). Omitted on failure statuses. */
  raw_model_output?: string | null;
  /** Only when status === "success". Omitted on all failure statuses. */
  validated_output?: CollectionsOutput;
  validation_errors?: unknown;
  parse_error_message?: string;
  /** Human-readable failure detail (input_error, sdk_error edge cases, unexpected_error). */
  unexpected_message?: string;
};

export type RunEventLine = {
  ts: string;
  type: string;
  subtype?: string;
  summary?: string;
};

export type CollectionsResultMessage = {
  subtype: string;
  errors?: string[];
  total_cost_usd: number;
  num_turns: number;
  session_id?: string;
};

export function runDirFor(repoRoot: string, runId: string): string {
  return path.join(repoRoot, "artifacts", "runs", runId);
}

export function eventLineFromSdkMessage(message: {
  type: string;
  subtype?: string;
}): RunEventLine {
  return runtimeEventLineFromSdkMessage(message);
}

export async function writeRunJson(runDir: string, body: RunArtifactV1): Promise<void> {
  await writeRunJsonFile(runDir, body);
}

export async function appendRunEvent(runDir: string, event: RunEventLine): Promise<void> {
  await appendRuntimeRunEvent(runDir, event);
}

export function sdkFieldsFromResult(m: CollectionsResultMessage): RunArtifactV1["sdk"] {
  return runtimeSdkFieldsFromResult(m);
}
