import fs from 'node:fs/promises'
import path from 'node:path'

import { DEFAULT_WEBSITE, formatClientName } from './product-shell'
import { readJsonIfExists } from './workflow-file-readers.server'
import { clientContextPath } from './workflow-paths.server'

type ClientContextFile = {
  client_slug: string
  client_name?: string
  website?: string
  email?: string
  created_at: string
  updated_at: string
}

export async function readClientContext(clientSlug: string) {
  return readJsonIfExists<ClientContextFile>(clientContextPath(clientSlug))
}

export async function saveClientContext(
  clientSlug: string,
  patch: {
    clientName?: string
    website?: string
    email?: string
  },
) {
  const existing = await readClientContext(clientSlug)
  const now = new Date().toISOString()
  const filePath = clientContextPath(clientSlug)
  const next: ClientContextFile = {
    client_slug: clientSlug,
    client_name: patch.clientName?.trim() || existing?.client_name || formatClientName(clientSlug),
    website: patch.website?.trim() || existing?.website || DEFAULT_WEBSITE,
    email: patch.email?.trim() || existing?.email,
    created_at: existing?.created_at || now,
    updated_at: now,
  }

  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, `${JSON.stringify(next, null, 2)}\n`, 'utf8')

  return next
}
