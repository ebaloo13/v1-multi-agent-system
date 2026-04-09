import { complete, getModel } from "@mariozechner/pi-ai";
import type { AuditRunArtifactV1 } from "./runArtifact.js";

const AUDIT_MODEL = getModel("anthropic", "claude-haiku-4-5");
let lastAuditLLMSdk:
  | (NonNullable<AuditRunArtifactV1["sdk"]> & { errors?: string[] })
  | null = null;

export function getLastAuditLLMSdk():
  | (NonNullable<AuditRunArtifactV1["sdk"]> & { errors?: string[] })
  | null {
  return lastAuditLLMSdk;
}

export async function runAuditLLM(prompt: string): Promise<string> {
  lastAuditLLMSdk = null;
  const response = await complete(AUDIT_MODEL, {
    messages: [
      {
        role: "user",
        content: prompt,
        timestamp: Date.now(),
      },
    ],
  });

  const sdkBase = {
    subtype: "success",
    total_cost_usd: response.usage.cost.total,
    num_turns: 1,
    session_id: response.responseId,
  } satisfies NonNullable<AuditRunArtifactV1["sdk"]>;

  if (response.stopReason === "error") {
    const message = response.errorMessage ?? "pi-ai completion failed";
    lastAuditLLMSdk = {
      ...sdkBase,
      subtype: "error",
      errors: [message],
    };
    throw new Error(message);
  }

  const rawTextOutput = response.content
    .filter((block): block is { type: "text"; text: string } => block.type === "text")
    .map((block) => block.text)
    .join("");

  if (rawTextOutput.trim().length === 0) {
    lastAuditLLMSdk = {
      ...sdkBase,
      subtype: "error",
      errors: ["pi-ai returned no text output"],
    };
    throw new Error("pi-ai returned no text output");
  }

  lastAuditLLMSdk = sdkBase;
  return rawTextOutput;
}
