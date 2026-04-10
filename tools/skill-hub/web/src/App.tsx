import { useEffect, useState, useCallback } from 'react'
import { useSkills } from './hooks/useSkills'
import { useWebSocket } from './hooks/useWebSocket'
import { useTheme } from './hooks/useTheme'
import { StatsBar } from './components/StatsBar'
import { Sidebar } from './components/Sidebar'
import { SkillGrid } from './components/SkillGrid'
import { SkillDetail } from './components/SkillDetail'
import { Dashboard } from './components/Dashboard'
import type { Skill } from './hooks/useSkills'

type GroupBy = 'none' | 'scope' | 'source' | 'project'
type View = 'skills' | 'dashboard'

function App() {
  const { allSkills, skills, stats, projects, conflicts, loading, error, scan, filterSkills } = useSkills()
  const { theme, toggle: toggleTheme } = useTheme()

  const [view, setView] = useState<View>('skills')
  const [scopeFilter, setScopeFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [projectFilter, setProjectFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [groupBy, setGroupBy] = useState<GroupBy>('scope')
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null)
  const [lastUpdate, setLastUpdate] = useState<string | null>(null)

  useEffect(() => {
    scan()
  }, [scan])

  // WebSocket: auto-refresh on file changes
  useWebSocket(
    useCallback(
      (data: any) => {
        if (data.type === 'change') {
          setLastUpdate(new Date().toLocaleTimeString('zh-CN'))
          scan()
        }
      },
      [scan],
    ),
  )

  const applyFilters = useCallback(
    (overrides?: { scope?: string; source?: string; project?: string; search?: string }) => {
      filterSkills({
        scope: overrides?.scope ?? scopeFilter,
        source: overrides?.source ?? sourceFilter,
        project: overrides?.project ?? projectFilter,
        search: overrides?.search ?? search,
      })
    },
    [filterSkills, scopeFilter, sourceFilter, projectFilter, search],
  )

  const handleScopeChange = (v: string) => {
    setScopeFilter(v)
    setProjectFilter('all')
    applyFilters({ scope: v, project: 'all' })
  }

  const handleSourceChange = (v: string) => {
    setSourceFilter(v)
    applyFilters({ source: v })
  }

  const handleProjectChange = (v: string) => {
    setProjectFilter(v)
    if (v !== 'all') {
      setScopeFilter('all')
      applyFilters({ project: v, scope: 'all' })
    } else {
      applyFilters({ project: v })
    }
  }

  const handleSearch = (q: string) => {
    setSearch(q)
    applyFilters({ search: q })
  }

  // Keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedSkill(null)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-[1400px] mx-auto px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-indigo-500/20">
                S
              </div>
              <div>
                <h1 className="text-base font-bold text-slate-100 leading-tight">Claude Skill Hub</h1>
                <p className="text-[11px] text-slate-500">
                  Skill 管理器
                  {lastUpdate && <span className="ml-2 text-green-500/60">最近更新 {lastUpdate}</span>}
                </p>
              </div>
            </div>

            {/* View switcher */}
            <div className="flex items-center gap-0.5 bg-slate-900 rounded-lg border border-slate-800 p-0.5 ml-4">
              <button
                onClick={() => setView('skills')}
                className={`px-3 py-1 rounded-md text-xs transition-all ${
                  view === 'skills' ? 'bg-slate-700 text-slate-200 shadow-sm' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                Skills
              </button>
              <button
                onClick={() => setView('dashboard')}
                className={`px-3 py-1 rounded-md text-xs transition-all ${
                  view === 'dashboard' ? 'bg-slate-700 text-slate-200 shadow-sm' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                仪表盘
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {view === 'skills' && (
              <div className="relative hidden md:block">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                  width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
                <input
                  type="text"
                  placeholder="搜索 Skills... (名称/描述)"
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-72 pl-9 pr-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-sm text-slate-200
                             placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all"
                />
              </div>
            )}

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all"
              title={theme === 'dark' ? '切换到日间模式' : '切换到夜间模式'}
            >
              {theme === 'dark' ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="5" /><path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72 1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>

            <button
              onClick={scan}
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50
                         rounded-lg text-sm font-medium text-white transition-all shadow-lg shadow-indigo-600/20
                         flex items-center gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
              )}
              <span>{loading ? '扫描中...' : '一键扫描'}</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto px-6 py-6">
        {/* Stats */}
        {stats.total > 0 && (
          <StatsBar stats={stats} projects={projects} conflicts={conflicts.length} />
        )}

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Dashboard view */}
        {view === 'dashboard' ? (
          <Dashboard stats={stats} projects={projects} conflicts={conflicts} skills={allSkills} />
        ) : (
          <>
            {/* Mobile search */}
            <div className="md:hidden mb-4">
              <input
                type="text"
                placeholder="搜索 Skills..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-sm text-slate-200
                           placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 transition-colors"
              />
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
              {/* Sidebar */}
              <Sidebar
                stats={stats}
                projects={projects}
                scopeFilter={scopeFilter}
                sourceFilter={sourceFilter}
                projectFilter={projectFilter}
                onScopeChange={handleScopeChange}
                onSourceChange={handleSourceChange}
                onProjectChange={handleProjectChange}
              />

              {/* Main */}
              <main className="flex-1 min-w-0">
                {/* Toolbar */}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-slate-500">
                    共 <span className="text-slate-300 font-medium">{skills.length}</span> 个 Skill
                  </span>

                  <div className="flex items-center gap-1 bg-slate-900 rounded-lg border border-slate-800 p-0.5">
                    {([
                      { value: 'scope', label: '按层级' },
                      { value: 'source', label: '按来源' },
                      { value: 'none', label: '平铺' },
                    ] as { value: GroupBy; label: string }[]).map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setGroupBy(opt.value)}
                        className={`px-3 py-1 rounded-md text-xs transition-all
                          ${groupBy === opt.value
                            ? 'bg-slate-700 text-slate-200 shadow-sm'
                            : 'text-slate-500 hover:text-slate-300'
                          }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Content */}
                {loading && skills.length === 0 ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-slate-400 flex flex-col items-center gap-3">
                      <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm">正在扫描 Skills...</span>
                      <span className="text-xs text-slate-600">扫描全局和项目目录中</span>
                    </div>
                  </div>
                ) : skills.length === 0 && stats.total === 0 ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                      <div className="text-4xl mb-3">🔍</div>
                      <p className="text-slate-300 mb-1">暂无 Skills</p>
                      <p className="text-sm text-slate-500">点击「一键扫描」发现你的 Claude Skills</p>
                    </div>
                  </div>
                ) : (
                  <SkillGrid
                    skills={skills}
                    groupBy={groupBy}
                    onSkillClick={setSelectedSkill}
                  />
                )}
              </main>
            </div>
          </>
        )}
      </div>

      {/* Detail modal */}
      {selectedSkill && (
        <SkillDetail
          skill={selectedSkill}
          projects={projects}
          onClose={() => setSelectedSkill(null)}
          onToggle={async (skill, enabled) => {
            await fetch(`/api/skills/${skill.id}/toggle`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ enabled, skillName: skill.name }),
            })
            await scan()
          }}
          onSaveContent={async (skill, content) => {
            await fetch(`/api/skills/${skill.id}/content`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ realPath: skill.realPath, content }),
            })
            await scan()
          }}
          onCopy={async (skill, targetScope, projectPath) => {
            const res = await fetch('/api/skills/copy', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sourcePath: skill.path, targetScope, projectPath, skillName: skill.name }),
            })
            const data = await res.json()
            if (!data.ok) throw new Error(data.error)
            await scan()
          }}
          onMove={async (skill, targetScope, projectPath) => {
            const res = await fetch('/api/skills/move', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sourcePath: skill.path, targetScope, projectPath, skillName: skill.name }),
            })
            const data = await res.json()
            if (!data.ok) throw new Error(data.error)
            setSelectedSkill(null)
            await scan()
          }}
          onDelete={async (skill) => {
            const res = await fetch(`/api/skills/${skill.id}`, {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ path: skill.path }),
            })
            const data = await res.json()
            if (!data.ok) throw new Error(data.error)
            await scan()
          }}
        />
      )}
    </div>
  )
}

export default App
