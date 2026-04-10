import type { FastifyInstance } from 'fastify'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'
import { invalidateCache } from './skills.js'
import { createSnapshot } from '../versioning/store.js'

const homedir = os.homedir()
const settingsPath = path.join(homedir, '.claude', 'settings.json')

async function readSettings(): Promise<any> {
  try {
    const raw = await fs.readFile(settingsPath, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

async function writeSettings(settings: any): Promise<void> {
  await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2), 'utf-8')
}

export async function manageRoutes(app: FastifyInstance) {
  // Toggle skill enabled/disabled
  app.put<{
    Params: { id: string }
    Body: { enabled: boolean; skillName: string }
  }>('/api/skills/:id/toggle', async (req) => {
    const { enabled, skillName } = req.body
    const settings = await readSettings()

    if (!settings.permissions) settings.permissions = {}
    if (!settings.permissions.deny) settings.permissions.deny = []

    const rule = `Skill(${skillName})`
    const idx = settings.permissions.deny.indexOf(rule)

    if (enabled && idx >= 0) {
      // Remove from deny list to enable
      settings.permissions.deny.splice(idx, 1)
    } else if (!enabled && idx < 0) {
      // Add to deny list to disable
      settings.permissions.deny.push(rule)
    }

    await writeSettings(settings)
    invalidateCache()
    return { ok: true, enabled }
  })

  // Update SKILL.md content
  app.put<{
    Params: { id: string }
    Body: { realPath: string; content: string }
  }>('/api/skills/:id/content', async (req) => {
    const { realPath, content } = req.body
    const skillMdPath = path.join(realPath, 'SKILL.md')

    // Verify the file exists
    try {
      await fs.access(skillMdPath)
    } catch {
      return { ok: false, error: 'SKILL.md not found' }
    }

    // Auto-snapshot before overwriting (save the old version)
    const skillName = path.basename(realPath)
    try {
      await createSnapshot(realPath, skillName, '编辑前自动备份', 'auto')
    } catch {}

    await fs.writeFile(skillMdPath, content, 'utf-8')

    // Snapshot the new version
    try {
      await createSnapshot(realPath, skillName, '通过编辑器保存', 'auto')
    } catch {}

    invalidateCache()
    return { ok: true }
  })

  // Copy skill to another location
  app.post<{
    Body: {
      sourcePath: string
      targetScope: 'global' | 'project'
      projectPath?: string
      skillName: string
    }
  }>('/api/skills/copy', async (req) => {
    const { sourcePath, targetScope, projectPath, skillName } = req.body

    let targetDir: string
    if (targetScope === 'global') {
      targetDir = path.join(homedir, '.claude', 'skills', skillName)
    } else if (projectPath) {
      targetDir = path.join(projectPath, '.claude', 'skills', skillName)
    } else {
      return { ok: false, error: 'Project path required for project scope' }
    }

    // Resolve source if symlink
    let realSource: string
    try {
      realSource = await fs.realpath(sourcePath)
    } catch {
      realSource = sourcePath
    }

    // Check if target already exists
    try {
      await fs.access(targetDir)
      return { ok: false, error: '目标位置已存在同名 Skill' }
    } catch {
      // Good — doesn't exist
    }

    // Copy directory recursively
    await copyDir(realSource, targetDir)
    invalidateCache()
    return { ok: true, targetDir }
  })

  // Move skill (copy + delete source)
  app.post<{
    Body: {
      sourcePath: string
      targetScope: 'global' | 'project'
      projectPath?: string
      skillName: string
    }
  }>('/api/skills/move', async (req) => {
    const { sourcePath, targetScope, projectPath, skillName } = req.body

    let targetDir: string
    if (targetScope === 'global') {
      targetDir = path.join(homedir, '.claude', 'skills', skillName)
    } else if (projectPath) {
      targetDir = path.join(projectPath, '.claude', 'skills', skillName)
    } else {
      return { ok: false, error: 'Project path required for project scope' }
    }

    let realSource: string
    try {
      realSource = await fs.realpath(sourcePath)
    } catch {
      realSource = sourcePath
    }

    try {
      await fs.access(targetDir)
      return { ok: false, error: '目标位置已存在同名 Skill' }
    } catch {}

    await copyDir(realSource, targetDir)

    // Remove the source (if symlink, just remove the link; if dir, remove recursively)
    const stat = await fs.lstat(sourcePath)
    if (stat.isSymbolicLink()) {
      await fs.unlink(sourcePath)
    } else {
      await fs.rm(sourcePath, { recursive: true })
    }

    invalidateCache()
    return { ok: true, targetDir }
  })

  // Delete skill
  app.delete<{
    Params: { id: string }
    Body: { path: string }
  }>('/api/skills/:id', async (req) => {
    const skillPath = req.body.path

    const stat = await fs.lstat(skillPath)
    if (stat.isSymbolicLink()) {
      await fs.unlink(skillPath)
    } else {
      await fs.rm(skillPath, { recursive: true })
    }

    invalidateCache()
    return { ok: true }
  })
}

async function copyDir(src: string, dest: string): Promise<void> {
  await fs.mkdir(dest, { recursive: true })
  const entries = await fs.readdir(src, { withFileTypes: true })
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath)
    } else {
      await fs.copyFile(srcPath, destPath)
    }
  }
}
