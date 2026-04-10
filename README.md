# 黄叔开源 Skill 集合

> 为 [Claude Code](https://docs.anthropic.com/en/docs/claude-code) 打造的实用 Skill，开箱即用。

## Skill 目录

| Skill | 说明 | 使用场景 | 安装命令 |
|-------|------|---------|---------|
| [私董会（advisory-board）](skills/advisory-board/) | 12 位顶级思想家组成的商业决策智囊团 | 面临重大商业决策，需要多视角碰撞 | `npx skills add Backtthefuture/huangshu --skill advisory-board` |
| [Social-SBTI（social-sbti）](skills/social-sbti/) | 基于社交媒体公开动态生成恶搞人格卡（27 型 × 15 维） | 给自己或公开公众人物做娱乐向人格画像 | `npx skills add Backtthefuture/huangshu --skill social-sbti` |

> 安装命令由 [Vercel Labs `skills`](https://github.com/vercel-labs/skills) 提供。
>
> - 不加 `--skill` 参数（`npx skills add Backtthefuture/huangshu`）会弹出交互式选单，适合浏览全部 Skill。
> - 加上 `--skill <name>` 可直接安装指定 Skill，跳过选单。
> - 需要完全非交互（CI 场景）时追加 `-g -a claude-code -y`，例如：
>
>   ```bash
>   npx skills add Backtthefuture/huangshu --skill social-sbti -g -a claude-code -y
>   ```
>
> 运行后按提示选择安装范围（全局 / 项目）和目标 Agent（Claude Code、Cursor、GitHub Copilot 等 40+ AI 编程助手）即可。

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

## Social-SBTI（社交版恶搞人格测试）

**一句话介绍**：MBTI 已经过时，SBTI 来了。读一个人的社交媒体公开动态，由 Claude 本人按 15 维度打分，匹配出 27 种恶搞人格里的一个（CTRL 拿捏者 / BOSS 领导者 / SHIT 愤世者 / DEAD 死者……），并生成一张可截图分享的竖版 HTML 卡片。

> ⚠️ **仅供娱乐**。只分析你自己或明确授权的公开公众人物，拒绝分析前任、同事、面试官、投资人、相亲对象。详见 [`skills/social-sbti/docs/DISCLAIMER.md`](skills/social-sbti/docs/DISCLAIMER.md)。

### 核心特色

- **27 种人格 × 15 维体系**：自我 / 情感 / 态度 / 行动驱力 / 社交 五组模型
- **Claude 本人打分，零 API key 门槛**：Claude Code 里的 Claude 直接读动态、对照 [`SCORING_RUBRIC.md`](skills/social-sbti/docs/SCORING_RUBRIC.md) 打 L/M/H
- **每张卡都是"本人定制版"**：描述文案基于对象身上的具体事实现场生成，不套通用模板
- **硬约束打分一致性**：每维必引 `post_id`、反向证据降档、置信度<0.4 强制回退 M
- **合规前置**：skill 入口就拒绝私人/非公开对象分析
- **HTML 分享卡片**：暖黄底色、雷达图、15 维解读、高信息量原话引用，自带"📸 保存为图片"按钮

### 触发方式

```
帮我用 social-sbti 分析 @AI产品黄叔（即刻）
给 vista8 来个社交版 SBTI
我把动态 JSON 给你了，帮我打个 SBTI 分
```

### 5 步流程

```
Step 1  确认对象 & 授权    →  合规检查，确保是本人或公开公众人物
Step 2  抓取动态           →  即刻 / X fetcher，统一 schema 到 sbti-output/
Step 3  Claude 直接打分    →  15 维 L/M/H + 证据 post_id + 定制描述
Step 4  匹配人格模板        →  曼哈顿距离 + 精确匹配数排序
Step 5  渲染 HTML + PNG    →  竖版卡片落到 sbti-output/
```

### 手动安装

```bash
git clone https://github.com/Backtthefuture/huangshu.git
cp -r huangshu/skills/social-sbti your-project/skills/
pip install -r skills/social-sbti/requirements.txt
```

然后在项目 `CLAUDE.md` 中引用：

```markdown
## Skills
- social-sbti：`skills/social-sbti/SKILL.md`
```

更多细节见 [`skills/social-sbti/README.md`](skills/social-sbti/README.md)。

---

## 贡献

欢迎提交 Issue 和 PR。如果你基于这些 Skill 做了有趣的改造，也欢迎分享。

## 许可

MIT License
