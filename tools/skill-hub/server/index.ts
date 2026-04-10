import Fastify from 'fastify'
import cors from '@fastify/cors'
import websocket from '@fastify/websocket'
import fastifyStatic from '@fastify/static'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import { skillRoutes } from './routes/skills.js'
import { manageRoutes } from './routes/manage.js'
import { versionRoutes } from './routes/versions.js'
import { startWatcher } from './scanner/watcher.js'
import { invalidateCache } from './routes/skills.js'
import type { WebSocket } from 'ws'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = Fastify({ logger: false })

await app.register(cors, { origin: true })
await app.register(websocket)
await app.register(skillRoutes)
await app.register(manageRoutes)
await app.register(versionRoutes)

// Health check
app.get('/api/health', async () => ({ status: 'ok' }))

// WebSocket for real-time updates
const wsClients = new Set<WebSocket>()

app.register(async function (fastify) {
  fastify.get('/ws', { websocket: true }, (socket) => {
    wsClients.add(socket)
    socket.on('close', () => wsClients.delete(socket))
  })
})

function broadcast(data: any) {
  const msg = JSON.stringify(data)
  for (const ws of wsClients) {
    if (ws.readyState === 1) {
      ws.send(msg)
    }
  }
}

// Start file watcher
let debounceTimer: ReturnType<typeof setTimeout> | null = null

startWatcher((event) => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    invalidateCache()
    broadcast({ type: 'change', event })
  }, 500)
})

// Serve built frontend static files (production mode)
// Try several possible locations for the dist/web directory
const candidates = [
  path.resolve(__dirname, '../web'),          // dist/server/ → dist/web/
  path.resolve(__dirname, '../../dist/web'),   // server/ (dev) → project/dist/web/
  path.resolve(process.cwd(), 'dist/web'),     // cwd/dist/web/
]

const staticRoot = candidates.find((p) => {
  try {
    return fs.existsSync(path.join(p, 'index.html'))
  } catch {
    return false
  }
})

if (staticRoot) {
  await app.register(fastifyStatic, {
    root: staticRoot,
    prefix: '/',
    wildcard: false,
  })

  // SPA fallback: any non-/api, non-/ws route → serve index.html
  app.setNotFoundHandler((req, reply) => {
    if (req.url.startsWith('/api') || req.url.startsWith('/ws')) {
      reply.status(404).send({ error: 'Not found' })
      return
    }
    reply.sendFile('index.html')
  })
}

const PORT = parseInt(process.env.PORT || '3456')

try {
  await app.listen({ port: PORT, host: '127.0.0.1' })
  const url = `http://localhost:${PORT}`
  console.log(`\n🚀 Claude Skill Hub running at \x1b[36m${url}\x1b[0m`)
  if (staticRoot) {
    console.log(`🌐 Web UI: \x1b[36m${url}\x1b[0m`)
  } else {
    console.log(`📡 API-only mode (no frontend built)`)
  }
  console.log(`👀 File watcher active\n`)

  // Auto-open browser unless explicitly disabled
  if (staticRoot && process.env.SKILL_HUB_NO_OPEN !== '1') {
    const { exec } = await import('child_process')
    const cmd = process.platform === 'darwin' ? 'open'
              : process.platform === 'win32' ? 'start'
              : 'xdg-open'
    exec(`${cmd} ${url}`, () => {})
  }
} catch (err) {
  console.error('Failed to start server:', err)
  process.exit(1)
}
