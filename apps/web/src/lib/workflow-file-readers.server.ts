import fs from 'node:fs/promises'

export async function readJsonFile<T>(filePath: string): Promise<T> {
  return JSON.parse(await fs.readFile(filePath, 'utf8')) as T
}

export async function readJsonIfExists<T>(filePath: string): Promise<T | undefined> {
  try {
    return await readJsonFile<T>(filePath)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return undefined
    }

    throw error
  }
}

export async function readTextIfExists(filePath: string) {
  try {
    return await fs.readFile(filePath, 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return ''
    }

    throw error
  }
}

export async function readMtimeMsIfExists(filePath: string) {
  try {
    const stats = await fs.stat(filePath)
    return stats.mtimeMs
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return undefined
    }

    throw error
  }
}

export async function readMtimeIsoIfExists(filePath: string) {
  const mtimeMs = await readMtimeMsIfExists(filePath)
  return typeof mtimeMs === 'number' ? new Date(mtimeMs).toISOString() : undefined
}
