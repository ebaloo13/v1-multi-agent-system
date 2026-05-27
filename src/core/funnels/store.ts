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
  type WorkItemStatus,
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
  label?: string;
  description?: string;
  assistantKey?: string;
  canMoveStage?: boolean;
  state?: FunnelStage["state"];
};

export type AddFunnelStageInput = {
  label: string;
  description?: string;
  status?: WorkItemStatus;
  state?: FunnelStage["state"];
  assistantKey?: string;
  canMoveStage?: boolean;
};

export type ReorderFunnelStageDirection = "left" | "right";

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

function createStageId(label: string, existingStages: FunnelStage[]): string {
  const baseId = label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "stage";
  const existingIds = new Set(existingStages.map((stage) => stage.id));

  if (!existingIds.has(baseId)) {
    return baseId;
  }

  for (let suffix = 2; ; suffix += 1) {
    const candidate = `${baseId}-${suffix}`;
    if (!existingIds.has(candidate)) {
      return candidate;
    }
  }
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

function sortStagesByOrder(stages: FunnelStage[]): FunnelStage[] {
  return stages
    .map((stage, index) => ({ stage, index }))
    .sort((first, second) => {
      const orderDifference = first.stage.order - second.stage.order;

      if (orderDifference !== 0) {
        return orderDifference;
      }

      return first.index - second.index;
    })
    .map(({ stage }) => stage);
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
    label: patch.label !== undefined ? patch.label : currentStage.label,
    description: "description" in patch ? patch.description : currentStage.description,
    assistantKey: "assistantKey" in patch ? patch.assistantKey : currentStage.assistantKey,
    state: patch.state !== undefined ? patch.state : currentStage.state,
    automationPolicy: patch.canMoveStage !== undefined
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

export async function addFunnelStage(
  clientSlug: string,
  funnelId: string,
  input: AddFunnelStageInput,
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
  const nextOrder = Math.max(-1, ...funnel.stages.map((stage) => stage.order)) + 1;
  const stage = FunnelStageSchema.parse({
    id: createStageId(input.label, funnel.stages),
    label: input.label,
    description: input.description,
    order: nextOrder,
    status: input.status ?? "new",
    state: input.state ?? "open",
    assistantKey: input.assistantKey,
    automationPolicy: {
      canMoveStage: input.canMoveStage ?? true,
    },
  });

  const nextFunnels = [...funnels];
  nextFunnels[funnelIndex] = FunnelSchema.parse({
    ...funnel,
    stages: [...funnel.stages, stage],
  });

  await writeFunnelsFile(clientSlug, nextFunnels);
  return stage;
}

export async function reorderFunnelStage(
  clientSlug: string,
  funnelId: string,
  stageId: string,
  direction: ReorderFunnelStageDirection,
): Promise<Funnel> {
  const rawFunnels = await readFunnelsFile(clientSlug);
  const funnels = rawFunnels === null
    ? [getDefaultWorkItemFunnel(clientSlug)]
    : FUNNELS_SCHEMA.parse(rawFunnels);
  const funnelIndex = funnels.findIndex((funnel) => funnel.id === funnelId);

  if (funnelIndex === -1) {
    throw new Error(`Funnel "${funnelId}" was not found.`);
  }

  const funnel = funnels[funnelIndex];
  const sortedStages = sortStagesByOrder(funnel.stages);
  const stageIndex = sortedStages.findIndex((stage) => stage.id === stageId);

  if (stageIndex === -1) {
    throw new Error(`Funnel stage "${stageId}" was not found.`);
  }

  const targetIndex = direction === "left" ? stageIndex - 1 : stageIndex + 1;

  if (targetIndex < 0 || targetIndex >= sortedStages.length) {
    return funnel;
  }

  const reorderedStages = [...sortedStages];
  const currentStage = reorderedStages[stageIndex];
  reorderedStages[stageIndex] = reorderedStages[targetIndex];
  reorderedStages[targetIndex] = currentStage;

  const nextStages = reorderedStages.map((stage, index) => FunnelStageSchema.parse({
    ...stage,
    order: index,
  }));
  const nextFunnel = FunnelSchema.parse({
    ...funnel,
    stages: nextStages,
  });
  const nextFunnels = [...funnels];
  nextFunnels[funnelIndex] = nextFunnel;

  await writeFunnelsFile(clientSlug, nextFunnels);
  return nextFunnel;
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
