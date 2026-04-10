import { useState, useEffect } from 'react'
import { DiffViewer } from './DiffViewer'

interface VersionMeta {
  id: string
  skillPath: string
  skillName: string
  timestamp: string
  message: string
  source: 'auto' | 'manual'
  contentHash: string
}

interface DiffResult {
  oldVersion: VersionMeta
  newVersion: VersionMeta
  lines: { type: 'add' | 'remove' | 'same'; lineNumber: { old?: number; new?: number }; content: string }[]
  stats: { additions: number; deletions: number; unchanged: number }
}

interface VersionHistoryProps {
  skillPath: string
  skillName: string
  onClose: () => void
  onRollback: () => void
}

export function VersionHistory({ skillPath, skillName, onClose, onRollback }: VersionHistoryProps) {
  const [history, setHistory] = useState<VersionMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [message, setMessage] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [diff, setDiff] = useState<DiffResult | null>(null)
  const [diffLoading, setDiffLoading] = useState(false)
  const [selectedVersions, setSelectedVersions] = useState<string[]>([])
  const [rollbackTarget, setRollbackTarget] = useState<string | null>(null)
  const [rollbackLoading, setRollbackLoading] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const fetchHistory = async () => {
    setLoading(true)
    try {
      const url = `/api/versions/history?skillPath=${encodeURIComponent(skillPath)}`
      const res = await fetch(url)
      const data = await res.json()
      setHistory(data.history || [])
    } catch (e: any) {
      console.error('[VersionHistory] fetchHistory error:', e)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchHistory()
  }, [skillPath])

  const handleCreateSnapshot = async () => {
    if (!message.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/versions/snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillPath, skillName, message: message.trim() }),
      })
      const data = await res.json()
      if (data.ok) {
        showToast('快照已创建')
        setMessage('')
        setShowCreate(false)
        await fetchHistory()
      } else {
        showToast(`创建失败: ${data.error || '未知错误'}`)
      }
    } catch (e: any) {
      showToast(`请求失败: ${e.message}`)
    }
    setCreating(false)
  }

  const handleDiffWithCurrent = async (versionId: string) => {
    setDiffLoading(true)
    try {
      const res = await fetch(
        `/api/versions/diff-current?skillPath=${encodeURIComponent(skillPath)}&versionId=${versionId}`,
      )
      const data = await res.json()
      if (data.ok) setDiff(data.diff)
    } catch {}
    setDiffLoading(false)
  }

  const handleDiffBetween = async () => {
    if (selectedVersions.length !== 2) return
    setDiffLoading(true)
    try {
      const [oldId, newId] = selectedVersions
      const res = await fetch(
        `/api/versions/diff?skillPath=${encodeURIComponent(skillPath)}&oldId=${oldId}&newId=${newId}`,
      )
      const data = await res.json()
      if (data.ok) setDiff(data.diff)
    } catch {}
    setDiffLoading(false)
  }

  const handleRollback = async (versionId: string) => {
    setRollbackLoading(true)
    try {
      const res = await fetch('/api/versions/rollback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillPath, versionId }),
      })
      const data = await res.json()
      if (data.ok) {
        showToast('已回滚成功')
        setRollbackTarget(null)
        await fetchHistory()
        onRollback()
      }
    } catch {}
    setRollbackLoading(false)
  }

  const toggleSelect = (id: string) => {
    setSelectedVersions((prev) => {
      if (prev.includes(id)) return prev.filter((v) => v !== id)
      if (prev.length >= 2) return [prev[1], id]
      return [...prev, id]
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[5vh] bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700/70 rounded-2xl w-full max-w-4xl max-h-[88vh] overflow-hidden m-4 shadow-2xl shadow-black/40 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-indigo-400">
                <circle cx="12" cy="12" r="3" /><path d="M12 3v6m0 6v6" /><path d="M3 12h6m6 0h6" />
              </svg>
              版本历史
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">/{skillName}</p>
          </div>
          <div className="flex items-center gap-2">
            {selectedVersions.length === 2 && (
              <button
                onClick={handleDiffBetween}
                disabled={diffLoading}
                className="px-3 py-1.5 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-400 rounded-lg text-xs font-medium transition-all"
              >
                对比选中 ({selectedVersions.length})
              </button>
            )}
            <button
              onClick={() => setShowCreate(!showCreate)}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition-all"
            >
              + 创建快照
            </button>
            <button onClick={onClose} className="text-slate-500 hover:text-slate-300 p-1 rounded-lg hover:bg-slate-800">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Toast */}
        {toast && (
          <div className="mx-6 mt-3 px-3 py-1.5 rounded-lg bg-green-500/10 text-green-400 text-xs">
            {toast}
          </div>
        )}

        {/* Create snapshot form */}
        {showCreate && (
          <div className="mx-6 mt-3 p-4 bg-slate-950/50 rounded-lg border border-slate-800/60">
            <div className="flex gap-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="版本描述（如：修复 prompt 逻辑）"
                className="flex-1 px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-sm text-slate-200
                           placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50"
                onKeyDown={(e) => e.key === 'Enter' && handleCreateSnapshot()}
              />
              <button
                onClick={handleCreateSnapshot}
                disabled={creating || !message.trim()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 rounded-lg text-sm text-white"
              >
                {creating ? '...' : '保存'}
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-3xl mb-3">📦</div>
              <p className="text-slate-400 text-sm">暂无版本历史</p>
              <p className="text-slate-600 text-xs mt-1">点击「创建快照」保存当前版本</p>
            </div>
          ) : (
            <>
              {/* Timeline */}
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-[19px] top-6 bottom-0 w-px bg-slate-800" />

                {history.map((v, i) => (
                  <div key={v.id} className="relative flex gap-3 pb-4">
                    {/* Dot */}
                    <div
                      className={`relative z-10 w-10 h-10 rounded-full border-2 flex items-center justify-center shrink-0 cursor-pointer transition-all
                        ${selectedVersions.includes(v.id)
                          ? 'border-cyan-400 bg-cyan-500/20'
                          : v.source === 'manual'
                          ? 'border-indigo-500 bg-indigo-500/20'
                          : 'border-slate-700 bg-slate-800'
                        }`}
                      onClick={() => toggleSelect(v.id)}
                      title="点击选中以对比"
                    >
                      <span className="text-xs">
                        {selectedVersions.includes(v.id)
                          ? selectedVersions.indexOf(v.id) + 1
                          : v.source === 'manual' ? '📌' : '⚡'}
                      </span>
                    </div>

                    {/* Card */}
                    <div className={`flex-1 rounded-lg border p-3 transition-all ${
                      selectedVersions.includes(v.id)
                        ? 'border-cyan-500/30 bg-cyan-500/5'
                        : 'border-slate-800/60 bg-slate-900/30 hover:bg-slate-900/60'
                    }`}>
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-sm text-slate-200">{v.message}</span>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[11px] text-slate-500 font-mono">{v.id.slice(0, 10)}</span>
                            <span className="text-[11px] text-slate-600">
                              {new Date(v.timestamp).toLocaleString('zh-CN')}
                            </span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                              v.source === 'manual'
                                ? 'bg-indigo-500/15 text-indigo-400'
                                : 'bg-slate-700/50 text-slate-500'
                            }`}>
                              {v.source === 'manual' ? '手动' : '自动'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleDiffWithCurrent(v.id)}
                            className="px-2 py-1 text-[11px] text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded transition-all"
                            title="与当前版本对比"
                          >
                            diff
                          </button>
                          {rollbackTarget === v.id ? (
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleRollback(v.id)}
                                disabled={rollbackLoading}
                                className="px-2 py-1 text-[11px] text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded"
                              >
                                {rollbackLoading ? '...' : '确认'}
                              </button>
                              <button
                                onClick={() => setRollbackTarget(null)}
                                className="px-2 py-1 text-[11px] text-slate-400 hover:bg-slate-800 rounded"
                              >
                                取消
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setRollbackTarget(v.id)}
                              className="px-2 py-1 text-[11px] text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 rounded transition-all"
                              title="回滚到此版本"
                            >
                              回滚
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Tip */}
              <div className="text-xs text-slate-600 text-center pt-2">
                点击左侧圆圈选中两个版本进行对比
              </div>
            </>
          )}

          {/* Diff panel */}
          {diff && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">版本对比</h3>
                <button
                  onClick={() => setDiff(null)}
                  className="text-xs text-slate-500 hover:text-slate-300"
                >
                  关闭
                </button>
              </div>
              <DiffViewer
                lines={diff.lines}
                stats={diff.stats}
                oldLabel={`${diff.oldVersion.message} (${diff.oldVersion.id.slice(0, 8)})`}
                newLabel={diff.newVersion.id === 'current' ? '当前文件' : `${diff.newVersion.message} (${diff.newVersion.id.slice(0, 8)})`}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
