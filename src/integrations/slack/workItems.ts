import type { WorkItem } from "../../schemas/operations.js";

export type SlackWorkItemCreatedNotification = Pick<
  WorkItem,
  "title" | "type" | "moduleKey" | "priority" | "status" | "createdAt"
> & {
  clientSlug: string;
};

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

export async function notifySlackWorkItemCreated(
  notification: SlackWorkItemCreatedNotification,
): Promise<boolean> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL?.trim();
  if (!webhookUrl) {
    return false;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        text: formatWorkItemCreatedMessage(notification),
      }),
    });

    return response.ok;
  } catch {
    return false;
  }
}
