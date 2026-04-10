import type { Stats, Project } from '../hooks/useSkills'

interface SidebarProps {
  stats: Stats
  projects: Project[]
  scopeFilter: string
  sourceFilter: string
  projectFilter: string
  onScopeChange: (v: string) => void
  onSourceChange: (v: string) => void
  onProjectChange: (v: string) => void
}

export function Sidebar({
  stats,
  projects,
  scopeFilter,
  sourceFilter,
  projectFilter,
  onScopeChange,
  onSourceChange,
  onProjectChange,
}: SidebarProps) {
  const scopeItems = [
    { value: 'all', label: '全部', count: stats.total },
    { value: 'global', label: '全局 Skills', count: stats.global },
    { value: 'project', label: '项目级 Skills', count: stats.project },
  ]

  const sourceItems = [
    { value: 'all', label: '全部来源' },
    ...Object.entries(stats.bySource)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => ({
        value: k,
        label: sourceLabel(k),
        count: v,
      })),
  ]

  return (
    <aside className="lg:w-60 shrink-0 space-y-5">
      {/* Scope */}
      <FilterSection title="层级">
        {scopeItems.map((item) => (
          <FilterButton
            key={item.value}
            active={scopeFilter === item.value}
            onClick={() => onScopeChange(item.value)}
            label={item.label}
            count={item.count}
            icon={scopeIcon(item.value)}
          />
        ))}
      </FilterSection>

      {/* Source */}
      <FilterSection title="来源">
        {sourceItems.map((item) => (
          <FilterButton
            key={item.value}
            active={sourceFilter === item.value}
            onClick={() => onSourceChange(item.value)}
            label={item.label}
            count={'count' in item ? (item as any).count : undefined}
            icon={sourceIcon(item.value)}
          />
        ))}
      </FilterSection>

      {/* Projects */}
      {projects.length > 0 && (
        <FilterSection title="项目">
          <FilterButton
            active={projectFilter === 'all'}
            onClick={() => onProjectChange('all')}
            label="全部项目"
          />
          {projects.map((p) => (
            <FilterButton
              key={p.path}
              active={projectFilter === p.path}
              onClick={() => onProjectChange(p.path)}
              label={p.name}
              count={p.skillCount}
              icon="📁"
            />
          ))}
        </FilterSection>
      )}
    </aside>
  )
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2 px-1">
        {title}
      </h3>
      <div className="space-y-0.5">{children}</div>
    </div>
  )
}

function FilterButton({
  active,
  onClick,
  label,
  count,
  icon,
}: {
  active: boolean
  onClick: () => void
  label: string
  count?: number
  icon?: string
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-1.5 rounded-lg text-[13px] transition-all flex justify-between items-center
        ${active
          ? 'bg-indigo-600/15 text-indigo-400 font-medium'
          : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-300'
        }`}
    >
      <span className="flex items-center gap-2 truncate">
        {icon && <span className="text-xs">{icon}</span>}
        <span className="truncate">{label}</span>
      </span>
      {count !== undefined && (
        <span className={`text-[11px] tabular-nums ${active ? 'text-indigo-400/70' : 'text-slate-600'}`}>
          {count}
        </span>
      )}
    </button>
  )
}

function scopeIcon(scope: string): string {
  const icons: Record<string, string> = { all: '📋', global: '🌐', project: '📂', plugin: '🔌' }
  return icons[scope] || ''
}

function sourceIcon(source: string): string {
  const icons: Record<string, string> = { all: '', newmax: '🟣', agents: '🔵', local: '🟢', unknown: '⚪' }
  return icons[source] || '⚪'
}

function sourceLabel(source: string): string {
  const labels: Record<string, string> = {
    newmax: 'Newmax 框架',
    agents: 'Agents 平台',
    local: '本地',
    symlink: '符号链接',
    unknown: '未知',
  }
  return labels[source] || source
}
