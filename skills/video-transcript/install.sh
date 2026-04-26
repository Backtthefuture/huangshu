#!/usr/bin/env bash
# video-transcript skill 一键安装向导(macOS)
# 用法:bash ~/.claude/skills/video-transcript/install.sh

set -e

SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SKILL_DIR/.env"

C_RESET='\033[0m'
C_BOLD='\033[1m'
C_GREEN='\033[32m'
C_YELLOW='\033[33m'
C_RED='\033[31m'
C_BLUE='\033[34m'
C_GRAY='\033[90m'

bar() { printf "${C_GRAY}═══════════════════════════════════════════════════════${C_RESET}\n"; }
sep() { printf "${C_GRAY}───────────────────────────────────────────────────────${C_RESET}\n"; }
ok()  { printf "  ${C_GREEN}✓${C_RESET} %s\n" "$1"; }
warn(){ printf "  ${C_YELLOW}⚠${C_RESET} %s\n" "$1"; }
err() { printf "  ${C_RED}✗${C_RESET} %s\n" "$1"; }
info(){ printf "  ${C_BLUE}ℹ${C_RESET} %s\n" "$1"; }
step(){ printf "\n${C_BOLD}[%s/%s] %s${C_RESET}\n" "$1" "$2" "$3"; }

# ── 仅支持 macOS ───────────────────────────────────────
if [[ "$(uname)" != "Darwin" ]]; then
  err "目前只支持 macOS。Linux/Windows 请看 README.md 手动安装。"
  exit 1
fi

# ── 欢迎 ────────────────────────────────────────────────
bar
printf "${C_BOLD}  🎬 视频逐字稿 Skill 安装向导${C_RESET}\n"
sep
echo "  把 B 站/抖音/小红书/YouTube 视频自动转成逐字稿"
echo "  全程在你电脑后台跑,不弹窗、不要登录视频网站"
echo ""
echo "  接下来 5 步,大约 5-10 分钟:"
echo "    [1/5] 检查/安装 ffmpeg(视频处理)"
echo "    [2/5] 检查 Python 3"
echo "    [3/5] 装 Python 工具(yt-dlp + playwright)"
echo "    [4/5] 下载浏览器引擎(Chromium, ~300MB)"
echo "    [5/5] 配置豆包 API Key"
bar
echo ""
read -r -p "  按回车继续 / Ctrl+C 取消..." _ < /dev/tty || true

# ── Step 1: ffmpeg ─────────────────────────────────────
step 1 5 "检查 ffmpeg"
if command -v ffmpeg >/dev/null 2>&1; then
  ok "ffmpeg 已装: $(ffmpeg -version 2>/dev/null | head -1 | awk '{print $3}')"
else
  warn "ffmpeg 未装,需要 Homebrew 帮忙"
  if ! command -v brew >/dev/null 2>&1; then
    warn "也没装 Homebrew,先帮你装它(macOS 标配工具)"
    info "下一步会让你输入 Mac 开机密码(看不到字符是正常的)"
    read -r -p "  按回车继续..." _ < /dev/tty || true
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    # 把 brew 加进当前 shell PATH
    if [[ -x /opt/homebrew/bin/brew ]]; then
      eval "$(/opt/homebrew/bin/brew shellenv)"
    elif [[ -x /usr/local/bin/brew ]]; then
      eval "$(/usr/local/bin/brew shellenv)"
    fi
  fi
  info "正在安装 ffmpeg(可能要 1-3 分钟)..."
  brew install ffmpeg
  ok "ffmpeg 装好了"
fi

# ── Step 2: Python 3 ────────────────────────────────────
step 2 5 "检查 Python 3"
if command -v python3 >/dev/null 2>&1; then
  PY_VER=$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}")')
  PY_OK=$(python3 -c 'import sys; print(1 if sys.version_info >= (3,8) else 0)')
  if [[ "$PY_OK" == "1" ]]; then
    ok "Python $PY_VER"
  else
    err "Python $PY_VER 太旧(需要 ≥ 3.8)。建议: brew install python@3.12"
    exit 1
  fi
else
  err "没找到 python3。建议: brew install python@3.12"
  exit 1
fi

# ── Step 3: pip 装 yt-dlp + playwright ─────────────────
step 3 5 "安装 Python 工具"
PIP_FLAGS="--break-system-packages --quiet"
info "yt-dlp ..."
python3 -m pip install $PIP_FLAGS --upgrade yt-dlp
ok "yt-dlp"

info "playwright ..."
python3 -m pip install $PIP_FLAGS --upgrade playwright
ok "playwright"

# ── Step 4: chromium ────────────────────────────────────
step 4 5 "下载 Chromium(playwright 用的浏览器引擎, ~300MB)"
info "国内网络可能稍慢,大概 1-3 分钟..."
python3 -m playwright install chromium
ok "Chromium 装好"

# ── Step 5: API Key ─────────────────────────────────────
step 5 5 "配置豆包 API Key"
sep
cat <<'EOF'
  这个工具用「豆包视频理解」做转录,需要你自己的 API Key。

  📌 申请步骤(3 分钟):

  ┌─ 1. 注册/登录火山引擎 ─────────────────────────────────┐
  │  https://console.volcengine.com                        │
  │  支付宝/微信扫码注册,免费                              │
  └────────────────────────────────────────────────────────┘

  ┌─ 2. 开通模型(很重要!) ───────────────────────────────┐
  │  控制台搜「火山方舟」→「模型广场」                     │
  │  找到 "Doubao-Seed-2.0-pro" → 点「开通」(免费)         │
  │  ⚠️  没开通的话,API Key 调用会报"模型未授权"           │
  └────────────────────────────────────────────────────────┘

  ┌─ 3. 创建 API Key ──────────────────────────────────────┐
  │  「API Key 管理」→ 创建 API Key → 复制(36 位 UUID)     │
  │  https://console.volcengine.com/ark/region:ark+cn-beijing/apiKey │
  └────────────────────────────────────────────────────────┘

EOF

# 尝试自动开网页
if command -v open >/dev/null 2>&1; then
  open "https://console.volcengine.com/ark/region:ark+cn-beijing/apiKey" 2>/dev/null || true
fi

echo ""
read -r -s -p "  请粘贴你的 API Key (输入时不显示是正常的): " API_KEY < /dev/tty
echo ""
if [[ -z "$API_KEY" ]]; then
  err "API Key 不能为空"
  exit 1
fi
if [[ ${#API_KEY} -lt 20 ]]; then
  warn "Key 长度看起来不对(${#API_KEY} 位,正常应是 36 位 UUID),仍然会写入,稍后用 --doctor 验证"
fi

read -r -p "  接入点 ID(回车用默认 doubao-seed-2-0-pro-260215): " MODEL_ID < /dev/tty
MODEL_ID="${MODEL_ID:-doubao-seed-2-0-pro-260215}"

cat > "$ENV_FILE" <<EOF
# video-transcript skill 配置
# 由 install.sh 生成于 $(date '+%Y-%m-%d %H:%M:%S')

DOUBAO_API_KEY=$API_KEY
DOUBAO_MODEL=$MODEL_ID
EOF
chmod 600 "$ENV_FILE"
ok "已写入 $ENV_FILE (chmod 600,只有你能读)"

# ── 完成 + 自检 ─────────────────────────────────────────
echo ""
bar
printf "${C_BOLD}  ✅ 安装完成,跑一次自检...${C_RESET}\n"
sep
python3 "$SKILL_DIR/scripts/transcript.py" --doctor

echo ""
bar
printf "${C_BOLD}  🎉 一切就绪!${C_RESET}\n"
sep
cat <<EOF
  试一下:
    在 Claude Code 里输入: /video-transcript <视频URL>

    或终端直接跑:
    python3 $SKILL_DIR/scripts/transcript.py <URL>

  逐字稿默认存到: $SKILL_DIR/outputs/

  常见问题: cat $SKILL_DIR/README.md
EOF
bar
