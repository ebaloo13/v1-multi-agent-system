import "dotenv/config";
import { query } from "@anthropic-ai/claude-agent-sdk";
import type { SDKMessage, SDKResultMessage } from "@anthropic-ai/claude-agent-sdk";
import fs from "node:fs/promises";
import path from "node:path";
import { buildCollectionsPrompt } from "../collections/contract.js";
import { CollectionsRunError } from "../collections/errors.js";
import { createRunId } from "../collections/runId.js";
import {
  appendRunEvent,
  eventLineFromSdkMessage,
  getGitCommit,
  resolveRepoRootFromModuleUrl,
  runDirFor,
  sdkFieldsFromResult,
  sha256Buffer,
  sha256Utf8,
  writeRunJson,
  type RunArtifactV1,
} from "../collections/runArtifact.js";
import { parseAndValidateCollectionsOutput } from "../collections/validateOutput.js";
import type { CollectionsOutput } from "../schemas/collections.js";

export type CollectionsAgentSuccess = {
  runId: string;
  artifactDir: string;
  output: CollectionsOutput;
};

function parseDetailMessage(details: unknown): string | undefined {
  if (details && typeof details === "object" && "message" in details) {
    return String((details as { message: string }).message);
  }
  return undefined;
}

export async function runCollectionsAgent(): Promise<CollectionsAgentSuccess> {
  const repoRoot = resolveRepoRootFromModuleUrl(import.meta.url);
  const runId = createRunId();
  const runDir = runDirFor(repoRoot, runId);
  await fs.mkdir(runDir, { recursive: true });

  const startedAt = new Date().toISOString();
  const gitCommit = getGitCommit(repoRoot);
  const invoicePath = path.join(repoRoot, "data", "invoices.json");
  let invoiceSha = "";
  let promptSha = "";
  let prompt = "";

  const baseFields = (): Omit<
    RunArtifactV1,
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
    invoice_path: invoicePath,
    invoice_sha256: invoiceSha,
    git_commit: gitCommit,
    prompt_sha256: promptSha,
  });

  try {
    let invoiceBytes: Buffer;
    try {
      invoiceBytes = await fs.readFile(invoicePath);
    } catch (cause) {
      const finishedAt = new Date().toISOString();
      await writeRunJson(runDir, {
        ...baseFields(),
        finished_at: finishedAt,
        status: "input_error",
        exit_code: 1,
        unexpected_message:
          cause instanceof Error ? cause.message : String(cause),
      });
      throw new CollectionsRunError("INPUT_INVALID", { cause });
    }

    invoiceSha = sha256Buffer(invoiceBytes);
    const invoicesText = invoiceBytes.toString("utf8");
    prompt = buildCollectionsPrompt(invoicesText);
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
      await appendRunEvent(runDir, eventLineFromSdkMessage(message));
      if (message.type === "result") {
        terminalResult = message;
      }
    }

    const finishedAt = new Date().toISOString();

    if (!terminalResult) {
      await writeRunJson(runDir, {
        ...baseFields(),
        finished_at: finishedAt,
        status: "sdk_error",
        exit_code: 1,
        unexpected_message: "No terminal result message in stream",
      });
      throw new CollectionsRunError("SDK_NO_RESULT", {});
    }

    if (terminalResult.subtype !== "success") {
      await writeRunJson(runDir, {
        ...baseFields(),
        finished_at: finishedAt,
        status: "sdk_error",
        exit_code: 1,
        sdk: sdkFieldsFromResult(terminalResult),
        raw_model_output: null,
      });
      throw new CollectionsRunError("SDK_RUN_FAILED", {
        subtype: terminalResult.subtype,
        errors: terminalResult.errors,
      });
    }

    let output: CollectionsOutput;
    try {
      output = parseAndValidateCollectionsOutput(terminalResult.result);
    } catch (e) {
      const ft = new Date().toISOString();
      if (e instanceof CollectionsRunError && e.code === "OUTPUT_PARSE") {
        await writeRunJson(runDir, {
          ...baseFields(),
          finished_at: ft,
          status: "parse_error",
          exit_code: 1,
          sdk: sdkFieldsFromResult(terminalResult),
          raw_model_output: terminalResult.result,
          parse_error_message: parseDetailMessage(e.details),
        });
      } else if (e instanceof CollectionsRunError && e.code === "OUTPUT_SCHEMA") {
        await writeRunJson(runDir, {
          ...baseFields(),
          finished_at: ft,
          status: "schema_error",
          exit_code: 1,
          sdk: sdkFieldsFromResult(terminalResult),
          raw_model_output: terminalResult.result,
          validation_errors: e.details,
        });
      }
      throw e;
    }

    const finishedOk = new Date().toISOString();
    await writeRunJson(runDir, {
      ...baseFields(),
      finished_at: finishedOk,
      status: "success",
      exit_code: 0,
      sdk: sdkFieldsFromResult(terminalResult),
      raw_model_output: terminalResult.result,
      validated_output: output,
    });

    console.log(
      `Collections run OK: ${output.actions.length} actions — ${path.join(runDir, "run.json")}`,
    );

    return { runId, artifactDir: runDir, output };
  } catch (e) {
    if (e instanceof CollectionsRunError) {
      throw e;
    }
    const finishedAt = new Date().toISOString();
    try {
      await writeRunJson(runDir, {
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
