import "dotenv/config";
import { query } from "@anthropic-ai/claude-agent-sdk";
import type { SDKMessage, SDKResultMessage } from "@anthropic-ai/claude-agent-sdk";
import fs from "node:fs/promises";
import path from "node:path";
import { buildAuditPrompt } from "../audit/contract.js";
import { AuditRunError } from "../audit/errors.js";
import { createAuditRunId } from "../audit/runId.js";
import {
  appendAuditRunEvent,
  getGitCommit,
  resolveRepoRootFromModuleUrl,
  auditEventLineFromSdkMessage,
  auditRunDirFor,
  auditSdkFieldsFromResult,
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

export async function runAuditAgent(
  scenarioIndex?: number,
): Promise<AuditAgentSuccess> {
  const index = scenarioIndex ?? 0;
  const repoRoot = resolveRepoRootFromModuleUrl(import.meta.url);
  const runId = createAuditRunId();
  const runDir = auditRunDirFor(repoRoot, runId);
  await fs.mkdir(runDir, { recursive: true });

  const startedAt = new Date().toISOString();
  const gitCommit = getGitCommit(repoRoot);
  const auditDataPath = path.join(repoRoot, "data", "audit.json");
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
    started_at: startedAt,
    model: "haiku",
    audit_data_path: auditDataPath,
    audit_data_sha256: auditDataSha,
    audit_record_index: index,
    git_commit: gitCommit,
    prompt_sha256: promptSha,
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
        unexpected_message: "audit.json must be a JSON array",
      });
      throw new AuditRunError("INPUT_INVALID", {
        message: "audit.json must be a JSON array",
      });
    }

    if (parsed.length === 0) {
      const finishedAt = new Date().toISOString();
      await writeAuditRunJson(runDir, {
        ...baseFields(),
        finished_at: finishedAt,
        status: "input_error",
        exit_code: 1,
        unexpected_message: "audit.json array is empty",
      });
      throw new AuditRunError("INPUT_INVALID", {
        message: "audit.json array is empty",
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
    const scenarioText = JSON.stringify(selectedScenario, null, 2);
    prompt = buildAuditPrompt(scenarioText);
    promptSha = sha256Utf8(prompt);

    const run = query({
      prompt,
      options: {
        maxTurns: 2,
        maxBudgetUsd: 0.1,
        allowedTools: [],
        settingSources: ["project"],
      },
    });

    await run.setModel("haiku");

    let terminalResult: SDKResultMessage | undefined;
    for await (const message of run as AsyncIterable<SDKMessage>) {
      await appendAuditRunEvent(runDir, auditEventLineFromSdkMessage(message));
      if (message.type === "result") {
        terminalResult = message;
      }
    }

    const finishedAt = new Date().toISOString();

    if (!terminalResult) {
      await writeAuditRunJson(runDir, {
        ...baseFields(),
        finished_at: finishedAt,
        status: "sdk_error",
        exit_code: 1,
        unexpected_message: "No terminal result message in stream",
      });
      throw new AuditRunError("SDK_NO_RESULT", {});
    }

    if (terminalResult.subtype !== "success") {
      await writeAuditRunJson(runDir, {
        ...baseFields(),
        finished_at: finishedAt,
        status: "sdk_error",
        exit_code: 1,
        sdk: auditSdkFieldsFromResult(terminalResult),
        raw_model_output: null,
      });
      throw new AuditRunError("SDK_RUN_FAILED", {
        subtype: terminalResult.subtype,
        errors: terminalResult.errors,
      });
    }

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
          sdk: auditSdkFieldsFromResult(terminalResult),
          raw_model_output: terminalResult.result,
          parse_error_message: parseDetailMessage(e.details),
        });
      } else if (e instanceof AuditRunError && e.code === "OUTPUT_SCHEMA") {
        await writeAuditRunJson(runDir, {
          ...baseFields(),
          finished_at: ft,
          status: "schema_error",
          exit_code: 1,
          sdk: auditSdkFieldsFromResult(terminalResult),
          raw_model_output: terminalResult.result,
          validation_errors: e.details,
        });
      }
      throw e;
    }

    const finishedOk = new Date().toISOString();
    await writeAuditRunJson(runDir, {
      ...baseFields(),
      finished_at: finishedOk,
      status: "success",
      exit_code: 0,
      sdk: auditSdkFieldsFromResult(terminalResult),
      raw_model_output: terminalResult.result,
      validated_output: output,
    });

    console.log(
      `Audit run OK: ${output.recommended_agents.length} recommended agents — ${path.join(runDir, "run.json")}`,
    );

    return { runId, artifactDir: runDir, output };
  } catch (e) {
    if (e instanceof AuditRunError) {
      throw e;
    }
    const finishedAt = new Date().toISOString();
    try {
      await writeAuditRunJson(runDir, {
        ...baseFields(),
        finished_at: finishedAt,
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
