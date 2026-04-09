import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { buildPreauditPrompt } from "../preaudit/contract.js";
import { PreauditRunError } from "../preaudit/errors.js";
import { getLastPreauditLLMSdk, runPreauditLLM } from "../preaudit/piClient.js";
import { createPreauditRunId } from "../preaudit/runId.js";
import {
  appendPreauditRunEvent,
  getGitCommit,
  resolveRepoRootFromModuleUrl,
  preauditEventLineFromSdkMessage,
  preauditRunDirFor,
  sha256Buffer,
  sha256Utf8,
  writePreauditRunJson,
  type PreauditRunArtifactV1,
} from "../preaudit/runArtifact.js";
import { parseAndValidatePreauditOutput } from "../preaudit/validateOutput.js";
import type { PreauditOutput } from "../schemas/preaudit.js";

export type PreauditAgentSuccess = {
  runId: string;
  artifactDir: string;
  output: PreauditOutput;
};

function parseDetailMessage(details: unknown): string | undefined {
  if (details && typeof details === "object" && "message" in details) {
    return String((details as { message: string }).message);
  }
  return undefined;
}

export async function runPreauditAgent(
  scenarioIndex?: number,
): Promise<PreauditAgentSuccess> {
  const index = scenarioIndex ?? 0;
  const repoRoot = resolveRepoRootFromModuleUrl(import.meta.url);
  const runId = createPreauditRunId();
  const runDir = preauditRunDirFor(repoRoot, runId);
  await fs.mkdir(runDir, { recursive: true });

  const startedAt = new Date().toISOString();
  const gitCommit = getGitCommit(repoRoot);
  const preauditDataPath = path.join(repoRoot, "data", "preaudit.json");
  let preauditDataSha = "";
  let promptSha = "";
  let prompt = "";

  const baseFields = (): Omit<
    PreauditRunArtifactV1,
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
    preaudit_data_path: preauditDataPath,
    preaudit_data_sha256: preauditDataSha,
    preaudit_record_index: index,
    git_commit: gitCommit,
    prompt_sha256: promptSha,
  });

  try {
    let preauditBytes: Buffer;
    try {
      preauditBytes = await fs.readFile(preauditDataPath);
    } catch (cause) {
      const finishedAt = new Date().toISOString();
      await writePreauditRunJson(runDir, {
        ...baseFields(),
        finished_at: finishedAt,
        status: "input_error",
        exit_code: 1,
        unexpected_message:
          cause instanceof Error ? cause.message : String(cause),
      });
      throw new PreauditRunError("INPUT_INVALID", { cause });
    }

    preauditDataSha = sha256Buffer(preauditBytes);

    let parsed: unknown;
    try {
      parsed = JSON.parse(preauditBytes.toString("utf8"));
    } catch (cause) {
      const finishedAt = new Date().toISOString();
      await writePreauditRunJson(runDir, {
        ...baseFields(),
        finished_at: finishedAt,
        status: "input_error",
        exit_code: 1,
        unexpected_message:
          cause instanceof Error ? cause.message : String(cause),
      });
      throw new PreauditRunError("INPUT_INVALID", { cause });
    }

    if (!Array.isArray(parsed)) {
      const finishedAt = new Date().toISOString();
      await writePreauditRunJson(runDir, {
        ...baseFields(),
        finished_at: finishedAt,
        status: "input_error",
        exit_code: 1,
        unexpected_message: "preaudit.json must be a JSON array",
      });
      throw new PreauditRunError("INPUT_INVALID", {
        message: "preaudit.json must be a JSON array",
      });
    }

    if (parsed.length === 0) {
      const finishedAt = new Date().toISOString();
      await writePreauditRunJson(runDir, {
        ...baseFields(),
        finished_at: finishedAt,
        status: "input_error",
        exit_code: 1,
        unexpected_message: "preaudit.json array is empty",
      });
      throw new PreauditRunError("INPUT_INVALID", {
        message: "preaudit.json array is empty",
      });
    }

    if (index < 0 || index >= parsed.length) {
      const finishedAt = new Date().toISOString();
      await writePreauditRunJson(runDir, {
        ...baseFields(),
        finished_at: finishedAt,
        status: "input_error",
        exit_code: 1,
        unexpected_message: `scenario index ${index} out of range (array length ${parsed.length})`,
      });
      throw new PreauditRunError("INPUT_INVALID", {
        index,
        length: parsed.length,
      });
    }

    const selectedScenario = parsed[index];
    const scenarioText = JSON.stringify(selectedScenario, null, 2);
    prompt = buildPreauditPrompt(scenarioText);
    promptSha = sha256Utf8(prompt);

    // Experimental pi-ai integration for multi-provider evaluation. Other agents still use Claude SDK.
    let terminalResult: { result: string };
    const fallbackSdk = {
      subtype: "success",
      total_cost_usd: 0,
      num_turns: 1,
    } satisfies NonNullable<PreauditRunArtifactV1["sdk"]>;

    try {
      terminalResult = { result: await runPreauditLLM(prompt) };
      const sdk = getLastPreauditLLMSdk() ?? fallbackSdk;
      await appendPreauditRunEvent(
        runDir,
        preauditEventLineFromSdkMessage({ type: "result", subtype: "success" }),
      );
      let output: PreauditOutput;
      try {
        output = parseAndValidatePreauditOutput(terminalResult.result);
      } catch (e) {
        const ft = new Date().toISOString();
        if (e instanceof PreauditRunError && e.code === "OUTPUT_PARSE") {
          await writePreauditRunJson(runDir, {
            ...baseFields(),
            finished_at: ft,
            status: "parse_error",
            exit_code: 1,
            sdk,
            raw_model_output: terminalResult.result,
            parse_error_message: parseDetailMessage(e.details),
          });
        } else if (e instanceof PreauditRunError && e.code === "OUTPUT_SCHEMA") {
          await writePreauditRunJson(runDir, {
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
      await writePreauditRunJson(runDir, {
        ...baseFields(),
        finished_at: finishedOk,
        status: "success",
        exit_code: 0,
        sdk,
        raw_model_output: terminalResult.result,
        validated_output: output,
      });

      console.log(
        `Preaudit run OK: ${output.priority_alerts.length} alerts — ${path.join(runDir, "run.json")}`,
      );

      return { runId, artifactDir: runDir, output };
    } catch (cause) {
      const finishedAt = new Date().toISOString();
      const message = cause instanceof Error ? cause.message : String(cause);
      const sdk = getLastPreauditLLMSdk() ?? {
        ...fallbackSdk,
        subtype: "error",
        errors: [message],
      };
      await appendPreauditRunEvent(
        runDir,
        preauditEventLineFromSdkMessage({ type: "result", subtype: sdk.subtype }),
      );
      await writePreauditRunJson(runDir, {
        ...baseFields(),
        finished_at: finishedAt,
        status: "sdk_error",
        exit_code: 1,
        sdk,
        raw_model_output: null,
      });
      throw new PreauditRunError("SDK_RUN_FAILED", {
        subtype: sdk.subtype,
        errors: "errors" in sdk ? sdk.errors : [message],
      });
    }
  } catch (e) {
    if (e instanceof PreauditRunError) {
      throw e;
    }
    const finishedAt = new Date().toISOString();
    try {
      await writePreauditRunJson(runDir, {
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
