import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { SalesRunError } from "../sales/errors.js";
import { runSalesAgent } from "./sales-agent.js";

type SalesRunner = NonNullable<NonNullable<Parameters<typeof runSalesAgent>[0]>["runner"]>;

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  assert.equal(typeof value, "object", `${label} must be an object`);
  assert.notEqual(value, null, `${label} must not be null`);
  assert.equal(Array.isArray(value), false, `${label} must not be an array`);
  return value as Record<string, unknown>;
}

const validSalesJson = JSON.stringify({
  summary: "One opportunity reviewed.",
  opportunities: [
    {
      customer: "Acme",
      type: "follow_up",
      priority_score: 25,
      reason: "Recent inquiry has not received a follow-up.",
      suggested_action: "Send a follow-up message.",
      message_draft: "Hello, checking in on your recent inquiry.",
    },
  ],
});

test("runSalesAgent writes success artifacts with a faux runner", async () => {
  const tempRoot = await fs.mkdtemp(path.join(tmpdir(), "sales-agent-"));
  const runDir = path.join(tempRoot, "run");

  const runner: SalesRunner = async ({ onEvent }) => {
    await onEvent?.({ type: "assistant" });
    await onEvent?.({ type: "result", subtype: "success" });

    return {
      subtype: "success",
      total_cost_usd: 0,
      num_turns: 1,
      session_id: "test-session",
      result: validSalesJson,
    };
  };

  try {
    const result = await runSalesAgent({ runner, runDir });

    assert.equal(result.artifactDir, runDir);
    assert.equal(result.output.summary, "One opportunity reviewed.");

    const runJsonPath = path.join(runDir, "run.json");
    const runJson = requireRecord(
      JSON.parse(await fs.readFile(runJsonPath, "utf8")) as unknown,
      "run.json",
    );
    assert.equal(runJson.status, "success");
    assert.ok(runJson.validated_output);

    const eventsPath = path.join(runDir, "events.ndjson");
    const eventLines = (await fs.readFile(eventsPath, "utf8"))
      .trim()
      .split("\n")
      .filter((line) => line.length > 0);

    assert.equal(eventLines.length, 2);
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

test("runSalesAgent writes sdk_error when faux runner returns no result", async () => {
  const tempRoot = await fs.mkdtemp(path.join(tmpdir(), "sales-agent-"));
  const runDir = path.join(tempRoot, "run");

  const runner: SalesRunner = async ({ onEvent }) => {
    await onEvent?.({ type: "assistant" });
    return undefined;
  };

  try {
    await assert.rejects(
      () => runSalesAgent({ runner, runDir }),
      (error: unknown) => error instanceof SalesRunError && error.code === "SDK_NO_RESULT",
    );

    const runJsonPath = path.join(runDir, "run.json");
    const runJson = requireRecord(
      JSON.parse(await fs.readFile(runJsonPath, "utf8")) as unknown,
      "run.json",
    );
    assert.equal(runJson.status, "sdk_error");

    const eventsPath = path.join(runDir, "events.ndjson");
    const eventLines = (await fs.readFile(eventsPath, "utf8"))
      .trim()
      .split("\n")
      .filter((line) => line.length > 0);

    assert.equal(eventLines.length, 1);
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});
