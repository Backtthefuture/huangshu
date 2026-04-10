---
name: social-sbti
description: |
  Social-SBTI — 基于社交媒体公开动态为本人或授权公众人物生成 SBTI 人格卡。
  输入不是问卷,而是抓到的动态 JSON:抓取动态 → 15 维度打分 → 模板匹配 → 生成 HTML + PNG。
  触发场景:
  - 用户说"帮我分析 @某某 的 SBTI"
  - 用户说"给 XXX 来个社交版 SBTI 人格卡"
  - 用户说"基于即刻/X/微博动态测 SBTI"
  - 用户提供动态 JSON 文件说"打个 SBTI 分"
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
user-invocable: true
---

# Social-SBTI Skill

> 这是一个**娱乐**工具。仅用于测试本人账号、或用户明确授权的公开公众人物。
> 不要用来分析前任、面试官、投资人、相亲对象、同事 —— 拒绝后果自负。

## 首次使用前(Claude 先执行)

所有 Python 脚本都在 `skills/social-sbti/src/` 下,依赖写在 `skills/social-sbti/requirements.txt`。
第一次运行时执行:

```bash
pip install -r skills/social-sbti/requirements.txt
# 如果要生成 PNG,还需要一次性装 chromium:
playwright install chromium
```

## 目录约定

- **skill 代码**: `skills/social-sbti/`(只读,不要往里写数据)
- **运行产物**: `./sbti-output/` (用户项目根下,跑完可以 gitignore)
  - `<name>_raw.json` — fetcher 抓到的原始动态
  - `<name>_scores.json` — Claude 打分的结果(主工件)
  - `<name>-sbti.html` — 最终卡片
  - `<name>-sbti.png` — 截图(可选)

开始时先:
```bash
mkdir -p sbti-output
```

## 合规守则(每次运行必须执行)

1. 开场白必须包含:**"本工具仅供娱乐。只分析你自己或明确授权的公开公众人物。"**
2. 如果用户让你分析明显的私人/非公开对象(前任、同事、亲戚、陌生匿名号),
   **直接拒绝**,并引导他们回到合法用法。参考 `skills/social-sbti/docs/DISCLAIMER.md`。
3. 生成的 HTML 页脚必须保留"仅供娱乐 · 零科学依据"。

## 五步流程

### Step 1 · 确认对象 & 平台

询问或确认:
- **对象**: 谁?(账号名 / 用户名 / 本人)
- **平台**: 即刻 / X / 微博 / 小红书
- **授权**: "这是你自己的账号,或对方是完全公开的公众人物吗?"

如果对象不符合合规要求,在此步就停住。

### Step 2 · 抓取动态

根据平台使用对应 fetcher:

| 平台 | 脚本 | 备注 |
|------|------|------|
| 即刻 | `skills/social-sbti/src/fetch_jike.py` | 需要 access_token / refresh_token |
| X    | `skills/social-sbti/src/fetch_x.py`    | 需要 twikit 登录,见 `skills/social-sbti/X_SETUP.md` |
| 微博 | (未来) | |
| 小红书 | (未来) | |

输出统一 schema:
```json
{
  "profile": {"screen_name": "...", "platform": "jike", "bio": "...", "post_count": 200},
  "posts": [{"id":"...","content":"...","created_at":"..."}, ...]
}
```

保存到 `./sbti-output/<name>_raw.json`。

### Step 3 · 你(Claude)直接打分

**这是这个 skill 最关键的一步 —— 不调 LLM API,你就是那个 LLM。**

1. 读取 Step 2 的 raw.json,通读 150 条动态(按时间分层采样:近期 60% + 较早 40%)。
2. 打开 `skills/social-sbti/docs/SCORING_RUBRIC.md`,对照 15 个维度的 L/M/H 锚点逐条打分。
3. 严守硬约束:
   - 每个维度至少引用 1 条 `post_id` 作为证据
   - 有明确反向证据时,降一档
   - 置信度 < 0.4 或无证据 → 强制 M
4. 额外产出:
   - `overall_impression`: 100-200 字一句话整体印象
   - `personality_description`: 200-300 字"本人定制版"的人格描述
     (不要照抄通用文案,要带对象身上的具体事实)
   - `quotes`: 选 4-6 条最有信息量的原文引用

把结果写成 `./sbti-output/<name>_scores.json`。

**scores.json schema:**
```json
{
  "profile": {"screen_name":"...","platform":"jike","bio":"...","post_count":200},
  "personality_description": "...",
  "overall_impression": "...",
  "quotes": ["...","..."],
  "scores": [
    {
      "dimension": "S1",
      "level": "H",
      "confidence": 0.9,
      "evidence": ["6953c49f","69bcf3c6"],
      "reasoning": "不超过 40 字的中文理由"
    }
    // ... 共 15 条,顺序固定: S1 S2 S3 E1 E2 E3 A1 A2 A3 Ac1 Ac2 Ac3 So1 So2 So3
  ]
}
```

可选字段:
- `"drunk": true` — 对象动态里非常明显地大量提"喝酒""白酒""灌杯",直接触发 DRUNK 彩蛋。

### Step 4 · 匹配人格模板

```bash
python3 skills/social-sbti/src/match.py ./sbti-output/<name>_scores.json
```

这一步会在 scores.json 里补写 `pattern` 和 `personality` 字段,并在终端打印
匹配结果(代号 / 中文名 / 匹配度 / 模式串)。

### Step 5 · 渲染 HTML + PNG

```bash
python3 skills/social-sbti/src/make_card.py ./sbti-output/<name>_scores.json
# → ./sbti-output/<name>-sbti.html

python3 skills/social-sbti/src/render_png.py ./sbti-output/<name>-sbti.html
# → ./sbti-output/<name>-sbti.png
```

`render_png.py` 需要 playwright,如果用户没装就跳过 PNG 这步,只给 HTML,
并提示 HTML 里自带"📸 保存为图片"按钮可以在浏览器里一键导出。

### Step 6 · 展示结果

向用户展示:

1. **人格代号 + 中文名 + 匹配度**(ASCII 框):
   ```
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     🎭 <对象名>
     【CODE】· <中文名>  <mascot>
     「<标语>」
     匹配度: XX%
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ```

2. **15 维度表格**(ASCII,一行一维):
   ```
   S1  自尊自信   H  —— 短理由
   S2  自我清晰   H  —— 短理由
   ...
   ```

3. **文件路径**: HTML + PNG(在 `./sbti-output/` 下)

4. **打开命令**:
   ```
   open ./sbti-output/<name>-sbti.html
   ```

## 常见陷阱(从实战里学到的)

- **"高执行力 ≠ 自信"**: 一个人 Ac3 很高不代表 S1 高,有些人是被死线推着走的。
- **"毒舌 ≠ 愤世"**: 中文互联网常见阴阳表达,别把玩梗当 SHIT。
- **"社群活跃 ≠ So1 高"**: 要看是 ta 主动发起,还是被动响应别人。
- **"转发多 ≠ 情感投入"**: 有些账号转发是信息流水,不是情感卷入。
- **"自嘲 ≠ 低 S1"**: 如果是"我真的牛 + 自嘲"的组合,S1 反而是 H。
- **M 是安全区**: 不确定就打 M,别为了好看硬凑 H/L。

## 参考文件

- `skills/social-sbti/docs/SCORING_RUBRIC.md` — 15 维度 L/M/H 行为锚点 + 硬约束
- `skills/social-sbti/docs/DISCLAIMER.md` — 合规文案 & 拒绝话术
- `skills/social-sbti/src/personalities.py` — 27 人格元数据(代号/中文/标语/吉祥物/模板串)
- `skills/social-sbti/src/match.py` — 曼哈顿距离匹配
- `skills/social-sbti/src/make_card.py` — scores.json → HTML 通用渲染器
- `skills/social-sbti/templates/card.html` — HTML 模板
- `skills/social-sbti/data/huangshu_scores.json` — 参考样例
