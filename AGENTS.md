

# Agent Development Rules

Read `CLAUDE.md` first for product context, architecture, and repository boundaries.

This file defines how coding agents must work in this repository.

## Conversational Style

- Keep answers short, concise, and technical.
- No emojis in commits, issues, PR comments, or code.
- No fluff or cheerful filler text.
- Be direct and kind.

## Simplicity / Scope Control

- Prefer the smallest correct change.
- Do not introduce new abstractions, helper layers, scripts, config files, providers, queues, or services unless the task explicitly requires them.
- Before creating a new file, check whether the functionality belongs in an existing file.
- Before adding a dependency, verify that the project does not already provide the needed capability.
- Do not create fallback systems, compatibility shims, mock layers, or migration paths unless explicitly requested.
- Do not add speculative extensibility.
- Do not add demo code, sample data, scripts, or docs unless requested.
- If a requested change appears to require broad architectural work, explain the tradeoff before implementing.
- Do not preserve backward compatibility unless the user explicitly asks for it.

## Code Quality

- TypeScript only.
- No `any` types unless absolutely necessary.
- Prefer explicit domain types, Zod schemas, and validated structured outputs.
- Check existing project types and external package type definitions before guessing APIs.
- Never use inline imports, dynamic imports for types, or `import("pkg").Type` in type positions.
- Use standard top-level imports.
- Never remove or downgrade intentional functionality to fix type errors.
- Always ask before removing functionality or code that appears intentional.
- Keep business logic deterministic where possible.
- Do not embed core business rules only in prompts.
- Do not expose arbitrary shell, edit/write, or coding tools to product agents.

## Architecture Rules

- Core schemas belong in `src/schemas`.
- Shared utilities belong in `src/shared`.
- Runtime utilities belong in `src/runtime`.
- Keep demo/mock execution separate from live execution.
- Keep client-facing workspace concepts separate from internal operations tooling.
- Do not hardcode business verticals into the core workspace.
- Business-specific behavior should be modular and pack-based.
- Presentation/reporting layers must derive from validated output.
- Generated artifacts must remain traceable and auditable.

## Commands

- After code changes, run:

```bash
npm run check
```

- Get the full output. Do not use `tail`.
- Fix all errors, warnings, and infos before reporting completion.
- `npm run check` does not replace targeted tests.
- Do not run these commands unless explicitly instructed:

```bash
npm run dev
npm run build
npm test
```

- Only run specific tests when instructed.
- If creating or modifying a test file, run that specific test and iterate until it passes.
- Run tests from the relevant package/app root when applicable.

## Git Rules

- Never commit unless the user explicitly asks.
- Before committing, run:

```bash
git status
```

- Only commit files changed in the current session.
- Never use:

```bash
git add -A
git add .
git reset --hard
git checkout .
git clean -fd
git stash
git commit --no-verify
```

- Use `git add <specific-file-path>` for each file intentionally changed.
- Track which files were created, modified, or deleted during the session.
- Never force push.
- If rebase conflicts occur in files not modified during the current session, abort and ask the user.

## Issue / PR Comments

- Keep comments concise, technical, and in the user's tone.
- Write full comments to a temp file and post with `--body-file`.
- Never pass multi-line markdown directly via `--body`.
- Preview the exact comment text before posting.
- Post exactly one final comment unless the user explicitly asks for multiple comments.
- If a comment is malformed, delete it immediately and post one corrected comment.

## Pull Request Workflow

- Analyze PRs without pulling locally first.
- If the user approves implementation:
  - Create a feature branch.
  - Pull the PR.
  - Rebase on main.
  - Apply required adjustments.
  - Run required checks.
  - Commit only the files changed in the current session.
  - Merge into main only after user approval.
  - Push only after user approval.
- Do not open PRs unless the user explicitly asks.

## User Override

- If user instructions conflict with these rules, ask for confirmation before overriding them.