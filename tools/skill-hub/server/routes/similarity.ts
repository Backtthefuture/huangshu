import type { FastifyInstance } from 'fastify'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'
import { detectSimilarSkills } from '../scanner/similarity.js'
import { getCachedResult } from './skills.js'
import { fullScan } from '../scanner/discovery.js'

const STORE_DIR = path.join(os.homedir(), '.claude', 'skill-hub')
const IGNORED_FILE = path.join(STORE_DIR, 'ignored-pairs.json')

interface IgnoredPair {
  a: string
  b: string
  ignoredAt: string
}

async function loadIgnored(): Promise<IgnoredPair[]> {
  try {
    const raw = await fs.readFile(IGNORED_FILE, 'utf-8')
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

async function saveIgnored(list: IgnoredPair[]): Promise<void> {
  await fs.mkdir(STORE_DIR, { recursive: true })
  await fs.writeFile(IGNORED_FILE, JSON.stringify(list, null, 2), 'utf-8')
}

export async function similarityRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { threshold?: string } }>('/api/similar', async (req) => {
    let result = getCachedResult()
    if (!result) result = await fullScan()

    const ignored = await loadIgnored()
    const threshold = req.query.threshold ? parseFloat(req.query.threshold) : 0.25

    const groups = detectSimilarSkills(result.skills, {
      threshold,
      ignoredPairs: ignored.map((p) => [p.a, p.b] as [string, string]),
    })

    return {
      threshold,
      ignoredCount: ignored.length,
      groups,
    }
  })

  app.post<{ Body: { a: string; b: string } }>('/api/similar/ignore', async (req, reply) => {
    const { a, b } = req.body || ({} as any)
    if (!a || !b) {
      return reply.status(400).send({ error: 'Missing skill ids (a, b)' })
    }
    const list = await loadIgnored()
    // Normalize so (a,b) and (b,a) are the same record
    const [x, y] = a < b ? [a, b] : [b, a]
    if (!list.some((p) => p.a === x && p.b === y)) {
      list.push({ a: x, b: y, ignoredAt: new Date().toISOString() })
      await saveIgnored(list)
    }
    return { ok: true, ignoredCount: list.length }
  })

  app.post<{ Body: { a: string; b: string } }>('/api/similar/unignore', async (req, reply) => {
    const { a, b } = req.body || ({} as any)
    if (!a || !b) {
      return reply.status(400).send({ error: 'Missing skill ids (a, b)' })
    }
    const list = await loadIgnored()
    const [x, y] = a < b ? [a, b] : [b, a]
    const next = list.filter((p) => !(p.a === x && p.b === y))
    if (next.length !== list.length) await saveIgnored(next)
    return { ok: true, ignoredCount: next.length }
  })

  app.get('/api/similar/ignored', async () => {
    return { ignored: await loadIgnored() }
  })
}
