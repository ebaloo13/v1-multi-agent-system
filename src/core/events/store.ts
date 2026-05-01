import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { z } from "zod";

import { slugifyClientName } from "../../shared/runNaming.js";

export const ClientEventSchema = z.object({
  id: z.string(),
  clientSlug: z.string(),
  type: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  message: z.string(),
  visibility: z.enum(["internal", "client"]),
  metadata: z.record(z.string(), z.unknown()).default({}),
  createdAt: z.string(),
});

export type ClientEvent = z.infer<typeof ClientEventSchema>;

export type AppendClientEventInput = {
  type: string;
  entityType: string;
  entityId: string;
  message: string;
  visibility: ClientEvent["visibility"];
  metadata?: Record<string, unknown>;
};

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(MODULE_DIR, "..", "..", "..");

function normalizeClientSlug(clientSlug: string): string {
  return slugifyClientName(clientSlug);
}

function clientEventsPath(clientSlug: string): string {
  return path.join(REPO_ROOT, "data", "clients", `${normalizeClientSlug(clientSlug)}-events.ndjson`);
}

export function clientEventsFilePath(clientSlug: string): string {
  return clientEventsPath(clientSlug);
}

export async function appendClientEvent(
  clientSlug: string,
  eventInput: AppendClientEventInput,
): Promise<ClientEvent> {
  const safeSlug = normalizeClientSlug(clientSlug);
  const event = ClientEventSchema.parse({
    ...eventInput,
    id: `client-event-${safeSlug}-${randomUUID()}`,
    clientSlug: safeSlug,
    createdAt: new Date().toISOString(),
  });
  const filePath = clientEventsPath(safeSlug);

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.appendFile(filePath, `${JSON.stringify(event)}\n`, "utf8");

  return event;
}

export async function listClientEvents(clientSlug: string): Promise<ClientEvent[]> {
  const filePath = clientEventsPath(clientSlug);

  let raw: string;
  try {
    raw = await fs.readFile(filePath, "utf8");
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return [];
    }

    throw error;
  }

  return raw
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => ClientEventSchema.parse(JSON.parse(line) as unknown));
}
