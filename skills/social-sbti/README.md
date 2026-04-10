# Social-SBTI

基于社交媒体公开动态生成 SBTI 人格画像卡的 Claude Code Skill。

> ⚠️ **仅供娱乐**。只分析你自己的账号、或用户明确授权的公开公众人物。
> 详见 [`docs/DISCLAIMER.md`](docs/DISCLAIMER.md)。

## 功能

- ✅ 27 种恶搞人格 + 15 维度打分体系
- ✅ Claude 本人直接读动态打分(零 API key 门槛)
- ✅ 统一模板匹配(`src/match.py`)+ HTML 渲染(`src/make_card.py`)
- ✅ 可选 playwright 截图成 PNG
- ✅ 内置即刻 / X fetcher
- ⏳ 微博 / 小红书 fetcher(待补)

## 安装

作为 `huangshu` 合集的一部分,推荐命令:

```bash
# 直接装 social-sbti,跳过选单
npx skills add Backtthefuture/huangshu --skill social-sbti

# 完全非交互(全局 + Claude Code)
npx skills add Backtthefuture/huangshu --skill social-sbti -g -a claude-code -y

# 或者浏览全部 Skill 后手动选
npx skills add Backtthefuture/huangshu
```

也可以手动:

```bash
git clone https://github.com/Backtthefuture/huangshu.git
cp -r huangshu/skills/social-sbti your-project/skills/
```

然后在项目 `CLAUDE.md` 里引用:

```markdown
## Skills
- social-sbti: `skills/social-sbti/SKILL.md`
```

## 使用方式

### 在 Claude Code 里(主推)

直接说:

```
帮我用 social-sbti 分析 @AI产品黄叔(即刻)
```

Claude 会按 `SKILL.md` 里的 5 步流程走:确认授权 → 抓动态 → 打分 → 匹配 → 渲染。

### Standalone CLI(调试/手工打分)

如果你手里已经有 `scores.json`(自己写或别的 LLM 打的),可以绕过 skill 直接用:

```bash
python3 skills/social-sbti/src/match.py     ./sbti-output/huangshu_scores.json
python3 skills/social-sbti/src/make_card.py ./sbti-output/huangshu_scores.json
python3 skills/social-sbti/src/render_png.py ./sbti-output/huangshu-sbti.html
```

`scores.json` 的格式见 [`docs/SCORING_RUBRIC.md`](docs/SCORING_RUBRIC.md)。

## Python 依赖

skill 核心(match / make_card / personalities)零依赖。
fetcher 和 PNG 渲染是可选的:

```bash
pip install -r skills/social-sbti/requirements.txt
playwright install chromium   # 需要生成 PNG 时
```

## 目录结构

```
skills/social-sbti/
├── SKILL.md                   # Claude Code skill 入口(Claude 会读这个)
├── README.md                  # 人类看的说明(就是本文件)
├── X_SETUP.md                 # X 平台登录配置
├── requirements.txt
├── docs/
│   ├── SCORING_RUBRIC.md      # 15 维打分锚点 & JSON schema
│   └── DISCLAIMER.md          # 合规/拒绝话术
├── src/
│   ├── personalities.py       # 27 人格元数据
│   ├── match.py               # 曼哈顿距离匹配
│   ├── make_card.py           # scores.json → HTML
│   ├── render_png.py          # HTML → PNG
│   ├── fetch_jike.py          # 即刻抓取
│   ├── fetch_x.py             # X 抓取
│   ├── twikit_patch.py        # X fetcher 辅助
│   └── analyze_sbti.py        # (legacy) 用 Anthropic API 自动打分
├── templates/
│   └── card.html              # HTML 模板
└── data/
    └── huangshu_scores.json   # 参考样例
```

## 为什么这样设计

- **零 API key 门槛**: Claude Code 里的 Claude 本人就是打分 LLM,用户不用额外申请 key。
- **每张卡都是"本人定制版"**: 描述文案由 Claude 现场基于对象身上的具体事实生成,不套通用模板。
- **一致性由 rubric 保证**: `docs/SCORING_RUBRIC.md` 是给任何 Claude agent 读的稳定指引。
- **合规前置**: SKILL.md 里写死拒绝逻辑,防止被拿来分析前任同事投资人。

## 许可

MIT(跟随 `huangshu` 仓库根目录 LICENSE)。
