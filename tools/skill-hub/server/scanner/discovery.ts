import fs from 'fs/promises'
import path from 'path'
import os from 'os'
import crypto from 'crypto'
import { parseSkillMd, listSkillFiles, getSkillMdPath } from './parser.js'
import { resolveSymlink, identifySource } from './symlink.js'
import {
  AGENTS,
  allAgentGlobalAbsPaths,
  allAgentProjectRelPaths,
  isValidAgentId,
  type AgentId,
} from './agents.js'
import type { Skill, Project, ConflictGroup, ScanResult, ScanPathReport } from '../types.js'

const homedir = os.homedir()

function makeId(p: string): string {
  return crypto.createHash('md5').update(p).digest('hex').slice(0, 12)
}

/**
 * YAML frontmatter can legitimately parse `name` / `description` / `model`
 * fields as non-string values (numbers, booleans, objects, arrays). If we let
 * those through, React renders them and throws error #31. Force-coerce every
 * value that the UI is going to render.
 */
function toSafeString(v: unknown): string {
  if (v == null) return ''
  if (typeof v === 'string') return v
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  if (Array.isArray(v)) return v.map(toSafeString).join(', ')
  if (typeof v === 'object') {
    try {
      return JSON.stringify(v)
    } catch {
      return '[object]'
    }
  }
  return String(v)
}

function sanitizeFrontmatter(fm: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(fm)) {
    // Keep arrays/objects as-is for fields the UI treats as data (e.g. `paths`),
    // but coerce the ones we know get rendered as plain text.
    if (k === 'name' || k === 'description' || k === 'model' || k === 'effort' || k === 'agent' || k === 'context') {
      out[k] = toSafeString(v)
    } else {
      out[k] = v
    }
  }
  return out
}

async function dirExists(p: string): Promise<boolean> {
  try {
    const s = await fs.stat(p)
    return s.isDirectory()
  } catch {
    return false
  }
}

async function scanSkillDir(
  skillDir: string,
  scope: 'global' | 'project' | 'plugin',
  agent: AgentId,
  projectName?: string,
  projectPath?: string,
  disabledSkills?: Set<string>,
): Promise<Skill[]> {
  const skills: Skill[] = []

  let entries: Awaited<ReturnType<typeof fs.readdir>>
  try {
    entries = await fs.readdir(skillDir, { withFileTypes: true })
  } catch {
    return skills
  }

  for (const entry of entries) {
    const entryPath = path.join(skillDir, entry.name)

    const symlinkInfo = await resolveSymlink(entryPath)
    const realPath = symlinkInfo.realPath

    let isDir = false
    try {
      const stat = await fs.stat(realPath)
      isDir = stat.isDirectory()
    } catch {
      continue
    }

    if (!isDir) continue

    const skillMdPath = getSkillMdPath(realPath)
    let skillMdExists = false
    try {
      await fs.access(skillMdPath)
      skillMdExists = true
    } catch {}

    if (!skillMdExists) {
      const files = await listSkillFiles(realPath)
      if (files.length === 0) continue
    }

    let frontmatter = {}
    let content = ''
    let rawContent = ''

    if (skillMdExists) {
      try {
        const parsed = await parseSkillMd(skillMdPath)
        frontmatter = parsed.frontmatter
        content = parsed.content
        rawContent = parsed.rawContent
      } catch {}
    }

    const files = await listSkillFiles(realPath)
    const source = symlinkInfo.isSymlink
      ? identifySource(realPath, homedir)
      : 'local'

    let lastModified = new Date().toISOString()
    try {
      const stat = await fs.stat(skillMdExists ? skillMdPath : realPath)
      lastModified = stat.mtime.toISOString()
    } catch {}

    const safeFrontmatter = sanitizeFrontmatter(frontmatter as Record<string, unknown>)
    const skillName = toSafeString((safeFrontmatter as any).name) || entry.name
    const description = toSafeString((safeFrontmatter as any).description)

    // Frontmatter `agent:` overrides the path-based guess when it's a known id.
    const fmAgent = toSafeString((safeFrontmatter as any).agent).toLowerCase().trim()
    const resolvedAgent: AgentId = fmAgent && isValidAgentId(fmAgent) ? fmAgent : agent

    skills.push({
      id: makeId(entryPath),
      name: skillName,
      description,
      scope,
      agent: resolvedAgent,
      source,
      path: entryPath,
      realPath,
      symlinkTarget: symlinkInfo.isSymlink ? symlinkInfo.target : undefined,
      projectName,
      projectPath,
      frontmatter: safeFrontmatter as any,
      content: toSafeString(rawContent || content),
      files,
      enabled: disabledSkills ? !disabledSkills.has(skillName) : true,
      hasConflict: false,
      lastModified,
    })
  }

  return skills
}

async function getDisabledSkills(): Promise<Set<string>> {
  const disabled = new Set<string>()
  const settingsPath = path.join(homedir, '.claude', 'settings.json')
  try {
    const raw = await fs.readFile(settingsPath, 'utf-8')
    const settings = JSON.parse(raw)
    const deny = settings?.permissions?.deny || []
    for (const rule of deny) {
      const match = rule.match(/^Skill\((.+)\)$/)
      if (match) disabled.add(match[1])
    }
  } catch {}
  return disabled
}

async function hasAnyAgentSkills(projectRoot: string): Promise<boolean> {
  for (const rel of allAgentProjectRelPaths()) {
    if (await dirExists(path.join(projectRoot, rel))) return true
  }
  return false
}

async function discoverProjects(): Promise<{ name: string; path: string }[]> {
  const projects: { name: string; path: string }[] = []

  // 1. ~/.claude/projects/ (mangled path dirs — Claude tracks projects it's been opened in)
  const projectsDir = path.join(homedir, '.claude', 'projects')
  try {
    const entries = await fs.readdir(projectsDir, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      const projectPath = entry.name.replace(/^-/, '/').replace(/-/g, '/')
      if (await dirExists(projectPath)) {
        if (projectPath === homedir) continue
        if (await hasAnyAgentSkills(projectPath)) {
          projects.push({
            name: path.basename(projectPath),
            path: projectPath,
          })
        }
      }
    }
  } catch {}

  // 2. Common project root dirs — expanded list
  const commonDirs = [
    path.join(homedir, 'Documents'),
    path.join(homedir, 'Projects'),
    path.join(homedir, 'Developer'),
    path.join(homedir, 'Code'),
    path.join(homedir, 'code'),
    path.join(homedir, 'workspace'),
    path.join(homedir, 'dev'),
    path.join(homedir, 'Dev'),
    path.join(homedir, 'work'),
    path.join(homedir, 'repos'),
    path.join(homedir, 'src'),
  ]

  for (const dir of commonDirs) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true })
      for (const entry of entries) {
        if (!entry.isDirectory()) continue
        const projectPath = path.join(dir, entry.name)
        if (await hasAnyAgentSkills(projectPath)) {
          if (!projects.some((p) => p.path === projectPath)) {
            projects.push({ name: entry.name, path: projectPath })
          }
        }
      }
    } catch {}
  }

  // 3. CWD + walk up 3 levels
  let cwd = process.cwd()
  for (let i = 0; i < 4; i++) {
    if (await hasAnyAgentSkills(cwd)) {
      if (!projects.some((p) => p.path === cwd)) {
        projects.push({ name: path.basename(cwd) + ' (cwd)', path: cwd })
      }
    }
    const parent = path.dirname(cwd)
    if (parent === cwd) break
    cwd = parent
  }

  return projects
}

/**
 * Find every `skills/` directory that belongs to a plugin the user has
 * actually enabled.
 *
 * Claude Code tracks enabled plugins in ~/.claude/plugins/config.json under
 * `repositories`. Anything living only under ~/.claude/plugins/marketplaces/
 * is a *candidate* from a marketplace — Claude Code does not load those, they
 * are just the source catalog. Earlier versions of this scanner walked the
 * entire plugins/ tree and reported those candidates as installed plugin
 * skills, which was very confusing for users who had never enabled a plugin.
 */
async function discoverPluginSkillDirs(): Promise<string[]> {
  const result: string[] = []
  const pluginsRoot = path.join(homedir, '.claude', 'plugins')
  const configPath = path.join(pluginsRoot, 'config.json')

  // Extract installLocation of every enabled plugin.
  const installLocations: string[] = []
  try {
    const raw = await fs.readFile(configPath, 'utf-8')
    const config = JSON.parse(raw) as { repositories?: Record<string, unknown> }
    const repos = config?.repositories || {}
    for (const meta of Object.values(repos)) {
      if (meta && typeof meta === 'object') {
        const loc = (meta as { installLocation?: unknown }).installLocation
        if (typeof loc === 'string' && loc.length > 0) {
          installLocations.push(loc)
        }
      }
    }
  } catch {}

  // No plugins enabled → nothing to scan. Skip the marketplace catalog entirely.
  if (installLocations.length === 0) return result

  async function walk(dir: string, depth: number) {
    if (depth > 4) return
    let entries: Awaited<ReturnType<typeof fs.readdir>>
    try {
      entries = await fs.readdir(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      if (entry.name === 'node_modules' || entry.name.startsWith('.git')) continue
      const sub = path.join(dir, entry.name)
      if (entry.name === 'skills') {
        result.push(sub)
        continue
      }
      await walk(sub, depth + 1)
    }
  }

  // Only walk inside each enabled plugin's install location, not the whole
  // plugins/ tree.
  for (const loc of installLocations) {
    if (await dirExists(loc)) {
      await walk(loc, 0)
    }
  }

  return result
}

function detectConflicts(skills: Skill[]): ConflictGroup[] {
  const byName = new Map<string, Skill[]>()
  for (const skill of skills) {
    const existing = byName.get(skill.name) || []
    existing.push(skill)
    byName.set(skill.name, existing)
  }

  const conflicts: ConflictGroup[] = []
  for (const [name, group] of byName) {
    if (group.length > 1) {
      group.forEach((s) => (s.hasConflict = true))
      conflicts.push({ name, skills: group })
    }
  }
  return conflicts
}

function parseExtraPaths(): string[] {
  const raw = process.env.SKILL_HUB_EXTRA_PATHS
  if (!raw) return []
  return raw
    .split(/[:,]/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => (p.startsWith('~') ? path.join(homedir, p.slice(1)) : p))
}

export async function fullScan(): Promise<ScanResult> {
  const start = Date.now()
  const disabledSkills = await getDisabledSkills()
  const allSkills: Skill[] = []
  const scannedPaths: ScanPathReport[] = []

  async function scanAndReport(
    label: string,
    dir: string,
    scope: 'global' | 'project' | 'plugin',
    agent: AgentId,
    projectName?: string,
    projectPath?: string,
  ) {
    const exists = await dirExists(dir)
    if (!exists) {
      scannedPaths.push({ label, path: dir, exists: false, count: 0 })
      return []
    }
    try {
      const skills = await scanSkillDir(dir, scope, agent, projectName, projectPath, disabledSkills)
      scannedPaths.push({ label, path: dir, exists: true, count: skills.length })
      return skills
    } catch (e: any) {
      scannedPaths.push({
        label,
        path: dir,
        exists: true,
        count: 0,
        error: e?.message || String(e),
      })
      return []
    }
  }

  // 1. Global skills — loop over every agent's global paths
  for (const { agent, path: globalDir } of allAgentGlobalAbsPaths(homedir)) {
    allSkills.push(
      ...(await scanAndReport(`global:${agent.id}`, globalDir, 'global', agent.id)),
    )
  }

  // 2. Plugin skills — Claude Code only for now
  const pluginSkillDirs = await discoverPluginSkillDirs()
  for (const pluginDir of pluginSkillDirs) {
    const pluginName = path.relative(path.join(homedir, '.claude', 'plugins'), pluginDir)
    allSkills.push(
      ...(await scanAndReport(`plugin:${pluginName}`, pluginDir, 'plugin', 'claude-code')),
    )
  }

  // 3. Project skills — for each project, scan every agent's project paths
  const discoveredProjects = await discoverProjects()
  const projects: Project[] = []

  for (const proj of discoveredProjects) {
    let projectTotal = 0
    for (const agent of AGENTS) {
      for (const rel of agent.projectPaths) {
        const skillsDir = path.join(proj.path, rel)
        const projectSkills = await scanAndReport(
          `project:${proj.name}:${agent.id}`,
          skillsDir,
          'project',
          agent.id,
          proj.name,
          proj.path,
        )
        allSkills.push(...projectSkills)
        projectTotal += projectSkills.length
      }
    }
    projects.push({
      name: proj.name,
      path: proj.path,
      skillCount: projectTotal,
    })
  }

  // 4. Extra paths from SKILL_HUB_EXTRA_PATHS — agent unknown
  for (const extra of parseExtraPaths()) {
    allSkills.push(
      ...(await scanAndReport(`extra:${path.basename(extra)}`, extra, 'project', 'unknown')),
    )
  }

  // Deduplicate by realPath (symlinks can point to the same skill from multiple roots)
  const seen = new Set<string>()
  const dedupedSkills: Skill[] = []
  for (const s of allSkills) {
    if (seen.has(s.realPath)) continue
    seen.add(s.realPath)
    dedupedSkills.push(s)
  }

  const conflicts = detectConflicts(dedupedSkills)

  const bySource: Record<string, number> = {}
  const byAgent: Record<string, number> = {}
  for (const s of dedupedSkills) {
    bySource[s.source] = (bySource[s.source] || 0) + 1
    byAgent[s.agent] = (byAgent[s.agent] || 0) + 1
  }

  return {
    skills: dedupedSkills,
    projects,
    conflicts,
    stats: {
      total: dedupedSkills.length,
      global: dedupedSkills.filter((s) => s.scope === 'global').length,
      project: dedupedSkills.filter((s) => s.scope === 'project').length,
      bySource,
      byAgent,
    },
    scannedPaths,
    durationMs: Date.now() - start,
  }
}
