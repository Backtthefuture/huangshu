import { SourceBadge, ScopeBadge } from './SourceBadge'
import type { Skill } from '../hooks/useSkills'

interface SkillCardProps {
  skill: Skill
  onClick?: (skill: Skill) => void
}

export function SkillCard({ skill, onClick }: SkillCardProps) {
  return (
    <div
      onClick={() => onClick?.(skill)}
      className={`group relative rounded-xl border p-4 cursor-pointer transition-all duration-200
        ${skill.enabled
          ? 'border-slate-700/50 bg-slate-800/40 hover:border-indigo-500/50 hover:bg-slate-800/80'
          : 'border-slate-800/50 bg-slate-900/40 opacity-60 hover:opacity-80'
        }`}
    >
      {/* Conflict indicator */}
      {skill.hasConflict && (
        <div className="absolute -top-1.5 -right-1.5 w-3 h-3 rounded-full bg-amber-500 ring-2 ring-slate-900" />
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-2 gap-2">
        <h3 className="text-sm font-semibold text-slate-100 group-hover:text-indigo-400 transition-colors truncate">
          /{skill.name}
        </h3>
        <div className="flex gap-1 shrink-0">
          <ScopeBadge scope={skill.scope} />
        </div>
      </div>

      {/* Description */}
      <p className="text-xs text-slate-400 line-clamp-2 mb-3 leading-relaxed min-h-[2.5rem]">
        {skill.description || '无描述'}
      </p>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <SourceBadge source={skill.source} />
        <div className="flex items-center gap-2 text-xs text-slate-500">
          {skill.symlinkTarget && (
            <span title={`→ ${skill.symlinkTarget}`}>🔗</span>
          )}
          {!skill.enabled && (
            <span className="text-red-400/80 text-[11px]">禁用</span>
          )}
          {skill.frontmatter.model && (
            <span className="text-slate-500">{skill.frontmatter.model}</span>
          )}
        </div>
      </div>
    </div>
  )
}
