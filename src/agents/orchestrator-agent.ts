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
import type { CollectionsOutput } from "../schemas/collections.js";
import type { OperationsOutput } from "../schemas/operations.js";
import type {
  OrchestratorFinalOutput,
  OrchestratorFinalResults,
  OrchestratorOutput,
} from "../schemas/orchestrator.js";
import type { SalesOutput } from "../schemas/sales.js";
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
  results: OrchestratorFinalResults,
): string {
  const painSnippet =
    audit.main_pains.length > 0
      ? audit.main_pains.slice(0, 2).join("; ")
      : "No major pains were explicitly identified in the audit.";

  const prioritySnippet =
    routing.execution_priority.length > 0
      ? `Priority order: ${routing.execution_priority.join(", ")}.`
      : "No specialized execution priority was set.";

  const executed = routing.activated_agents;
  const executionSnippet =
    executed.length > 0
      ? `Activated agents: ${executed.join(", ")}.`
      : "No specialized agents were activated.";

  const resultSummaries = [
    results.collections?.summary,
    results.sales?.summary,
    results.operations?.summary,
  ].filter((value): value is string => Boolean(value));

  const resultSnippet =
    resultSummaries.length > 0
      ? `Key execution outputs: ${resultSummaries.slice(0, 2).join(" ")}`
      : "No subagent execution outputs were produced.";

  return `${audit.company_summary} Main issues: ${painSnippet}. ${prioritySnippet} ${executionSnippet} ${resultSnippet}`.trim();
}

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function uniqueList(items: string[], maxItems = 5): string[] {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const item of items) {
    const cleaned = item.trim().replace(/\s+/g, " ");
    if (cleaned.length === 0) {
      continue;
    }

    const key = normalizeText(cleaned);
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    output.push(cleaned);

    if (output.length >= maxItems) {
      break;
    }
  }

  return output;
}

function typeLabel(value: string): string {
  return value.replace(/_/g, " ");
}

function buildTopFindings(
  audit: AuditOutput,
  results: OrchestratorFinalResults,
): string[] {
  const findings = [
    ...audit.main_pains,
    results.collections?.summary,
    results.sales?.summary,
    results.operations?.summary,
  ].filter((value): value is string => Boolean(value));

  return uniqueList(findings, 5);
}

function buildQuickWins(results: OrchestratorFinalResults): string[] {
  const wins: string[] = [];

  if (results.collections?.actions.length) {
    const top = [...results.collections.actions].sort(
      (a, b) => b.priority_score - a.priority_score,
    )[0];
    wins.push(top.suggested_action);
  }

  if (results.sales?.opportunities.length) {
    const top = [...results.sales.opportunities].sort(
      (a, b) => b.priority_score - a.priority_score,
    )[0];
    wins.push(top.suggested_action);
  }

  if (results.operations?.issues.length) {
    const top = [...results.operations.issues].sort(
      (a, b) => b.priority_score - a.priority_score,
    )[0];
    wins.push(top.suggested_action);
  }

  return uniqueList(wins, 5);
}

function buildCollectionsNextAction(output: CollectionsOutput): string | undefined {
  if (output.actions.length === 0) {
    return undefined;
  }

  const top = [...output.actions].sort(
    (a, b) => b.priority_score - a.priority_score,
  )[0];

  return `Run collections follow-up for ${top.customer} on invoice ${top.invoice_id} using the drafted outreach. Priority action: ${top.suggested_action}`;
}

function buildSalesNextAction(output: SalesOutput): string | undefined {
  if (output.opportunities.length === 0) {
    return undefined;
  }

  const top = [...output.opportunities].sort(
    (a, b) => b.priority_score - a.priority_score,
  )[0];

  return `Execute the highest-priority ${typeLabel(top.type)} action for ${top.customer} using the drafted message. Priority action: ${top.suggested_action}`;
}

function buildOperationsNextAction(output: OperationsOutput): string | undefined {
  if (output.issues.length === 0) {
    return undefined;
  }

  const top = [...output.issues].sort(
    (a, b) => b.priority_score - a.priority_score,
  )[0];

  return `Address the ${typeLabel(top.type)} affecting ${top.entity}. Priority action: ${top.suggested_action}`;
}

function buildRecommendedNextActions(
  routing: OrchestratorOutput,
  results: OrchestratorFinalResults,
): string[] {
  const nextActions: string[] = [];

  if (routing.recommended_next_step.trim().length > 0) {
    nextActions.push(routing.recommended_next_step);
  }

  for (const agent of routing.execution_priority) {
    switch (agent) {
      case "collections":
        if (results.collections) {
          nextActions.push(buildCollectionsNextAction(results.collections) ?? "");
        }
        break;
      case "sales":
        if (results.sales) {
          nextActions.push(buildSalesNextAction(results.sales) ?? "");
        }
        break;
      case "operations":
        if (results.operations) {
          nextActions.push(buildOperationsNextAction(results.operations) ?? "");
        }
        break;
    }
  }

  return uniqueList(nextActions, 5);
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
      top_findings: buildTopFindings(auditResult.output, results),
      quick_wins: buildQuickWins(results),
      recommended_next_actions: buildRecommendedNextActions(
        routingOutput,
        results,
      ),
      final_summary: buildFinalSummary(auditResult.output, routingOutput, results),
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
