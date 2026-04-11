# Project Context

This repository contains B2B business agents built in TypeScript using a hybrid LLM runtime: `pi-ai` for diagnostic agents and the Claude Agent SDK for orchestration and specialist agents.

## Goal
Build realistic, production-oriented mock agents for SME consulting use cases that can later be deployed in real client environments.

## Current Focus
Documented multi-agent consulting workflow:
- Preaudit agent
- Audit agent
- Orchestrator agent
- Collections agent
- Sales agent
- Operations agent

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

## Current Architecture
The current documented flow is:

1. **Preaudit**: fast digital diagnostic for SEO, PageSpeed, UX, and tracking
2. **Audit**: deeper business diagnostic covering business model, pains, available data, prioritization, and recommended specialist agents
3. **Orchestrator**: routing and execution layer that runs the audit first, validates routing, and executes the selected specialist agents
4. **Specialized agents**:
   - Collections
   - Sales
   - Operations

Most agents are mock-data driven in the current phase. Preaudit also supports a lightweight live single-page ingestion path for one real website URL.

### Execution Layout
- `scripts/demo/` contains mock/demo single-run entrypoints
- `scripts/batch/` contains repeated mock/demo batch entrypoints
- `scripts/live/` contains live preaudit ingestion and deterministic report generation entrypoints
- `data/mock/` contains the current mock JSON fixtures
- `data/clients/` contains generated live client inputs for preaudit runs
- `src/common/` contains lightweight shared helpers such as run naming

### LLM Usage
- `preaudit-agent` and `audit-agent` use `pi-ai` (multi-provider abstraction)
- `orchestrator-agent`, `collections-agent`, `sales-agent`, and `operations-agent` use the Claude SDK

This separation allows controlled migration and evaluation of different model providers without affecting core system behavior.

---

## Output Requirements
- Must return **valid JSON only** (no markdown fences)
- Must conform to schema
- Must match the agent-specific validated output contract
- Must be concise, auditable, and safe to store in `run.json`
- For preaudit, model-generated scores are not trusted as final; deterministic scoring in code is the source of truth written to `validated_output`

---

## Data Assumptions (Mock Phase)
- Input data comes from static JSON files under `data/mock/`
- Live preaudit may synthesize a one-record JSON input under `data/clients/` from a fetched homepage
- No external integrations
- No real customer data
- No live browser automation, crawling, or live website measurement yet
- Preaudit scope-fit classification is heuristic and is used only to add prudence, not to block runs

---

## Engineering Constraints
- TypeScript only
- Deterministic validation using Zod
- Strict parsing (fail on invalid JSON)
- Keep demo/mock execution clearly separated from future live execution
- Presentation/reporting layers must remain deterministic and derive only from validated output
- Observability metadata in artifacts may be extended, but existing artifact readers must keep working
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
- Use orchestration only where the current architecture already requires it
- Build reusable patterns across agents
- Favor clarity over cleverness
- Prefer lightweight heuristics over infrastructure when adding prudence or traceability

---

## Near-Term Roadmap
1. Keep preaudit, audit, orchestrator, and specialist agents aligned with the documented architecture
2. Extend deterministic reporting patterns where useful without changing schemas or artifact contracts
3. Extend validation and tests across agents that still lag collections
4. Add real integrations only when requirements are explicit

---

## Anti-Patterns to Avoid
- Over-engineering early
- Embedding business logic only in prompts
- Relying on LLM outputs without validation
- Mixing responsibilities across agents
- Turning presentation/report scripts into business-logic layers
- Treating enterprise or platform sites as if the SME lead-gen framework applies cleanly without qualification

---

## Definition of Done
- Demo commands run from `scripts/demo/` and batch commands run from `scripts/batch/`
- Live preaudit ingestion and report generation run from `scripts/live/`
- Runs in batch mode
- Produces valid structured outputs
- Saves artifacts per run
- Handles failures safely
- Preserves internal traceability via `run_id` while allowing optional human-friendly artifact metadata such as `display_run_id`
- Preserves clear separation between:
  - preaudit as fast digital diagnostic
  - audit as deeper business diagnostic
  - orchestrator as routing / execution
  - collections / sales / operations as specialized execution agents
