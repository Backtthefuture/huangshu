# Skill Hub

> 黄叔的 Claude Skill 可视化管理器 — 一键扫描并管理你机器上所有 Claude Agent Skills。

## 它解决了什么问题

当你装了几十个 Skill 后，你会遇到：

- 同名 Skill 散落在不同目录（`~/.claude/skills/`、插件、各个项目的 `.claude/skills/`）
- 想改个 Skill 得手动翻目录
- 不知道哪些是全局、哪些是项目私有、哪些来自插件、哪些重复了
- 改坏了想回滚，没有版本历史

Skill Hub 是一个本地 Web UI：扫描全盘、聚合展示、可视化编辑、自动版本快照。

## 快速开始（一行命令）

```bash
npm install -g https://github.com/Backtthefuture/skillmanager/raw/main/release/claude-skill-hub.tgz && skill-hub
```

首次运行会自动：
1. 下载预构建的 tarball 并全局安装
2. 安装运行期依赖
3. 启动服务并打开浏览器到 `http://localhost:3456`

**之后每次启动只要敲 `skill-hub` 就行**，不用再打这串长命令。

要求：Node.js ≥ 20。

> **为什么用 tarball URL 而不是 `github:user/repo`**：npm 11 + node 24 在 macOS 上通过 `npm install -g github:...` 全局安装时，会把包软链到 `~/.npm/_cacache/tmp/` 里的临时克隆目录，随后临时目录被清理、留下悬空符号链接导致 `skill-hub` 无法运行。直接装预构建 tarball 走的是真正的文件拷贝路径，完全绕开这个 bug。
>
> **更新到最新版**：再跑一次同样的命令即可。
>
> **卸载**：`npm uninstall -g claude-skill-hub`。

## 扫描覆盖的位置

- `~/.claude/skills/` — 全局 skill
- `~/.claude/plugins/**/skills/` — Claude Code 插件附带的 skill（递归扫描）
- `~/.claude/projects/*` 里注册过的项目 `.claude/skills/`
- 常见开发目录：`~/Documents`、`~/Projects`、`~/Developer`、`~/Code`、`~/code`、`~/workspace`、`~/dev`、`~/work`、`~/repos`、`~/src` 下一层的项目
- 当前工作目录及其向上 3 级目录的 `.claude/skills/`
- 环境变量 `SKILL_HUB_EXTRA_PATHS=/path/a:/path/b` 指定的额外路径

## 排查问题

如果发现扫到的 skill 数量不对、或者页面打开是白屏，访问：

```
http://localhost:3456/api/debug
```

返回 JSON 包含：node 版本、cwd、homedir、所有被扫的路径及每个路径的命中数、耗时、错误。报 bug 时发这份 JSON 即可快速定位。

## 本地开发

```bash
# 方式一：从独立仓库克隆
git clone https://github.com/Backtthefuture/skillmanager.git
cd skillmanager

# 方式二：从 huangshu 合集克隆
git clone https://github.com/Backtthefuture/huangshu.git
cd huangshu/tools/skill-hub

npm install
npm run dev       # 开发模式：前端 5173 + 后端 3456
```

生产模式：

```bash
npm run build
npm start
```

## 可选环境变量

- `PORT` — 自定义起始端口（默认 3456；占用时自动向上尝试到 3460）
- `SKILL_HUB_NO_OPEN=1` — 启动时不自动打开浏览器
- `SKILL_HUB_EXTRA_PATHS` — 额外的扫描路径，冒号或逗号分隔

## 目录结构

- `server/` — Fastify 后端（API + WebSocket + 文件监听 + 扫描器）
- `web/` — React + Vite + Tailwind 前端（含 ErrorBoundary）
- `bin/` — CLI 入口与首次安装构建脚本

## 许可

MIT
