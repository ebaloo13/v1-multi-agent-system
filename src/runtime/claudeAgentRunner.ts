import { query } from "@anthropic-ai/claude-agent-sdk";
import type { SDKMessage, SDKResultMessage } from "@anthropic-ai/claude-agent-sdk";
import type {
  AgentResultMessage,
  AgentRunner,
  AgentStreamEvent,
} from "./agentRunner.js";

function eventFromSdkMessage(message: SDKMessage): AgentStreamEvent {
  if ("subtype" in message && typeof message.subtype === "string") {
    return {
      type: message.type,
      subtype: message.subtype,
    };
  }

  return { type: message.type };
}

function resultFromSdkMessage(message: SDKResultMessage): AgentResultMessage {
  if (message.subtype === "success") {
    return {
      subtype: message.subtype,
      total_cost_usd: message.total_cost_usd,
      num_turns: message.num_turns,
      session_id: message.session_id,
      result: message.result,
    };
  }

  return {
    subtype: message.subtype,
    errors: message.errors,
    total_cost_usd: message.total_cost_usd,
    num_turns: message.num_turns,
    session_id: message.session_id,
    result: "",
  };
}

export const runClaudeAgent: AgentRunner = async ({
  prompt,
  onEvent,
}) => {
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

  let terminalResult: AgentResultMessage | undefined;
  for await (const message of run as AsyncIterable<SDKMessage>) {
    await onEvent?.(eventFromSdkMessage(message));
    if (message.type === "result") {
      terminalResult = resultFromSdkMessage(message);
    }
  }

  return terminalResult;
};
