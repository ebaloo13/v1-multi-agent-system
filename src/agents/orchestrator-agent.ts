import "dotenv/config";
import { query } from "@anthropic-ai/claude-agent-sdk";
import type { SDKMessage, SDKResultMessage } from "@anthropic-ai/claude-agent-sdk";
import fs from "node:fs/promises";
import path from "node:path";
import { AuditRunError } from "../audit/errors.js";
import { CollectionsRunError } from "../collections/errors.js";
import { buildOrchestratorPrompt } from "../orchestrator/contract.js";
import { OrchestratorRunError } from "../orchestrator/errors.js";
import { OperationsRunError } from "../operations/errors.js";
import { createOrchestratorRunId } from "../orchestrator/runId.js";
import {
  appendOrchestratorRunEvent,
  getGitCommit,
  resolveRepoRootFromModuleUrl,
  orchestratorEventLineFromSdkMessage,
  orchestratorRunDirFor,
  orchestratorSdkFieldsFromResult,
  sha256Utf8,
  writeOrchestratorRunJson,
  type OrchestratorRunArtifactV1,
} from "../orchestrator/runArtifact.js";
import { SalesRunError } from "../sales/errors.js";
import {
  parseAndValidateOrchestratorOutput,
  validateOrchestratorFinalOutput,
} from "../orchestrator/validateOutput.js";
import type { AuditOutput } from "../schemas/audit.js";
import type {
  OrchestratorFinalOutput,
  OrchestratorFinalResults,
  OrchestratorOutput,
} from "../schemas/orchestrator.js";
import type { AuditAgentSuccess } from "./audit-agent.js";
import { runAuditAgent } from "./audit-agent.js";
import { runCollectionsAgent } from "./collections-agent.js";
import { runOperationsAgent } from "./operations-agent.js";
import { runSalesAgent } from "./sales-agent.js";

export type OrchestratorAgentSuccess = {
  runId: string;
  artifactDir: string;
  output: OrchestratorFinalOutput;
};

function buildFinalSummary(
  audit: AuditOutput,
  routing: OrchestratorOutput,
  agentsExecutedCount: number,
  executionFailed: boolean,
): string {
  const recommended = audit.recommended_agents;
  let auditSentence: string;
  if (recommended.length === 0) {
    auditSentence = "Audit recommended no specialized agents.";
  } else if (recommended.length === 1) {
    auditSentence = `Audit recommended ${recommended[0]}.`;
  } else {
    const head = recommended.slice(0, -1).join(", ");
    const tail = recommended[recommended.length - 1];
    auditSentence = `Audit recommended ${head} and ${tail}.`;
  }

  const n = routing.activated_agents.length;
  const orchSentence =
    n === 1
      ? "Orchestrator activated 1 agent."
      : `Orchestrator activated ${n} agents.`;

  let outcomeSentence: string;
  if (executionFailed) {
    outcomeSentence = "Execution stopped after a subagent failed.";
  } else if (agentsExecutedCount === 0) {
    outcomeSentence = "No specialized agents were run.";
  } else if (agentsExecutedCount === 1) {
    outcomeSentence = "It executed successfully.";
  } else if (agentsExecutedCount === 2) {
    outcomeSentence = "Both were executed successfully.";
  } else {
    outcomeSentence = `All ${agentsExecutedCount} were executed successfully.`;
  }

  return `${auditSentence} ${orchSentence} ${outcomeSentence}`;
}

function parseDetailMessage(details: unknown): string | undefined {
  if (details && typeof details === "object" && "message" in details) {
    return String((details as { message: string }).message);
  }
  return undefined;
}

export async function runOrchestratorAgent(): Promise<OrchestratorAgentSuccess> {
  const repoRoot = resolveRepoRootFromModuleUrl(import.meta.url);
  const runId = createOrchestratorRunId();
  const runDir = orchestratorRunDirFor(repoRoot, runId);
  await fs.mkdir(runDir, { recursive: true });

  const startedAt = new Date().toISOString();
  const gitCommit = getGitCommit(repoRoot);
  const orchestratorInputSource = "audit-agent";
  const orchestratorDataPath = orchestratorInputSource;
  let orchestratorDataSha = "";
  let promptSha = "";
  let prompt = "";

  const baseFields = (): Omit<
    OrchestratorRunArtifactV1,
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
    orchestrator_input_source: orchestratorInputSource,
    orchestrator_data_path: orchestratorDataPath,
    orchestrator_data_sha256: orchestratorDataSha,
    git_commit: gitCommit,
    prompt_sha256: promptSha,
  });

  try {
    let auditResult: AuditAgentSuccess | undefined;
    try {
      auditResult = await runAuditAgent();
      const auditInputText = JSON.stringify(auditResult.output, null, 2);
      orchestratorDataSha = sha256Utf8(auditInputText);
      prompt = buildOrchestratorPrompt(auditInputText);
    } catch (cause) {
      const finishedAt = new Date().toISOString();
      const unexpectedMessage =
        cause instanceof AuditRunError
          ? `${cause.code}${cause.message && cause.message !== cause.code ? `: ${cause.message}` : ""}`
          : cause instanceof Error
            ? cause.message
            : String(cause);
      await writeOrchestratorRunJson(runDir, {
        ...baseFields(),
        finished_at: finishedAt,
        status: "input_error",
        exit_code: 1,
        unexpected_message: unexpectedMessage,
      });
      throw new OrchestratorRunError("INPUT_INVALID", { cause });
    }
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
      await appendOrchestratorRunEvent(
        runDir,
        orchestratorEventLineFromSdkMessage(message),
      );
      if (message.type === "result") {
        terminalResult = message;
      }
    }

    const finishedAt = new Date().toISOString();

    if (!terminalResult) {
      await writeOrchestratorRunJson(runDir, {
        ...baseFields(),
        finished_at: finishedAt,
        status: "sdk_error",
        exit_code: 1,
        unexpected_message: "No terminal result message in stream",
      });
      throw new OrchestratorRunError("SDK_NO_RESULT", {});
    }

    if (terminalResult.subtype !== "success") {
      await writeOrchestratorRunJson(runDir, {
        ...baseFields(),
        finished_at: finishedAt,
        status: "sdk_error",
        exit_code: 1,
        sdk: orchestratorSdkFieldsFromResult(terminalResult),
        raw_model_output: null,
      });
      throw new OrchestratorRunError("SDK_RUN_FAILED", {
        subtype: terminalResult.subtype,
        errors: terminalResult.errors,
      });
    }

    let routingOutput: OrchestratorOutput;
    try {
      routingOutput = parseAndValidateOrchestratorOutput(terminalResult.result);
    } catch (e) {
      const ft = new Date().toISOString();
      if (e instanceof OrchestratorRunError && e.code === "OUTPUT_PARSE") {
        await writeOrchestratorRunJson(runDir, {
          ...baseFields(),
          finished_at: ft,
          status: "parse_error",
          exit_code: 1,
          sdk: orchestratorSdkFieldsFromResult(terminalResult),
          raw_model_output: terminalResult.result,
          parse_error_message: parseDetailMessage(e.details),
        });
      } else if (e instanceof OrchestratorRunError && e.code === "OUTPUT_SCHEMA") {
        await writeOrchestratorRunJson(runDir, {
          ...baseFields(),
          finished_at: ft,
          status: "schema_error",
          exit_code: 1,
          sdk: orchestratorSdkFieldsFromResult(terminalResult),
          raw_model_output: terminalResult.result,
          validation_errors: e.details,
        });
      }
      throw e;
    }

    if (!auditResult) {
      throw new OrchestratorRunError("UNEXPECTED", {
        message: "Audit result missing after successful audit phase",
      });
    }

    const agents_executed: OrchestratorOutput["activated_agents"] = [];
    const results: OrchestratorFinalResults = {};

    for (const agent of routingOutput.activated_agents) {
      try {
        switch (agent) {
          case "collections": {
            const r = await runCollectionsAgent();
            results.collections = r.output;
            agents_executed.push("collections");
            break;
          }
          case "sales": {
            const r = await runSalesAgent();
            results.sales = r.output;
            agents_executed.push("sales");
            break;
          }
          case "operations": {
            const r = await runOperationsAgent();
            results.operations = r.output;
            agents_executed.push("operations");
            break;
          }
        }
      } catch (cause) {
        const ft = new Date().toISOString();
        const code =
          cause instanceof CollectionsRunError ||
          cause instanceof SalesRunError ||
          cause instanceof OperationsRunError
            ? cause.code
            : "UNEXPECTED";
        const message =
          cause instanceof Error ? cause.message : String(cause);
        await writeOrchestratorRunJson(runDir, {
          ...baseFields(),
          finished_at: ft,
          status: "subagent_error",
          exit_code: 1,
          sdk: orchestratorSdkFieldsFromResult(terminalResult),
          raw_model_output: terminalResult.result,
          orchestrator_routing_output: routingOutput,
          subagent_failure: { agent, code, message },
        });
        throw new OrchestratorRunError("SUBAGENT_FAILED", { agent, cause });
      }
    }

    const consolidatedUnknown = {
      audit: auditResult.output,
      orchestrator: routingOutput,
      agents_executed,
      results,
      final_summary: buildFinalSummary(
        auditResult.output,
        routingOutput,
        agents_executed.length,
        false,
      ),
    };
    const finalOutput = validateOrchestratorFinalOutput(consolidatedUnknown);

    const finishedOk = new Date().toISOString();
    await writeOrchestratorRunJson(runDir, {
      ...baseFields(),
      finished_at: finishedOk,
      status: "success",
      exit_code: 0,
      sdk: orchestratorSdkFieldsFromResult(terminalResult),
      raw_model_output: terminalResult.result,
      validated_output: finalOutput,
    });

    console.log(
      `Orchestrator run OK: audit + routing + ${finalOutput.agents_executed.length} subagent(s) — ${path.join(runDir, "run.json")}`,
    );

    return { runId, artifactDir: runDir, output: finalOutput };
  } catch (e) {
    if (e instanceof OrchestratorRunError) {
      throw e;
    }
    const finishedAt = new Date().toISOString();
    try {
      await writeOrchestratorRunJson(runDir, {
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
