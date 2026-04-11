import path from 'path'

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

export interface AgentDef {
  id: AgentId
  name: string
  icon: string
  globalPaths: string[]
  projectPaths: string[]
}

/**
 * Registry of all supported agents. Mirrors the Supported Agents table from
 * https://www.npmjs.com/package/skills (42 agents as of 2026-04).
 *
 * Design rules:
 *
 * 1. `~/.agents/skills/` (global) and `.agents/skills/` (project) are the
 *    shared universal paths used by Amp / Kimi / Replit / Codex / Cline /
 *    Warp / Cursor / Deep Agents / Firebender / Gemini CLI / GitHub Copilot /
 *    OpenCode — we can't tell them apart at the filesystem level, so we
 *    attribute them to the `universal` pseudo-agent. Agents in that group
 *    declare only their UNIQUE global path (e.g. `~/.cursor/skills/`) here;
 *    their shared project path is handled by `universal.projectPaths`.
 *
 * 2. Agents with no unique scan location (cline / warp / amp / kimi-cli /
 *    replit) still appear in the registry with empty path arrays so that
 *    frontmatter `agent: cline` is a valid override.
 *
 * 3. OpenClaw's project path is a bare `skills/` which would false-positive
 *    on any repo with a top-level skills dir. We skip it — only the global
 *    path is scanned.
 *
 * 4. trae + trae-cn share `.trae/skills/` as project path. Attributed to
 *    `trae` (alphabetically first); trae-cn is distinguishable only via
 *    its unique global path or frontmatter override.
 */
export const AGENTS: AgentDef[] = [
  // Most popular first
  {
    id: 'claude-code',
    name: 'Claude Code',
    icon: '🤖',
    globalPaths: ['.claude/skills'],
    projectPaths: ['.claude/skills'],
  },
  {
    id: 'cursor',
    name: 'Cursor',
    icon: '🖱️',
    globalPaths: ['.cursor/skills'],
    projectPaths: [],
  },
  {
    id: 'codex',
    name: 'Codex',
    icon: '💻',
    globalPaths: ['.codex/skills'],
    projectPaths: [],
  },
  {
    id: 'gemini-cli',
    name: 'Gemini CLI',
    icon: '✨',
    globalPaths: ['.gemini/skills'],
    projectPaths: [],
  },
  {
    id: 'github-copilot',
    name: 'GitHub Copilot',
    icon: '🐙',
    globalPaths: ['.copilot/skills'],
    projectPaths: [],
  },
  {
    id: 'windsurf',
    name: 'Windsurf',
    icon: '🏄',
    globalPaths: ['.codeium/windsurf/skills'],
    projectPaths: ['.windsurf/skills'],
  },
  {
    id: 'continue',
    name: 'Continue',
    icon: '▶️',
    globalPaths: ['.continue/skills'],
    projectPaths: ['.continue/skills'],
  },

  // Rest in alphabetical order
  {
    id: 'adal',
    name: 'AdaL',
    icon: '🔷',
    globalPaths: ['.adal/skills'],
    projectPaths: ['.adal/skills'],
  },
  {
    id: 'amp',
    name: 'Amp',
    icon: '🔉',
    globalPaths: [],
    projectPaths: [],
  },
  {
    id: 'antigravity',
    name: 'Antigravity',
    icon: '🌌',
    globalPaths: ['.gemini/antigravity/skills'],
    projectPaths: ['.antigravity/skills'],
  },
  {
    id: 'augment',
    name: 'Augment',
    icon: '⚡',
    globalPaths: ['.augment/skills'],
    projectPaths: ['.augment/skills'],
  },
  {
    id: 'bob',
    name: 'IBM Bob',
    icon: '🤝',
    globalPaths: ['.bob/skills'],
    projectPaths: ['.bob/skills'],
  },
  {
    id: 'cline',
    name: 'Cline',
    icon: '🧭',
    globalPaths: [],
    projectPaths: [],
  },
  {
    id: 'codebuddy',
    name: 'CodeBuddy',
    icon: '👥',
    globalPaths: ['.codebuddy/skills'],
    projectPaths: ['.codebuddy/skills'],
  },
  {
    id: 'commandcode',
    name: 'Command Code',
    icon: '⌨️',
    globalPaths: ['.commandcode/skills'],
    projectPaths: ['.commandcode/skills'],
  },
  {
    id: 'cortex',
    name: 'Cortex Code',
    icon: '🧠',
    globalPaths: ['.snowflake/cortex/skills'],
    projectPaths: ['.cortex/skills'],
  },
  {
    id: 'crush',
    name: 'Crush',
    icon: '💥',
    globalPaths: ['.config/crush/skills'],
    projectPaths: ['.crush/skills'],
  },
  {
    id: 'deepagents',
    name: 'Deep Agents',
    icon: '🔬',
    globalPaths: ['.deepagents/agent/skills'],
    projectPaths: [],
  },
  {
    id: 'droid',
    name: 'Droid',
    icon: '🦾',
    globalPaths: ['.factory/skills'],
    projectPaths: ['.factory/skills'],
  },
  {
    id: 'firebender',
    name: 'Firebender',
    icon: '🔥',
    globalPaths: ['.firebender/skills'],
    projectPaths: [],
  },
  {
    id: 'goose',
    name: 'Goose',
    icon: '🪿',
    globalPaths: ['.config/goose/skills'],
    projectPaths: ['.goose/skills'],
  },
  {
    id: 'iflow-cli',
    name: 'iFlow CLI',
    icon: '➡️',
    globalPaths: ['.iflow/skills'],
    projectPaths: ['.iflow/skills'],
  },
  {
    id: 'junie',
    name: 'Junie',
    icon: '🌼',
    globalPaths: ['.junie/skills'],
    projectPaths: ['.junie/skills'],
  },
  {
    id: 'kilo',
    name: 'Kilo Code',
    icon: '🎯',
    globalPaths: ['.kilocode/skills'],
    projectPaths: ['.kilocode/skills'],
  },
  {
    id: 'kimi-cli',
    name: 'Kimi Code CLI',
    icon: '🌙',
    globalPaths: [],
    projectPaths: [],
  },
  {
    id: 'kiro-cli',
    name: 'Kiro CLI',
    icon: '🟢',
    globalPaths: ['.kiro/skills'],
    projectPaths: ['.kiro/skills'],
  },
  {
    id: 'kode',
    name: 'Kode',
    icon: '📘',
    globalPaths: ['.kode/skills'],
    projectPaths: ['.kode/skills'],
  },
  {
    id: 'mcpjam',
    name: 'MCPJam',
    icon: '🎛️',
    globalPaths: ['.mcpjam/skills'],
    projectPaths: ['.mcpjam/skills'],
  },
  {
    id: 'mistral-vibe',
    name: 'Mistral Vibe',
    icon: '🌬️',
    globalPaths: ['.vibe/skills'],
    projectPaths: ['.vibe/skills'],
  },
  {
    id: 'mux',
    name: 'Mux',
    icon: '🔀',
    globalPaths: ['.mux/skills'],
    projectPaths: ['.mux/skills'],
  },
  {
    id: 'neovate',
    name: 'Neovate',
    icon: '♻️',
    globalPaths: ['.neovate/skills'],
    projectPaths: ['.neovate/skills'],
  },
  {
    id: 'opencode',
    name: 'OpenCode',
    icon: '📖',
    globalPaths: ['.config/opencode/skills'],
    projectPaths: [],
  },
  {
    id: 'openclaw',
    name: 'OpenClaw',
    icon: '🦀',
    globalPaths: ['.openclaw/skills'],
    projectPaths: [],
  },
  {
    id: 'openhands',
    name: 'OpenHands',
    icon: '🖐️',
    globalPaths: ['.openhands/skills'],
    projectPaths: ['.openhands/skills'],
  },
  {
    id: 'pi',
    name: 'Pi',
    icon: 'π',
    globalPaths: ['.pi/agent/skills'],
    projectPaths: ['.pi/skills'],
  },
  {
    id: 'pochi',
    name: 'Pochi',
    icon: '🐼',
    globalPaths: ['.pochi/skills'],
    projectPaths: ['.pochi/skills'],
  },
  {
    id: 'qoder',
    name: 'Qoder',
    icon: '❓',
    globalPaths: ['.qoder/skills'],
    projectPaths: ['.qoder/skills'],
  },
  {
    id: 'qwen-code',
    name: 'Qwen Code',
    icon: '📜',
    globalPaths: ['.qwen/skills'],
    projectPaths: ['.qwen/skills'],
  },
  {
    id: 'replit',
    name: 'Replit',
    icon: '🔁',
    globalPaths: [],
    projectPaths: [],
  },
  {
    id: 'roo',
    name: 'Roo Code',
    icon: '🦘',
    globalPaths: ['.roo/skills'],
    projectPaths: ['.roo/skills'],
  },
  {
    id: 'trae',
    name: 'Trae',
    icon: '🔺',
    globalPaths: ['.trae/skills'],
    projectPaths: ['.trae/skills'],
  },
  {
    id: 'trae-cn',
    name: 'Trae CN',
    icon: '🔻',
    globalPaths: ['.trae-cn/skills'],
    projectPaths: [], // shares `.trae/skills/` with trae
  },
  {
    id: 'warp',
    name: 'Warp',
    icon: '⏩',
    globalPaths: [],
    projectPaths: [],
  },
  {
    id: 'zencoder',
    name: 'Zencoder',
    icon: '🧘',
    globalPaths: ['.zencoder/skills'],
    projectPaths: ['.zencoder/skills'],
  },

  // Catch-all for shared .agents/skills paths. MUST stay last so other
  // agents' project paths get scanned first in registry order (not that it
  // matters today, but future agents may claim overlapping paths).
  {
    id: 'universal',
    name: 'Universal (Amp/Codex/Cline/Warp/Cursor/…)',
    icon: '🌐',
    globalPaths: ['.agents/skills', '.config/agents/skills'],
    projectPaths: ['.agents/skills'],
  },
]

const VALID_AGENT_IDS = new Set<string>(AGENTS.map((a) => a.id))

export function isValidAgentId(s: string): s is AgentId {
  return VALID_AGENT_IDS.has(s)
}

export function allAgentProjectRelPaths(): string[] {
  const set = new Set<string>()
  for (const a of AGENTS) for (const p of a.projectPaths) set.add(p)
  return Array.from(set)
}

export function allAgentGlobalAbsPaths(homedir: string): { agent: AgentDef; path: string }[] {
  const out: { agent: AgentDef; path: string }[] = []
  for (const a of AGENTS) for (const rel of a.globalPaths) out.push({ agent: a, path: path.join(homedir, rel) })
  return out
}
