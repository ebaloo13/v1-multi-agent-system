import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { OrchestratorRunError } from "../orchestrator/errors.js";
import type { OrchestratorRunArtifactV1 } from "../orchestrator/runArtifact.js";
import type { AuditAgentSuccess } from "./audit-agent.js";
import type { CollectionsAgentSuccess } from "./collections-agent.js";
import type { OperationsAgentSuccess } from "./operations-agent.js";
import { runOrchestratorAgent } from "./orchestrator-agent.js";
import type { SalesAgentSuccess } from "./sales-agent.js";

type OrchestratorAgentOptions = NonNullable<
  Parameters<typeof runOrchestratorAgent>[0]
>;
type OrchestratorRunner = NonNullable<OrchestratorAgentOptions["runner"]>;
type AuditAgent = NonNullable<OrchestratorAgentOptions["auditAgent"]>;
type CollectionsAgent = NonNullable<
  OrchestratorAgentOptions["collectionsAgent"]
>;
type SalesAgent = NonNullable<OrchestratorAgentOptions["salesAgent"]>;
type OperationsAgent = NonNullable<
  OrchestratorAgentOptions["operationsAgent"]
>;

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  assert.equal(typeof value, "object", `${label} must be an object`);
  assert.notEqual(value, null, `${label} must not be null`);
  assert.equal(Array.isArray(value), false, `${label} must not be an array`);
  return value as Record<string, unknown>;
}

const routingJson = JSON.stringify({
  activated_agents: ["collections"],
  reasoning_summary: "Collections has the only immediate follow-up.",
  execution_priority: ["collections"],
  recommended_next_step: "Send the collections reminder.",
});

const auditResult: AuditAgentSuccess = {
  runId: "audit-test-run",
  artifactDir: "/tmp/audit-test-run",
  output: {
    company_summary: "Acme provides field services.",
    industry: "Field services",
    main_pains: ["Overdue invoices"],
    available_data: ["invoices"],
    recommended_agents: ["collections"],
    priority_order: ["collections"],
    notes: "Use collections first.",
  },
};

const collectionsResult: CollectionsAgentSuccess = {
  runId: "collections-test-run",
  artifactDir: "/tmp/collections-test-run",
  output: {
    summary: "One collections action prepared.",
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
  },
};

test("runOrchestratorAgent writes success artifacts with injected seams", async () => {
  const tempRoot = await fs.mkdtemp(path.join(tmpdir(), "orchestrator-agent-"));
  const runDir = path.join(tempRoot, "run");
  let auditCalls = 0;
  let collectionsCalls = 0;
  let salesCalls = 0;
  let operationsCalls = 0;

  const runner: OrchestratorRunner = async ({ onEvent }) => {
    await onEvent?.({ type: "assistant" });
    await onEvent?.({ type: "result", subtype: "success" });

    return {
      subtype: "success",
      total_cost_usd: 0,
      num_turns: 1,
      session_id: "test-session",
      result: routingJson,
    };
  };

  const auditAgent: AuditAgent = async () => {
    auditCalls += 1;
    return auditResult;
  };

  const collectionsAgent: CollectionsAgent = async () => {
    collectionsCalls += 1;
    return collectionsResult;
  };

  const salesAgent: SalesAgent = async (): Promise<SalesAgentSuccess> => {
    salesCalls += 1;
    return {
      runId: "sales-test-run",
      artifactDir: "/tmp/sales-test-run",
      output: {
        summary: "No sales actions.",
        opportunities: [],
      },
    };
  };

  const operationsAgent: OperationsAgent =
    async (): Promise<OperationsAgentSuccess> => {
      operationsCalls += 1;
      return {
        runId: "operations-test-run",
        artifactDir: "/tmp/operations-test-run",
        output: {
          summary: "No operations actions.",
          issues: [],
        },
      };
    };

  try {
    const result = await runOrchestratorAgent({
      runner,
      runDir,
      auditAgent,
      collectionsAgent,
      salesAgent,
      operationsAgent,
    });

    assert.equal(result.artifactDir, runDir);
    assert.deepEqual(result.output.agents_executed, ["collections"]);
    assert.equal(result.output.results.collections?.summary, collectionsResult.output.summary);
    assert.equal(auditCalls, 1);
    assert.equal(collectionsCalls, 1);
    assert.equal(salesCalls, 0);
    assert.equal(operationsCalls, 0);

    const runJsonPath = path.join(runDir, "run.json");
    const runJsonUnknown = JSON.parse(await fs.readFile(runJsonPath, "utf8")) as unknown;
    const runJson = requireRecord(runJsonUnknown, "run.json");
    const artifact = runJsonUnknown as OrchestratorRunArtifactV1;
    assert.equal(runJson.status, "success");
    assert.ok(runJson.orchestrator_routing_output);
    assert.deepEqual(artifact.orchestrator_routing_output?.activated_agents, [
      "collections",
    ]);

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

test("runOrchestratorAgent writes sdk_error when routing runner returns no result", async () => {
  const tempRoot = await fs.mkdtemp(path.join(tmpdir(), "orchestrator-agent-"));
  const runDir = path.join(tempRoot, "run");
  let auditCalls = 0;
  let collectionsCalls = 0;
  let salesCalls = 0;
  let operationsCalls = 0;

  const runner: OrchestratorRunner = async ({ onEvent }) => {
    await onEvent?.({ type: "assistant" });
    return undefined;
  };

  const auditAgent: AuditAgent = async () => {
    auditCalls += 1;
    return auditResult;
  };

  const collectionsAgent: CollectionsAgent = async () => {
    collectionsCalls += 1;
    return collectionsResult;
  };

  const salesAgent: SalesAgent = async (): Promise<SalesAgentSuccess> => {
    salesCalls += 1;
    return {
      runId: "sales-test-run",
      artifactDir: "/tmp/sales-test-run",
      output: {
        summary: "No sales actions.",
        opportunities: [],
      },
    };
  };

  const operationsAgent: OperationsAgent =
    async (): Promise<OperationsAgentSuccess> => {
      operationsCalls += 1;
      return {
        runId: "operations-test-run",
        artifactDir: "/tmp/operations-test-run",
        output: {
          summary: "No operations actions.",
          issues: [],
        },
      };
    };

  try {
    await assert.rejects(
      () =>
        runOrchestratorAgent({
          runner,
          runDir,
          auditAgent,
          collectionsAgent,
          salesAgent,
          operationsAgent,
        }),
      (error: unknown) =>
        error instanceof OrchestratorRunError &&
        error.code === "SDK_NO_RESULT",
    );

    assert.equal(auditCalls, 1);
    assert.equal(collectionsCalls, 0);
    assert.equal(salesCalls, 0);
    assert.equal(operationsCalls, 0);

    const runJsonPath = path.join(runDir, "run.json");
    const runJson = requireRecord(
      JSON.parse(await fs.readFile(runJsonPath, "utf8")) as unknown,
      "run.json",
    );
    assert.equal(runJson.status, "sdk_error");
  } finally {
    await fs.rm(tempRoot, { recursive: true, force: true });
  }
});
