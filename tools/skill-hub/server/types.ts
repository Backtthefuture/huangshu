export interface SkillFrontmatter {
  name?: string
  description?: string
  'allowed-tools'?: string
  model?: string
  effort?: string
  'user-invocable'?: boolean
  'disable-model-invocation'?: boolean
  context?: string
  agent?: string
  paths?: string[]
  shell?: string
  'argument-hint'?: string
}

export interface Skill {
  id: string
  name: string
  description: string
  scope: 'global' | 'project' | 'plugin'
  source: 'local' | 'newmax' | 'agents' | 'symlink' | 'unknown'
  path: string
  realPath: string
  symlinkTarget?: string
  projectName?: string
  projectPath?: string
  frontmatter: SkillFrontmatter
  content: string
  files: string[]
  enabled: boolean
  hasConflict: boolean
  lastModified: string
}

export interface Project {
  name: string
  path: string
  skillCount: number
}

export interface ConflictGroup {
  name: string
  skills: Skill[]
}

export interface ScanResult {
  skills: Skill[]
  projects: Project[]
  conflicts: ConflictGroup[]
  stats: {
    total: number
    global: number
    project: number
    bySource: Record<string, number>
  }
}
