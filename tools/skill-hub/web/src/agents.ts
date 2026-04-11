export type AgentId =
  | 'claude-code'
  | 'adal'
  | 'amp'
  | 'antigravity'
  | 'augment'
  | 'bob'
  | 'cline'
  | 'codebuddy'
  | 'codex'
  | 'commandcode'
  | 'continue'
  | 'cortex'
  | 'crush'
  | 'cursor'
  | 'deepagents'
  | 'droid'
  | 'firebender'
  | 'gemini-cli'
  | 'github-copilot'
  | 'goose'
  | 'iflow-cli'
  | 'junie'
  | 'kilo'
  | 'kimi-cli'
  | 'kiro-cli'
  | 'kode'
  | 'mcpjam'
  | 'mistral-vibe'
  | 'mux'
  | 'neovate'
  | 'opencode'
  | 'openclaw'
  | 'openhands'
  | 'pi'
  | 'pochi'
  | 'qoder'
  | 'qwen-code'
  | 'replit'
  | 'roo'
  | 'trae'
  | 'trae-cn'
  | 'universal'
  | 'warp'
  | 'windsurf'
  | 'zencoder'
  | 'unknown'

export interface AgentMeta {
  id: AgentId
  name: string
  icon: string
  color: { bg: string; text: string; ring: string }
}

// Mirrors server/scanner/agents.ts. Kept in sync by hand.
// Popular agents get distinctive colors; long tail uses a rotating palette.
const c = {
  orange: { bg: 'bg-orange-500/15', text: 'text-orange-300', ring: 'ring-orange-500/30' },
  slate:  { bg: 'bg-slate-500/20', text: 'text-slate-200', ring: 'ring-slate-400/30' },
  purple: { bg: 'bg-purple-500/15', text: 'text-purple-300', ring: 'ring-purple-500/30' },
  blue:   { bg: 'bg-blue-500/15', text: 'text-blue-300', ring: 'ring-blue-500/30' },
  cyan:   { bg: 'bg-cyan-500/15', text: 'text-cyan-300', ring: 'ring-cyan-500/30' },
  red:    { bg: 'bg-red-500/15', text: 'text-red-300', ring: 'ring-red-500/30' },
  green:  { bg: 'bg-green-500/15', text: 'text-green-300', ring: 'ring-green-500/30' },
  indigo: { bg: 'bg-indigo-500/15', text: 'text-indigo-300', ring: 'ring-indigo-500/30' },
  amber:  { bg: 'bg-amber-500/15', text: 'text-amber-300', ring: 'ring-amber-500/30' },
  emerald:{ bg: 'bg-emerald-500/15', text: 'text-emerald-300', ring: 'ring-emerald-500/30' },
  pink:   { bg: 'bg-pink-500/15', text: 'text-pink-300', ring: 'ring-pink-500/30' },
  violet: { bg: 'bg-violet-500/15', text: 'text-violet-300', ring: 'ring-violet-500/30' },
  teal:   { bg: 'bg-teal-500/15', text: 'text-teal-300', ring: 'ring-teal-500/30' },
  fuchsia:{ bg: 'bg-fuchsia-500/15', text: 'text-fuchsia-300', ring: 'ring-fuchsia-500/30' },
  rose:   { bg: 'bg-rose-500/15', text: 'text-rose-300', ring: 'ring-rose-500/30' },
  sky:    { bg: 'bg-sky-500/15', text: 'text-sky-300', ring: 'ring-sky-500/30' },
  lime:   { bg: 'bg-lime-500/15', text: 'text-lime-300', ring: 'ring-lime-500/30' },
  yellow: { bg: 'bg-yellow-500/15', text: 'text-yellow-300', ring: 'ring-yellow-500/30' },
  gray:   { bg: 'bg-gray-500/15', text: 'text-gray-400', ring: 'ring-gray-500/30' },
}

export const AGENT_META: Record<AgentId, AgentMeta> = {
  // Popular agents with distinctive colors
  'claude-code':    { id: 'claude-code',    name: 'Claude Code',     icon: '🤖',  color: c.orange },
  cursor:           { id: 'cursor',         name: 'Cursor',          icon: '🖱️',  color: c.sky },
  codex:            { id: 'codex',          name: 'Codex',           icon: '💻',  color: c.slate },
  'gemini-cli':     { id: 'gemini-cli',     name: 'Gemini CLI',      icon: '✨',  color: c.blue },
  'github-copilot': { id: 'github-copilot', name: 'GitHub Copilot',  icon: '🐙',  color: c.violet },
  windsurf:         { id: 'windsurf',       name: 'Windsurf',        icon: '🏄',  color: c.teal },
  continue:         { id: 'continue',       name: 'Continue',        icon: '▶️',  color: c.emerald },
  antigravity:      { id: 'antigravity',    name: 'Antigravity',     icon: '🌌',  color: c.purple },
  augment:          { id: 'augment',        name: 'Augment',         icon: '⚡',  color: c.amber },
  bob:              { id: 'bob',            name: 'IBM Bob',         icon: '🤝',  color: c.cyan },
  codebuddy:        { id: 'codebuddy',      name: 'CodeBuddy',       icon: '👥',  color: c.green },
  openclaw:         { id: 'openclaw',       name: 'OpenClaw',        icon: '🦀',  color: c.red },
  universal:        { id: 'universal',      name: 'Universal',       icon: '🌐',  color: c.indigo },

  // Long tail — cycle through remaining colors so each has a recognizable hue
  adal:           { id: 'adal',           name: 'AdaL',           icon: '🔷',  color: c.blue },
  amp:            { id: 'amp',            name: 'Amp',            icon: '🔉',  color: c.fuchsia },
  cline:          { id: 'cline',          name: 'Cline',          icon: '🧭',  color: c.rose },
  commandcode:    { id: 'commandcode',    name: 'Command Code',   icon: '⌨️',  color: c.slate },
  cortex:         { id: 'cortex',         name: 'Cortex Code',    icon: '🧠',  color: c.pink },
  crush:          { id: 'crush',          name: 'Crush',          icon: '💥',  color: c.red },
  deepagents:     { id: 'deepagents',     name: 'Deep Agents',    icon: '🔬',  color: c.teal },
  droid:          { id: 'droid',          name: 'Droid',          icon: '🦾',  color: c.slate },
  firebender:     { id: 'firebender',     name: 'Firebender',     icon: '🔥',  color: c.orange },
  goose:          { id: 'goose',          name: 'Goose',          icon: '🪿',  color: c.amber },
  'iflow-cli':    { id: 'iflow-cli',      name: 'iFlow CLI',      icon: '➡️',  color: c.blue },
  junie:          { id: 'junie',          name: 'Junie',          icon: '🌼',  color: c.yellow },
  kilo:           { id: 'kilo',           name: 'Kilo Code',      icon: '🎯',  color: c.lime },
  'kimi-cli':     { id: 'kimi-cli',       name: 'Kimi Code CLI',  icon: '🌙',  color: c.violet },
  'kiro-cli':     { id: 'kiro-cli',       name: 'Kiro CLI',       icon: '🟢',  color: c.emerald },
  kode:           { id: 'kode',           name: 'Kode',           icon: '📘',  color: c.blue },
  mcpjam:         { id: 'mcpjam',         name: 'MCPJam',         icon: '🎛️',  color: c.purple },
  'mistral-vibe': { id: 'mistral-vibe',   name: 'Mistral Vibe',   icon: '🌬️',  color: c.cyan },
  mux:            { id: 'mux',            name: 'Mux',            icon: '🔀',  color: c.fuchsia },
  neovate:        { id: 'neovate',        name: 'Neovate',        icon: '♻️',  color: c.green },
  opencode:       { id: 'opencode',       name: 'OpenCode',       icon: '📖',  color: c.sky },
  openhands:      { id: 'openhands',      name: 'OpenHands',      icon: '🖐️',  color: c.pink },
  pi:             { id: 'pi',             name: 'Pi',             icon: 'π',   color: c.rose },
  pochi:          { id: 'pochi',          name: 'Pochi',          icon: '🐼',  color: c.slate },
  qoder:          { id: 'qoder',          name: 'Qoder',          icon: '❓',  color: c.purple },
  'qwen-code':    { id: 'qwen-code',      name: 'Qwen Code',      icon: '📜',  color: c.amber },
  replit:         { id: 'replit',         name: 'Replit',         icon: '🔁',  color: c.orange },
  roo:            { id: 'roo',            name: 'Roo Code',       icon: '🦘',  color: c.yellow },
  trae:           { id: 'trae',           name: 'Trae',           icon: '🔺',  color: c.red },
  'trae-cn':      { id: 'trae-cn',        name: 'Trae CN',        icon: '🔻',  color: c.rose },
  warp:           { id: 'warp',           name: 'Warp',           icon: '⏩',  color: c.violet },
  zencoder:       { id: 'zencoder',       name: 'Zencoder',       icon: '🧘',  color: c.teal },

  unknown: { id: 'unknown', name: '未知', icon: '❔', color: c.gray },
}

// Sidebar filter order — popular first, then alphabetical, universal last.
export const AGENT_ORDER: AgentId[] = [
  'claude-code',
  'cursor',
  'codex',
  'gemini-cli',
  'github-copilot',
  'windsurf',
  'continue',
  'adal',
  'amp',
  'antigravity',
  'augment',
  'bob',
  'cline',
  'codebuddy',
  'commandcode',
  'cortex',
  'crush',
  'deepagents',
  'droid',
  'firebender',
  'goose',
  'iflow-cli',
  'junie',
  'kilo',
  'kimi-cli',
  'kiro-cli',
  'kode',
  'mcpjam',
  'mistral-vibe',
  'mux',
  'neovate',
  'opencode',
  'openclaw',
  'openhands',
  'pi',
  'pochi',
  'qoder',
  'qwen-code',
  'replit',
  'roo',
  'trae',
  'trae-cn',
  'warp',
  'zencoder',
  'universal',
  'unknown',
]

export function getAgentMeta(id: string): AgentMeta {
  return AGENT_META[id as AgentId] || AGENT_META.unknown
}
