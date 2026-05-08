import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
  '..',
)

export function clientsDataDir() {
  return path.join(REPO_ROOT, 'data', 'clients')
}

export function clientArtifactsDir() {
  return path.join(REPO_ROOT, 'artifacts', 'clients')
}

export function clientArtifactPath(clientSlug: string, agent: 'preaudit' | 'audit') {
  return path.join(clientArtifactsDir(), clientSlug, agent)
}

export function intakeDraftPath(clientSlug: string) {
  return path.join(clientsDataDir(), `${clientSlug}-audit-intake.draft.json`)
}

export function intakePath(clientSlug: string) {
  return path.join(clientsDataDir(), `${clientSlug}-audit-intake.json`)
}

export function clientContextPath(clientSlug: string) {
  return path.join(clientsDataDir(), `${clientSlug}-workspace.json`)
}
