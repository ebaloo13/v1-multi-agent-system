import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  WorkItemAssistantResultSchema,
  WorkItemConversationMessageSchema,
  WorkItemSchema,
  WorkItemStatusSchema,
  type BusinessModuleKey,
  type WorkItem,
  type WorkItemAssistantResult,
  type WorkItemConversationMessage,
  type WorkItemStatus,
  type WorkItemType,
} from "../../schemas/operations.js";
import { slugifyClientName } from "../../shared/runNaming.js";
import {
  notifySlackWorkItemCreated,
  notifySlackWorkItemStatusChanged,
} from "../../integrations/slack/index.js";
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

export type CreateWorkItemAssistantResultInput = {
  clientSlug: string;
  workItemId: string;
  assistantKey: string;
  stageId?: string;
  summary: string;
  suggestedNextAction: string;
  confidence: WorkItemAssistantResult["confidence"];
};

export type CreateWorkItemConversationMessageInput = {
  clientSlug: string;
  workItemId: string;
  role: WorkItemConversationMessage["role"];
  body: string;
  assistantKey?: string;
  source: WorkItemConversationMessage["source"];
};

const WORK_ITEMS_SCHEMA = WorkItemSchema.array();
const WORK_ITEM_ASSISTANT_RESULTS_SCHEMA = WorkItemAssistantResultSchema.array();
const WORK_ITEM_CONVERSATION_MESSAGES_SCHEMA = WorkItemConversationMessageSchema.array();
const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(MODULE_DIR, "..", "..", "..");

function normalizeClientSlug(clientSlug: string): string {
  return slugifyClientName(clientSlug);
}

function workItemsPath(clientSlug: string): string {
  return path.join(REPO_ROOT, "data", "clients", `${normalizeClientSlug(clientSlug)}-work-items.json`);
}

function workItemAssistantResultsPath(clientSlug: string): string {
  return path.join(
    REPO_ROOT,
    "data",
    "clients",
    `${normalizeClientSlug(clientSlug)}-work-item-assistant-results.json`,
  );
}

function workItemConversationMessagesPath(clientSlug: string): string {
  return path.join(
    REPO_ROOT,
    "data",
    "clients",
    `${normalizeClientSlug(clientSlug)}-work-item-messages.json`,
  );
}

function createWorkItemId(clientSlug: string): string {
  return `work-item-${normalizeClientSlug(clientSlug)}-${randomUUID()}`;
}

function createWorkItemAssistantResultId(clientSlug: string): string {
  return `work-item-assistant-result-${normalizeClientSlug(clientSlug)}-${randomUUID()}`;
}

function createWorkItemConversationMessageId(clientSlug: string): string {
  return `work-item-message-${normalizeClientSlug(clientSlug)}-${randomUUID()}`;
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

async function readWorkItemAssistantResultsFile(clientSlug: string): Promise<unknown[]> {
  const filePath = workItemAssistantResultsPath(clientSlug);

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

async function readWorkItemConversationMessagesFile(clientSlug: string): Promise<unknown[]> {
  const filePath = workItemConversationMessagesPath(clientSlug);

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

async function writeWorkItemAssistantResultsFile(
  clientSlug: string,
  results: WorkItemAssistantResult[],
): Promise<void> {
  const safeSlug = normalizeClientSlug(clientSlug);
  const filePath = workItemAssistantResultsPath(safeSlug);
  const validated = WORK_ITEM_ASSISTANT_RESULTS_SCHEMA.parse(results);

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(validated, null, 2)}\n`, "utf8");
}

async function writeWorkItemConversationMessagesFile(
  clientSlug: string,
  messages: WorkItemConversationMessage[],
): Promise<void> {
  const safeSlug = normalizeClientSlug(clientSlug);
  const filePath = workItemConversationMessagesPath(safeSlug);
  const validated = WORK_ITEM_CONVERSATION_MESSAGES_SCHEMA.parse(messages);

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(validated, null, 2)}\n`, "utf8");
}

export function workItemsFilePath(clientSlug: string): string {
  return workItemsPath(clientSlug);
}

export function workItemAssistantResultsFilePath(clientSlug: string): string {
  return workItemAssistantResultsPath(clientSlug);
}

export function workItemConversationMessagesFilePath(clientSlug: string): string {
  return workItemConversationMessagesPath(clientSlug);
}

export async function listWorkItems(clientSlug: string): Promise<WorkItem[]> {
  const rawWorkItems = await readWorkItemsFile(clientSlug);
  return WORK_ITEMS_SCHEMA.parse(rawWorkItems);
}

export async function listWorkItemAssistantResults(
  clientSlug: string,
  workItemId: string,
): Promise<WorkItemAssistantResult[]> {
  const safeSlug = normalizeClientSlug(clientSlug);
  const rawResults = await readWorkItemAssistantResultsFile(safeSlug);
  return WORK_ITEM_ASSISTANT_RESULTS_SCHEMA.parse(rawResults)
    .filter((result) => result.workItemId === workItemId);
}

export async function listWorkItemConversationMessages(
  clientSlug: string,
  workItemId: string,
): Promise<WorkItemConversationMessage[]> {
  const safeSlug = normalizeClientSlug(clientSlug);
  const rawMessages = await readWorkItemConversationMessagesFile(safeSlug);
  return WORK_ITEM_CONVERSATION_MESSAGES_SCHEMA.parse(rawMessages)
    .filter((message) => message.workItemId === workItemId);
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

export async function createWorkItemConversationMessage(
  input: CreateWorkItemConversationMessageInput,
): Promise<WorkItemConversationMessage> {
  const safeSlug = normalizeClientSlug(input.clientSlug);
  const existing = WORK_ITEM_CONVERSATION_MESSAGES_SCHEMA.parse(
    await readWorkItemConversationMessagesFile(safeSlug),
  );
  const message = WorkItemConversationMessageSchema.parse({
    ...input,
    id: createWorkItemConversationMessageId(safeSlug),
    clientSlug: safeSlug,
    createdAt: new Date().toISOString(),
  });

  await writeWorkItemConversationMessagesFile(safeSlug, [...existing, message]);
  await appendClientEvent(safeSlug, {
    type: "work_item.message_created",
    entityType: "work_item",
    entityId: message.workItemId,
    message: `Work item message created: ${message.role}`,
    visibility: "internal",
    metadata: {
      messageId: message.id,
      role: message.role,
      source: message.source,
      assistantKey: message.assistantKey,
    },
  });

  return message;
}

export async function createWorkItemAssistantResult(
  input: CreateWorkItemAssistantResultInput,
): Promise<WorkItemAssistantResult> {
  const safeSlug = normalizeClientSlug(input.clientSlug);
  const existing = WORK_ITEM_ASSISTANT_RESULTS_SCHEMA.parse(
    await readWorkItemAssistantResultsFile(safeSlug),
  );
  const result = WorkItemAssistantResultSchema.parse({
    ...input,
    id: createWorkItemAssistantResultId(safeSlug),
    clientSlug: safeSlug,
    createdAt: new Date().toISOString(),
  });

  await writeWorkItemAssistantResultsFile(safeSlug, [...existing, result]);
  await appendClientEvent(safeSlug, {
    type: "work_item.assistant_result_created",
    entityType: "work_item",
    entityId: result.workItemId,
    message: `Assistant result created: ${result.assistantKey}`,
    visibility: "internal",
    metadata: {
      assistantResultId: result.id,
      assistantKey: result.assistantKey,
      stageId: result.stageId,
      confidence: result.confidence,
    },
  });

  return result;
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
  await notifySlackWorkItemStatusChanged({
    clientSlug: safeSlug,
    title: updated.title,
    previousStatus: current.status,
    status: updated.status,
    type: updated.type,
    moduleKey: updated.moduleKey,
    priority: updated.priority,
    updatedAt: updated.updatedAt,
  });
  return updated;
}

export const listClientRequests = listWorkItems;
export const createClientRequest = createWorkItem;
export const updateClientRequestStatus = updateWorkItemStatus;
