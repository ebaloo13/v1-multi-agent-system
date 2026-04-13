import fs from "node:fs/promises";
import path from "node:path";
import { slugifyClientName } from "./runNaming.js";

export type ClientArtifactAgent = "preaudit" | "audit";

export type LatestClientRunPointer = {
  display_run_id: string;
  run_id: string;
  path: string;
};

type RunLocationParams = {
  clientSlug?: string;
  agent: ClientArtifactAgent;
  displayRunId?: string;
  runId: string;
};

function safeClientSlug(clientSlug: string | undefined): string {
  return slugifyClientName(clientSlug || "generic-client");
}

export function artifactClientsDir(repoRoot: string): string {
  return path.join(repoRoot, "artifacts", "clients");
}

export function artifactClientPath(repoRoot: string, clientSlug?: string): string {
  return path.join(artifactClientsDir(repoRoot), safeClientSlug(clientSlug));
}

export function artifactAgentPath(
  repoRoot: string,
  clientSlug: string | undefined,
  agent: ClientArtifactAgent,
): string {
  return path.join(artifactClientPath(repoRoot, clientSlug), agent);
}

export function artifactRunPath(repoRoot: string, params: RunLocationParams): string {
  const folderName = params.displayRunId?.trim() || params.runId;
  return path.join(artifactAgentPath(repoRoot, params.clientSlug, params.agent), folderName);
}

export function artifactRelativePath(repoRoot: string, absolutePath: string): string {
  return path.relative(repoRoot, absolutePath) || ".";
}

export async function relocateRunDir(currentDir: string, targetDir: string): Promise<string> {
  if (currentDir === targetDir) {
    return currentDir;
  }

  await fs.mkdir(path.dirname(targetDir), { recursive: true });
  await fs.rename(currentDir, targetDir);
  return targetDir;
}

export async function writeLatestClientRunPointer(
  repoRoot: string,
  params: {
    clientSlug?: string;
    agent: ClientArtifactAgent;
    displayRunId?: string;
    runId: string;
    runDir: string;
  },
): Promise<void> {
  const agentDir = artifactAgentPath(repoRoot, params.clientSlug, params.agent);
  await fs.mkdir(agentDir, { recursive: true });

  const pointer: LatestClientRunPointer = {
    display_run_id: params.displayRunId?.trim() || params.runId,
    run_id: params.runId,
    path: artifactRelativePath(repoRoot, params.runDir),
  };

  await fs.writeFile(
    path.join(agentDir, "latest.json"),
    `${JSON.stringify(pointer, null, 2)}\n`,
    "utf8",
  );
}
