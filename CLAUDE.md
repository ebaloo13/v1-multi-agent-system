# Project Context

This repository contains B2B business agents built in TypeScript using the Claude Agent SDK.

## Goal
Build realistic, production-oriented mock agents for SME consulting use cases that can later be deployed in real client environments.

## Current Focus
Collections agent (Accounts Receivable / Debt Recovery)

---

## System Philosophy
- Agents are **assistive, not autonomous decision-makers**
- Business logic should be **deterministic where possible (policies, scoring)**
- LLMs are used for:
  - summarization
  - reasoning explanation
  - drafting communication
- Every run must be **traceable, reproducible, and auditable**

---

## Agent Responsibilities (Collections)
The collections agent must:

1. Analyze overdue invoices
2. Prioritize accounts based on risk
3. Suggest clear next actions
4. Generate professional communication drafts
5. Output strictly structured JSON

---

## Output Requirements
- Must return **valid JSON only** (no markdown fences)
- Must conform to schema
- Must include:
  - summary
  - prioritized actions
  - risk classification
  - suggested next steps
  - email drafts (short, professional)

---

## Data Assumptions (Mock Phase)
- Input data comes from static JSON files
- No external integrations
- No real customer data

---

## Engineering Constraints
- TypeScript only
- Deterministic validation using Zod
- Strict parsing (fail on invalid JSON)
- All runs must generate artifacts:
  - run.json
  - events.ndjson

---

## Cost & Performance Guidelines
- Prefer low-cost models (Haiku) during development
- Limit turns and budget per run
- Keep prompts concise

---

## Design Principles
- Keep agents simple and composable
- Avoid premature orchestration
- Build reusable patterns across agents
- Favor clarity over cleverness

---

## Near-Term Roadmap
1. Finalize Collections agent (v1)
2. Replicate pattern for:
   - Sales agent
   - Operations agent
3. Introduce orchestrator agent (later stage)

---

## Anti-Patterns to Avoid
- Over-engineering early
- Embedding business logic only in prompts
- Relying on LLM outputs without validation
- Mixing responsibilities across agents

---

## Definition of Done (Collections v1)
- Runs in batch mode
- Produces valid structured outputs
- Saves artifacts per run
- Handles failures safely
- Can be reused as a template for other agents