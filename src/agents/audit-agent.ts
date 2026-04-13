import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import {
  artifactAgentPath,
  artifactClientPath,
  artifactRelativePath,
  relocateRunDir,
  writeLatestClientRunPointer,
} from "../common/clientArtifacts.js";
import {
  deriveClientSlugFromRecord,
  nextDisplayRunId,
} from "../common/runNaming.js";
import { buildAuditPrompt } from "../audit/contract.js";
import { AuditRunError } from "../audit/errors.js";
import { getLastAuditLLMSdk, runAuditLLM } from "../audit/piClient.js";
import { createAuditRunId } from "../audit/runId.js";
import {
  appendAuditRunEvent,
  getGitCommit,
  resolveRepoRootFromModuleUrl,
  auditEventLineFromSdkMessage,
  auditRunDirFor,
  sha256Buffer,
  sha256Utf8,
  writeAuditRunJson,
  type AuditRunArtifactV1,
} from "../audit/runArtifact.js";
import { parseAndValidateAuditOutput } from "../audit/validateOutput.js";
import type { AuditOutput } from "../schemas/audit.js";

export type AuditAgentSuccess = {
  runId: string;
  artifactDir: string;
  output: AuditOutput;
};

function parseDetailMessage(details: unknown): string | undefined {
  if (details && typeof details === "object" && "message" in details) {
    return String((details as { message: string }).message);
  }
  return undefined;
}

function durationMs(startedAt: string, finishedAt: string): number {
  return Math.max(0, Date.parse(finishedAt) - Date.parse(startedAt));
}

export async function runAuditAgent(
  scenarioIndex?: number,
): Promise<AuditAgentSuccess> {
  const index = scenarioIndex ?? 0;
  const auditVariant = "pi-ai" as const;
  const repoRoot = resolveRepoRootFromModuleUrl(import.meta.url);
  const runId = createAuditRunId();
  let runDir = auditRunDirFor(repoRoot, { runId });
  await fs.mkdir(runDir, { recursive: true });

  const startedAt = new Date().toISOString();
  const gitCommit = getGitCommit(repoRoot);
  const structuredAuditInputPath = process.env.AUDIT_INPUT_PATH?.trim();
  const auditDataPath = structuredAuditInputPath || path.join(repoRoot, "data", "mock", "audit.json");
  const inputSource = structuredAuditInputPath ? "live" : "mock";
  const auditInputSource = structuredAuditInputPath ? "structured" : "mock";
  const intakePath = process.env.AUDIT_INTAKE_PATH?.trim() || undefined;
  const sourcePreauditRunId = process.env.SOURCE_PREAUDIT_RUN_ID?.trim() || undefined;
  const sourcePreauditDisplayRunId =
    process.env.SOURCE_PREAUDIT_DISPLAY_RUN_ID?.trim() || undefined;
  const sourcePreauditPath = process.env.SOURCE_PREAUDIT_PATH?.trim() || undefined;
  let displayRunId = "";
  let clientSlug = "generic-client";
  let auditDataSha = "";
  let promptSha = "";
  let prompt = "";

  const baseFields = (): Omit<
    AuditRunArtifactV1,
    | "finished_at"
    | "status"
    | "exit_code"
    | "sdk"
    | "raw_model_output"
    | "validated_output"
    | "validation_errors"
    | "parse_error_message"
    | "unexpected_message"
  > => ({
    schema_version: 1,
    run_id: runId,
    display_run_id: displayRunId || undefined,
    client_slug: clientSlug,
    input_source: inputSource,
    runtime: "pi-ai",
    started_at: startedAt,
    model: "haiku",
    audit_data_path: auditDataPath,
    audit_data_sha256: auditDataSha,
    audit_record_index: index,
    audit_variant: auditVariant,
    git_commit: gitCommit,
    prompt_sha256: promptSha,
    score_source: "llm",
    audit_input_source: auditInputSource,
    intake_path: intakePath,
    artifact_client_path: artifactRelativePath(repoRoot, artifactClientPath(repoRoot, clientSlug)),
    artifact_agent_path: artifactRelativePath(repoRoot, artifactAgentPath(repoRoot, clientSlug, "audit")),
    source_preaudit_run_id: sourcePreauditRunId,
    source_preaudit_display_run_id: sourcePreauditDisplayRunId,
    source_preaudit_path: sourcePreauditPath,
  });

  try {
    let auditBytes: Buffer;
    try {
      auditBytes = await fs.readFile(auditDataPath);
    } catch (cause) {
      const finishedAt = new Date().toISOString();
      await writeAuditRunJson(runDir, {
        ...baseFields(),
        finished_at: finishedAt,
        status: "input_error",
        exit_code: 1,
        unexpected_message:
          cause instanceof Error ? cause.message : String(cause),
      });
      throw new AuditRunError("INPUT_INVALID", { cause });
    }

    auditDataSha = sha256Buffer(auditBytes);

    let parsed: unknown;
    try {
      parsed = JSON.parse(auditBytes.toString("utf8"));
    } catch (cause) {
      const finishedAt = new Date().toISOString();
      await writeAuditRunJson(runDir, {
        ...baseFields(),
        finished_at: finishedAt,
        status: "input_error",
        exit_code: 1,
        unexpected_message:
          cause instanceof Error ? cause.message : String(cause),
      });
      throw new AuditRunError("INPUT_INVALID", { cause });
    }

    if (!Array.isArray(parsed)) {
      const finishedAt = new Date().toISOString();
      await writeAuditRunJson(runDir, {
        ...baseFields(),
        finished_at: finishedAt,
        status: "input_error",
        exit_code: 1,
        unexpected_message: "data/mock/audit.json must be a JSON array",
      });
      throw new AuditRunError("INPUT_INVALID", {
        message: "data/mock/audit.json must be a JSON array",
      });
    }

    if (parsed.length === 0) {
      const finishedAt = new Date().toISOString();
      await writeAuditRunJson(runDir, {
        ...baseFields(),
        finished_at: finishedAt,
        status: "input_error",
        exit_code: 1,
        unexpected_message: "data/mock/audit.json array is empty",
      });
      throw new AuditRunError("INPUT_INVALID", {
        message: "data/mock/audit.json array is empty",
      });
    }

    if (index < 0 || index >= parsed.length) {
      const finishedAt = new Date().toISOString();
      await writeAuditRunJson(runDir, {
        ...baseFields(),
        finished_at: finishedAt,
        status: "input_error",
        exit_code: 1,
        unexpected_message: `scenario index ${index} out of range (array length ${parsed.length})`,
      });
      throw new AuditRunError("INPUT_INVALID", {
        index,
        length: parsed.length,
      });
    }

    const selectedScenario = parsed[index];
    clientSlug =
      process.env.AUDIT_CLIENT_SLUG?.trim() ||
      deriveClientSlugFromRecord(selectedScenario, "generic-client");
    displayRunId = await nextDisplayRunId(repoRoot, "audit", clientSlug);
    runDir = await relocateRunDir(
      runDir,
      auditRunDirFor(repoRoot, {
        runId,
        clientSlug,
        displayRunId,
      }),
    );
    const scenarioText = JSON.stringify(selectedScenario, null, 2);
    prompt = buildAuditPrompt(scenarioText);
    promptSha = sha256Utf8(prompt);

    // Experimental pi-ai integration. Other agents may still use the original SDK. This change is isolated for comparison.
    let terminalResult: { result: string };
    const fallbackSdk = {
      subtype: "success",
      total_cost_usd: 0,
      num_turns: 1,
    } satisfies NonNullable<AuditRunArtifactV1["sdk"]>;

    try {
      terminalResult = { result: await runAuditLLM(prompt) };
      const sdk = getLastAuditLLMSdk() ?? fallbackSdk;
      await appendAuditRunEvent(
        runDir,
        auditEventLineFromSdkMessage({ type: "result", subtype: "success" }),
      );

      let output: AuditOutput;
      try {
        output = parseAndValidateAuditOutput(terminalResult.result);
      } catch (e) {
        const ft = new Date().toISOString();
        if (e instanceof AuditRunError && e.code === "OUTPUT_PARSE") {
          await writeAuditRunJson(runDir, {
            ...baseFields(),
            finished_at: ft,
            status: "parse_error",
            exit_code: 1,
            sdk,
            raw_model_output: terminalResult.result,
            parse_error_message: parseDetailMessage(e.details),
          });
        } else if (e instanceof AuditRunError && e.code === "OUTPUT_SCHEMA") {
          await writeAuditRunJson(runDir, {
            ...baseFields(),
            finished_at: ft,
            status: "schema_error",
            exit_code: 1,
            sdk,
            raw_model_output: terminalResult.result,
            validation_errors: e.details,
          });
        }
        throw e;
      }

      const finishedOk = new Date().toISOString();
      const completedDurationMs = durationMs(startedAt, finishedOk);
      await writeAuditRunJson(runDir, {
        ...baseFields(),
        finished_at: finishedOk,
        duration_ms: completedDurationMs,
        status: "success",
        exit_code: 0,
        sdk,
        raw_model_output: terminalResult.result,
        validated_output: output,
      });
      await writeLatestClientRunPointer(repoRoot, {
        clientSlug,
        agent: "audit",
        displayRunId,
        runId,
        runDir,
      });

      console.log("[audit] success");
      console.log(`display_run_id: ${displayRunId || runId}`);
      console.log("runtime: pi-ai");
      console.log(`input_source: ${inputSource}`);
      console.log(`audit_input_source: ${auditInputSource}`);
      console.log(`duration_ms: ${completedDurationMs}`);
      console.log(`run_json: ${path.join(runDir, "run.json")}`);

      return { runId, artifactDir: runDir, output };
    } catch (cause) {
      const finishedAt = new Date().toISOString();
      const message = cause instanceof Error ? cause.message : String(cause);
      const sdk = getLastAuditLLMSdk() ?? {
        ...fallbackSdk,
        subtype: "error",
        errors: [message],
      };
      await appendAuditRunEvent(
        runDir,
        auditEventLineFromSdkMessage({ type: "result", subtype: sdk.subtype }),
      );
      await writeAuditRunJson(runDir, {
        ...baseFields(),
        finished_at: finishedAt,
        duration_ms: durationMs(startedAt, finishedAt),
        status: "sdk_error",
        exit_code: 1,
        sdk,
        raw_model_output: null,
      });
      throw new AuditRunError("SDK_RUN_FAILED", {
        subtype: sdk.subtype,
        errors: "errors" in sdk ? sdk.errors : [message],
      });
    }
  } catch (e) {
    if (e instanceof AuditRunError) {
      throw e;
    }
    const finishedAt = new Date().toISOString();
    try {
      await writeAuditRunJson(runDir, {
        ...baseFields(),
        finished_at: finishedAt,
        duration_ms: durationMs(startedAt, finishedAt),
        status: "unexpected_error",
        exit_code: 1,
        unexpected_message: e instanceof Error ? e.message : String(e),
      });
    } catch {
      // If artifact write fails, surface original error
    }
    throw e;
  }
}
