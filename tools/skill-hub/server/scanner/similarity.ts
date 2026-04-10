import type { Skill } from '../types.js'

// Built-in synonyms — extend via ~/.claude/skill-hub/synonyms.json if needed.
const BUILTIN_SYNONYMS: Record<string, string[]> = {
  小红书: ['xhs', 'rednote', '种草', '小红薯', 'xiaohongshu'],
  视频: ['video', 'vlog', 'movie', 'mp4'],
  图片: ['image', 'img', 'picture', 'pic', 'photo'],
  飞书: ['lark', 'feishu'],
  公众号: ['wechat', 'mp', 'gzh', 'wx'],
  推特: ['twitter', 'x', 'tweet'],
  邮件: ['email', 'mail', 'gmail'],
  日报: ['daily', 'report', 'digest'],
  会议: ['meeting', 'minutes', '纪要'],
  文档: ['doc', 'document', 'markdown', 'md'],
  表格: ['sheet', 'spreadsheet', 'excel', 'xlsx', 'csv'],
  幻灯片: ['ppt', 'pptx', 'slide', 'presentation'],
  翻译: ['translate', 'translation', 'i18n'],
  生成: ['generate', 'create', 'make', '制作', '创建'],
  抓取: ['fetch', 'scrape', 'crawl', '爬取'],
  发布: ['publish', 'post', 'deploy', '推送'],
  分析: ['analyze', 'analysis', 'analytics', '拆解'],
  测试: ['test', 'testing', 'qa'],
  代码: ['code', 'coding', 'program'],
  设计: ['design', 'designer', 'ui'],
  人格: ['personality', 'mbti', 'sbti', 'persona'],
  访谈: ['interview', '采访'],
  发票: ['invoice', 'receipt', '收据'],
}

// Stop words — too common to be useful as similarity signal.
const STOP_WORDS = new Set([
  // Chinese stop tokens
  '使用', '当用', '用户', '提到', '触发', '支持', '需要', '可以', '自动', '一个', '这个', '进行',
  '工具', '技能', '功能', '场景', '命令', '文件', '内容', '数据', '信息', '结果',
  '或者', '按照', '根据', '然后', '基于', '提供', '我们', '所以', '因此', '以及',
  // English stop tokens
  'skill', 'use', 'used', 'using', 'usage', 'when', 'user', 'users', 'the', 'and', 'for', 'with',
  'from', 'this', 'that', 'these', 'those', 'can', 'any', 'all', 'auto', 'support', 'supports',
  'tool', 'tools', 'create', 'creates', 'creating', 'generate', 'generates', 'make', 'makes',
  'do', 'does', 'get', 'gets', 'set', 'sets', 'should', 'would', 'could', 'will', 'want',
  'add', 'adds', 'added', 'adding', 'need', 'needs', 'needed', 'guidance', 'guide', 'guides',
  'help', 'helps', 'helper', 'ensure', 'allow', 'allows', 'asks', 'ask', 'asked',
  'mention', 'mentions', 'mentioned', 'provide', 'provides', 'provided', 'request', 'requests',
  'requested', 'include', 'includes', 'included', 'contains', 'content', 'text', 'task',
  'tasks', 'file', 'files', 'code', 'new', 'each', 'also', 'other', 'over', 'into', 'more',
  'most', 'some', 'such', 'than', 'only', 'very', 'like', 'just', 'between', 'based',
  'handle', 'handles', 'handled', 'process', 'processing', 'processed', 'system', 'systems',
])

/**
 * Normalize a raw token into its canonical form using the synonym table.
 * Everything is lowercased; Chinese is left as-is.
 */
function buildSynonymIndex(synonyms: Record<string, string[]>): Map<string, string> {
  const index = new Map<string, string>()
  for (const [canonical, aliases] of Object.entries(synonyms)) {
    index.set(canonical.toLowerCase(), canonical.toLowerCase())
    for (const a of aliases) {
      index.set(a.toLowerCase(), canonical.toLowerCase())
    }
  }
  return index
}

/**
 * Tokenize a string into a set of normalized tokens.
 * - English: split on non-word; drop short/stopword
 * - Chinese (CJK range): generate character bigrams so "小红书" contributes
 *   "小红" + "红书" tokens that can match against the "小红书" synonym key after merging.
 *   Also emit the full 3-gram when possible.
 */
export function tokenize(text: string, synonymIndex: Map<string, string>): Set<string> {
  const out = new Set<string>()
  if (!text) return out
  const lower = text.toLowerCase()

  // 1. English / ASCII words
  const words = lower.match(/[a-z][a-z0-9_-]{1,}/g) || []
  for (const w of words) {
    if (STOP_WORDS.has(w)) continue
    if (w.length < 3) continue
    out.add(synonymIndex.get(w) || w)
  }

  // 2. Chinese n-grams (bigram + trigram on CJK spans)
  const cjkSpans = lower.match(/[\u4e00-\u9fff]+/g) || []
  for (const span of cjkSpans) {
    // Try to match synonym keys first by sliding full length
    for (const key of synonymIndex.keys()) {
      if (/^[\u4e00-\u9fff]+$/.test(key) && span.includes(key)) {
        out.add(synonymIndex.get(key)!)
      }
    }
    // Bigrams
    for (let i = 0; i < span.length - 1; i++) {
      const bg = span.slice(i, i + 2)
      if (STOP_WORDS.has(bg)) continue
      out.add(bg)
    }
  }

  return out
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0
  let intersect = 0
  for (const x of a) if (b.has(x)) intersect++
  const union = a.size + b.size - intersect
  return union === 0 ? 0 : intersect / union
}

export interface SimilarityPair {
  a: Skill
  b: Skill
  score: number
  sharedTokens: string[]
}

export interface SimilarityGroup {
  id: string
  skills: Skill[]
  sharedTokens: string[]
  averageSimilarity: number
}

export interface SimilarityOptions {
  threshold?: number
  extraSynonyms?: Record<string, string[]>
  ignoredPairs?: Array<[string, string]> // pairs of skill ids
}

/**
 * Build a skill → signature token set, using name + description + frontmatter.keywords.
 */
function signatureFor(
  skill: Skill,
  synonymIndex: Map<string, string>,
): Set<string> {
  const parts: string[] = []
  parts.push(skill.name)
  if (skill.description) parts.push(skill.description)
  const kw = (skill.frontmatter as any)?.keywords
  if (Array.isArray(kw)) parts.push(kw.join(' '))
  return tokenize(parts.join(' '), synonymIndex)
}

/**
 * Cluster skills into similarity groups via single-linkage clustering over
 * pairs whose Jaccard similarity exceeds the threshold.
 */
export function detectSimilarSkills(
  skills: Skill[],
  options: SimilarityOptions = {},
): SimilarityGroup[] {
  const threshold = options.threshold ?? 0.25
  const synonyms = { ...BUILTIN_SYNONYMS, ...(options.extraSynonyms || {}) }
  const synonymIndex = buildSynonymIndex(synonyms)

  const ignored = new Set<string>()
  for (const [a, b] of options.ignoredPairs || []) {
    ignored.add(a < b ? `${a}|${b}` : `${b}|${a}`)
  }

  // 1. Compute signatures
  const sigs = new Map<string, Set<string>>()
  for (const s of skills) {
    sigs.set(s.id, signatureFor(s, synonymIndex))
  }

  // 2. Collect pairs above threshold. Skip exact-name duplicates (already shown as conflicts).
  const pairs: SimilarityPair[] = []
  for (let i = 0; i < skills.length; i++) {
    for (let j = i + 1; j < skills.length; j++) {
      const a = skills[i]
      const b = skills[j]
      if (a.name === b.name) continue // covered by conflict detection
      const pairKey = a.id < b.id ? `${a.id}|${b.id}` : `${b.id}|${a.id}`
      if (ignored.has(pairKey)) continue
      const sa = sigs.get(a.id)!
      const sb = sigs.get(b.id)!
      const score = jaccard(sa, sb)
      if (score >= threshold) {
        const shared: string[] = []
        for (const t of sa) if (sb.has(t)) shared.push(t)
        pairs.push({ a, b, score, sharedTokens: shared })
      }
    }
  }

  // 3. Union-Find to cluster via single linkage
  const parent = new Map<string, string>()
  const find = (x: string): string => {
    if (parent.get(x) !== x) parent.set(x, find(parent.get(x)!))
    return parent.get(x)!
  }
  const union = (a: string, b: string) => {
    const ra = find(a)
    const rb = find(b)
    if (ra !== rb) parent.set(ra, rb)
  }
  for (const s of skills) parent.set(s.id, s.id)
  for (const p of pairs) union(p.a.id, p.b.id)

  // 4. Gather clusters that have ≥ 2 members
  const clusters = new Map<string, Skill[]>()
  for (const s of skills) {
    const r = find(s.id)
    const arr = clusters.get(r) || []
    arr.push(s)
    clusters.set(r, arr)
  }

  const groups: SimilarityGroup[] = []
  for (const [rootId, members] of clusters) {
    if (members.length < 2) continue

    // Compute shared token intersection + avg similarity for display
    const memberSigs = members.map((m) => sigs.get(m.id)!)
    let sharedTokens = new Set(memberSigs[0])
    for (let i = 1; i < memberSigs.length; i++) {
      const next = new Set<string>()
      for (const t of sharedTokens) if (memberSigs[i].has(t)) next.add(t)
      sharedTokens = next
    }

    // Avg of all pairwise similarities within the cluster
    let sum = 0
    let count = 0
    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        sum += jaccard(memberSigs[i], memberSigs[j])
        count++
      }
    }
    const avg = count === 0 ? 0 : sum / count

    groups.push({
      id: rootId,
      skills: members.sort((a, b) => a.name.localeCompare(b.name)),
      sharedTokens: Array.from(sharedTokens).slice(0, 8),
      averageSimilarity: Math.round(avg * 100) / 100,
    })
  }

  // Sort: highest similarity first, then largest group
  groups.sort((x, y) => {
    if (y.averageSimilarity !== x.averageSimilarity) {
      return y.averageSimilarity - x.averageSimilarity
    }
    return y.skills.length - x.skills.length
  })

  return groups
}
