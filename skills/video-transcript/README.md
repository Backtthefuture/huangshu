# video-transcript — 视频逐字稿提取 Skill

把 B 站 / 抖音 / 小红书 / YouTube 视频自动转成**严格逐字稿**（保留口语词、网络梗、停顿）。
全程在你电脑后台跑，**不弹窗、不要登录视频网站**。

---

## ⚡ 一键安装（macOS 推荐）

复制下面这一行，粘贴到终端回车，全程跟着提示按回车就行：

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/Backtthefuture/huangshu/main/skills/video-transcript/bootstrap.sh)
```

引导脚本会自动：
1. 把 skill 文件拉到 `~/.claude/skills/video-transcript/`（优先 `npx skills add`，回退 git，再回退 tarball）
2. 检查/安装 ffmpeg（必要时连 Homebrew 一起装）
3. 装 `yt-dlp` + `playwright` + Chromium 浏览器引擎（~300MB）
4. **引导你填写豆包 API Key**（见下方「申请 API Key」）
5. 跑 `--doctor` 自检

完成后在 Claude Code 里就能用 `/video-transcript <视频链接>`。

### 标准两步安装（与 huangshu 其他 skill 风格一致）

```bash
# 1. 拉 skill 文件
npx skills add Backtthefuture/huangshu --skill video-transcript -a claude-code -g -y

# 2. 装系统依赖 + 配 API Key
bash ~/.claude/skills/video-transcript/install.sh
```

### 老手手动 4 步

```bash
brew install ffmpeg
pip3 install --break-system-packages -r ~/.claude/skills/video-transcript/requirements.txt
python3 -m playwright install chromium
echo "DOUBAO_API_KEY=你的key" > ~/.claude/skills/video-transcript/.env
```

---

## 🔑 申请豆包 API Key（3 分钟）

需要 1 把 Key + 1 个开通了的模型，不用创建接入点。

### 1. 注册/登录火山引擎
👉 https://console.volcengine.com（支付宝/微信扫码免费注册）

### 2. ⚠️ 开通模型（这步不能跳）
- 控制台搜 **「火山方舟」**
- 进入 **「模型广场」**
- 找到 **`Doubao-Seed-2.0-pro`** → 点 **「开通」**（免费）

> 没开通的话，调用会返回 *"模型未授权"*。

### 3. 创建 API Key
- 控制台 → **「API Key 管理」** → **「创建 API Key」**
- 复制那串 36 位 UUID（形如 `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`）

直接 👉 https://console.volcengine.com/ark/region:ark+cn-beijing/apiKey

把 Key 粘贴给 `install.sh`（或手动写到 `~/.claude/skills/video-transcript/.env`）即可。

---

## 🚀 用法

### 在 Claude Code 里
```
/video-transcript <视频 URL>
```

支持：
- B 站：`https://www.bilibili.com/video/BVxxx`
- 抖音：`https://www.douyin.com/video/xxx` 或 `https://v.douyin.com/xxx`
- 小红书：`https://www.xiaohongshu.com/discovery/item/xxx` 或短链 `xhslink.com/xxx`
- YouTube：`https://youtube.com/watch?v=xxx`
- 本地文件：`/path/to/video.mp4`

### 终端直接跑
```bash
python3 ~/.claude/skills/video-transcript/scripts/transcript.py "<URL>"
```

### 实际体验
跑命令时会看到：
```
[Step 0/3] 探测视频元信息...
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
然后自动跑 下载 → 切片 → 压缩 → 转录 → 合并，全程无人值守。

---

## 📝 输出

逐字稿默认**两个去处**：
1. **stdout**：完整 Markdown 直接打印（适合 Claude Code 直接展示，或 `| pbcopy`）
2. **落盘**：`~/.claude/skills/video-transcript/outputs/<标题>_transcript.md`

格式示例：
```markdown
# 视频标题

> 时长 5:32 | 来源: <URL>

## 1. 引入话题 [00:00 - 00:42]
大家好，今天我们要聊的是...

## 2. 核心观点 [00:42 - 02:15]
那么我的看法是这样的，首先...
```

特性：
- **严格逐字**：保留语气词（"呃""啊""那"）、口语、网络梗，不总结改写
- **语义分段**：按主题自动切 3-8 段，每段一个小标题
- **段落级时间戳**：`[MM:SS - MM:SS]` 方便定位
- **长视频自动分段**：超 8 分钟切成 6 分钟/段独立转录，规避模型概括

---

## 🛠 命令行选项

| 参数 | 说明 |
|---|---|
| `input` | 视频 URL 或本地文件路径（必需，`--doctor` 时不需要） |
| `--title` | 视频标题（默认用探测到的标题） |
| `--target-size` | 压缩目标大小 MB，默认 30 |
| `--no-save` | 不写 .md 文件（默认会保存） |
| `--output-dir` | 改输出目录 |
| `--doctor` | 体检模式：检查所有依赖+配置 |

---

## 🩺 故障排查

```bash
python3 ~/.claude/skills/video-transcript/scripts/transcript.py --doctor
```

会逐项检查：ffmpeg / ffprobe / Python / yt-dlp / playwright / chromium / .env / API Key / 模型配置，缺啥说啥。

### 常见问题

| 现象 | 处理 |
|---|---|
| `[ERROR] 没找到豆包 API Key` | 检查 `.env` 是否存在并填了 `DOUBAO_API_KEY` |
| API 报 "模型未授权" / 401 | 火山方舟控制台 → 模型广场 → 给 Doubao-Seed-2.0-pro 点"开通" |
| 抖音/小红书抓不到视频 | 平台前端可能改版，参考 `FALLBACK.md` 手动方案 |
| B 站 yt-dlp 报 412 | 正常，已自动 fallback 到 headless 浏览器，不用管 |
| 长视频被概括而不是逐字 | 已自动分段处理；如仍概括请提 issue 附上 URL |
| `playwright` 报 chromium 找不到 | `python3 -m playwright install chromium` |
| Chromium 下载失败 | 国内网络问题；可设代理或重试 |

---

## 🏗 架构

```
~/.claude/skills/video-transcript/
├── SKILL.md                      ← Claude Code 入口文档
├── README.md                     ← (本文件)
├── FALLBACK.md                   ← 抓取失效时的人工兜底
├── install.sh                    ← 一键安装向导
├── bootstrap.sh                  ← 一行命令入口(三档兜底拉 skill + 跑 install.sh)
├── requirements.txt              ← Python 依赖列表
├── .env                          ← 用户私有配置(API Key)，.gitignore
├── .gitignore
├── outputs/                      ← 逐字稿落盘目录
└── scripts/
    ├── transcript.py             ← 主流程(--doctor 体检 / probe / 切片 / 合并)
    └── platform_extractor.py     ← 抖音/小红书/B 站 headless 直链抓取
```

流程：
```
探测元信息(headless,拿 title+duration+直链 URL)
  ↓
打印评估表(平台/标题/时长/分段/预估耗时)
  ↓
下载(复用探测拿到的直链,不重启浏览器)
  ↓
长视频(>8min)切片 → 每段独立压缩(目标 30MB,智能选分辨率)
  ↓
逐段调豆包 API,严格逐字 prompt
  ↓
合并各段 + 时间戳偏移修正
  ↓
stdout + 落盘 outputs/
```

---

## 📦 手动安装（不想用 install.sh）

```bash
# 0. 把 skill 拷贝到 ~/.claude/skills/video-transcript/

# 1. ffmpeg
brew install ffmpeg

# 2. Python 包
pip install --break-system-packages -r ~/.claude/skills/video-transcript/requirements.txt

# 3. Chromium
python3 -m playwright install chromium

# 4. 配置 .env
cat > ~/.claude/skills/video-transcript/.env <<'EOF'
DOUBAO_API_KEY=你的-36位-API-key
DOUBAO_MODEL=doubao-seed-2-0-pro-260215
EOF
chmod 600 ~/.claude/skills/video-transcript/.env

# 5. 体检
python3 ~/.claude/skills/video-transcript/scripts/transcript.py --doctor
```

---

## 🔒 隐私

- API Key 只存在你本地的 `.env`，权限 600（只有你能读），`.gitignore` 已屏蔽
- 视频走豆包 API 转录，按字符计费（视频理解约 ~0.0008 元/秒）
- 不会上传任何视频到第三方网站

---

## 🤝 反馈

平台前端改版导致抓取失效是常态。遇到失败：
1. 跑 `--doctor`
2. 看 `FALLBACK.md` 手动绕开
3. 提 issue 附上 URL + 报错日志
