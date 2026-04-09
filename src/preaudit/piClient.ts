import { complete, getModel } from "@mariozechner/pi-ai";
import type { PreauditRunArtifactV1 } from "./runArtifact.js";

const PREAUDIT_MODEL = getModel("anthropic", "claude-haiku-4-5");
let lastPreauditLLMSdk:
  | (NonNullable<PreauditRunArtifactV1["sdk"]> & { errors?: string[] })
  | null = null;

export function getLastPreauditLLMSdk():
  | (NonNullable<PreauditRunArtifactV1["sdk"]> & { errors?: string[] })
  | null {
  return lastPreauditLLMSdk;
}

export async function runPreauditLLM(prompt: string): Promise<string> {
  lastPreauditLLMSdk = null;
  const response = await complete(PREAUDIT_MODEL, {
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
  } satisfies NonNullable<PreauditRunArtifactV1["sdk"]>;

  if (response.stopReason === "error") {
    const message = response.errorMessage ?? "pi-ai completion failed";
    lastPreauditLLMSdk = {
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
    lastPreauditLLMSdk = {
      ...sdkBase,
      subtype: "error",
      errors: ["pi-ai returned no text output"],
    };
    throw new Error("pi-ai returned no text output");
  }

  lastPreauditLLMSdk = sdkBase;
  return rawTextOutput;
}
