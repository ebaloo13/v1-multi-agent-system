import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { z } from "zod";

import {
  FunnelSchema,
  type Funnel,
  type FunnelStage,
} from "../../schemas/operations.js";
import { slugifyClientName } from "../../shared/runNaming.js";

const DEFAULT_WORK_ITEM_FUNNEL_KEY = "default_work_item_funnel";
const FUNNELS_SCHEMA = z.array(FunnelSchema);
const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(MODULE_DIR, "..", "..", "..");

const DEFAULT_WORK_ITEM_FUNNEL_STAGES: FunnelStage[] = [
  {
    id: "new",
    label: "New",
    order: 0,
    status: "new",
  },
  {
    id: "in-progress",
    label: "In Progress",
    order: 1,
    status: "in_progress",
  },
  {
    id: "waiting",
    label: "Waiting",
    order: 2,
    status: "waiting",
  },
  {
    id: "needs-review",
    label: "Needs Review",
    order: 3,
    status: "needs_review",
  },
  {
    id: "ready",
    label: "Ready",
    order: 4,
    status: "ready",
  },
  {
    id: "done",
    label: "Done",
    order: 5,
    status: "done",
  },
];

function normalizeClientSlug(clientSlug: string): string {
  return slugifyClientName(clientSlug);
}

function funnelsPath(clientSlug: string): string {
  return path.join(REPO_ROOT, "data", "clients", `${normalizeClientSlug(clientSlug)}-funnels.json`);
}

async function readFunnelsFile(clientSlug: string): Promise<unknown[] | null> {
  const filePath = funnelsPath(clientSlug);

  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      throw new Error(`${filePath} must contain a JSON array`);
    }

    return parsed;
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

export function funnelsFilePath(clientSlug: string): string {
  return funnelsPath(clientSlug);
}

export function getDefaultWorkItemFunnel(clientSlug: string): Funnel {
  const safeSlug = normalizeClientSlug(clientSlug);

  return FunnelSchema.parse({
    id: `${safeSlug}-${DEFAULT_WORK_ITEM_FUNNEL_KEY}`,
    businessId: safeSlug,
    key: DEFAULT_WORK_ITEM_FUNNEL_KEY,
    label: "Work Items",
    stages: DEFAULT_WORK_ITEM_FUNNEL_STAGES,
  });
}

export async function listFunnels(clientSlug: string): Promise<Funnel[]> {
  const rawFunnels = await readFunnelsFile(clientSlug);

  if (rawFunnels === null) {
    return [getDefaultWorkItemFunnel(clientSlug)];
  }

  return FUNNELS_SCHEMA.parse(rawFunnels);
}
