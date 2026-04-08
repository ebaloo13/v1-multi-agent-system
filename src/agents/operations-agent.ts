import "dotenv/config";
import { query } from "@anthropic-ai/claude-agent-sdk";
import type { SDKMessage, SDKResultMessage } from "@anthropic-ai/claude-agent-sdk";
import fs from "node:fs/promises";
import path from "node:path";
import { buildOperationsPrompt } from "../operations/contract.js";
import { OperationsRunError } from "../operations/errors.js";
import { createOperationsRunId } from "../operations/runId.js";
import {
  appendOperationsRunEvent,
  getGitCommit,
  resolveRepoRootFromModuleUrl,
  operationsEventLineFromSdkMessage,
  operationsRunDirFor,
  operationsSdkFieldsFromResult,
  sha256Buffer,
  sha256Utf8,
  writeOperationsRunJson,
  type OperationsRunArtifactV1,
} from "../operations/runArtifact.js";
import { parseAndValidateOperationsOutput } from "../operations/validateOutput.js";
import type { OperationsOutput } from "../schemas/operations.js";

export type OperationsAgentSuccess = {
  runId: string;
  artifactDir: string;
  output: OperationsOutput;
};

function parseDetailMessage(details: unknown): string | undefined {
  if (details && typeof details === "object" && "message" in details) {
    return String((details as { message: string }).message);
  }
  return undefined;
}

export async function runOperationsAgent(): Promise<OperationsAgentSuccess> {
  const repoRoot = resolveRepoRootFromModuleUrl(import.meta.url);
  const runId = createOperationsRunId();
  const runDir = operationsRunDirFor(repoRoot, runId);
  await fs.mkdir(runDir, { recursive: true });

  const startedAt = new Date().toISOString();
  const gitCommit = getGitCommit(repoRoot);
  const operationsDataPath = path.join(repoRoot, "data", "operations.json");
  let operationsDataSha = "";
  let promptSha = "";
  let prompt = "";

  const baseFields = (): Omit<
    OperationsRunArtifactV1,
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
    operations_data_path: operationsDataPath,
    operations_data_sha256: operationsDataSha,
    git_commit: gitCommit,
    prompt_sha256: promptSha,
  });

  try {
    let operationsBytes: Buffer;
    try {
      operationsBytes = await fs.readFile(operationsDataPath);
    } catch (cause) {
      const finishedAt = new Date().toISOString();
      await writeOperationsRunJson(runDir, {
        ...baseFields(),
        finished_at: finishedAt,
        status: "input_error",
        exit_code: 1,
        unexpected_message:
          cause instanceof Error ? cause.message : String(cause),
      });
      throw new OperationsRunError("INPUT_INVALID", { cause });
    }

    operationsDataSha = sha256Buffer(operationsBytes);
    const operationsText = operationsBytes.toString("utf8");
    prompt = buildOperationsPrompt(operationsText);
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
      await appendOperationsRunEvent(runDir, operationsEventLineFromSdkMessage(message));
      if (message.type === "result") {
        terminalResult = message;
      }
    }

    const finishedAt = new Date().toISOString();

    if (!terminalResult) {
      await writeOperationsRunJson(runDir, {
        ...baseFields(),
        finished_at: finishedAt,
        status: "sdk_error",
        exit_code: 1,
        unexpected_message: "No terminal result message in stream",
      });
      throw new OperationsRunError("SDK_NO_RESULT", {});
    }

    if (terminalResult.subtype !== "success") {
      await writeOperationsRunJson(runDir, {
        ...baseFields(),
        finished_at: finishedAt,
        status: "sdk_error",
        exit_code: 1,
        sdk: operationsSdkFieldsFromResult(terminalResult),
        raw_model_output: null,
      });
      throw new OperationsRunError("SDK_RUN_FAILED", {
        subtype: terminalResult.subtype,
        errors: terminalResult.errors,
      });
    }

    let output: OperationsOutput;
    try {
      output = parseAndValidateOperationsOutput(terminalResult.result);
    } catch (e) {
      const ft = new Date().toISOString();
      if (e instanceof OperationsRunError && e.code === "OUTPUT_PARSE") {
        await writeOperationsRunJson(runDir, {
          ...baseFields(),
          finished_at: ft,
          status: "parse_error",
          exit_code: 1,
          sdk: operationsSdkFieldsFromResult(terminalResult),
          raw_model_output: terminalResult.result,
          parse_error_message: parseDetailMessage(e.details),
        });
      } else if (e instanceof OperationsRunError && e.code === "OUTPUT_SCHEMA") {
        await writeOperationsRunJson(runDir, {
          ...baseFields(),
          finished_at: ft,
          status: "schema_error",
          exit_code: 1,
          sdk: operationsSdkFieldsFromResult(terminalResult),
          raw_model_output: terminalResult.result,
          validation_errors: e.details,
        });
      }
      throw e;
    }

    const finishedOk = new Date().toISOString();
    await writeOperationsRunJson(runDir, {
      ...baseFields(),
      finished_at: finishedOk,
      status: "success",
      exit_code: 0,
      sdk: operationsSdkFieldsFromResult(terminalResult),
      raw_model_output: terminalResult.result,
      validated_output: output,
    });

    console.log(
      `Operations run OK: ${output.issues.length} issues — ${path.join(runDir, "run.json")}`,
    );

    return { runId, artifactDir: runDir, output };
  } catch (e) {
    if (e instanceof OperationsRunError) {
      throw e;
    }
    const finishedAt = new Date().toISOString();
    try {
      await writeOperationsRunJson(runDir, {
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
