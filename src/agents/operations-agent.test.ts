import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { OperationsRunError } from "../operations/errors.js";
import { runOperationsAgent } from "./operations-agent.js";

type OperationsRunner = NonNullable<
  NonNullable<Parameters<typeof runOperationsAgent>[0]>["runner"]
>;

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  assert.equal(typeof value, "object", `${label} must be an object`);
  assert.notEqual(value, null, `${label} must not be null`);
  assert.equal(Array.isArray(value), false, `${label} must not be an array`);
  return value as Record<string, unknown>;
}

const validOperationsJson = JSON.stringify({
  summary: "One operations issue reviewed.",
  issues: [
    {
      entity: "Room 2",
      type: "schedule_gap",
      priority_score: 25,
      reason: "The room has unused appointment capacity.",
      suggested_action: "Offer the open slot to waitlisted clients.",
      message_draft: "Hello, an earlier appointment slot is available.",
    },
  ],
});

test("runOperationsAgent writes success artifacts with a faux runner", async () => {
  const tempRoot = await fs.mkdtemp(path.join(tmpdir(), "operations-agent-"));
  const runDir = path.join(tempRoot, "run");

  const runner: OperationsRunner = async ({ onEvent }) => {
    await onEvent?.({ type: "assistant" });
    await onEvent?.({ type: "result", subtype: "success" });

    return {
      subtype: "success",
      total_cost_usd: 0,
      num_turns: 1,
      session_id: "test-session",
      result: validOperationsJson,
    };
  };

  try {
    const result = await runOperationsAgent({ runner, runDir });

    assert.equal(result.artifactDir, runDir);
    assert.equal(result.output.summary, "One operations issue reviewed.");

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

test("runOperationsAgent writes sdk_error when faux runner returns no result", async () => {
  const tempRoot = await fs.mkdtemp(path.join(tmpdir(), "operations-agent-"));
  const runDir = path.join(tempRoot, "run");

  const runner: OperationsRunner = async ({ onEvent }) => {
    await onEvent?.({ type: "assistant" });
    return undefined;
  };

  try {
    await assert.rejects(
      () => runOperationsAgent({ runner, runDir }),
      (error: unknown) => error instanceof OperationsRunError && error.code === "SDK_NO_RESULT",
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

test("runOperationsAgent writes schema_error when faux runner returns invalid output", async () => {
  const tempRoot = await fs.mkdtemp(path.join(tmpdir(), "operations-agent-"));
  const runDir = path.join(tempRoot, "run");
  const invalidOperationsJson = JSON.stringify({
    summary: "One operations issue reviewed.",
    issues: [
      {
        entity: "Room 2",
        type: "invalid_type",
        priority_score: 25,
        reason: "The room has unused appointment capacity.",
        suggested_action: "Offer the open slot to waitlisted clients.",
        message_draft: "Hello, an earlier appointment slot is available.",
      },
    ],
  });

  const runner: OperationsRunner = async () => ({
    subtype: "success",
    total_cost_usd: 0,
    num_turns: 1,
    session_id: "test-session",
    result: invalidOperationsJson,
  });

  try {
    await assert.rejects(
      () => runOperationsAgent({ runner, runDir }),
      (error: unknown) => error instanceof OperationsRunError && error.code === "OUTPUT_SCHEMA",
    );

    const runJsonPath = path.join(runDir, "run.json");
    const runJson = requireRecord(
      JSON.parse(await fs.readFile(runJsonPath, "utf8")) as unknown,
      "run.json",
    );
    assert.equal(runJson.status, "schema_error");
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});

test("runOperationsAgent writes parse_error when faux runner returns non-JSON output", async () => {
  const tempRoot = await fs.mkdtemp(path.join(tmpdir(), "operations-agent-"));
  const runDir = path.join(tempRoot, "run");

  const runner: OperationsRunner = async () => ({
    subtype: "success",
    total_cost_usd: 0,
    num_turns: 1,
    session_id: "test-session",
    result: "not json",
  });

  try {
    await assert.rejects(
      () => runOperationsAgent({ runner, runDir }),
      (error: unknown) => error instanceof OperationsRunError && error.code === "OUTPUT_PARSE",
    );

    const runJsonPath = path.join(runDir, "run.json");
    const runJson = requireRecord(
      JSON.parse(await fs.readFile(runJsonPath, "utf8")) as unknown,
      "run.json",
    );
    assert.equal(runJson.status, "parse_error");
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});
