import { useEffect, useState, useCallback } from 'react'
import type { Skill } from '../hooks/useSkills'

export interface SimilarGroup {
  id: string
  skills: Skill[]
  sharedTokens: string[]
  averageSimilarity: number
}

interface Props {
  onSkillClick: (skill: Skill) => void
}

export function SimilarView({ onSkillClick }: Props) {
  const [groups, setGroups] = useState<SimilarGroup[]>([])
  const [threshold, setThreshold] = useState(0.25)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (t: number) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/similar?threshold=${t}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setGroups(data.groups || [])
    } catch (e: any) {
      setError(e.message || String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load(threshold)
  }, [threshold, load])

  const ignorePair = async (a: string, b: string) => {
    await fetch('/api/similar/ignore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ a, b }),
    })
    load(threshold)
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 p-4 rounded-xl border border-slate-800 bg-slate-900/40">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
              🔍 相似 Skill 检测
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              通过关键词重叠度（Jaccard）识别可能在做同一件事的 Skill。阈值越高越严格。
              支持同义词归一（小红书 ↔ XHS ↔ RedNote 等）。
            </p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-2xl font-bold text-purple-400">{groups.length}</div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500">相似组</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 shrink-0">灵敏度</span>
          <input
            type="range"
            min={0.1}
            max={0.6}
            step={0.05}
            value={threshold}
            onChange={(e) => setThreshold(parseFloat(e.target.value))}
            className="flex-1 accent-purple-500"
          />
          <span className="text-xs text-slate-400 font-mono tabular-nums w-10 text-right">
            {threshold.toFixed(2)}
          </span>
          <span className="text-[10px] text-slate-600 ml-2">
            {threshold <= 0.2 ? '宽松' : threshold >= 0.4 ? '严格' : '平衡'}
          </span>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16 text-slate-500 text-sm">
          <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mr-2" />
          正在计算相似度...
        </div>
      )}

      {error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          加载失败：{error}
        </div>
      )}

      {!loading && !error && groups.length === 0 && (
        <div className="text-center py-16 text-slate-500">
          <div className="text-4xl mb-3">✨</div>
          <p className="text-sm">没有发现相似的 Skill</p>
          <p className="text-xs text-slate-600 mt-1">尝试拉低灵敏度阈值看看更多候选</p>
        </div>
      )}

      {!loading && !error && groups.length > 0 && (
        <div className="space-y-4">
          {groups.map((group) => (
            <div
              key={group.id}
              className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-slate-800/80 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-xs font-semibold text-purple-300">
                    相似度 {(group.averageSimilarity * 100).toFixed(0)}%
                  </span>
                  <span className="text-[11px] text-slate-500">·</span>
                  <span className="text-xs text-slate-400">{group.skills.length} 个 Skill</span>
                  {group.sharedTokens.length > 0 && (
                    <>
                      <span className="text-[11px] text-slate-600">·</span>
                      <span className="text-[11px] text-slate-500">共享关键词:</span>
                      <div className="flex flex-wrap gap-1">
                        {group.sharedTokens.slice(0, 6).map((t) => (
                          <span
                            key={t}
                            className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300 text-[10px] font-mono"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="divide-y divide-slate-800/80">
                {group.skills.map((skill) => (
                  <div
                    key={skill.id}
                    className="px-4 py-3 flex items-start justify-between gap-3 hover:bg-slate-800/30 transition-colors"
                  >
                    <button
                      onClick={() => onSkillClick(skill)}
                      className="flex-1 min-w-0 text-left"
                    >
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-medium text-slate-100 truncate">
                          /{skill.name}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                          {skill.scope}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-1">
                        {skill.description || '无描述'}
                      </p>
                      <p className="text-[10px] text-slate-600 truncate mt-0.5 font-mono">
                        {skill.path}
                      </p>
                    </button>
                  </div>
                ))}
              </div>

              {group.skills.length === 2 && (
                <div className="px-4 py-2 border-t border-slate-800/80 bg-slate-900/60 flex justify-end">
                  <button
                    onClick={() => ignorePair(group.skills[0].id, group.skills[1].id)}
                    className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    标记为不相似
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
