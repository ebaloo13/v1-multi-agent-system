import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { z } from "zod";

import {
  FunnelSchema,
  FunnelStageSchema,
  type BusinessModuleKey,
  type Funnel,
  type FunnelStage,
} from "../../schemas/operations.js";
import { slugifyClientName } from "../../shared/runNaming.js";

const DEFAULT_WORK_ITEM_FUNNEL_KEY = "default_work_item_funnel";
const FUNNELS_SCHEMA = z.array(FunnelSchema);
const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(MODULE_DIR, "..", "..", "..");
const FUNNEL_PRIORITY_ORDER: Record<Funnel["priority"], number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export type UpdateFunnelStagePatch = {
  assistantKey?: string;
  canMoveStage?: boolean;
};

const DEFAULT_WORK_ITEM_FUNNEL_STAGES: FunnelStage[] = [
  {
    id: "new",
    label: "New",
    order: 0,
    status: "new",
    state: "open",
    assistantKey: "intake-assistant",
    automationPolicy: {
      canMoveStage: true,
      canCreateInternalNote: true,
      canApplyTags: true,
    },
  },
  {
    id: "in-progress",
    label: "In Progress",
    order: 1,
    status: "in_progress",
    state: "open",
    assistantKey: "operations-assistant",
    automationPolicy: {
      canMoveStage: true,
      canCreateInternalNote: true,
    },
  },
  {
    id: "waiting",
    label: "Waiting",
    order: 2,
    status: "waiting",
    state: "open",
    assistantKey: "followup-assistant",
    automationPolicy: {
      canMoveStage: true,
      canCreateInternalNote: true,
      canTriggerWorkflow: true,
    },
  },
  {
    id: "needs-review",
    label: "Needs Review",
    order: 3,
    status: "needs_review",
    state: "open",
    assistantKey: "review-assistant",
    automationPolicy: {
      canMoveStage: true,
      requiresHumanApproval: true,
      canCreateInternalNote: true,
    },
  },
  {
    id: "ready",
    label: "Ready",
    order: 4,
    status: "ready",
    state: "open",
    assistantKey: "delivery-assistant",
    automationPolicy: {
      canMoveStage: true,
      canCreateInternalNote: true,
    },
  },
  {
    id: "done",
    label: "Done",
    order: 5,
    status: "done",
    state: "closed",
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

async function writeFunnelsFile(clientSlug: string, funnels: Funnel[]): Promise<void> {
  const safeSlug = normalizeClientSlug(clientSlug);
  const filePath = funnelsPath(safeSlug);
  const validated = FUNNELS_SCHEMA.parse(funnels);

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(validated, null, 2)}\n`, "utf8");
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
    moduleKey: "tasks",
    priority: "critical",
    isDefault: true,
    isActive: true,
    order: 0,
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

export async function updateFunnelStage(
  clientSlug: string,
  funnelId: string,
  stageId: string,
  patch: UpdateFunnelStagePatch,
): Promise<FunnelStage> {
  const rawFunnels = await readFunnelsFile(clientSlug);
  const funnels = rawFunnels === null
    ? [getDefaultWorkItemFunnel(clientSlug)]
    : FUNNELS_SCHEMA.parse(rawFunnels);
  const funnelIndex = funnels.findIndex((funnel) => funnel.id === funnelId);

  if (funnelIndex === -1) {
    throw new Error(`Funnel "${funnelId}" was not found.`);
  }

  const funnel = funnels[funnelIndex];
  const stageIndex = funnel.stages.findIndex((stage) => stage.id === stageId);

  if (stageIndex === -1) {
    throw new Error(`Funnel stage "${stageId}" was not found.`);
  }

  const currentStage = funnel.stages[stageIndex];
  const updatedStage = FunnelStageSchema.parse({
    ...currentStage,
    assistantKey: "assistantKey" in patch ? patch.assistantKey : currentStage.assistantKey,
    automationPolicy: "canMoveStage" in patch
      ? {
          ...(currentStage.automationPolicy ?? {}),
          canMoveStage: patch.canMoveStage,
        }
      : currentStage.automationPolicy,
  });
  const nextStages = [...funnel.stages];
  nextStages[stageIndex] = updatedStage;

  const nextFunnels = [...funnels];
  nextFunnels[funnelIndex] = FunnelSchema.parse({
    ...funnel,
    stages: nextStages,
  });

  await writeFunnelsFile(clientSlug, nextFunnels);
  return updatedStage;
}

export function selectFunnelForModule(
  funnels: Funnel[],
  moduleKey: BusinessModuleKey,
  fallback: Funnel,
): Funnel {
  return funnels
    .map((funnel, index) => ({ funnel, index }))
    .filter(({ funnel }) => funnel.moduleKey === moduleKey)
    .sort((first, second) => {
      if (first.funnel.isActive !== false && second.funnel.isActive === false) {
        return -1;
      }

      if (first.funnel.isActive === false && second.funnel.isActive !== false) {
        return 1;
      }

      if (first.funnel.isDefault === true && second.funnel.isDefault !== true) {
        return -1;
      }

      if (first.funnel.isDefault !== true && second.funnel.isDefault === true) {
        return 1;
      }

      const priorityDifference =
        FUNNEL_PRIORITY_ORDER[first.funnel.priority] - FUNNEL_PRIORITY_ORDER[second.funnel.priority];
      if (priorityDifference !== 0) {
        return priorityDifference;
      }

      const orderDifference = (first.funnel.order ?? Number.MAX_SAFE_INTEGER) -
        (second.funnel.order ?? Number.MAX_SAFE_INTEGER);
      if (orderDifference !== 0) {
        return orderDifference;
      }

      return first.index - second.index;
    })[0]?.funnel ?? fallback;
}

export async function getFunnelForModule(
  clientSlug: string,
  moduleKey: BusinessModuleKey,
): Promise<Funnel> {
  const fallback = getDefaultWorkItemFunnel(clientSlug);
  const funnels = await listFunnels(clientSlug);
  return selectFunnelForModule(funnels, moduleKey, fallback);
}
