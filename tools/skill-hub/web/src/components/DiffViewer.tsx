interface DiffLine {
  type: 'add' | 'remove' | 'same'
  lineNumber: { old?: number; new?: number }
  content: string
}

interface DiffStats {
  additions: number
  deletions: number
  unchanged: number
}

interface DiffViewerProps {
  lines: DiffLine[]
  stats: DiffStats
  oldLabel: string
  newLabel: string
}

export function DiffViewer({ lines, stats, oldLabel, newLabel }: DiffViewerProps) {
  return (
    <div className="rounded-lg border border-slate-800/60 overflow-hidden">
      {/* Header */}
      <div className="bg-slate-900 px-4 py-2.5 border-b border-slate-800/60 flex items-center justify-between">
        <div className="flex items-center gap-4 text-xs">
          <span className="text-slate-400">{oldLabel}</span>
          <span className="text-slate-600">→</span>
          <span className="text-slate-300">{newLabel}</span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-green-400">+{stats.additions}</span>
          <span className="text-red-400">-{stats.deletions}</span>
          <span className="text-slate-600">{stats.unchanged} 行未变</span>
        </div>
      </div>

      {/* Diff lines */}
      <div className="overflow-x-auto max-h-[50vh] overflow-y-auto">
        <table className="w-full text-xs font-mono">
          <tbody>
            {lines.map((line, i) => (
              <tr
                key={i}
                className={`${
                  line.type === 'add'
                    ? 'bg-green-500/8'
                    : line.type === 'remove'
                    ? 'bg-red-500/8'
                    : ''
                } hover:bg-slate-800/30`}
              >
                {/* Old line number */}
                <td className="w-12 text-right pr-2 py-0 text-slate-600 select-none border-r border-slate-800/40 align-top">
                  <span className="px-1">{line.lineNumber.old ?? ''}</span>
                </td>
                {/* New line number */}
                <td className="w-12 text-right pr-2 py-0 text-slate-600 select-none border-r border-slate-800/40 align-top">
                  <span className="px-1">{line.lineNumber.new ?? ''}</span>
                </td>
                {/* Indicator */}
                <td className={`w-6 text-center py-0 select-none ${
                  line.type === 'add'
                    ? 'text-green-400'
                    : line.type === 'remove'
                    ? 'text-red-400'
                    : 'text-slate-700'
                }`}>
                  {line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '}
                </td>
                {/* Content */}
                <td className={`py-0 pl-2 pr-4 whitespace-pre-wrap break-all ${
                  line.type === 'add'
                    ? 'text-green-300'
                    : line.type === 'remove'
                    ? 'text-red-300'
                    : 'text-slate-400'
                }`}>
                  {line.content || '\u00A0'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
