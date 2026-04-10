const sourceColors: Record<string, { bg: string; text: string }> = {
  newmax: { bg: 'bg-purple-500/20', text: 'text-purple-400' },
  agents: { bg: 'bg-cyan-500/20', text: 'text-cyan-400' },
  local: { bg: 'bg-green-500/20', text: 'text-green-400' },
  symlink: { bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
  unknown: { bg: 'bg-gray-500/20', text: 'text-gray-400' },
}

const scopeColors: Record<string, { bg: string; text: string }> = {
  global: { bg: 'bg-indigo-500/20', text: 'text-indigo-400' },
  project: { bg: 'bg-amber-500/20', text: 'text-amber-400' },
  plugin: { bg: 'bg-pink-500/20', text: 'text-pink-400' },
}

export function SourceBadge({ source }: { source: string }) {
  const colors = sourceColors[source] || sourceColors.unknown
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors.bg} ${colors.text}`}>
      {source}
    </span>
  )
}

export function ScopeBadge({ scope }: { scope: string }) {
  const colors = scopeColors[scope] || scopeColors.global
  const labels: Record<string, string> = { global: '全局', project: '项目级', plugin: '插件' }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors.bg} ${colors.text}`}>
      {labels[scope] || scope}
    </span>
  )
}
