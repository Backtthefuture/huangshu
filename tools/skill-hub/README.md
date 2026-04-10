# Skill Hub

> 黄叔的 Claude Skill 可视化管理器 — 一键扫描并管理你机器上所有 Claude Agent Skills。

## 它解决了什么问题

当你装了几十个 Skill 后，你会遇到：

- 同名 Skill 散落在不同目录（`~/.claude/skills/`、各个项目的 `skills/`）
- 想改个 Skill 得手动翻目录
- 不知道哪些是全局、哪些是项目私有，哪些重复了
- 改坏了想回滚，没有版本历史

Skill Hub 是一个本地 Web UI：扫描全盘、聚合展示、可视化编辑、自动版本快照。

## 快速开始（一行命令）

```bash
npx github:Backtthefuture/skillmanager
```

首次运行会自动：
1. 下载代码到 npx 缓存
2. 安装依赖
3. 构建前端与服务端
4. 启动服务并打开浏览器到 `http://localhost:3456`

要求：Node.js ≥ 20。

> **说明**：一行 npx 命令走的是独立仓库 [`skillmanager`](https://github.com/Backtthefuture/skillmanager)（npx 不支持从 monorepo 子目录拉取）。本目录是源码镜像，方便你在 `huangshu` 合集里查阅和修改。

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

- `PORT` — 自定义端口（默认 3456）
- `SKILL_HUB_NO_OPEN=1` — 启动时不自动打开浏览器

## 目录结构

- `server/` — Fastify 后端（API + WebSocket + 文件监听）
- `web/` — React + Vite + Tailwind 前端
- `bin/` — CLI 入口与首次安装构建脚本

## 许可

MIT
