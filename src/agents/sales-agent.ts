import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { buildSalesPrompt } from "../sales/contract.js";
import { SalesRunError } from "../sales/errors.js";
import { createSalesRunId } from "../sales/runId.js";
import {
  appendSalesRunEvent,
  getGitCommit,
  resolveRepoRootFromModuleUrl,
  salesEventLineFromSdkMessage,
  salesRunDirFor,
  salesSdkFieldsFromResult,
  sha256Buffer,
  sha256Utf8,
  writeSalesRunJson,
  type SalesRunArtifactV1,
} from "../sales/runArtifact.js";
import { parseAndValidateSalesOutput } from "../sales/validateOutput.js";
import type { AgentRunner } from "../runtime/agentRunner.js";
import { runClaudeAgent } from "../runtime/claudeAgentRunner.js";
import type { SalesOutput } from "../schemas/sales.js";

export type SalesAgentSuccess = {
  runId: string;
  artifactDir: string;
  output: SalesOutput;
};

type SalesAgentOptions = {
  runner?: AgentRunner;
  runDir?: string;
};

function parseDetailMessage(details: unknown): string | undefined {
  if (details && typeof details === "object" && "message" in details) {
    return String((details as { message: string }).message);
  }
  return undefined;
}

export async function runSalesAgent(
  options: SalesAgentOptions = {},
): Promise<SalesAgentSuccess> {
  const runner = options.runner ?? runClaudeAgent;
  const repoRoot = resolveRepoRootFromModuleUrl(import.meta.url);
  const runId = createSalesRunId();
  const runDir = options.runDir ?? salesRunDirFor(repoRoot, runId);
  await fs.mkdir(runDir, { recursive: true });

  const startedAt = new Date().toISOString();
  const gitCommit = getGitCommit(repoRoot);
  const salesDataPath = path.join(repoRoot, "data", "mock", "sales.json");
  let salesDataSha = "";
  let promptSha = "";
  let prompt = "";

  const baseFields = (): Omit<
    SalesRunArtifactV1,
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
    sales_data_path: salesDataPath,
    sales_data_sha256: salesDataSha,
    git_commit: gitCommit,
    prompt_sha256: promptSha,
  });

  try {
    let salesBytes: Buffer;
    try {
      salesBytes = await fs.readFile(salesDataPath);
    } catch (cause) {
      const finishedAt = new Date().toISOString();
      await writeSalesRunJson(runDir, {
        ...baseFields(),
        finished_at: finishedAt,
        status: "input_error",
        exit_code: 1,
        unexpected_message:
          cause instanceof Error ? cause.message : String(cause),
      });
      throw new SalesRunError("INPUT_INVALID", { cause });
    }

    salesDataSha = sha256Buffer(salesBytes);
    const salesText = salesBytes.toString("utf8");
    prompt = buildSalesPrompt(salesText);
    promptSha = sha256Utf8(prompt);

    const terminalResult = await runner({
      prompt,
      onEvent: async (message) => {
        await appendSalesRunEvent(runDir, salesEventLineFromSdkMessage(message));
      },
    });

    const finishedAt = new Date().toISOString();

    if (!terminalResult) {
      await writeSalesRunJson(runDir, {
        ...baseFields(),
        finished_at: finishedAt,
        status: "sdk_error",
        exit_code: 1,
        unexpected_message: "No terminal result message in stream",
      });
      throw new SalesRunError("SDK_NO_RESULT", {});
    }

    if (terminalResult.subtype !== "success") {
      await writeSalesRunJson(runDir, {
        ...baseFields(),
        finished_at: finishedAt,
        status: "sdk_error",
        exit_code: 1,
        sdk: salesSdkFieldsFromResult(terminalResult),
        raw_model_output: null,
      });
      throw new SalesRunError("SDK_RUN_FAILED", {
        subtype: terminalResult.subtype,
        errors: terminalResult.errors,
      });
    }

    let output: SalesOutput;
    try {
      output = parseAndValidateSalesOutput(terminalResult.result);
    } catch (e) {
      const ft = new Date().toISOString();
      if (e instanceof SalesRunError && e.code === "OUTPUT_PARSE") {
        await writeSalesRunJson(runDir, {
          ...baseFields(),
          finished_at: ft,
          status: "parse_error",
          exit_code: 1,
          sdk: salesSdkFieldsFromResult(terminalResult),
          raw_model_output: terminalResult.result,
          parse_error_message: parseDetailMessage(e.details),
        });
      } else if (e instanceof SalesRunError && e.code === "OUTPUT_SCHEMA") {
        await writeSalesRunJson(runDir, {
          ...baseFields(),
          finished_at: ft,
          status: "schema_error",
          exit_code: 1,
          sdk: salesSdkFieldsFromResult(terminalResult),
          raw_model_output: terminalResult.result,
          validation_errors: e.details,
        });
      }
      throw e;
    }

    const finishedOk = new Date().toISOString();
    await writeSalesRunJson(runDir, {
      ...baseFields(),
      finished_at: finishedOk,
      status: "success",
      exit_code: 0,
      sdk: salesSdkFieldsFromResult(terminalResult),
      raw_model_output: terminalResult.result,
      validated_output: output,
    });

    console.log(
      `Sales run OK: ${output.opportunities.length} opportunities — ${path.join(runDir, "run.json")}`,
    );

    return { runId, artifactDir: runDir, output };
  } catch (e) {
    if (e instanceof SalesRunError) {
      throw e;
    }
    const finishedAt = new Date().toISOString();
    try {
      await writeSalesRunJson(runDir, {
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
