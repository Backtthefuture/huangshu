import fs from 'fs/promises'
import path from 'path'
import os from 'os'
import crypto from 'crypto'
import { parseSkillMd, listSkillFiles, getSkillMdPath } from './parser.js'
import { resolveSymlink, identifySource } from './symlink.js'
import type { Skill, Project, ConflictGroup, ScanResult } from '../types.js'

const homedir = os.homedir()

function makeId(p: string): string {
  return crypto.createHash('md5').update(p).digest('hex').slice(0, 12)
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

    // Resolve the entry first (might be symlink to a directory)
    const symlinkInfo = await resolveSymlink(entryPath)
    const realPath = symlinkInfo.realPath

    // Check if it's a directory (or symlink to directory)
    let isDir = false
    try {
      const stat = await fs.stat(realPath)
      isDir = stat.isDirectory()
    } catch {
      continue
    }

    if (!isDir) continue

    // Look for SKILL.md
    const skillMdPath = getSkillMdPath(realPath)
    let skillMdExists = false
    try {
      await fs.access(skillMdPath)
      skillMdExists = true
    } catch {}

    // Also check if there's a .md file directly (some skills are just .md files)
    if (!skillMdExists) {
      // Check for any .md files in the directory
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
      } catch {
        // If parse fails, still include the skill with basic info
      }
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

    const skillName = (frontmatter as any).name || entry.name
    const description = (frontmatter as any).description || ''

    skills.push({
      id: makeId(entryPath),
      name: skillName,
      description,
      scope,
      source,
      path: entryPath,
      realPath,
      symlinkTarget: symlinkInfo.isSymlink ? symlinkInfo.target : undefined,
      projectName,
      projectPath,
      frontmatter: frontmatter as any,
      content: rawContent || content,
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

async function discoverProjects(): Promise<{ name: string; path: string }[]> {
  const projects: { name: string; path: string }[] = []

  // 1. Read ~/.claude/projects/ to find known projects
  const projectsDir = path.join(homedir, '.claude', 'projects')
  try {
    const entries = await fs.readdir(projectsDir, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      // The directory name is a mangled path like -Users-foo-myproject
      const projectPath = entry.name.replace(/^-/, '/').replace(/-/g, '/')
      if (await dirExists(projectPath)) {
        // Skip home directory — its skills are already counted as global
        if (projectPath === homedir) continue
        const skillsDir = path.join(projectPath, '.claude', 'skills')
        if (await dirExists(skillsDir)) {
          projects.push({
            name: path.basename(projectPath),
            path: projectPath,
          })
        }
      }
    }
  } catch {}

  // 2. Also scan common directories for .claude/skills
  const commonDirs = [
    path.join(homedir, 'Documents'),
    path.join(homedir, 'Projects'),
    path.join(homedir, 'Developer'),
    path.join(homedir, 'Code'),
    path.join(homedir, 'workspace'),
  ]

  for (const dir of commonDirs) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true })
      for (const entry of entries) {
        if (!entry.isDirectory()) continue
        const projectPath = path.join(dir, entry.name)
        const skillsDir = path.join(projectPath, '.claude', 'skills')
        if (await dirExists(skillsDir)) {
          // Avoid duplicates
          if (!projects.some((p) => p.path === projectPath)) {
            projects.push({
              name: entry.name,
              path: projectPath,
            })
          }
        }
      }
    } catch {}
  }

  return projects
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

export async function fullScan(): Promise<ScanResult> {
  const disabledSkills = await getDisabledSkills()
  const allSkills: Skill[] = []

  // 1. Scan global skills
  const globalDir = path.join(homedir, '.claude', 'skills')
  const globalSkills = await scanSkillDir(globalDir, 'global', undefined, undefined, disabledSkills)
  allSkills.push(...globalSkills)

  // 2. Discover and scan project-level skills
  const discoveredProjects = await discoverProjects()
  const projects: Project[] = []

  for (const proj of discoveredProjects) {
    const skillsDir = path.join(proj.path, '.claude', 'skills')
    const projectSkills = await scanSkillDir(skillsDir, 'project', proj.name, proj.path, disabledSkills)
    allSkills.push(...projectSkills)
    projects.push({
      name: proj.name,
      path: proj.path,
      skillCount: projectSkills.length,
    })
  }

  // 3. Detect conflicts
  const conflicts = detectConflicts(allSkills)

  // 4. Compute stats
  const bySource: Record<string, number> = {}
  for (const s of allSkills) {
    bySource[s.source] = (bySource[s.source] || 0) + 1
  }

  return {
    skills: allSkills,
    projects,
    conflicts,
    stats: {
      total: allSkills.length,
      global: allSkills.filter((s) => s.scope === 'global').length,
      project: allSkills.filter((s) => s.scope === 'project').length,
      bySource,
    },
  }
}
