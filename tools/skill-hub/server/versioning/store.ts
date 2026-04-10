/**
 * Skill Version Store
 *
 * 设计思路：类 Git 的轻量级版本管理
 * - 每个 Skill 的版本存储在 ~/.skill-hub/versions/<skill-hash>/
 * - 每个版本是一个 JSON 文件，包含完整快照 + 元数据
 * - 支持：创建快照、查看历史、对比 diff、回滚
 */
import fs from 'fs/promises'
import path from 'path'
import os from 'os'
import crypto from 'crypto'

const STORE_ROOT = path.join(os.homedir(), '.skill-hub', 'versions')

export interface VersionMeta {
  id: string            // 短 hash，类似 git commit id
  skillPath: string     // Skill 的原始路径
  skillName: string
  timestamp: string     // ISO 时间
  message: string       // 版本描述（类似 commit message）
  source: 'auto' | 'manual'  // 自动快照 or 手动保存
  contentHash: string   // 内容指纹，用于判断是否有变化
}

export interface Version extends VersionMeta {
  content: string       // SKILL.md 完整内容
  files: Record<string, string>  // 其他文件快照 { filename: content }
}

export interface DiffLine {
  type: 'add' | 'remove' | 'same'
  lineNumber: { old?: number; new?: number }
  content: string
}

export interface DiffResult {
  oldVersion: VersionMeta
  newVersion: VersionMeta
  lines: DiffLine[]
  stats: { additions: number; deletions: number; unchanged: number }
}

// --- Helpers ---

function skillHash(skillPath: string): string {
  return crypto.createHash('md5').update(skillPath).digest('hex').slice(0, 12)
}

function versionId(): string {
  const now = Date.now().toString(36)
  const rand = crypto.randomBytes(3).toString('hex')
  return `${now}-${rand}`
}

function contentHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex').slice(0, 16)
}

function storeDir(skillPath: string): string {
  return path.join(STORE_ROOT, skillHash(skillPath))
}

// --- File helpers ---

/**
 * 递归读取目录下所有文本文件，key 为相对路径
 */
async function readDirRecursive(
  baseDir: string,
  currentDir: string,
  result: Record<string, string>,
): Promise<void> {
  let entries: Awaited<ReturnType<typeof fs.readdir>>
  try {
    entries = await fs.readdir(currentDir, { withFileTypes: true })
  } catch {
    return
  }
  for (const entry of entries) {
    const fullPath = path.join(currentDir, entry.name)
    const relPath = path.relative(baseDir, fullPath)
    if (entry.isDirectory()) {
      // 跳过 .git 等隐藏目录
      if (entry.name.startsWith('.')) continue
      await readDirRecursive(baseDir, fullPath, result)
    } else if (entry.isFile() && relPath !== 'SKILL.md') {
      try {
        const buf = await fs.readFile(fullPath)
        // 简单判断是否为文本：检查前 8KB 有无 NULL 字节
        const sample = buf.subarray(0, 8192)
        if (!sample.includes(0)) {
          result[relPath] = buf.toString('utf-8')
        }
      } catch {
        // 跳过无法读取的文件
      }
    }
  }
}

/**
 * 递归恢复文件，key 为相对路径（含子目录）
 */
async function restoreFiles(
  baseDir: string,
  files: Record<string, string>,
): Promise<void> {
  for (const [relPath, fileContent] of Object.entries(files)) {
    const fullPath = path.join(baseDir, relPath)
    // 确保父目录存在
    await fs.mkdir(path.dirname(fullPath), { recursive: true })
    await fs.writeFile(fullPath, fileContent, 'utf-8')
  }
}

// --- Core API ---

export async function initStore(): Promise<void> {
  await fs.mkdir(STORE_ROOT, { recursive: true })
}

/**
 * 创建一个版本快照
 */
export async function createSnapshot(
  skillPath: string,
  skillName: string,
  message: string,
  source: 'auto' | 'manual' = 'manual',
): Promise<VersionMeta> {
  await initStore()

  const dir = storeDir(skillPath)
  await fs.mkdir(dir, { recursive: true })

  // 读取当前 SKILL.md
  let realPath: string
  try {
    realPath = await fs.realpath(skillPath)
  } catch {
    realPath = skillPath
  }

  const skillMdPath = path.join(realPath, 'SKILL.md')
  let content = ''
  try {
    content = await fs.readFile(skillMdPath, 'utf-8')
  } catch {
    throw new Error('SKILL.md not found')
  }

  // 递归读取整个目录下所有文本文件
  const files: Record<string, string> = {}
  await readDirRecursive(realPath, realPath, files)

  const cHash = contentHash(content + JSON.stringify(files))

  // 检查是否和最新版本相同（避免重复快照）
  const history = await getHistory(skillPath)
  if (history.length > 0 && history[0].contentHash === cHash) {
    return history[0] // 内容没变，返回最新版本
  }

  const id = versionId()
  const version: Version = {
    id,
    skillPath,
    skillName,
    timestamp: new Date().toISOString(),
    message,
    source,
    contentHash: cHash,
    content,
    files,
  }

  await fs.writeFile(
    path.join(dir, `${id}.json`),
    JSON.stringify(version, null, 2),
    'utf-8',
  )

  return {
    id: version.id,
    skillPath: version.skillPath,
    skillName: version.skillName,
    timestamp: version.timestamp,
    message: version.message,
    source: version.source,
    contentHash: version.contentHash,
  }
}

/**
 * 获取版本历史（按时间倒序）
 */
export async function getHistory(skillPath: string): Promise<VersionMeta[]> {
  const dir = storeDir(skillPath)
  let entries: string[]
  try {
    entries = await fs.readdir(dir)
  } catch {
    return []
  }

  const versions: VersionMeta[] = []
  for (const file of entries) {
    if (!file.endsWith('.json')) continue
    try {
      const raw = await fs.readFile(path.join(dir, file), 'utf-8')
      const v: Version = JSON.parse(raw)
      versions.push({
        id: v.id,
        skillPath: v.skillPath,
        skillName: v.skillName,
        timestamp: v.timestamp,
        message: v.message,
        source: v.source,
        contentHash: v.contentHash,
      })
    } catch {}
  }

  return versions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
}

/**
 * 获取某个版本的完整内容
 */
export async function getVersion(skillPath: string, versionId: string): Promise<Version | null> {
  const dir = storeDir(skillPath)
  const filePath = path.join(dir, `${versionId}.json`)
  try {
    const raw = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return null
  }
}

/**
 * 对比两个版本的 diff
 */
export async function diffVersions(
  skillPath: string,
  oldId: string,
  newId: string,
): Promise<DiffResult | null> {
  const oldVer = await getVersion(skillPath, oldId)
  const newVer = await getVersion(skillPath, newId)
  if (!oldVer || !newVer) return null

  const lines = computeDiff(oldVer.content, newVer.content)
  const stats = {
    additions: lines.filter((l) => l.type === 'add').length,
    deletions: lines.filter((l) => l.type === 'remove').length,
    unchanged: lines.filter((l) => l.type === 'same').length,
  }

  return {
    oldVersion: { id: oldVer.id, skillPath: oldVer.skillPath, skillName: oldVer.skillName, timestamp: oldVer.timestamp, message: oldVer.message, source: oldVer.source, contentHash: oldVer.contentHash },
    newVersion: { id: newVer.id, skillPath: newVer.skillPath, skillName: newVer.skillName, timestamp: newVer.timestamp, message: newVer.message, source: newVer.source, contentHash: newVer.contentHash },
    lines,
    stats,
  }
}

/**
 * 对比当前文件和某个版本的 diff
 */
export async function diffWithCurrent(
  skillPath: string,
  versionId: string,
): Promise<DiffResult | null> {
  const ver = await getVersion(skillPath, versionId)
  if (!ver) return null

  let realPath: string
  try {
    realPath = await fs.realpath(skillPath)
  } catch {
    realPath = skillPath
  }

  let currentContent = ''
  try {
    currentContent = await fs.readFile(path.join(realPath, 'SKILL.md'), 'utf-8')
  } catch {
    return null
  }

  const lines = computeDiff(ver.content, currentContent)
  const stats = {
    additions: lines.filter((l) => l.type === 'add').length,
    deletions: lines.filter((l) => l.type === 'remove').length,
    unchanged: lines.filter((l) => l.type === 'same').length,
  }

  return {
    oldVersion: { id: ver.id, skillPath: ver.skillPath, skillName: ver.skillName, timestamp: ver.timestamp, message: ver.message, source: ver.source, contentHash: ver.contentHash },
    newVersion: { id: 'current', skillPath, skillName: ver.skillName, timestamp: new Date().toISOString(), message: '当前版本', source: 'auto', contentHash: contentHash(currentContent) },
    lines,
    stats,
  }
}

/**
 * 回滚到指定版本
 */
export async function rollback(skillPath: string, versionId: string): Promise<boolean> {
  const ver = await getVersion(skillPath, versionId)
  if (!ver) return false

  let realPath: string
  try {
    realPath = await fs.realpath(skillPath)
  } catch {
    realPath = skillPath
  }

  // 先对当前状态创建一个自动快照（回滚前的安全网）
  try {
    await createSnapshot(skillPath, ver.skillName, `回滚前自动备份 (回滚目标: ${versionId})`, 'auto')
  } catch {}

  // 恢复 SKILL.md
  await fs.writeFile(path.join(realPath, 'SKILL.md'), ver.content, 'utf-8')

  // 恢复其他文件（含子目录）
  await restoreFiles(realPath, ver.files)

  // 创建回滚后的快照
  await createSnapshot(skillPath, ver.skillName, `回滚到版本 ${versionId}`, 'auto')

  return true
}

/**
 * 删除某个版本
 */
export async function deleteVersion(skillPath: string, versionId: string): Promise<boolean> {
  const dir = storeDir(skillPath)
  try {
    await fs.unlink(path.join(dir, `${versionId}.json`))
    return true
  } catch {
    return false
  }
}

// --- Diff Algorithm (Myers-like simplified) ---

function computeDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split('\n')
  const newLines = newText.split('\n')
  const result: DiffLine[] = []

  // LCS-based diff
  const lcs = longestCommonSubsequence(oldLines, newLines)

  let oi = 0
  let ni = 0
  let li = 0

  while (oi < oldLines.length || ni < newLines.length) {
    if (li < lcs.length && oi < oldLines.length && ni < newLines.length && oldLines[oi] === lcs[li] && newLines[ni] === lcs[li]) {
      result.push({ type: 'same', lineNumber: { old: oi + 1, new: ni + 1 }, content: oldLines[oi] })
      oi++
      ni++
      li++
    } else if (oi < oldLines.length && (li >= lcs.length || oldLines[oi] !== lcs[li])) {
      result.push({ type: 'remove', lineNumber: { old: oi + 1 }, content: oldLines[oi] })
      oi++
    } else if (ni < newLines.length && (li >= lcs.length || newLines[ni] !== lcs[li])) {
      result.push({ type: 'add', lineNumber: { new: ni + 1 }, content: newLines[ni] })
      ni++
    }
  }

  return result
}

function longestCommonSubsequence(a: string[], b: string[]): string[] {
  const m = a.length
  const n = b.length

  // Optimize for large files: limit to first 2000 lines
  const maxLen = 2000
  const aa = a.slice(0, maxLen)
  const bb = b.slice(0, maxLen)
  const mm = aa.length
  const nn = bb.length

  const dp: number[][] = Array.from({ length: mm + 1 }, () => Array(nn + 1).fill(0))

  for (let i = 1; i <= mm; i++) {
    for (let j = 1; j <= nn; j++) {
      if (aa[i - 1] === bb[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }

  // Backtrack
  const result: string[] = []
  let i = mm
  let j = nn
  while (i > 0 && j > 0) {
    if (aa[i - 1] === bb[j - 1]) {
      result.unshift(aa[i - 1])
      i--
      j--
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--
    } else {
      j--
    }
  }

  return result
}
