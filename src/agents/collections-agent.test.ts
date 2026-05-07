import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { CollectionsRunError } from "../collections/errors.js";
import { runCollectionsAgent } from "./collections-agent.js";

type CollectionsRunner = NonNullable<
  NonNullable<Parameters<typeof runCollectionsAgent>[0]>["runner"]
>;

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  assert.equal(typeof value, "object", `${label} must be an object`);
  assert.notEqual(value, null, `${label} must not be null`);
  assert.equal(Array.isArray(value), false, `${label} must not be an array`);
  return value as Record<string, unknown>;
}

const validCollectionsJson = JSON.stringify({
  summary: "One account reviewed.",
  actions: [
    {
      customer: "Acme",
      invoice_id: "INV-1",
      risk_tier: "low",
      priority_score: 10,
      suggested_action: "Send reminder",
      escalate: false,
      email_draft: "Hello, please remit.",
    },
  ],
});

test("runCollectionsAgent writes success artifacts with a faux runner", async () => {
  const tempRoot = await fs.mkdtemp(path.join(tmpdir(), "collections-agent-"));
  const runDir = path.join(tempRoot, "run");

  const runner: CollectionsRunner = async ({ onEvent }) => {
    await onEvent?.({ type: "assistant" });
    await onEvent?.({ type: "result", subtype: "success" });

    return {
      subtype: "success",
      total_cost_usd: 0,
      num_turns: 1,
      session_id: "test-session",
      result: validCollectionsJson,
    };
  };

  try {
    const result = await runCollectionsAgent({ runner, runDir });

    assert.equal(result.artifactDir, runDir);
    assert.equal(result.output.summary, "One account reviewed.");

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

test("runCollectionsAgent writes sdk_error when faux runner returns no result", async () => {
  const tempRoot = await fs.mkdtemp(path.join(tmpdir(), "collections-agent-"));
  const runDir = path.join(tempRoot, "run");

  const runner: CollectionsRunner = async ({ onEvent }) => {
    await onEvent?.({ type: "assistant" });
    return undefined;
  };

  try {
    await assert.rejects(
      () => runCollectionsAgent({ runner, runDir }),
      (error: unknown) => error instanceof CollectionsRunError && error.code === "SDK_NO_RESULT",
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

test("runCollectionsAgent writes schema_error when faux runner returns invalid output", async () => {
  const tempRoot = await fs.mkdtemp(path.join(tmpdir(), "collections-agent-"));
  const runDir = path.join(tempRoot, "run");
  const invalidCollectionsJson = JSON.stringify({
    summary: "One account reviewed.",
    actions: [
      {
        customer: "Acme",
        invoice_id: "INV-1",
        risk_tier: "low",
        priority_score: 10.5,
        suggested_action: "Send reminder",
        escalate: false,
        email_draft: "Hello, please remit.",
      },
    ],
  });

  const runner: CollectionsRunner = async () => ({
    subtype: "success",
    total_cost_usd: 0,
    num_turns: 1,
    session_id: "test-session",
    result: invalidCollectionsJson,
  });

  try {
    await assert.rejects(
      () => runCollectionsAgent({ runner, runDir }),
      (error: unknown) => error instanceof CollectionsRunError && error.code === "OUTPUT_SCHEMA",
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

test("runCollectionsAgent writes parse_error when faux runner returns non-json output", async () => {
  const tempRoot = await fs.mkdtemp(path.join(tmpdir(), "collections-agent-"));
  const runDir = path.join(tempRoot, "run");

  const runner: CollectionsRunner = async () => ({
    subtype: "success",
    total_cost_usd: 0,
    num_turns: 1,
    session_id: "test-session",
    result: "```json\n{}\n```",
  });

  try {
    await assert.rejects(
      () => runCollectionsAgent({ runner, runDir }),
      (error: unknown) => error instanceof CollectionsRunError && error.code === "OUTPUT_PARSE",
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
