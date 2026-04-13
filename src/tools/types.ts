export type ToolDefinition<TArgs, TResult> = {
  name: string;
  description: string;
  validate(args: unknown): TArgs;
  execute(args: TArgs): Promise<TResult>;
};

export function defineTool<TArgs, TResult>(
  tool: ToolDefinition<TArgs, TResult>,
): ToolDefinition<TArgs, TResult> {
  return tool;
}
