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
  | 'hermes'
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
 * https://www.npmjs.com/package/skills (43 agents as of 2026-04).
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
    icon: '💽',
    globalPaths: ['.crush/skills'],
    projectPaths: ['.crush/skills'],
  },
  {
    id: 'deepagents',
    name: 'Deep Agents',
    icon: '🌊',
    globalPaths: [],
    projectPaths: [],
  },
  {
    id: 'droid',
    name: 'Droid',
    icon: '🤖',
    globalPaths: ['.droid/skills'],
    projectPaths: ['.droid/skills'],
  },
  {
    id: 'firebender',
    name: 'Firebender',
    icon: '🔥',
    globalPaths: [],
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
    id: 'goose',
    name: 'Goose',
    icon: '🪿',
    globalPaths: ['.goose/skills'],
    projectPaths: ['.goose/skills'],
  },
  {
    id: 'hermes',
    name: 'Hermes Agent',
    icon: '🔮',
    globalPaths: ['.hermes/skills'],
    projectPaths: [],
  },
  {
    id: 'iflow-cli',
    name: 'iFlow CLI',
    icon: '🌊',
    globalPaths: ['.iflow/skills'],
    projectPaths: ['.iflow/skills'],
  },
  {
    id: 'junie',
    name: 'Junie',
    icon: '🐱',
    globalPaths: ['.junie/skills'],
    projectPaths: ['.junie/skills'],
  },
  {
    id: 'kilo',
    name: 'Kilo Code',
    icon: '⚡',
    globalPaths: ['.kilo/skills'],
    projectPaths: ['.kilo/skills'],
  },
  {
    id: 'kimi-cli',
    name: 'Kimi CLI',
    icon: '🐱',
    globalPaths: [],
    projectPaths: [],
  },
  {
    id: 'kiro-cli',
    name: 'Kiro CLI',
    icon: '🔑',
    globalPaths: ['.kiro/skills'],
    projectPaths: ['.kiro/skills'],
  },
  {
    id: 'kode',
    name: 'Kode',
    icon: '💠',
    globalPaths: ['.kode/skills'],
    projectPaths: ['.kode/skills'],
  },
  {
    id: 'mcpjam',
    name: 'MCP Jam',
    icon: '🎵',
    globalPaths: ['.mcpjam/skills'],
    projectPaths: ['.mcpjam/skills'],
  },
  {
    id: 'mistral-vibe',
    name: 'Mistral Vibe',
    icon: '🌟',
    globalPaths: ['.mistral/vibe/skills'],
    projectPaths: ['.vibe/skills'],
  },
  {
    id: 'mux',
    name: 'Mux',
    icon: '🎬',
    globalPaths: ['.mux/skills'],
    projectPaths: ['.mux/skills'],
  },
  {
    id: 'neovate',
    name: 'Neovate',
    icon: '🚀',
    globalPaths: ['.neovate/skills'],
    projectPaths: ['.neovate/skills'],
  },
  {
    id: 'opencode',
    name: 'OpenCode',
    icon: '📝',
    globalPaths: [],
    projectPaths: [],
  },
  {
    id: 'openclaw',
    name: 'OpenClaw',
    icon: '🦜',
    globalPaths: ['.openclaw/skills'],
    projectPaths: [],
  },
  {
    id: 'openhands',
    name: 'OpenHands',
    icon: '✋',
    globalPaths: ['.openhands/skills'],
    projectPaths: ['.openhands/skills'],
  },
  {
    id: 'pi',
    name: 'Pi',
    icon: '🍀',
    globalPaths: ['.pi/skills'],
    projectPaths: ['.pi/skills'],
  },
  {
    id: 'pochi',
    name: 'Pochi',
    icon: '🐶',
    globalPaths: ['.pochi/skills'],
    projectPaths: ['.pochi/skills'],
  },
  {
    id: 'qoder',
    name: 'Qoder',
    icon: '💎',
    globalPaths: ['.qoder/skills'],
    projectPaths: ['.qoder/skills'],
  },
  {
    id: 'qwen-code',
    name: 'Qwen Code',
    icon: '🦄',
    globalPaths: ['.qwen-code/skills'],
    projectPaths: ['.qwen-code/skills'],
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
    name: 'Roo',
    icon: '🦘',
    globalPaths: ['.roo/skills'],
    projectPaths: ['.roo/skills'],
  },
  {
    id: 'trae',
    name: 'Trae',
    icon: '🌳',
    globalPaths: ['.trae/skills'],
    projectPaths: ['.trae/skills'],
  },
  {
    id: 'trae-cn',
    name: 'Trae CN',
    icon: '🌏',
    globalPaths: ['.trae-cn/skills'],
    projectPaths: ['.trae-cn/skills'],
  },
  {
    id: 'universal',
    name: 'Universal (Amp/Codex/Cline/Warp/Cursor/…)',
    icon: '🌐',
    globalPaths: ['.agents/skills', '.config/agents/skills'],
    projectPaths: ['.agents/skills'],
  },
  {
    id: 'warp',
    name: 'Warp',
    icon: '🚀',
    globalPaths: [],
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
    id: 'zencoder',
    name: 'Zencoder',
    icon: '🎬',
    globalPaths: ['.zencoder/skills'],
    projectPaths: ['.zencoder/skills'],
  },
]
