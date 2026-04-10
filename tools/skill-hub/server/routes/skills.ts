import type { FastifyInstance } from 'fastify'
import { fullScan } from '../scanner/discovery.js'
import type { ScanResult } from '../types.js'

let cachedResult: ScanResult | null = null

export async function skillRoutes(app: FastifyInstance) {
  // Trigger full scan
  app.get('/api/scan', async () => {
    cachedResult = await fullScan()
    return cachedResult
  })

  // Get all skills (with optional filters)
  app.get<{
    Querystring: { scope?: string; source?: string; search?: string }
  }>('/api/skills', async (req) => {
    if (!cachedResult) {
      cachedResult = await fullScan()
    }

    let skills = [...cachedResult.skills]
    const { scope, source, search } = req.query

    if (scope && scope !== 'all') {
      skills = skills.filter((s) => s.scope === scope)
    }
    if (source && source !== 'all') {
      skills = skills.filter((s) => s.source === source)
    }
    if (search) {
      const q = search.toLowerCase()
      skills = skills.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q),
      )
    }

    return { skills, stats: cachedResult.stats }
  })

  // Get single skill detail
  app.get<{ Params: { id: string } }>('/api/skills/:id', async (req, reply) => {
    if (!cachedResult) {
      cachedResult = await fullScan()
    }
    const skill = cachedResult.skills.find((s) => s.id === req.params.id)
    if (!skill) {
      return reply.status(404).send({ error: 'Skill not found' })
    }
    return skill
  })

  // Get discovered projects
  app.get('/api/projects', async () => {
    if (!cachedResult) {
      cachedResult = await fullScan()
    }
    return cachedResult.projects
  })

  // Get conflicts
  app.get('/api/conflicts', async () => {
    if (!cachedResult) {
      cachedResult = await fullScan()
    }
    return cachedResult.conflicts
  })

  // Get stats
  app.get('/api/stats', async () => {
    if (!cachedResult) {
      cachedResult = await fullScan()
    }
    return cachedResult.stats
  })
}

export function invalidateCache() {
  cachedResult = null
}
