# Social-SBTI

从即刻 / X 抓取公开动态,生成 SBTI 恶搞人格画像卡的 Claude Code Skill。
**向导式**流程:触发 → 选平台 → 贴 URL → 剩下全自动。

> ⚠️ **仅供娱乐**。只分析你自己的账号、或明确授权的公开公众人物。
> 详见 [`docs/DISCLAIMER.md`](docs/DISCLAIMER.md)。

## 这个 skill 做什么

**一句话**:喂一个即刻 username 或 X handle,吐给你一张可分享的人格卡(HTML + PNG)。

**触发一条命令,剩下全自动化**:

```
你: 跑一下 social-sbti

🎭  Social-SBTI 人格画像(仅供娱乐 · 只分析本人或公开公众人物)

    请选择要分析的平台:
      1. 即刻
      2. X (Twitter)

你: 1

🎭  请贴一下对方的即刻主页 URL 或 username

你: https://web.okjike.com/u/E272054E-...

🔧  检查依赖 + 凭证 (sbti doctor --fix)
📡  抓取 200 条动态 (sbti fetch jike ...)
🧠  Claude 本人读 150 条打分(对照 rubric,15 维 L/M/H)
🎯  匹配人格 + 渲染 (sbti finalize)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🎭 AI产品黄叔
  【CTRL】· 拿捏者  🎛️
  匹配度: 77%
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  [15 维画像]
  📁 sbti-output/huangshu-sbti.png
```

## 这个 skill **不**做什么

- ❌ 不支持手动粘贴文字 —— 没有可抓取的账号就不要用这个 skill
- ❌ 不支持自我问卷 —— 想测自己玩,用根目录的 `/sbti` 问卷版 skill(30 题选 ABC)
- ❌ 不分析前任、同事、面试官、投资人、相亲对象 —— skill 在对象确认阶段会拒绝

## 安装

作为 `huangshu` 合集的一部分:

```bash
# 直接装 social-sbti,跳过选单
npx skills add Backtthefuture/huangshu --skill social-sbti

# 完全非交互(全局 + Claude Code)
npx skills add Backtthefuture/huangshu --skill social-sbti -g -a claude-code -y
```

手动安装:

```bash
git clone https://github.com/Backtthefuture/huangshu.git
cp -r huangshu/skills/social-sbti your-project/.claude/skills/
```

## 首次使用

skill 自带**自动引导** —— 触发时 Claude 会跑 `sbti doctor --fix`,检测到缺啥就
带你现场补,只需要一次。

### 会自动处理的

- ✅ 缺 Python 包(`jike-skill` / `twikit` / `playwright`)→ `pip install`
- ✅ 缺 playwright chromium → `playwright install chromium`
- ✅ 缺即刻 tokens → 指引你在另一个终端跑 `jike-auth > ~/.config/sbti/jike-tokens.json`,自动吸入 config
- ✅ 缺 X cookies → 指引你从浏览器复制 `auth_token` + `ct0`,贴回来自动保存

### 只需要你做一次的事

- 即刻: **在另一个终端**扫码一次(`jike-auth > ~/.config/sbti/jike-tokens.json`)
- X: **在浏览器** DevTools 复制两个 cookie 值贴给 Claude 一次

配完就存在 `~/.config/sbti/` 里,后续用完全零配置。

## `sbti` CLI(Claude 调的后端,你手动也能调)

所有子命令统一入口 `bin/sbti`(纯 Python,自己定位 skill 根):

```bash
# 体检 + 自动修复
sbti doctor [--fix] [--platform jike|x|both]

# 管理凭证
sbti config show
sbti config jike --from-inbox                 # 从 ~/.config/sbti/jike-tokens.json 吸入
sbti config jike --access-token A --refresh-token R
sbti config x    --auth-token A --ct0 C

# 抓动态(结果写到 ./sbti-output/<name>_raw.json)
sbti fetch jike <username|url>  [--limit 200]
sbti fetch x    <handle|url|id> [--limit 200]

# 打分后的终章:match + HTML + PNG
sbti finalize ./sbti-output/<name>_scores.json [--no-png]
```

直接把 `bin/sbti` 加进 PATH(可选):

```bash
echo 'export PATH="$HOME/.claude/skills/social-sbti/bin:$PATH"' >> ~/.zshrc
```

## 目录结构

```
skills/social-sbti/
├── SKILL.md                   # Claude 读的对话剧本(向导式)
├── README.md                  # 你现在在看的文件
├── X_SETUP.md                 # X cookies 补救手册(通常不用看)
├── requirements.txt
├── bin/
│   └── sbti                   # 统一 CLI 入口(纯 Python)
├── docs/
│   ├── SCORING_RUBRIC.md      # 15 维打分锚点(Claude 打分时读)
│   └── DISCLAIMER.md          # 合规/拒绝话术
├── src/
│   ├── cli.py                 # argparse 主入口
│   ├── config.py              # ~/.config/sbti/ 读写
│   ├── doctor.py              # 体检 + 自动修复
│   ├── personalities.py       # 27 人格元数据(零依赖)
│   ├── match.py               # 曼哈顿距离匹配(零依赖)
│   ├── make_card.py           # scores.json → HTML(零依赖)
│   ├── render_png.py          # HTML → PNG (playwright)
│   ├── fetch_jike.py          # 即刻抓取
│   ├── fetch_x.py             # X 抓取
│   └── twikit_patch.py        # X fetcher 修补 patch
├── templates/
│   └── card.html              # 暖黄色竖版卡片模板
└── examples/
    └── huangshu_scores.json   # scores.json 的完整格式样例
```

## 运行产物位置

落到用户项目根的 `./sbti-output/` 下(不污染 skill 目录):

```
sbti-output/
├── <name>_raw.json        # fetcher 抓到的原始动态
├── <name>_scores.json     # Claude 打分的结果 + 人格匹配
├── <name>-sbti.html       # 最终卡片(浏览器打开,自带"📸 保存为图片")
└── <name>-sbti.png        # 分享图(playwright 渲染)
```

可以把 `sbti-output/` 加进你项目的 `.gitignore`。

## 持久化凭证位置

```
~/.config/sbti/
├── config.json            # 即刻 tokens + X cookies 路径(chmod 600)
└── x_cookies.json         # X 登录凭证(chmod 600)
```

**别 commit 这两个文件**。如果凭证过期,直接重跑阶段 4 对应的配置流程即可。

## 为什么这样设计

- **向导式一条路走到底**: 触发 → 选平台 → 贴 URL,用户只打 3 次字(首次多 1-2 次配凭证)
- **自动体检 + 自动修复**: `sbti doctor --fix` 一口气解决依赖问题,不用用户折腾 pip
- **纯数据驱动**: 不支持手动粘贴,不支持自我问卷。输入必须是抓到的真实动态,
  保证打分有据可查、每条证据都能引到真实的 `post_id`
- **Claude 本人打分,零 API key 门槛**: Claude Code 里的 Claude 就是打分 LLM
- **每张卡都是"本人定制版"**: Claude 现场基于对象的具体事实/口头禅/代表观点写描述
- **持久化凭证**: 第一次配完,后续零配置
- **合规前置**: SKILL.md 里写死拒绝逻辑,skill 在"合规确认"阶段就拦住

## 许可

MIT(跟随 `huangshu` 仓库根目录 LICENSE)。
