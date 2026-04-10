import { SkillCard } from './SkillCard'
import type { Skill } from '../hooks/useSkills'

interface SkillGridProps {
  skills: Skill[]
  groupBy: 'none' | 'scope' | 'source' | 'project'
  onSkillClick: (skill: Skill) => void
}

const groupLabels: Record<string, Record<string, string>> = {
  scope: {
    global: '🌐 全局 Skills',
    project: '📂 项目级 Skills',
    plugin: '🔌 插件 Skills',
  },
  source: {
    newmax: '🟣 Newmax 框架',
    agents: '🔵 Agents 平台',
    local: '🟢 本地',
    symlink: '🔗 符号链接',
    unknown: '⚪ 未知',
  },
}

export function SkillGrid({ skills, groupBy, onSkillClick }: SkillGridProps) {
  if (skills.length === 0) {
    return (
      <div className="flex items-center justify-center h-48">
        <p className="text-slate-500 text-sm">没有匹配的 Skills</p>
      </div>
    )
  }

  if (groupBy === 'none') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {skills.map((s) => (
          <SkillCard key={s.id} skill={s} onClick={onSkillClick} />
        ))}
      </div>
    )
  }

  // Group skills
  const groups = new Map<string, Skill[]>()

  for (const skill of skills) {
    let key: string
    if (groupBy === 'project') {
      key = skill.scope === 'project' ? (skill.projectName || '未知项目') : '全局'
    } else {
      key = skill[groupBy]
    }
    const arr = groups.get(key) || []
    arr.push(skill)
    groups.set(key, arr)
  }

  // Sort groups: global first, then by size
  const sortedGroups = [...groups.entries()].sort((a, b) => {
    if (groupBy === 'scope') {
      const order = ['global', 'project', 'plugin']
      return order.indexOf(a[0]) - order.indexOf(b[0])
    }
    return b[1].length - a[1].length
  })

  return (
    <div className="space-y-6">
      {sortedGroups.map(([key, groupSkills]) => (
        <div key={key}>
          <div className="flex items-center gap-3 mb-3">
            <h2 className="text-sm font-semibold text-slate-300">
              {(groupLabels[groupBy] && groupLabels[groupBy][key]) || key}
            </h2>
            <span className="text-xs text-slate-600 bg-slate-800 px-2 py-0.5 rounded-full">
              {groupSkills.length}
            </span>
            <div className="flex-1 h-px bg-slate-800/60" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {groupSkills.map((s) => (
              <SkillCard key={s.id} skill={s} onClick={onSkillClick} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
