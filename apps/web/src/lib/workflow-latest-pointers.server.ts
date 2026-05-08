import fs from 'node:fs/promises'
import path from 'node:path'

import { readJsonIfExists } from './workflow-file-readers.server'
import { clientArtifactPath, clientArtifactsDir } from './workflow-paths.server'

export type LatestPointer = {
  display_run_id: string
  run_id: string
  path: string
}

export async function findLatestClientSlugForAgent(agent: 'preaudit' | 'audit') {
  const root = clientArtifactsDir()
  const clients = await fs.readdir(root, { withFileTypes: true }).catch(() => [])
  let latest: { slug: string; mtimeMs: number } | undefined

  for (const client of clients) {
    if (!client.isDirectory()) {
      continue
    }

    const latestPath = path.join(root, client.name, agent, 'latest.json')
    const stats = await fs.stat(latestPath).catch(() => undefined)
    if (!stats) {
      continue
    }

    if (!latest || stats.mtimeMs > latest.mtimeMs) {
      latest = { slug: client.name, mtimeMs: stats.mtimeMs }
    }
  }

  return latest?.slug
}

export async function readLatestPointer(clientSlug: string, agent: 'preaudit' | 'audit') {
  const latestPath = path.join(clientArtifactPath(clientSlug, agent), 'latest.json')
  const pointer = await readJsonIfExists<LatestPointer>(latestPath)

  if (!pointer) {
    throw new Error(`No latest ${agent} output found for client "${clientSlug}".`)
  }

  return pointer
}

export async function readLatestPointerIfExists(clientSlug: string, agent: 'preaudit' | 'audit') {
  try {
    return await readLatestPointer(clientSlug, agent)
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('No latest')) {
      return undefined
    }

    throw error
  }
}
