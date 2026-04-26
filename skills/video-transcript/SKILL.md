---
name: video-transcript
description: |
  视频逐字稿提取专家(基于豆包视频理解模型)。支持 B 站 / 抖音 / 小红书 / YouTube 链接或本地视频。全程在用户电脑后台运行(headless),不弹窗、不要求登录视频网站。输出"语义分段 + 段落级时间戳"的严格逐字稿(保留口语词、网络梗、停顿),长视频自动分段处理避免被模型概括。
  触发场景:
  - 用户说"出逐字稿"、"提取逐字稿"、"转文字"、"视频转文字"
  - 用户说"听写视频"、"提取视频文案"、"视频字幕"
  - 用户使用 /video-transcript 命令
  - 用户贴一个视频链接(B站 / 抖音 / 小红书 / YouTube),意图是要文字版
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
user-invocable: true
---

# 视频逐字稿提取专家

> 输入视频链接或本地路径 → 自动探测 → 后台下载 → 切片 → 压缩 → 豆包转录 → 严格逐字稿(stdout + 落盘)

## 阶段 0 · 定位 skill 根目录(第一件事)

被触发时你必须先定位自己,跑这段:

```bash
VT_HOME="$(
  for d in "$HOME/.claude/skills/video-transcript" \
           "$(pwd)/.claude/skills/video-transcript" \
           "$(pwd)/skills/video-transcript" \
           "$HOME/.claude/plugins/video-transcript/video-transcript"; do
    [ -f "$d/SKILL.md" ] && echo "$d" && break
  done
)"
export VT_HOME
echo "VT_HOME=$VT_HOME"
```

如果输出为空,说明 skill 安装位置非标准。让用户给出路径,然后手工 `export VT_HOME=<路径>`。
之后**所有命令**都通过 `"$VT_HOME/scripts/transcript.py"`,不要用相对路径或绝对路径硬编码。

## 阶段 1 · 依赖体检(首次/可疑时)

第一次跑或者遇到报错时,先做体检:

```bash
python3 "$VT_HOME/scripts/transcript.py" --doctor
```

如果有 ✗ 项,告诉用户:
- 缺 ffmpeg / playwright / chromium / API Key 等 → 跑一键安装向导:
  ```bash
  bash "$VT_HOME/install.sh"
  ```
- 体检全 ✓ 才进入阶段 2。

## 阶段 2 · 触发方式与执行

用户给视频链接(URL 或本地路径)就直接跑:

```bash
python3 "$VT_HOME/scripts/transcript.py" "<URL或本地路径>"
```

支持的输入:
- B 站:`https://www.bilibili.com/video/BVxxx` 或 `b23.tv/xxx` 短链
- 抖音:`https://www.douyin.com/video/xxx`、`v.douyin.com/xxx`、`douyin.com/jingxuan?modal_id=xxx`
- 小红书:`xiaohongshu.com/discovery/item/xxx`、`xiaohongshu.com/explore/xxx`、`xhslink.com/xxx`
- YouTube:`youtube.com/watch?v=xxx`、`youtu.be/xxx`
- 本地视频文件路径

脚本自动:
0. **探测** — 启动 headless 浏览器,拿标题、时长、视频/音频直链;打印 📊 评估表 + 预估耗时
1. **下载** — 复用探测拿到的直链(不重启浏览器);B 站走 dash 流(分别下载 video/audio + ffmpeg 合并);其他平台直接 mp4
2. **长视频切片** — 总时长 > 8min 自动切成 6min/段,避免被模型概括成摘要
3. **压缩** — ffmpeg,目标 30MB;按时长自动选分辨率,一次到位
4. **转录** — 豆包视频理解 API,严格逐字 prompt(保留口语词、网络梗、停顿)
5. **合并** — 长视频合并各段输出 + 自动调整段头时间戳偏移

## 阶段 3 · 输出

**两个去处同时进行**:
1. **stdout 直出**:完整 Markdown 全文(供 agent 直接展示给用户)
2. **落盘**:`$VT_HOME/outputs/<标题>_transcript.md`(skill 自管,所有产出归一处)

**取消落盘**:`--no-save`
**改保存路径**:`--output-dir <path>`

### 评估表样例

```
═══════════════════════════════════════════════════════
  📊 视频探测
───────────────────────────────────────────────────────
  平台:      B 站
  标题:      在浙江和安徽之间，一座10万人的城市消失了
  时长:      17分12秒
  分段:      3 段(每段 ≤ 6 分钟)
  预估耗时:  3分20秒 ~ 5分25秒
═══════════════════════════════════════════════════════
```

### 输出格式样例

```markdown
# 视频标题

> 时长 5:32 | 来源: <URL或文件名>

## 1. 引入话题 [00:00 - 00:42]
大家好,今天我们要聊的是...

## 2. 核心观点 [00:42 - 02:15]
那么我的看法是这样的,首先...
```

特性:
- **语义分段**:按主题自动分 3-8 段,每段一个简短小标题
- **段落级时间戳**:每段开头标 `[MM:SS - MM:SS]`,定位方便
- **逐字转录**:保留口语词("呃""那""啊""就是")、网络梗、停顿,不总结、不改写
- **无人声段落**:用 `_(此处无人声,XX秒)_` 标注

## 阶段 4 · 异常处理

| 场景 | 处理 |
|---|---|
| `--doctor` 报缺依赖 | 跑 `bash "$VT_HOME/install.sh"` |
| `没找到豆包 API Key` | 检查 `$VT_HOME/.env`;没配过让用户跑 install.sh 引导填 Key |
| API 401 / "模型未授权" | 火山方舟控制台 → 模型广场 → 给 Doubao-Seed-2.0-pro 点"开通" |
| 抖音图文笔记(note 链接) | 提示用户不支持图文,仅支持视频 |
| 平台前端改版导致抓取失败 | 看 `$VT_HOME/FALLBACK.md` 走人工兜底 |
| 长视频被模型概括而非逐字 | 已自动处理(>8min 切片);仍出现请反馈 |
| 压缩后视频仍 > 50MB | 脚本自动迭代降码率/分辨率(最多 4 轮) |

## 命令行选项

| 参数 | 说明 |
|---|---|
| `input` | 视频 URL 或本地文件路径(必需,`--doctor` 时可省) |
| `--title` | 视频标题(默认用探测到的) |
| `--target-size` | 压缩目标大小 MB,默认 30 |
| `--no-save` | 不落盘 .md(默认会保存到 `$VT_HOME/outputs/`) |
| `--output-dir` | 改保存路径 |
| `--doctor` | 体检模式:检查依赖+配置 |

## Notes

- 豆包原生视频理解,模型直接听视频音频,无需独立 ASR
- 时间戳精度为段落级(不是词级/句级),用于章节定位
- 默认 stdout 直接输出 Markdown 全文(供上层 agent 展示);**同时**落盘
- 预估耗时模型(基于实测):headless 启动 10s + 下载(0.4s/视频秒) + 每段压缩 12s + 每段 API 30s,给 ±20% 范围
- API Key 配置存在 `$VT_HOME/.env`(权限 600,gitignore),不会随仓库分发
