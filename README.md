# 黄叔开源 Skill 集合

> 为 [Claude Code](https://docs.anthropic.com/en/docs/claude-code) 打造的实用 Skill，开箱即用。

## 安装

```bash
npx skills add Backtthefuture/huangshu
```

按提示选择要安装的 Skill、安装范围（全局 / 项目）和目标 Agent 即可。

> 支持 Claude Code、Cursor、GitHub Copilot 等 40+ AI 编程助手，由 [Vercel Labs](https://github.com/vercel-labs/agent-skills) 维护。

## Skill 目录

| Skill | 说明 | 使用场景 |
|-------|------|---------|
| [私董会（advisory-board）](skills/advisory-board/) | 12 位顶级思想家组成的商业决策智囊团 | 面临重大商业决策，需要多视角碰撞 |

## 🛠️ 工具（Tools）

除了 Skill 本体，这里还收录黄叔自用的 Skill 周边工具。

| 工具 | 说明 | 启动方式 |
|-----|------|---------|
| [Skill Hub](tools/skill-hub/) | 本地 Web UI，扫描全机器所有 Claude Skills，可视化编辑、去重、版本快照 | `npx github:Backtthefuture/skillmanager` |

> 一行 `npx` 命令走的是独立仓库 [`skillmanager`](https://github.com/Backtthefuture/skillmanager)（npx 不支持从 monorepo 子目录拉取）。`tools/skill-hub/` 是源码镜像，方便在合集里查阅和贡献。

---

## 私董会（Advisory Board）

**一句话介绍**：把南添、Steve Jobs、毛泽东、Trump、张一鸣、Paul Graham、Taleb、Naval、Feynman、Munger、Elon Musk、Buffett 请到同一张桌子上，帮你把问题想透。

### 核心特色

- **12 位顾问**，每位保持独特的语气、思维框架和说话方式
- **结构化 5 阶段流程**：议题接收 → 信息补全 → 选席 → 发言与交锋 → 决议
- **自然张力对设计**：刻意安排观点碰撞（如 Taleb vs Musk、Jobs vs 毛选），产生深度洞察
- **红牌机制**：致命风险强制标注，确保不遗漏关键风险
- **HTML 可视化报告**：讨论结束后可一键生成交互式网页报告，白色背景、现代设计、手风琴卡片、对话气泡交锋

### 触发方式

```
私董会：要不要把个人IP转成公司化运营？
开私董会，聊聊定价策略的问题
请 Taleb 和 Musk 聊聊我这个 all-in 的想法
```

### 手动安装

如果不想用 `npx skills`，也可以手动操作：

```bash
# 方式一：克隆仓库后复制
git clone https://github.com/Backtthefuture/huangshu.git
cp -r huangshu/skills/advisory-board your-project/skills/

# 方式二：只下载单个 Skill
mkdir -p skills/advisory-board
curl -o skills/advisory-board/SKILL.md \
  https://raw.githubusercontent.com/Backtthefuture/huangshu/main/skills/advisory-board/SKILL.md
```

然后在项目根目录的 `CLAUDE.md` 中引用：

```markdown
## Skills
- 私董会（advisory-board）：`skills/advisory-board/SKILL.md`
```

### 运行效果

```
Phase 0  议题接收     →  复述核心问题，判断议题类型
Phase 1  信息补全     →  以顾问视角提 3-5 个关键澄清问题
Phase 2  选席        →  选 5-7 位顾问，标明核心张力对
Phase 3  第一轮发言   →  每位顾问用自己的语气给出判断
Phase 4  交锋        →  2-3 个分歧点的深度碰撞
Phase 5  决议        →  共识 / 分歧 / 风险地图 / 行动建议
Phase 6  可视化报告   →  生成交互式 HTML 网页（可选）
```

---

## 贡献

欢迎提交 Issue 和 PR。如果你基于这些 Skill 做了有趣的改造，也欢迎分享。

## 许可

MIT License
