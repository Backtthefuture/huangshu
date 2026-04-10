import type { Stats, Project, ConflictGroup, Skill } from '../hooks/useSkills'

interface DashboardProps {
  stats: Stats
  projects: Project[]
  conflicts: ConflictGroup[]
  skills: Skill[]
}

export function Dashboard({ stats, projects, conflicts, skills }: DashboardProps) {
  // Compute category stats
  const categories = categorizeSkills(skills)

  return (
    <div className="space-y-6">
      {/* Source Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card title="来源分布">
          <div className="space-y-2.5">
            {Object.entries(stats.bySource)
              .sort((a, b) => b[1] - a[1])
              .map(([source, count]) => (
                <BarItem
                  key={source}
                  label={sourceLabel(source)}
                  count={count}
                  total={stats.total}
                  color={sourceColor(source)}
                />
              ))}
          </div>
        </Card>

        <Card title="层级分布">
          <div className="space-y-2.5">
            <BarItem label="全局 Skills" count={stats.global} total={stats.total} color="bg-indigo-500" />
            <BarItem label="项目级 Skills" count={stats.project} total={stats.total} color="bg-amber-500" />
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800/60">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
              <span>Symlink 数量</span>
              <span className="text-slate-300">
                {skills.filter((s) => s.symlinkTarget).length}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>已禁用</span>
              <span className="text-slate-300">
                {skills.filter((s) => !s.enabled).length}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Categories */}
      <Card title="技能分类">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {categories.map((cat) => (
            <div
              key={cat.name}
              className="bg-slate-900/50 rounded-lg border border-slate-800/40 p-3"
            >
              <div className="text-lg mb-1">{cat.icon}</div>
              <div className="text-lg font-bold text-slate-200">{cat.count}</div>
              <div className="text-[11px] text-slate-500">{cat.name}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Projects */}
      {projects.length > 0 && (
        <Card title="项目概览">
          <div className="space-y-2">
            {projects.map((p) => (
              <div
                key={p.path}
                className="flex items-center justify-between py-2 border-b border-slate-800/40 last:border-0"
              >
                <div>
                  <span className="text-sm text-slate-200">{p.name}</span>
                  <span className="text-xs text-slate-600 ml-2 font-mono">{p.path}</span>
                </div>
                <span className="text-sm text-slate-400 font-medium">{p.skillCount} skills</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Conflicts */}
      {conflicts.length > 0 && (
        <Card title={`冲突检测 (${conflicts.length} 组)`} accent="amber">
          <div className="space-y-3">
            {conflicts.map((group) => (
              <div
                key={group.name}
                className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-amber-400 text-sm font-semibold">/{group.name}</span>
                  <span className="text-[11px] text-amber-500/70 bg-amber-500/10 px-2 py-0.5 rounded-full">
                    {group.skills.length} 个冲突
                  </span>
                </div>
                <div className="space-y-1">
                  {group.skills.map((s, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className={`px-1.5 py-0.5 rounded ${
                        s.scope === 'global'
                          ? 'bg-indigo-500/20 text-indigo-400'
                          : 'bg-amber-500/20 text-amber-400'
                      }`}>
                        {s.scope === 'global' ? '全局' : '项目'}
                      </span>
                      <span className="text-slate-400 font-mono truncate">{s.path}</span>
                      <span className="text-slate-600">({s.source})</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

function Card({
  title,
  children,
  accent = 'default',
}: {
  title: string
  children: React.ReactNode
  accent?: 'default' | 'amber'
}) {
  return (
    <div className={`rounded-xl border p-5 ${
      accent === 'amber'
        ? 'bg-slate-900/50 border-amber-500/20'
        : 'bg-slate-900/50 border-slate-800/60'
    }`}>
      <h3 className="text-sm font-semibold text-slate-300 mb-4">{title}</h3>
      {children}
    </div>
  )
}

function BarItem({
  label,
  count,
  total,
  color,
}: {
  label: string
  count: number
  total: number
  color: string
}) {
  const pct = total > 0 ? (count / total) * 100 : 0
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-slate-400">{label}</span>
        <span className="text-slate-300 font-medium">{count} <span className="text-slate-600">({pct.toFixed(0)}%)</span></span>
      </div>
      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function sourceLabel(s: string): string {
  const m: Record<string, string> = { newmax: 'Newmax 框架', agents: 'Agents 平台', local: '本地', unknown: '未知' }
  return m[s] || s
}

function sourceColor(s: string): string {
  const m: Record<string, string> = { newmax: 'bg-purple-500', agents: 'bg-cyan-500', local: 'bg-green-500', unknown: 'bg-gray-500' }
  return m[s] || 'bg-gray-500'
}

interface Category {
  name: string
  icon: string
  keywords: string[]
  count: number
}

function categorizeSkills(skills: Skill[]): Category[] {
  const defs: Omit<Category, 'count'>[] = [
    { name: '飞书/Lark', icon: '💬', keywords: ['lark', 'feishu'] },
    { name: '文档处理', icon: '📄', keywords: ['pdf', 'docx', 'xlsx', 'pptx', 'doc', 'sheet'] },
    { name: '视频/音频', icon: '🎬', keywords: ['video', 'ffmpeg', 'audio', 'remotion'] },
    { name: '设计/创意', icon: '🎨', keywords: ['design', 'canvas', 'art', 'brand', 'theme', 'image', 'sketch'] },
    { name: '开发工具', icon: '🛠', keywords: ['tdd', 'mcp', 'skill-creator', 'webapp', 'frontend', 'claude-api'] },
    { name: '邮件/通讯', icon: '📧', keywords: ['email', 'mail', 'slack', 'im', 'comms'] },
    { name: '数据分析', icon: '📊', keywords: ['data', 'analysis', 'report', 'daily'] },
    { name: '其他', icon: '📦', keywords: [] },
  ]

  const cats: Category[] = defs.map((d) => ({ ...d, count: 0 }))
  const matched = new Set<string>()

  for (const skill of skills) {
    const nameAndDesc = `${skill.name} ${skill.description}`.toLowerCase()
    let found = false
    for (const cat of cats) {
      if (cat.keywords.length === 0) continue
      if (cat.keywords.some((kw) => nameAndDesc.includes(kw))) {
        cat.count++
        matched.add(skill.id)
        found = true
        break
      }
    }
    if (!found) {
      cats[cats.length - 1].count++
    }
  }

  return cats.filter((c) => c.count > 0)
}
