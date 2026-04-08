import assert from "node:assert/strict";
import test from "node:test";
import { CollectionsRunError } from "./errors.js";
import { parseAndValidateCollectionsOutput } from "./validateOutput.js";

const validMinimal = JSON.stringify({
  summary: "All reviewed.",
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

test("valid minimal JSON passes", () => {
  const out = parseAndValidateCollectionsOutput(validMinimal);
  assert.equal(out.summary, "All reviewed.");
  assert.equal(out.actions.length, 1);
});

test("markdown-fenced JSON fails parse (strict, no cleanup)", () => {
  const fenced = "```json\n" + validMinimal + "\n```";
  assert.throws(
    () => parseAndValidateCollectionsOutput(fenced),
    (e: unknown) => e instanceof CollectionsRunError && e.code === "OUTPUT_PARSE",
  );
});

test("wrong risk_tier enum fails schema", () => {
  const bad = JSON.stringify({
    summary: "x",
    actions: [
      {
        customer: "Acme",
        invoice_id: "INV-1",
        risk_tier: "critical",
        priority_score: 10,
        suggested_action: "s",
        escalate: false,
        email_draft: "e",
      },
    ],
  });
  assert.throws(
    () => parseAndValidateCollectionsOutput(bad),
    (e: unknown) => e instanceof CollectionsRunError && e.code === "OUTPUT_SCHEMA",
  );
});

test("priority_score as string fails schema", () => {
  const bad = JSON.stringify({
    summary: "x",
    actions: [
      {
        customer: "Acme",
        invoice_id: "INV-1",
        risk_tier: "low",
        priority_score: "50",
        suggested_action: "s",
        escalate: false,
        email_draft: "e",
      },
    ],
  });
  assert.throws(
    () => parseAndValidateCollectionsOutput(bad),
    (e: unknown) => e instanceof CollectionsRunError && e.code === "OUTPUT_SCHEMA",
  );
});

test("missing required top-level actions fails schema", () => {
  const bad = JSON.stringify({ summary: "only summary" });
  assert.throws(
    () => parseAndValidateCollectionsOutput(bad),
    (e: unknown) => e instanceof CollectionsRunError && e.code === "OUTPUT_SCHEMA",
  );
});
