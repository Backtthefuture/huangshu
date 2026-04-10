import fs from 'fs/promises'
import path from 'path'
import matter from 'gray-matter'
import type { SkillFrontmatter } from '../types.js'

export interface ParsedSkill {
  frontmatter: SkillFrontmatter
  content: string
  rawContent: string
}

export async function parseSkillMd(skillMdPath: string): Promise<ParsedSkill> {
  const raw = await fs.readFile(skillMdPath, 'utf-8')
  const { data, content } = matter(raw)

  return {
    frontmatter: data as SkillFrontmatter,
    content: content.trim(),
    rawContent: raw,
  }
}

export async function listSkillFiles(skillDir: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(skillDir, { withFileTypes: true })
    return entries
      .filter((e) => e.isFile())
      .map((e) => e.name)
  } catch {
    return []
  }
}

export function getSkillMdPath(skillDir: string): string {
  return path.join(skillDir, 'SKILL.md')
}
