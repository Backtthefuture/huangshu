# 黄叔开源 Skill 集合

> 为 [Claude Code](https://docs.anthropic.com/en/docs/claude-code) 打造的实用 Skill，开箱即用。

## Skill 目录

| Skill | 说明 | 使用场景 | 一键安装（Claude Code） |
|-------|------|---------|---------|
| [私董会（advisory-board）](skills/advisory-board/) | 12 位顶级思想家组成的商业决策智囊团 | 面临重大商业决策，需要多视角碰撞 | `npx skills add Backtthefuture/huangshu --skill advisory-board -a claude-code -g -y` |
| [Social-SBTI（social-sbti）](skills/social-sbti/) | 基于社交媒体公开动态生成恶搞人格卡（27 型 × 15 维） | 给自己或公开公众人物做娱乐向人格画像 | `npx skills add Backtthefuture/huangshu --skill social-sbti -a claude-code -g -y` |
| [视频逐字稿（video-transcript）](skills/video-transcript/) | B 站/抖音/小红书/YouTube 视频自动转严格逐字稿（豆包视频理解，headless 后台抓取，长视频自动分段） | 把视频内容转成可搜索/可引用的文字稿，做笔记、做素材、做总结 | `bash <(curl -fsSL https://raw.githubusercontent.com/Backtthefuture/huangshu/main/skills/video-transcript/bootstrap.sh)` |

> 点击 Skill 名称进入对应目录，里面有**核心特色 / 触发方式 / 运行效果 / 手动安装**的完整说明。
>
> **video-transcript 用 `bootstrap.sh` 而不是 `npx skills add`** —— 因为它需要装系统依赖（ffmpeg / Chromium）和配豆包 API Key，引导脚本会一条龙搞定。如果你只想拉 skill 文件不要安装向导，也可以用 `npx skills add Backtthefuture/huangshu --skill video-transcript -a claude-code -g -y`，然后手动跑 `~/.claude/skills/video-transcript/install.sh`。

**⚠️ `-a claude-code` 这个参数不能省**。`npx skills add` 是 [Vercel Labs `skills`](https://github.com/vercel-labs/skills) CLI，支持 40+ AI 编程助手，**默认装到通用路径 `.agents/skills/`**，而 Claude Code 只扫 `~/.claude/skills/`（全局）和 `.claude/skills/`（项目）两个位置。不加 `-a claude-code` 的话，skill 装了但 Claude Code 看不见。

**关于 `npx skills add` 命令：**

- `--skill <name>` — 直接安装指定 Skill，跳过交互式选单
- `-a claude-code` — 告诉 CLI 目标是 Claude Code（走 `.claude/skills/` 路径）
- `-g` — 装到全局 `~/.claude/skills/`（所有项目可用）；不加就装到当前项目的 `.claude/skills/`
- `-y` — 跳过确认提示，完全非交互

命令跑完后，**重启 Claude Code**（完全退出再打开），skill 才会被加载。

## 🛠️ 工具（Tools）

除了 Skill 本体，这里还收录黄叔自用的 Skill 周边工具。

| 工具 | 说明 | 首次安装 | 再次启动 |
|-----|------|---------|---------|
| [Skill Hub](tools/skill-hub/) | 本地 Web UI，扫描全机器所有 Claude Skills，可视化编辑、去重、相似检测、版本快照、7 天回收站 | `npm install -g https://github.com/Backtthefuture/huangshu/raw/main/tools/skill-hub/release/claude-skill-hub.tgz && skill-hub` | `skill-hub` |

> 装的是 `tools/skill-hub/release/claude-skill-hub.tgz` 这个预构建 tarball（绕开 `npm install -g github:...` 在 npm 11 + node 24 上的悬空软链 bug）。每次 skill-hub 源码变更后 tarball 会同步重打。
>
> 首次装完会自动启动并打开浏览器；之后任何时候只要在终端敲 `skill-hub` 就能重新启动，或者直接访问 `http://localhost:3456`（如果服务还在跑）。更新到最新版本：再跑一次首次安装的那条命令即可。

## 贡献

欢迎提交 Issue 和 PR。如果你基于这些 Skill 做了有趣的改造，也欢迎分享。

## 许可

MIT License
