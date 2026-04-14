# `apps/web`

TanStack Start frontend shell for the B2B audit workflow:

`preaudit:live -> preaudit report -> audit intake form -> audit:live`

This app is intentionally scoped to the UX/product layer. The existing agent
engine, scripts, artifacts, and source tree in the repo root are unchanged.

## Scaffold

Exact scaffold command used:

```bash
npx @tanstack/cli@latest create web \
  --target-dir apps/web \
  --framework React \
  --package-manager pnpm \
  --deployment cloudflare \
  --no-toolchain \
  --no-examples \
  --non-interactive \
  --no-install \
  --no-git
```

Install commands used after scaffolding:

```bash
corepack pnpm install
corepack pnpm add -D @tanstack/intent@latest
```

## Chosen Stack

- Framework: TanStack Start with React
- Routing: TanStack Router file-based routes
- Styling: Tailwind CSS v4 plus app-level CSS variables
- Package manager: pnpm (app-local)
- Deployment target: Cloudflare via `wrangler.jsonc`
- Tooling posture: minimal scaffold, no added integrations

## TanStack Intent Guidance Inspected

Installed `@tanstack/intent` and inspected the local skill inventory with:

```bash
corepack pnpm exec intent list
```

Available TanStack skills in this scaffold came from:

- `@tanstack/router-plugin`
- `@tanstack/router-core`
- `@tanstack/virtual-file-routes`

The route shell implementation was kept aligned to the relevant bundled
guidance:

- preserve TanStack Start / router plugin conventions
- keep navigation link-first where possible
- avoid premature loader/server-function complexity for this first shell
- rely on router type inference instead of extra type plumbing

## Environment Requirements

- Node.js `24.x` worked in this repo
- Corepack-enabled `pnpm`
- Cloudflare tooling from local dependencies when deploying:
  - `pnpm deploy`

Run locally:

```bash
cd apps/web
corepack pnpm dev
```

Build:

```bash
cd apps/web
corepack pnpm build
```

## Structure

- `src/routes/index.tsx`: Home / New Preaudit
- `src/routes/preaudit-result.tsx`: Preaudit report shell
- `src/routes/audit-intake.tsx`: Prefilled editable intake shell
- `src/routes/audit-result.tsx`: Audit result placeholder shell
- `src/lib/product-shell.ts`: Doc-derived mock content and intake structure
- `src/components/StageRail.tsx`: Shared stage navigator

## Architectural Decisions

- `apps/web` is app-local and uses its own `pnpm-lock.yaml`
- no repo-root restructure, no workspace conversion, no engine changes
- local workflow bridge lives inside TanStack Start server functions
- preaudit and audit execution call the existing live scripts directly with `node --import tsx/esm`
- preaudit, report, latest pointers, and intake JSON files remain the source of truth
- prefilled intake content only fills what public preaudit could plausibly infer
- internal business goals, pains, systems, and constraints remain user-editable

## Next Steps

1. Exercise the home page against a real URL outside the sandboxed environment to validate the full `preaudit:live` round-trip.
2. Refine how the intake UI maps to the current JSON shape if operators want more exact sales or operations fields preserved.
3. Decide whether local-only Node workflow bridging should stay in this app or be isolated behind a future dedicated local adapter.
