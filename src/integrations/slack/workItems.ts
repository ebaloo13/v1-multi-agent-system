import type { WorkItem, WorkItemStatus } from "../../schemas/operations.js";

export type SlackWorkItemCreatedNotification = Pick<
  WorkItem,
  "title" | "type" | "moduleKey" | "priority" | "status" | "createdAt"
> & {
  clientSlug: string;
};

export type SlackWorkItemStatusChangedNotification = Pick<
  WorkItem,
  "title" | "type" | "moduleKey" | "priority" | "updatedAt"
> & {
  clientSlug: string;
  previousStatus: WorkItemStatus;
  status: WorkItemStatus;
};

const SLACK_NOTIFIABLE_STATUSES = new Set<WorkItemStatus>([
  "waiting",
  "needs_review",
  "ready",
]);

function formatWorkItemCreatedMessage(notification: SlackWorkItemCreatedNotification): string {
  return [
    "New WorkItem created",
    `Client: ${notification.clientSlug}`,
    `Title: ${notification.title}`,
    `Type: ${notification.type}`,
    `Module: ${notification.moduleKey}`,
    `Priority: ${notification.priority}`,
    `Status: ${notification.status}`,
    `Created: ${notification.createdAt}`,
  ].join("\n");
}

function formatWorkItemStatusChangedMessage(
  notification: SlackWorkItemStatusChangedNotification,
): string {
  return [
    "Important WorkItem status change",
    `Client: ${notification.clientSlug}`,
    `Title: ${notification.title}`,
    `Previous status: ${notification.previousStatus}`,
    `New status: ${notification.status}`,
    `Type: ${notification.type}`,
    `Module: ${notification.moduleKey}`,
    `Priority: ${notification.priority}`,
    `Updated: ${notification.updatedAt}`,
  ].join("\n");
}

async function postSlackMessage(message: string): Promise<boolean> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL?.trim();
  if (!webhookUrl) {
    return false;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: message }),
    });

    return response.ok;
  } catch {
    return false;
  }
}

export async function notifySlackWorkItemCreated(
  notification: SlackWorkItemCreatedNotification,
): Promise<boolean> {
  return postSlackMessage(formatWorkItemCreatedMessage(notification));
}

export async function notifySlackWorkItemStatusChanged(
  notification: SlackWorkItemStatusChangedNotification,
): Promise<boolean> {
  if (
    notification.previousStatus === notification.status ||
    !SLACK_NOTIFIABLE_STATUSES.has(notification.status)
  ) {
    return false;
  }

  return postSlackMessage(formatWorkItemStatusChangedMessage(notification));
}
