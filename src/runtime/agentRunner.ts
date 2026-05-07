export type AgentStreamEvent = {
  type: string;
  subtype?: string;
};

export type AgentResultMessage = {
  subtype: string;
  errors?: string[];
  total_cost_usd: number;
  num_turns: number;
  session_id?: string;
  result: string;
};

export type AgentRunnerOptions = {
  prompt: string;
  onEvent?: (event: AgentStreamEvent) => Promise<void>;
};

export type AgentRunner = (
  options: AgentRunnerOptions,
) => Promise<AgentResultMessage | undefined>;
