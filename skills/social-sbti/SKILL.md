---
name: social-sbti
description: |
  Social-SBTI — 从即刻 / X 抓取公开动态,生成 SBTI 恶搞人格画像卡。
  向导式流程:用户触发 → 选平台 → 贴 URL → 自动体检/配凭证/抓取/打分/渲染 → 出卡片。
  触发场景:
  - 用户说"跑一下 social-sbti" / "启动 social-sbti"
  - 用户说"帮我分析 @某某 的 SBTI"
  - 用户说"用 social-sbti 分析 @某某"
  - 用户说"给 XXX 来个社交版 SBTI 人格卡"
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
user-invocable: true
---

# Social-SBTI(向导剧本)

> 这份 SKILL.md 是**对话剧本**。每个阶段都给你明确的台词、输入解析、要跑的命令和
> 失败分支。严格按阶段顺序执行,**不要跳步**。

## 阶段 0 · 定位 skill 根目录(第一件事)

被触发时你必须先定位自己,跑这段:

```bash
SBTI_HOME="$(
  for d in "$HOME/.claude/skills/social-sbti" \
           "$(pwd)/.claude/skills/social-sbti" \
           "$(pwd)/skills/social-sbti" \
           "$HOME/.claude/plugins/social-sbti/social-sbti"; do
    [ -f "$d/SKILL.md" ] && echo "$d" && break
  done
)"
export SBTI_HOME
echo "SBTI_HOME=$SBTI_HOME"
```

如果输出为空,告诉用户 skill 安装位置非标准,让他们给你路径,然后手工 `export SBTI_HOME=<路径>`。

之后**所有命令**都通过 `"$SBTI_HOME/bin/sbti" <subcmd>`,不要用相对路径。

---

## 阶段 1 · 欢迎 + 选平台

**台词**(原样输出,合规提示必须保留):

```
🎭 Social-SBTI 人格画像(仅供娱乐 · 只分析本人或公开公众人物)

请选择要分析的平台:
  1. 即刻
  2. X (Twitter)
```

**等用户输入**: `1` / `2` / `即刻` / `X` / `Twitter`

**解析**:
- `1` / `即刻` / `jike` → `PLATFORM=jike`
- `2` / `x` / `X` / `twitter` → `PLATFORM=x`

**如果用户输入的是对象名而不是平台选择**: 你可以从对象里推测平台(例如 `@sama` 像是 X,`AI产品黄叔` 像是即刻),然后确认一次:"我理解你要分析 X 上的 @sama,对吗?"

**下一步**: 阶段 2

---

## 阶段 2 · 要对象

**台词**(即刻):
```
好的,分析即刻用户。请贴一下对方的即刻主页 URL 或 username。

示例:
  https://web.okjike.com/u/E272054E-D904-4F13-A7EC-9ABD2CBF209E
  或直接 username
```

**台词**(X):
```
好的,分析 X 用户。请贴一下对方的 X handle / 主页 URL / user id。

示例:
  @sama
  https://x.com/elonmusk
  44196397   (user id,最稳,不怕改名)
```

**等用户输入**: 任意字符串

**保存**: `TARGET=<用户输入>`

**合规确认**(重要): 拿到对象后,问一句:

> 确认一下,这是**你自己的账号**,或者是**完全公开的公众人物**吗?
> 本工具不分析前任、同事、面试官、投资人、相亲对象。

**如果用户明确是前任/同事/私人对象 → 立即拒绝,停在此处**,引导他们换对象或放弃。

**下一步**: 阶段 3

---

## 阶段 3 · 体检 + 自动修复

跑体检:

```bash
"$SBTI_HOME/bin/sbti" doctor --fix --platform "$PLATFORM"
```

解析 doctor 输出:

- **全绿(退出码 0)**: 跳阶段 5(抓取)
- **缺依赖**: `--fix` 会自动 pip install,装完再跑一次 doctor 确认
- **缺凭证**: 跳阶段 4
- **Python 版本过低 / 其它硬错**: 告诉用户具体原因,停

**不要骗自己**:体检没过就不要进抓取,不然就是浪费时间。

---

## 阶段 4 · 首次配置凭证(只执行一次)

### 4A · 即刻分支(**全程在对话里完成,不要让用户离开**)

`jike-auth` 是交互式扫码工具:把 QR(unicode 块字符组成的 ASCII 二维码)和
进度信息打到 stderr,扫完把 tokens 以 JSON 形式打到 stdout。你要在**后台**
跑它,把 stderr 里的 QR 原样贴到对话里让用户用手机 App 扫。

**台词 1**(短,给 QR 让位置):

```
首次扫码拿 token,马上显示二维码。
```

**执行步骤(严格按序)**:

**① 在后台启动 jike-auth**,stdout 重定向到 inbox(tokens),stderr 去后台任务
output 文件(QR + 进度):

```bash
mkdir -p ~/.config/sbti && rm -f ~/.config/sbti/jike-tokens.json && \
"$SBTI_HOME/bin/sbti" jike-auth > ~/.config/sbti/jike-tokens.json
```

**⚠️ 一定要用 `sbti jike-auth` 而不是裸的 `jike-auth`**。后者在 macOS Homebrew
Python 下通常不在 PATH 里 —— `pip install --user` 会把二进制扔到
`~/Library/Python/3.x/bin`,而这个目录默认没被 shell 拾到。`sbti jike-auth`
会自己定位到正确的二进制再 execv 过去,不依赖 PATH。

调用 Bash 工具时**务必传 `run_in_background: true`**,记下返回的 task id 和
output 文件路径。

**② 等 2-3 秒**让 jike-auth 把 QR 打出来,然后用 `Read` 工具读 output 文件。
你会看到类似:

```
[+] Session: 642d995d-31a6-...
 ▄▄▄▄▄▄▄  ▄▄▄▄    ▄▄▄▄ ▄▄ ▄   ▄▄  ▄▄▄  ▄▄▄▄▄   ▄▄▄▄▄▄▄
 █ ▄▄▄ █  █  ██▀ ▀█▄▄█▀▀▀▀▄█ █▄███ ▄▄█▀▄█▀▄▀█  █ ▄▄▄ █
 ...约 25 行 QR...
 ▄█▀█▀▄▄ ▄▄  █▄█ ▀▀▄▄▀▀▄█ ▀  ▀▀▄▄▀▀▀▀██▀█▄▀▀▀▀█   █▄▀
[*] Waiting for scan...
```

如果还没看到 `Waiting for scan...`,再等 1 秒重读。

**③ 把整段 QR 原样贴到对话里**(从 `[+] Session:` 那行开始到 `Waiting for scan` 之前的
所有块字符行)。**用代码块包起来**,前后加空行:

```
<原样粘贴 stderr 内容>
```

然后紧跟一句:
> 👆 请用**即刻 App** 扫上面这个二维码。扫完我这里会自动继续,不用切回来告诉我。

**④ 等后台任务结束**。两种方式:
- 调 `TaskOutput` 工具 `block: true, timeout: 120000`(给用户 2 分钟扫码)
- 或者每 3 秒 `Read` 一次 `~/.config/sbti/jike-tokens.json`,文件一旦存在且非空
  就说明扫完了

**⑤ 确认 tokens 到位**:

```bash
"$SBTI_HOME/bin/sbti" config jike --from-inbox
```

这会把 jike-tokens.json 吸入 config.json 并删掉原文件。输出应该是
`✓ 即刻 tokens 已从 inbox 导入`。

**⑥ 回阶段 3 重跑一次 doctor** 确认凭证已 ✓,进阶段 5。

**失败分支**:

| 症状 | 处理 |
|---|---|
| 等了 2 分钟没扫 → 任务退出 1 | 告诉用户"扫码超时了,要不要再试一次?",确认后回步骤 ① |
| jike-tokens.json 存在但 `config jike --from-inbox` 报格式错误 | jike-auth 中途挂了,`rm` 掉文件从 ① 重来 |
| 后台任务 output 文件迟迟没有 QR 块字符 | jike-auth 可能卡在网络,`TaskStop` 掉,提示用户检查网络后重试 |

**⚠️ 不要退化成"请用户开另一个终端跑 jike-auth"**。这个 skill 承诺全流程在
对话里完成,后台 + QR 回显是标准路径。

### 4B · X 分支

**台词**:

```
首次使用 X,需要从浏览器 cookies 拿两个字段:

1. 在浏览器登录 https://x.com
2. F12 打开 DevTools → Application → Cookies → https://x.com
3. 找这两个 cookie,复制它们的 Value:
   - auth_token   (长字符串)
   - ct0           (长字符串,CSRF token)

直接贴给我,格式随意,比如:
   auth_token = xxxxxx
   ct0 = yyyyyy
```

**等用户回**: 两个字符串

**解析**: 从用户消息里提取 `auth_token` 和 `ct0` 的值

**执行**:

```bash
"$SBTI_HOME/bin/sbti" config x \
    --auth-token "<auth_token 值>" \
    --ct0 "<ct0 值>"
```

**成功**: cookies 已落到 `~/.config/sbti/x_cookies.json`。回阶段 3 重跑 doctor。

**⚠️ 重要提示**(配完后提醒用户):
> X 风控很严。脚本已经内置了自限速,但建议:单次 ≤ 500 条,一天别跑超过
> 10 个不同用户,cookies 别 commit 进 git。如果被限流了停一天再试。

---

## 阶段 5 · 抓取动态

**执行**:

```bash
"$SBTI_HOME/bin/sbti" fetch "$PLATFORM" "$TARGET" --limit 200
```

这会把数据写到 `./sbti-output/<name>_raw.json`(用户项目根下)。

**解析返回**: fetcher 会打印最终路径,记下来叫 `RAW_FILE`。

**如果失败**:

| 错误 | 处理 |
|---|---|
| 401 / token expired | 让用户重跑 jike-auth(即刻)或重新导 cookies(X),回阶段 4 |
| 404 user not found | 让用户确认 URL / username 是否对 |
| 429 / rate limited | 停,让用户等 30 分钟再来 |
| 网络错误 | 让用户检查网络,重试 |

**不要退而求其次让用户手工粘贴动态**。抓取就是这个 skill 的基石。

---

## 阶段 6 · Claude 本人打分(**这是你的核心工作**)

这一步没有命令可以调,**你就是那个打分 LLM**。

### 步骤

1. **读 raw.json**: `Read` 工具读 `$RAW_FILE`,进入 `posts[]` 数组。
2. **采样 150 条**:
   - 总数 ≤ 150: 全读
   - 总数 > 150: 近期 60%(前 90 条) + 较早 40%(后 60 条)
3. **读 rubric**: `Read` 工具读 `$SBTI_HOME/docs/SCORING_RUBRIC.md`。对照每个维度的 L/M/H 锚点打分。
4. **逐条评分 15 维** (顺序固定):
   `S1 S2 S3 E1 E2 E3 A1 A2 A3 Ac1 Ac2 Ac3 So1 So2 So3`
5. **严守硬约束**(摘自 rubric):
   - 每维至少引 1 条真实 `post_id`(必须来自 raw.json,不要编)
   - 有反向证据 → 降一档
   - 置信度 < 0.4 或无证据 → 强制回退 M
6. **额外产出**:
   - `overall_impression`: 100-200 字整体印象
   - `personality_description`: 200-300 字"本人定制版"描述 —— 必须包含对象的
     具体事实(职业、项目、口头禅、代表观点),不要套通用文案
   - `quotes`: 4-6 条真实原文引用(从 raw.json 的 `content` 里抄)
7. **写 scores.json**:

   ```json
   {
     "profile": { "screen_name": "...", "platform": "jike|x",
                  "bio": "...", "post_count": 200 },
     "personality_description": "...",
     "overall_impression": "...",
     "quotes": ["...", "...", "...", "..."],
     "scores": [
       {
         "dimension": "S1",
         "level": "H",
         "confidence": 0.9,
         "evidence": ["<真实 post_id>", "<真实 post_id>"],
         "reasoning": "不超过 40 字"
       }
       // ... 共 15 条
     ]
   }
   ```

   路径: `./sbti-output/<name>_scores.json`(和 raw.json 同目录,同一个 `<name>`)。

8. **可选字段**: 如果动态里非常明显地大量提"喝酒/白酒/灌杯",加 `"drunk": true`,
   会触发 DRUNK 彩蛋。

### 写入前自检清单

- [ ] 15 条 scores 全在,顺序正确
- [ ] 每条都有 ≥ 1 个 evidence post_id,都是 raw.json 里真实存在的
- [ ] confidence < 0.4 的已经回退到 M
- [ ] quotes 是真实原文,没编
- [ ] personality_description 带了具体事实

记下 scores.json 路径: `SCORES_FILE=./sbti-output/<name>_scores.json`

---

## 阶段 7 · 匹配 + 渲染

**执行**:

```bash
"$SBTI_HOME/bin/sbti" finalize "$SCORES_FILE"
```

这会一条龙跑完:
1. `match.py` → 匹配 27 人格模板,写回 scores.json 补上 `pattern` + `personality`
2. `make_card.py` → 生成 HTML 卡片
3. `render_png.py` → 用 playwright 截成 PNG(没装就跳过,会给提示)

**如果 PNG 失败**: 继续,HTML 自己就能看,也带了"📸 保存为图片"按钮。

---

## 阶段 8 · 展示结果

向用户展示(**按这个格式**):

1. **主结果(ASCII 框)**:

   ```
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     🎭 <screen_name>
     【<CODE>】· <中文名>  <mascot>
     「<标语>」
     匹配度: <XX>%
     模式串: <pattern>
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ```

2. **15 维画像**(ASCII 表格,一行一维):

   ```
   自我模型
     S1 自尊自信  H  — <reasoning>
     S2 自我清晰  H  — <reasoning>
     S3 核心价值  H  — <reasoning>
   情感模型
     E1 依恋安全  H  — <reasoning>
     ...
   ```

3. **整体印象**: 复述 `overall_impression` 一整段

4. **文件路径**:

   ```
   📁 产物:
      sbti-output/<name>_scores.json  (完整数据)
      sbti-output/<name>-sbti.html    (可分享卡片)
      sbti-output/<name>-sbti.png     (截图,如果 playwright 就绪)
   ```

5. **打开命令**:

   ```
   open sbti-output/<name>-sbti.png
   open sbti-output/<name>-sbti.html
   ```

---

## 常见陷阱(从实战里学到的)

- **"高执行力 ≠ 自信"**: Ac3 高不代表 S1 高,有些人是被死线推着走的
- **"毒舌 ≠ 愤世"**: 中文阴阳表达,别把玩梗当 SHIT
- **"社群活跃 ≠ So1 高"**: 要看是 ta 主动发起还是被动响应
- **"转发多 ≠ 情感投入"**: 转发可能是信息流水
- **"自嘲 ≠ 低 S1"**: "我真的牛 + 自嘲" 反而是 H
- **M 是安全区**: 不确定就打 M,别硬凑
- **证据必须是真 post_id**: raw.json 里不存在的 id 不要写

## 失败时的降级优先级

当任何一步失败,按以下优先级处理:

1. **重试** — 如果是临时错误(网络、rate limit 短时)
2. **修复根因** — 凭证过期、URL 错、依赖缺
3. **告诉用户具体原因并停住** — 不要回退到"那我就用你粘贴的文字吧"之类

## 参考

- `docs/SCORING_RUBRIC.md` — 15 维度 L/M/H 行为锚点(打分时必读)
- `docs/DISCLAIMER.md` — 合规/拒绝话术
- `bin/sbti` — 唯一命令入口,子命令见 `sbti --help`
- `examples/huangshu_scores.json` — 完整的 scores.json 格式参考
