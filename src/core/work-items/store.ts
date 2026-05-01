import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  WorkItemSchema,
  WorkItemStatusSchema,
  type BusinessModuleKey,
  type WorkItem,
  type WorkItemStatus,
  type WorkItemType,
} from "../../schemas/operations.js";
import { slugifyClientName } from "../../shared/runNaming.js";
import { notifySlackWorkItemCreated } from "../../integrations/slack/index.js";
import { appendClientEvent } from "../events/index.js";

type WorkItemOptionalDefaults = Pick<
  WorkItem,
  "status" | "priority" | "source" | "relatedEntities" | "metadata"
>;

export type CreateWorkItemInput = {
  type: WorkItemType;
  title: string;
  moduleKey: BusinessModuleKey;
  description?: string;
  contactId?: string;
  conversationId?: string;
  paymentId?: string;
  scheduleItemId?: string;
  fileOutputId?: string;
  assigneeId?: string;
  dueAt?: string;
  completedAt?: string;
} & Partial<WorkItemOptionalDefaults>;

const WORK_ITEMS_SCHEMA = WorkItemSchema.array();
const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(MODULE_DIR, "..", "..", "..");

function normalizeClientSlug(clientSlug: string): string {
  return slugifyClientName(clientSlug);
}

function workItemsPath(clientSlug: string): string {
  return path.join(REPO_ROOT, "data", "clients", `${normalizeClientSlug(clientSlug)}-work-items.json`);
}

function createWorkItemId(clientSlug: string): string {
  return `work-item-${normalizeClientSlug(clientSlug)}-${randomUUID()}`;
}

async function readWorkItemsFile(clientSlug: string): Promise<unknown[]> {
  const filePath = workItemsPath(clientSlug);

  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      throw new Error(`${filePath} must contain a JSON array`);
    }

    return parsed;
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

async function writeWorkItemsFile(clientSlug: string, workItems: WorkItem[]): Promise<void> {
  const safeSlug = normalizeClientSlug(clientSlug);
  const filePath = workItemsPath(safeSlug);
  const validated = WORK_ITEMS_SCHEMA.parse(workItems);

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(validated, null, 2)}\n`, "utf8");
}

export function workItemsFilePath(clientSlug: string): string {
  return workItemsPath(clientSlug);
}

export async function listWorkItems(clientSlug: string): Promise<WorkItem[]> {
  const rawWorkItems = await readWorkItemsFile(clientSlug);
  return WORK_ITEMS_SCHEMA.parse(rawWorkItems);
}

export async function createWorkItem(
  clientSlug: string,
  input: CreateWorkItemInput,
): Promise<WorkItem> {
  const safeSlug = normalizeClientSlug(clientSlug);
  const now = new Date().toISOString();
  const existing = await listWorkItems(safeSlug);
  const workItem = WorkItemSchema.parse({
    ...input,
    id: createWorkItemId(safeSlug),
    businessId: safeSlug,
    createdAt: now,
    updatedAt: now,
    completedAt: input.status === "done" ? input.completedAt ?? now : input.completedAt,
  });

  await writeWorkItemsFile(safeSlug, [...existing, workItem]);
  await appendClientEvent(safeSlug, {
    type: "work_item.created",
    entityType: "work_item",
    entityId: workItem.id,
    message: `Work item created: ${workItem.title}`,
    visibility: "internal",
    metadata: {
      status: workItem.status,
      type: workItem.type,
      moduleKey: workItem.moduleKey,
    },
  });
  await notifySlackWorkItemCreated({
    clientSlug: safeSlug,
    title: workItem.title,
    type: workItem.type,
    moduleKey: workItem.moduleKey,
    priority: workItem.priority,
    status: workItem.status,
    createdAt: workItem.createdAt,
  });
  return workItem;
}

export async function updateWorkItemStatus(
  clientSlug: string,
  workItemId: string,
  status: WorkItemStatus,
): Promise<WorkItem> {
  const safeSlug = normalizeClientSlug(clientSlug);
  const nextStatus = WorkItemStatusSchema.parse(status);
  const existing = await listWorkItems(safeSlug);
  const index = existing.findIndex((workItem) => workItem.id === workItemId);

  if (index === -1) {
    throw new Error(`WorkItem "${workItemId}" was not found for client "${safeSlug}".`);
  }

  const now = new Date().toISOString();
  const current = existing[index];
  const updated = WorkItemSchema.parse({
    ...current,
    status: nextStatus,
    updatedAt: now,
    completedAt: nextStatus === "done" ? current.completedAt ?? now : undefined,
  });
  const nextWorkItems = [...existing];
  nextWorkItems[index] = updated;

  await writeWorkItemsFile(safeSlug, nextWorkItems);
  await appendClientEvent(safeSlug, {
    type: "work_item.status_updated",
    entityType: "work_item",
    entityId: updated.id,
    message: `Work item status updated: ${updated.title}`,
    visibility: "internal",
    metadata: {
      previousStatus: current.status,
      status: updated.status,
      type: updated.type,
      moduleKey: updated.moduleKey,
    },
  });
  return updated;
}

export const listClientRequests = listWorkItems;
export const createClientRequest = createWorkItem;
export const updateClientRequestStatus = updateWorkItemStatus;
