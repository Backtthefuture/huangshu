# 黄叔开源 Skill 集合

> 为 [Claude Code](https://docs.anthropic.com/en/docs/claude-code) 打造的实用 Skill，开箱即用。

## Skill 目录

| Skill | 说明 | 使用场景 | 安装命令 |
|-------|------|---------|---------|
| [私董会（advisory-board）](skills/advisory-board/) | 12 位顶级思想家组成的商业决策智囊团 | 面临重大商业决策，需要多视角碰撞 | `npx skills add Backtthefuture/huangshu --skill advisory-board` |
| [Social-SBTI（social-sbti）](skills/social-sbti/) | 基于社交媒体公开动态生成恶搞人格卡（27 型 × 15 维） | 给自己或公开公众人物做娱乐向人格画像 | `npx skills add Backtthefuture/huangshu --skill social-sbti` |

> 点击 Skill 名称进入对应目录，里面有**核心特色 / 触发方式 / 运行效果 / 手动安装**的完整说明。

**关于 `npx skills add` 命令：**

- 不加 `--skill` 参数会弹出交互式选单，适合浏览全部 Skill
- 加上 `--skill <name>` 直接安装指定 Skill，跳过选单
- 需要完全非交互（CI 场景）时追加 `-g -a claude-code -y`，例如：

  ```bash
  npx skills add Backtthefuture/huangshu --skill social-sbti -g -a claude-code -y
  ```

- 运行后按提示选择安装范围（全局 / 项目）和目标 Agent（Claude Code、Cursor、GitHub Copilot 等 40+ AI 编程助手）即可
- 命令由 [Vercel Labs `skills`](https://github.com/vercel-labs/skills) 提供

## 🛠️ 工具（Tools）

除了 Skill 本体，这里还收录黄叔自用的 Skill 周边工具。

| 工具 | 说明 | 启动方式 |
|-----|------|---------|
| [Skill Hub](tools/skill-hub/) | 本地 Web UI，扫描全机器所有 Claude Skills，可视化编辑、去重、相似检测、版本快照 | `npx github:Backtthefuture/skillmanager` |

> 一行 `npx` 命令走的是独立仓库 [`skillmanager`](https://github.com/Backtthefuture/skillmanager)（npx 不支持从 monorepo 子目录拉取）。`tools/skill-hub/` 是源码镜像，方便在合集里查阅和贡献。

## 贡献

欢迎提交 Issue 和 PR。如果你基于这些 Skill 做了有趣的改造，也欢迎分享。

## 许可

MIT License
