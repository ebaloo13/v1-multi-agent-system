import "dotenv/config";

import { z } from "zod";

import type { AgentRunner } from "../runtime/agentRunner.js";
import { runClaudeAgent } from "../runtime/claudeAgentRunner.js";
import type { FunnelStage, WorkItem } from "../schemas/operations.js";

const WorkItemAssistantAgentOutputSchema = z.object({
  summary: z.string(),
  suggestedNextAction: z.string(),
  confidence: z.enum(["low", "medium", "high"]),
});

export type WorkItemAssistantAgentOutput = z.infer<typeof WorkItemAssistantAgentOutputSchema>;

export type WorkItemAssistantAgentInput = {
  clientSlug: string;
  workItem: Pick<WorkItem, "title" | "description" | "type" | "status">;
  stageLabel: string;
  assistantKey: string;
  automationPolicy?: FunnelStage["automationPolicy"];
};

type WorkItemAssistantAgentOptions = {
  runner?: AgentRunner;
};

function buildWorkItemAssistantPrompt(input: WorkItemAssistantAgentInput): string {
  const payload = {
    clientSlug: input.clientSlug,
    workItem: {
      title: input.workItem.title,
      description: input.workItem.description ?? "",
      type: input.workItem.type,
      status: input.workItem.status,
    },
    currentStage: {
      label: input.stageLabel,
      assistantKey: input.assistantKey,
      automationPolicy: input.automationPolicy ?? {},
    },
  };

  return [
    "You are a stage assistant for a client work item.",
    "Review the bounded input and suggest the next funnel action.",
    "Do not change status, move stages, contact anyone, or call tools.",
    "Return strict JSON only with this shape:",
    '{"summary": string, "suggestedNextAction": string, "confidence": "low" | "medium" | "high"}',
    "Keep summary and suggestedNextAction each under 180 characters.",
    "",
    "Input:",
    JSON.stringify(payload),
  ].join("\n");
}

function parseWorkItemAssistantOutput(raw: string): WorkItemAssistantAgentOutput {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw.trim());
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    throw new Error(`Work item assistant returned invalid JSON: ${message}`);
  }

  const result = WorkItemAssistantAgentOutputSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`Work item assistant output failed schema validation: ${result.error.message}`);
  }

  return result.data;
}

export async function runWorkItemAssistantAgent(
  input: WorkItemAssistantAgentInput,
  options: WorkItemAssistantAgentOptions = {},
): Promise<WorkItemAssistantAgentOutput> {
  const runner = options.runner ?? runClaudeAgent;
  const terminalResult = await runner({
    prompt: buildWorkItemAssistantPrompt(input),
  });

  if (!terminalResult) {
    throw new Error("Work item assistant run failed: no terminal result message.");
  }

  if (terminalResult.subtype !== "success") {
    throw new Error(`Work item assistant run failed: ${terminalResult.subtype}.`);
  }

  return parseWorkItemAssistantOutput(terminalResult.result);
}
