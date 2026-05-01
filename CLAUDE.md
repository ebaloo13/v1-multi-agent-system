# Project Context

This repository is evolving into an AI operations workspace for small businesses. It combines a simple client-facing workspace, a separate internal operations workspace, reusable business modules, validated schemas, and agent workflows designed for traceable execution.

## Repository Boundary
- The repository root is the only allowed workspace.
- Do not inspect, modify, or request access to directories outside the repository root.
- Do not browse parent directories, sibling directories, home-directory paths, or unrelated filesystem locations.
- If a needed file is missing from the repo, report that limitation clearly instead of searching outside the project.
- Treat anything outside the repo as out of scope unless the user explicitly requests work in another repository or location.

## Product Direction
- The product is an AI operations workspace for small businesses.
- The client-facing workspace should stay simple, non-technical, and focused on:
  - Inbox
  - WorkItems / Tasks
  - Payments
  - Schedule
  - Files
  - Settings
- The internal ops workspace is separate and lives under `/internal/:clientSlug`.
- Pre-audit is a lead acquisition hook. It should not be treated as part of the core client platform.
- Business-specific behavior should be implemented through reusable modules and vertical packs, not hardcoded vertical apps.

## Architecture
- Core schemas live at root `src/schemas`.
- Shared utilities live under root `src/shared`.
- Runtime utilities live under root `src/runtime`.
- Demo/mock scripts and live workflow entrypoints remain separate.
- Generated artifacts should remain traceable and auditable.
- Existing legacy names such as `intake` and `artifacts` may remain in implementation paths, but product-facing docs should prefer **Business Context** and **Outputs** where relevant.

## Agent Model
- Agents should be organized as domain coordinators plus specialist agents.
- Technical and coding agents are internal implementation capabilities, not client-facing product concepts.
- Agents are assistive, not autonomous decision-makers.
- Business logic should be deterministic where possible: policies, scoring, artifact routing, ingestion normalization, and validation.
- LLMs are used for summarization, reasoning explanation, and drafting communication.
- Every run must be traceable, reproducible, and auditable.

## Current System Notes
- Preaudit and audit flows still exist and may use live-oriented inputs.
- Preaudit is primarily a lead-gen diagnostic and Business Context starter.
- Audit and operations flows should support the broader AI operations platform direction.
- Orchestration should route work across domain coordinators and specialists rather than embedding business behavior in one prompt or one vertical app.
- Presentation/reporting layers must remain deterministic and derive from validated output.

## Engineering Constraints
- TypeScript only.
- Deterministic validation using Zod.
- Strict parsing: fail on invalid JSON.
- Keep demo/mock execution clearly separated from live execution.
- Preserve existing artifact readers and traceability metadata.
- Do not hardcode business verticals into the core workspace.
- Do not expose arbitrary shell, edit/write, or coding tools to product agents.

## Anti-Patterns to Avoid
- Over-engineering early.
- Embedding business logic only in prompts.
- Relying on LLM outputs without validation.
- Mixing client-facing workspace concepts with internal ops tooling.
- Treating pre-audit as the client platform.
- Building vertical-specific apps instead of modules and vertical packs.
- Presenting technical/coding agents as client-facing features.

## Definition of Done
- Changes preserve the client/internal workspace separation.
- Core contracts remain validated through schemas in `src/schemas`.
- Shared/runtime behavior belongs in `src/shared` or `src/runtime`.
- Business-specific behavior is modular and pack-based.
- Runs produce valid structured outputs and auditable artifacts.
- Client-facing surfaces stay simple, non-technical, and operations-focused.
