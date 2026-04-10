import { useState } from 'react'
import { SourceBadge, ScopeBadge } from './SourceBadge'
import { SkillEditor } from './SkillEditor'
import { VersionHistory } from './VersionHistory'
import type { Skill, Project } from '../hooks/useSkills'

interface SkillDetailProps {
  skill: Skill
  projects: Project[]
  onClose: () => void
  onToggle: (skill: Skill, enabled: boolean) => Promise<void>
  onSaveContent: (skill: Skill, content: string) => Promise<void>
  onCopy: (skill: Skill, targetScope: 'global' | 'project', projectPath?: string) => Promise<void>
  onMove: (skill: Skill, targetScope: 'global' | 'project', projectPath?: string) => Promise<void>
  onDelete: (skill: Skill) => Promise<void>
}

export function SkillDetail({
  skill,
  projects,
  onClose,
  onToggle,
  onSaveContent,
  onCopy,
  onMove,
  onDelete,
}: SkillDetailProps) {
  const [editing, setEditing] = useState(false)
  const [showVersions, setShowVersions] = useState(false)
  const [showActions, setShowActions] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 3000)
  }

  const handleToggle = async () => {
    setActionLoading('toggle')
    try {
      await onToggle(skill, !skill.enabled)
      showMsg('success', skill.enabled ? '已禁用' : '已启用')
    } catch { showMsg('error', '操作失败') }
    finally { setActionLoading(null) }
  }

  const handleCopy = async (scope: 'global' | 'project', projectPath?: string) => {
    setActionLoading('copy')
    try {
      await onCopy(skill, scope, projectPath)
      showMsg('success', '复制成功')
      setShowActions(false)
    } catch { showMsg('error', '复制失败') }
    finally { setActionLoading(null) }
  }

  const handleMove = async (scope: 'global' | 'project', projectPath?: string) => {
    setActionLoading('move')
    try {
      await onMove(skill, scope, projectPath)
      showMsg('success', '移动成功')
      setShowActions(false)
    } catch { showMsg('error', '移动失败') }
    finally { setActionLoading(null) }
  }

  const handleDelete = async () => {
    setActionLoading('delete')
    try {
      await onDelete(skill)
      onClose()
    } catch { showMsg('error', '删除失败') }
    finally { setActionLoading(null) }
  }

  if (showVersions) {
    return (
      <VersionHistory
        skillPath={skill.path}
        skillName={skill.name}
        onClose={() => setShowVersions(false)}
        onRollback={() => {
          setShowVersions(false)
        }}
      />
    )
  }

  if (editing) {
    return (
      <SkillEditor
        skill={skill}
        onSave={async (content) => {
          await onSaveContent(skill, content)
          showMsg('success', '保存成功')
        }}
        onClose={() => setEditing(false)}
      />
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[8vh] bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700/70 rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden m-4 shadow-2xl shadow-black/40 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-slate-800">
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-slate-100 truncate">/{skill.name}</h2>
              <div className="flex flex-wrap gap-2 mt-2">
                <ScopeBadge scope={skill.scope} />
                <SourceBadge source={skill.source} />
                {!skill.enabled && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-500/20 text-red-400">
                    已禁用
                  </span>
                )}
                {skill.hasConflict && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-500/20 text-amber-400">
                    冲突
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-500 hover:text-slate-300 p-1 rounded-lg hover:bg-slate-800 transition-colors shrink-0 ml-4"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Message */}
          {message && (
            <div className={`mt-3 px-3 py-1.5 rounded-lg text-xs ${
              message.type === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
            }`}>
              {message.text}
            </div>
          )}
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {skill.description && (
            <p className="text-sm text-slate-300 leading-relaxed">{skill.description}</p>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            <ActionButton
              onClick={handleToggle}
              loading={actionLoading === 'toggle'}
              variant={skill.enabled ? 'warning' : 'success'}
            >
              {skill.enabled ? '禁用' : '启用'}
            </ActionButton>
            <ActionButton onClick={() => setEditing(true)}>编辑 SKILL.md</ActionButton>
            <ActionButton onClick={() => setShowVersions(true)} variant="default">
              版本历史
            </ActionButton>
            <ActionButton onClick={() => setShowActions(!showActions)}>
              复制/移动
            </ActionButton>
            {confirmDelete ? (
              <div className="flex gap-1">
                <ActionButton onClick={handleDelete} loading={actionLoading === 'delete'} variant="danger">
                  确认删除
                </ActionButton>
                <ActionButton onClick={() => setConfirmDelete(false)}>取消</ActionButton>
              </div>
            ) : (
              <ActionButton onClick={() => setConfirmDelete(true)} variant="danger">删除</ActionButton>
            )}
          </div>

          {/* Copy/Move panel */}
          {showActions && (
            <div className="bg-slate-950/50 rounded-lg border border-slate-800 p-4 space-y-3">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">复制或移动到</h4>

              {skill.scope !== 'global' && (
                <div className="flex gap-2">
                  <ActionButton onClick={() => handleCopy('global')} loading={actionLoading === 'copy'}>
                    复制到全局
                  </ActionButton>
                  <ActionButton onClick={() => handleMove('global')} loading={actionLoading === 'move'}>
                    移动到全局
                  </ActionButton>
                </div>
              )}

              {projects.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-xs text-slate-500">项目:</span>
                  {projects.map((p) => (
                    <div key={p.path} className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 truncate flex-1">{p.name}</span>
                      <ActionButton
                        onClick={() => handleCopy('project', p.path)}
                        loading={actionLoading === 'copy'}
                        small
                      >
                        复制
                      </ActionButton>
                      <ActionButton
                        onClick={() => handleMove('project', p.path)}
                        loading={actionLoading === 'move'}
                        small
                      >
                        移动
                      </ActionButton>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Metadata */}
          <div>
            <SectionTitle>详细信息</SectionTitle>
            <div className="bg-slate-950/50 rounded-lg border border-slate-800/60 divide-y divide-slate-800/60">
              <InfoRow label="路径" value={skill.path} mono />
              <InfoRow label="实际路径" value={skill.realPath} mono />
              {skill.symlinkTarget && <InfoRow label="符号链接" value={skill.symlinkTarget} mono />}
              {skill.projectName && <InfoRow label="所属项目" value={skill.projectName} />}
              {skill.frontmatter['allowed-tools'] && (
                <InfoRow label="允许工具" value={skill.frontmatter['allowed-tools']} />
              )}
              {skill.frontmatter.model && <InfoRow label="模型" value={skill.frontmatter.model} />}
              {skill.frontmatter.effort && <InfoRow label="Effort" value={skill.frontmatter.effort} />}
              {skill.frontmatter.agent && <InfoRow label="Agent" value={skill.frontmatter.agent} />}
              {skill.files.length > 0 && <InfoRow label="文件" value={skill.files.join(', ')} />}
              <InfoRow label="修改时间" value={new Date(skill.lastModified).toLocaleString('zh-CN')} />
            </div>
          </div>

          {/* Content preview */}
          {skill.content && (
            <div>
              <SectionTitle>SKILL.md 预览</SectionTitle>
              <pre className="bg-slate-950 border border-slate-800/60 rounded-lg p-4 text-xs text-slate-300 overflow-x-auto max-h-60 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                {skill.content}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2">
      {children}
    </h3>
  )
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex gap-3 px-3 py-2 text-sm">
      <span className="text-slate-500 shrink-0 w-20 text-xs pt-0.5">{label}</span>
      <span className={`text-slate-300 break-all min-w-0 ${mono ? 'font-mono text-xs' : ''}`}>
        {value}
      </span>
    </div>
  )
}

function ActionButton({
  onClick,
  children,
  loading,
  variant = 'default',
  small,
}: {
  onClick: () => void
  children: React.ReactNode
  loading?: boolean
  variant?: 'default' | 'success' | 'warning' | 'danger'
  small?: boolean
}) {
  const colors = {
    default: 'bg-slate-800 hover:bg-slate-700 text-slate-300',
    success: 'bg-green-600/20 hover:bg-green-600/30 text-green-400',
    warning: 'bg-amber-600/20 hover:bg-amber-600/30 text-amber-400',
    danger: 'bg-red-600/20 hover:bg-red-600/30 text-red-400',
  }

  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`${small ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1.5 text-xs'} rounded-lg font-medium transition-all disabled:opacity-50 ${colors[variant]}`}
    >
      {loading ? '...' : children}
    </button>
  )
}
