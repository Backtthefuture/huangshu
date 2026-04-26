#!/usr/bin/env python3
"""
视频逐字稿提取工具(简化版)
- 支持B站/YouTube/小红书/抖音链接 或 本地视频文件
- 下载 + 压缩 + 豆包原生视频理解
- 只输出"语义分段 + 段落级时间戳"的 Markdown 逐字稿
"""

import argparse
import base64
import json
import math
import os
import re
import subprocess
import sys
import time
import ssl
import urllib.request
import urllib.error
from pathlib import Path

# macOS Python SSL 证书修复
SSL_CONTEXT = ssl.create_default_context()
SSL_CONTEXT.check_hostname = False
SSL_CONTEXT.verify_mode = ssl.CERT_NONE

# ─── 配置 ───────────────────────────────────────────────
SKILL_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_OUTPUT_DIR = os.path.join(SKILL_DIR, "outputs")
ENV_FILE = os.path.join(SKILL_DIR, ".env")


def _load_dotenv(path):
    """简单 .env 加载器:KEY=VALUE 格式,支持引号、注释、空行。"""
    if not os.path.exists(path):
        return
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" not in line:
                continue
            k, v = line.split("=", 1)
            k, v = k.strip(), v.strip()
            # 去掉引号
            if (v.startswith('"') and v.endswith('"')) or (v.startswith("'") and v.endswith("'")):
                v = v[1:-1]
            # 不覆盖已有的环境变量(让 shell export 优先)
            os.environ.setdefault(k, v)


_load_dotenv(ENV_FILE)


API_ENDPOINT = os.getenv("DOUBAO_API_ENDPOINT", "https://ark.cn-beijing.volces.com/api/v3/responses")
API_KEY = os.getenv("DOUBAO_API_KEY") or ""
MODEL = os.getenv("DOUBAO_MODEL", "doubao-seed-2-0-pro-260215")
MAX_RETRIES = 3
TARGET_SIZE_MB = 30     # 压缩目标大小(MB),base64后约40MB,留安全余量
API_MAX_MB = 50         # API base64上传大小上限(MB)
WORK_DIR = "/tmp/video-transcript"

# 长视频分段:超过 8 分钟切片,每段 6 分钟,避免模型对长视频做摘要
SEGMENT_THRESHOLD_SEC = 480
SEGMENT_SECONDS = 360


# ─── 逐字稿 Prompt ──────────────────────────────────────

TRANSCRIPT_PROMPT = """你是一名严格的视频转录员(不是摘要员、不是解说员)。

# 视频信息
- 文件名: {file_name}
- 总时长: {duration}秒

# 任务
转录视频中的所有人声,要求 **严格逐字**:
- 听到什么字就写什么字,**一字不漏、一字不改**。
- 保留语气词("呃""那个""啊""就是""然后""对吧"等)、停顿、重复、口误。
- 保留口语化表达、网络梗、方言用词,不要改成书面语。
- **绝对禁止**:概括、总结、改写、串联、归纳、改写为第三人称叙述。
- 反例(错):"他先去了 A,又去了 B"。正例(对):"好,那我们先去 A 看一下,然后我们再去 B"。

# 语义分段
按内容主题分 3-8 段,每段一个简短小标题(≤15 字),段头标注 `[MM:SS - MM:SS]`,基于你实际听到的视频内容。

# 无人声
某段时间内无人声(纯 BGM/画面),用 `_(此处无人声,XX秒)_` 标注。

# 输出格式
纯 Markdown,不要代码块包裹,不要任何前后说明。直接从 `## 1.` 开始。

现在开始严格逐字转录。"""


SEGMENT_TRANSCRIPT_PROMPT = """你是一名严格的视频转录员(不是摘要员、不是解说员)。

# 重要说明
这是从更长视频中切出来的 **第 {seg_index}/{seg_total} 段**(整体起始 {offset_mmss},此段时长 {duration}秒)。
请严格按 **本段视频内部时间**(从 00:00 开始)标注时间戳,不要做任何偏移——后续合并时会自动加偏移。

# 任务
转录 **本段视频** 中的所有人声,要求 **严格逐字**:
- 听到什么字就写什么字,**一字不漏、一字不改**。
- 保留语气词("呃""那个""啊""就是""然后""对吧"等)、停顿、重复、口误。
- 保留口语化表达、网络梗、方言用词,不要改成书面语。
- **绝对禁止**:概括、总结、改写、串联、归纳、改写为第三人称叙述。

# 段落
按内容自动分 1-4 段(本段较短,不需要太多分段),每段一个简短小标题(≤15 字),段头标注 `[MM:SS - MM:SS]`(本段内部时间)。

# 输出格式
纯 Markdown,不要代码块包裹,不要任何前后说明。直接从 `## 1.` 开始。

现在开始严格逐字转录本段。"""


# ─── 工具函数 ──────────────────────────────────────────

def check_ffmpeg():
    try:
        subprocess.run(["ffmpeg", "-version"], capture_output=True, check=True)
        return True
    except (FileNotFoundError, subprocess.CalledProcessError):
        return False


def check_ytdlp():
    try:
        subprocess.run(["yt-dlp", "--version"], capture_output=True, check=True)
        return True
    except (FileNotFoundError, subprocess.CalledProcessError):
        return False


def is_url(path):
    return path.startswith("http://") or path.startswith("https://")


def detect_platform(url):
    url_lower = url.lower()
    if 'bilibili.com' in url_lower or 'b23.tv' in url_lower:
        return 'bilibili'
    elif 'youtube.com' in url_lower or 'youtu.be' in url_lower:
        return 'youtube'
    elif 'xiaohongshu.com' in url_lower or 'xhslink.com' in url_lower:
        return 'xiaohongshu'
    elif 'douyin.com' in url_lower or 'v.douyin.com' in url_lower:
        return 'douyin'
    return 'unknown'


def is_browser_only_platform(url):
    # B 站 yt-dlp 412 概率高,默认也走 headless;youtube 走 yt-dlp
    return detect_platform(url) in ('xiaohongshu', 'douyin', 'bilibili')


def get_video_info(video_path):
    cmd = [
        "ffprobe", "-v", "quiet", "-print_format", "json",
        "-show_format", "-show_streams", video_path
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"[ERROR] 无法读取视频信息: {video_path}", file=sys.stderr)
        sys.exit(1)
    info = json.loads(result.stdout)

    duration = float(info.get("format", {}).get("duration", 0))
    width, height = 0, 0
    for stream in info.get("streams", []):
        if stream.get("codec_type") == "video":
            width = stream.get("width", 0)
            height = stream.get("height", 0)
            break

    return {
        "duration": round(duration, 1),
        "width": width,
        "height": height,
        "file_size_mb": round(os.path.getsize(video_path) / 1024 / 1024, 1),
        "file_name": os.path.basename(video_path),
    }


# ─── Step 1: 下载视频 ─────────────────────────────────

def download_video(url, output_dir=None):
    output_dir = output_dir or WORK_DIR
    os.makedirs(output_dir, exist_ok=True)

    for f in Path(output_dir).glob("*.mp4"):
        f.unlink()

    output_template = os.path.join(output_dir, "%(title).50s.%(ext)s")

    cmd = [
        "yt-dlp",
        "-f", "bestvideo[height<=720]+bestaudio/best[height<=720]/best",
        "--merge-output-format", "mp4",
        "-o", output_template,
        "--no-playlist",
        url
    ]

    print(f"[INFO] 正在下载视频: {url}", file=sys.stderr)
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)

    if result.returncode != 0:
        # 让调用方决定是否回退到 headless 浏览器
        raise RuntimeError(f"yt-dlp 下载失败: {result.stderr[-400:]}")

    files = sorted(Path(output_dir).glob("*.mp4"), key=os.path.getmtime, reverse=True)
    if not files:
        for ext in ["*.webm", "*.mkv", "*.flv"]:
            files = sorted(Path(output_dir).glob(ext), key=os.path.getmtime, reverse=True)
            if files:
                break

    if not files:
        raise RuntimeError("yt-dlp 下载完成但找不到视频文件")

    output_path = str(files[0])
    size_mb = os.path.getsize(output_path) / 1024 / 1024
    print(f"[OK] 下载完成: {os.path.basename(output_path)} ({size_mb:.1f}MB)", file=sys.stderr)
    return output_path


def _curl_download(url, out_path, headers=None, timeout=900):
    cmd = ["curl", "-L", "-sS", "--fail", "-o", out_path]
    for k, v in (headers or {}).items():
        cmd += ["-H", f"{k}: {v}"]
    cmd.append(url)
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
    if r.returncode != 0 or not os.path.exists(out_path) or os.path.getsize(out_path) < 1024:
        raise RuntimeError(f"curl 下载失败: {r.stderr[-300:] or r.stdout[-300:]}")


def download_via_browser(url, output_dir=None, cached_info=None):
    """抖音/小红书/B站:用 Playwright headless 后台抓视频直链,再用 curl 下载。
    B 站走 dash 流(分别下载 video + audio m4s,再 ffmpeg 合并)。
    cached_info 由 probe 阶段提供,避免重复启动 headless。"""
    output_dir = output_dir or WORK_DIR
    os.makedirs(output_dir, exist_ok=True)

    if cached_info:
        info = cached_info
        print(f"[INFO] 复用探测阶段的直链(无需重启浏览器)", file=sys.stderr)
    else:
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        from platform_extractor import extract as platform_extract

        pname = detect_platform(url)
        pname_zh = {"douyin": "抖音", "xiaohongshu": "小红书", "bilibili": "B 站"}.get(pname, pname)
        print(f"[INFO] {pname_zh}链接,启动后台浏览器提取直链(headless,无窗口)...", file=sys.stderr)
        info = platform_extract(url, headless=True)
        print(f"[OK] 标题: {info['title']}", file=sys.stderr)

    out_path = os.path.join(output_dir, "video.mp4")
    if os.path.exists(out_path):
        os.remove(out_path)

    if info.get("needs_merge"):
        # B 站 dash:分别下载 video.m4s + audio.m4s,再 ffmpeg copy 合并
        v_path = os.path.join(output_dir, "_video.m4s")
        a_path = os.path.join(output_dir, "_audio.m4s")
        for p in (v_path, a_path):
            if os.path.exists(p):
                os.remove(p)
        print(f"[INFO] 下载视频流...", file=sys.stderr)
        _curl_download(info["video_url"], v_path, info.get("headers"))
        print(f"[INFO] 下载音频流...", file=sys.stderr)
        _curl_download(info["audio_url"], a_path, info.get("headers"))
        print(f"[INFO] ffmpeg 合并 video + audio...", file=sys.stderr)
        merge_cmd = [
            "ffmpeg", "-y", "-i", v_path, "-i", a_path,
            "-c", "copy", "-movflags", "+faststart", out_path,
        ]
        r = subprocess.run(merge_cmd, capture_output=True, text=True, timeout=300)
        if r.returncode != 0 or not os.path.exists(out_path):
            print(f"[ERROR] ffmpeg 合并失败: {r.stderr[-500:]}", file=sys.stderr)
            sys.exit(1)
        for p in (v_path, a_path):
            try: os.remove(p)
            except OSError: pass
    else:
        print(f"[INFO] 下载视频...", file=sys.stderr)
        try:
            _curl_download(info["video_url"], out_path, info.get("headers"))
        except RuntimeError as e:
            print(f"[ERROR] {e}", file=sys.stderr)
            sys.exit(1)

    size_mb = os.path.getsize(out_path) / 1024 / 1024
    print(f"[OK] 下载完成: {os.path.basename(out_path)} ({size_mb:.1f}MB)", file=sys.stderr)
    return out_path, info["title"]


# ─── Step 2: 视频压缩 ─────────────────────────────────

def compress_video(input_path, output_path=None, target_mb=None):
    target_mb = target_mb or TARGET_SIZE_MB

    if output_path is None:
        base = Path(input_path)
        output_path = str(base.parent / f"{base.stem}_compressed.mp4")

    current_size_mb = os.path.getsize(input_path) / 1024 / 1024
    base64_est_mb = current_size_mb * 4 / 3

    if current_size_mb <= target_mb and base64_est_mb <= API_MAX_MB:
        print(f"[INFO] 视频已小于{target_mb}MB ({current_size_mb:.1f}MB),无需压缩", file=sys.stderr)
        # faststart 重封装
        faststart_path = str(Path(input_path).parent / f"{Path(input_path).stem}_fs.mp4")
        cmd = ["ffmpeg", "-i", input_path, "-c", "copy",
               "-movflags", "+faststart", "-y", faststart_path]
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode == 0:
            if input_path.endswith(".mp4"):
                os.replace(faststart_path, input_path)
                return input_path
            return faststart_path
        return input_path

    safe_file_mb = API_MAX_MB * 3 / 4 * 0.92
    effective_target = min(target_mb, safe_file_mb)
    return _do_compress(input_path, output_path, effective_target)


def _pick_height_for_bitrate(video_kbps, source_height):
    """根据视频比特率(kbps)选合适的最大高度,确保画质不糊到不可识别。"""
    if video_kbps >= 1500:
        cap = 720
    elif video_kbps >= 800:
        cap = 540
    elif video_kbps >= 450:
        cap = 480
    elif video_kbps >= 220:
        cap = 360
    else:
        cap = 240
    return min(cap, source_height) if source_height > 0 else cap


def _pick_audio_kbps(total_kbps):
    if total_kbps >= 600: return 96
    if total_kbps >= 300: return 64
    if total_kbps >= 150: return 48
    return 32


def _do_compress(input_path, output_path, target_mb, iteration=1, max_iterations=4, max_height=None):
    current_size_mb = os.path.getsize(input_path) / 1024 / 1024
    info = get_video_info(input_path)
    duration = info["duration"]

    if duration <= 0:
        print("[ERROR] 无法获取视频时长", file=sys.stderr)
        sys.exit(1)

    # 一次到位:按时长直接算目标比特率,智能选分辨率
    safety = 0.92 if iteration == 1 else max(0.75, 0.92 - 0.08 * (iteration - 1))
    total_kbps = int(target_mb * 8 * 1024 / duration * safety)
    audio_kbps = _pick_audio_kbps(total_kbps)
    video_kbps = max(60, total_kbps - audio_kbps)
    auto_height = _pick_height_for_bitrate(video_kbps, info["height"])
    if max_height is not None:
        auto_height = min(auto_height, max_height)

    print(f"[INFO] 压缩视频 (第{iteration}轮): {current_size_mb:.1f}MB -> 目标{target_mb:.0f}MB "
          f"@ {video_kbps}kbps + {audio_kbps}kbps audio, height={auto_height}",
          file=sys.stderr)

    cmd = [
        "ffmpeg", "-i", input_path,
        "-vf", f"scale=-2:{auto_height}",
        "-c:v", "libx264",
        "-b:v", f"{video_kbps}k",
        "-maxrate", f"{int(video_kbps * 1.4)}k",
        "-bufsize", f"{video_kbps * 2}k",
        "-preset", "medium",
        "-c:a", "aac",
        "-b:a", f"{audio_kbps}k",
        "-movflags", "+faststart",
        "-y",
        output_path,
    ]

    result = subprocess.run(cmd, capture_output=True, text=True, timeout=900)
    if result.returncode != 0:
        print(f"[ERROR] 压缩失败: {result.stderr[-500:]}", file=sys.stderr)
        sys.exit(1)

    new_size_mb = os.path.getsize(output_path) / 1024 / 1024
    new_b64_mb = new_size_mb * 4 / 3
    print(f"[OK] 压缩完成: {new_size_mb:.1f}MB", file=sys.stderr)

    if new_b64_mb <= API_MAX_MB and new_size_mb <= target_mb * 1.10:
        return output_path

    if iteration >= max_iterations:
        if new_b64_mb > API_MAX_MB:
            print(f"[ERROR] 已尝试 {iteration} 轮压缩仍超限({new_b64_mb:.0f}MB),放弃", file=sys.stderr)
            sys.exit(1)
        return output_path

    # 二次微调:再压一档
    next_height_ladder = [auto_height, 540, 480, 360, 240]
    next_height = next_height_ladder[min(iteration, len(next_height_ladder) - 1)]
    base = Path(output_path)
    next_output = str(base.parent / f"{base.stem.replace('_compressed','')}_compressed_r{iteration + 1}.mp4")
    return _do_compress(output_path, next_output, target_mb,
                        iteration=iteration + 1, max_iterations=max_iterations,
                        max_height=next_height)


# ─── Step 3: 豆包 API 调用 ────────────────────────────

def video_to_base64_url(video_path):
    size_mb = os.path.getsize(video_path) / 1024 / 1024
    print(f"[INFO] 编码视频为base64... ({size_mb:.1f}MB)", file=sys.stderr)

    with open(video_path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode("utf-8")

    return f"data:video/mp4;base64,{b64}"


def call_doubao_video_api(video_url, prompt):
    if not API_KEY:
        print("[ERROR] 没找到豆包 API Key。", file=sys.stderr)
        print(f"  请在 {ENV_FILE} 里加一行:", file=sys.stderr)
        print(f"     DOUBAO_API_KEY=你的-key-uuid", file=sys.stderr)
        print(f"  或者跑一下安装脚本: bash {SKILL_DIR}/install.sh", file=sys.stderr)
        print(f"  Key 申请: https://console.volcengine.com/ark/region:ark+cn-beijing/apiKey", file=sys.stderr)
        sys.exit(1)
    payload = {
        "model": MODEL,
        "input": [
            {
                "role": "user",
                "content": [
                    {"type": "input_video", "video_url": video_url},
                    {"type": "input_text", "text": prompt},
                ]
            }
        ]
    }

    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        API_ENDPOINT,
        data=data,
        headers={
            "Authorization": f"Bearer {API_KEY}",
            "Content-Type": "application/json"
        },
        method="POST"
    )

    for attempt in range(MAX_RETRIES):
        try:
            print(f"[INFO] 调用豆包API转录... (尝试 {attempt + 1}/{MAX_RETRIES})", file=sys.stderr)
            with urllib.request.urlopen(req, timeout=1800, context=SSL_CONTEXT) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            error_body = e.read().decode("utf-8") if e.fp else ""
            print(f"[WARN] API失败 (HTTP {e.code}): {error_body[:300]}", file=sys.stderr)
            if attempt < MAX_RETRIES - 1:
                time.sleep((attempt + 1) * 5)
        except Exception as e:
            print(f"[WARN] API异常: {e}", file=sys.stderr)
            if attempt < MAX_RETRIES - 1:
                time.sleep((attempt + 1) * 5)

    print("[ERROR] API调用失败,已达最大重试次数", file=sys.stderr)
    return None


def extract_text_from_response(response):
    if not response:
        return None

    output = response.get("output", {})

    if isinstance(output, list):
        texts = []
        for block in output:
            if block.get("type") == "message":
                for item in block.get("content", []):
                    if isinstance(item, dict) and item.get("type") == "output_text":
                        texts.append(item.get("text", ""))
        if texts:
            return "\n".join(texts)

    if isinstance(output, dict):
        content = output.get("content", [])
        if isinstance(content, list):
            texts = [item.get("text", "") for item in content
                     if isinstance(item, dict) and item.get("type") == "output_text"]
            if texts:
                return "\n".join(texts)
        if "text" in output:
            return output["text"]

    choices = response.get("choices", [])
    if choices:
        return choices[0].get("message", {}).get("content", "")

    return output if isinstance(output, str) else None


def clean_markdown_output(text):
    """去掉模型可能多加的代码块包裹"""
    text = text.strip()
    # 去掉 ```markdown / ``` 包裹
    if text.startswith("```"):
        lines = text.split("\n")
        if len(lines) >= 2:
            lines = lines[1:]
            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]
            text = "\n".join(lines).strip()
    return text


# ─── 分段处理 ─────────────────────────────────────────

def _fmt_mmss(sec):
    sec = int(sec)
    return f"{sec // 60:02d}:{sec % 60:02d}"


def split_video_by_seconds(input_path, segment_seconds=SEGMENT_SECONDS, work_dir=None):
    """按秒切片(尽量用 -c copy,瞬时切),返回 [(seg_path, start, end), ...]。"""
    work_dir = work_dir or os.path.join(WORK_DIR, "segs")
    os.makedirs(work_dir, exist_ok=True)
    for f in Path(work_dir).glob("seg_*.mp4"):
        f.unlink()

    info = get_video_info(input_path)
    duration = info["duration"]
    if duration <= segment_seconds:
        return [(input_path, 0, duration)]

    n = math.ceil(duration / segment_seconds)
    segs = []
    for i in range(n):
        start = i * segment_seconds
        end = min(duration, (i + 1) * segment_seconds)
        out_path = os.path.join(work_dir, f"seg_{i:02d}.mp4")
        cmd = [
            "ffmpeg", "-y",
            "-ss", str(start),
            "-i", input_path,
            "-t", str(end - start),
            "-c", "copy",
            "-movflags", "+faststart",
            "-avoid_negative_ts", "make_zero",
            out_path,
        ]
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
        if r.returncode != 0 or not os.path.exists(out_path) or os.path.getsize(out_path) == 0:
            # -c copy 可能因关键帧落点失败,fallback 到重编码切片
            cmd_re = [
                "ffmpeg", "-y",
                "-ss", str(start),
                "-i", input_path,
                "-t", str(end - start),
                "-c:v", "libx264", "-preset", "veryfast",
                "-c:a", "aac", "-b:a", "64k",
                "-movflags", "+faststart",
                out_path,
            ]
            r2 = subprocess.run(cmd_re, capture_output=True, text=True, timeout=600)
            if r2.returncode != 0:
                print(f"[ERROR] 切片失败 seg {i}: {r2.stderr[-300:]}", file=sys.stderr)
                sys.exit(1)
        sm = os.path.getsize(out_path) / 1024 / 1024
        print(f"[OK] 切片 seg_{i:02d}: [{_fmt_mmss(start)}-{_fmt_mmss(end)}] {sm:.1f}MB", file=sys.stderr)
        segs.append((out_path, start, end))
    return segs


SEC_HEADER_RE = re.compile(
    r"^##\s*(\d+)[\.、\)\s]\s*(.*?)\s*\[\s*(\d+):(\d+)\s*[-–~]\s*(\d+):(\d+)\s*\]",
    re.MULTILINE,
)


def _parse_sections(md):
    """把一段 markdown 拆成 [(title, start_sec, end_sec, body), ...]。"""
    matches = list(SEC_HEADER_RE.finditer(md))
    sections = []
    for i, m in enumerate(matches):
        _, title, sm, ss, em, es = m.groups()
        start = int(sm) * 60 + int(ss)
        end = int(em) * 60 + int(es)
        body_start = m.end()
        body_end = matches[i + 1].start() if i + 1 < len(matches) else len(md)
        body = md[body_start:body_end].strip()
        sections.append((title.strip(), start, end, body))
    return sections


def merge_segment_transcripts(seg_results):
    """合并各段输出,统一编号 + 时间戳偏移。
    seg_results: list of (offset_sec, segment_md)
    """
    parts = []
    counter = 1
    for offset_sec, md in seg_results:
        sections = _parse_sections(md)
        if not sections:
            # 模型没按格式输出,fallback 整体作为一段
            parts.append(f"## {counter}. 段落 {counter} [{_fmt_mmss(offset_sec)} - {_fmt_mmss(offset_sec)}]\n\n{md.strip()}")
            counter += 1
            continue
        for title, start, end, body in sections:
            abs_start = start + offset_sec
            abs_end = end + offset_sec
            header = f"## {counter}. {title} [{_fmt_mmss(abs_start)} - {_fmt_mmss(abs_end)}]"
            parts.append(f"{header}\n\n{body}")
            counter += 1
    return "\n\n".join(parts)


# ─── 视频探测 + 耗时预估 ────────────────────────────────

def _ytdlp_probe(url):
    """yt-dlp --dump-json 拿元信息(youtube 等用)。"""
    cmd = ["yt-dlp", "--dump-json", "--no-warnings", "--skip-download", url]
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
    if r.returncode != 0:
        raise RuntimeError(f"yt-dlp probe 失败: {r.stderr[-300:]}")
    info = json.loads(r.stdout.split("\n")[0])
    return {
        "platform": detect_platform(url),
        "title": info.get("title"),
        "duration": int(info.get("duration") or 0),
        "needs_merge": False,
        "cached_info": None,
    }


def probe_video(input_path):
    """快速探测视频元信息。
    返回:
      {
        platform, title, duration, n_segs, est_sec,
        cached_info  -- 若已经从 platform_extract 拿到 URL,后续可复用
      }
    """
    if is_url(input_path):
        platform = detect_platform(input_path)
        if platform in ("xiaohongshu", "douyin", "bilibili"):
            # 调 headless 提取器,顺便缓存视频/音频 URL,后续 download 不再重启浏览器
            sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
            from platform_extractor import extract as platform_extract
            info = platform_extract(input_path, headless=True)
            duration = info.get("duration") or 0
            return {
                "platform": platform,
                "title": info.get("title") or "",
                "duration": int(duration),
                "cached_info": info,
            }
        else:
            # YouTube / 其他平台
            return _ytdlp_probe(input_path)
    else:
        # 本地文件
        meta = get_video_info(input_path)
        return {
            "platform": "local",
            "title": Path(input_path).stem,
            "duration": int(meta["duration"]),
            "cached_info": None,
        }


def estimate_processing_time(duration, platform):
    """根据时长估算处理总耗时(秒)。基于实测数据建模:
       探测启动 10s + 下载(0.4s/视频秒) + 每段压缩 12s + 每段 API 30s。"""
    if not duration or duration <= 0:
        return None, 1
    n_segs = math.ceil(duration / SEGMENT_SECONDS) if duration > SEGMENT_THRESHOLD_SEC else 1
    headless_overhead = 10 if platform in ("xiaohongshu", "douyin", "bilibili") else 5
    download_sec = duration * 0.4
    compress_sec = n_segs * 12
    api_sec = n_segs * 30
    total = int(headless_overhead + download_sec + compress_sec + api_sec)
    return total, n_segs


def fmt_duration_human(sec):
    if not sec or sec <= 0: return "未知"
    sec = int(sec)
    if sec < 60: return f"{sec}秒"
    m, s = sec // 60, sec % 60
    if sec < 3600: return f"{m}分{s:02d}秒"
    h, m = m // 60, m % 60
    return f"{h}小时{m:02d}分"


def fmt_estimate_range(sec):
    """耗时给个 ±20% 范围,更诚实。"""
    if not sec: return "未知"
    lo = int(sec * 0.8)
    hi = int(sec * 1.3)
    return f"{fmt_duration_human(lo)} ~ {fmt_duration_human(hi)}"


def print_probe_report(meta, est_sec, n_segs):
    bar = "═" * 55
    sep = "─" * 55
    platform_zh = {
        "xiaohongshu": "小红书", "douyin": "抖音",
        "bilibili": "B 站", "youtube": "YouTube",
        "local": "本地文件", "unknown": "未知平台",
    }.get(meta["platform"], meta["platform"])

    print(bar, file=sys.stderr)
    print("  📊 视频探测", file=sys.stderr)
    print(sep, file=sys.stderr)
    print(f"  平台:      {platform_zh}", file=sys.stderr)
    title = meta.get("title") or "(未抓到标题)"
    print(f"  标题:      {title}", file=sys.stderr)
    d = meta.get("duration") or 0
    print(f"  时长:      {fmt_duration_human(d)}", file=sys.stderr)
    seg_note = f"{n_segs} 段(每段 ≤ 6 分钟)" if n_segs > 1 else "1 段(短视频整体处理)"
    print(f"  分段:      {seg_note}", file=sys.stderr)
    if est_sec:
        print(f"  预估耗时:  {fmt_estimate_range(est_sec)}", file=sys.stderr)
    print(bar, file=sys.stderr)


# ─── 主流程 ────────────────────────────────────────────

def safe_filename(name, max_len=60):
    """把任意字符串清成安全的文件名"""
    name = re.sub(r'[\\/:*?"<>|]', '_', name).strip()
    return name[:max_len] or "transcript"


def run(input_path, title=None, target_mb=None, output_dir=None, save_md=True):
    if not check_ffmpeg():
        print("[ERROR] ffmpeg 未安装!请运行: brew install ffmpeg", file=sys.stderr)
        sys.exit(1)

    # ── Step 0: 探测 + 评估 ──
    print("[Step 0/3] 探测视频元信息...", file=sys.stderr)
    try:
        meta = probe_video(input_path)
    except Exception as e:
        print(f"[ERROR] 探测失败: {e}", file=sys.stderr)
        sys.exit(1)

    if not meta.get("duration"):
        print("[WARN] 未拿到视频时长,无法预估耗时;仍将继续。", file=sys.stderr)

    est_sec, n_segs = estimate_processing_time(meta.get("duration", 0), meta["platform"])
    print_probe_report(meta, est_sec, n_segs)

    # 标题优先级:用户传入 > probe 拿到的
    if not title and meta.get("title"):
        title = meta["title"]

    cached_info = meta.get("cached_info")

    # ── Step 1: 下载 ──
    if is_url(input_path):
        if is_browser_only_platform(input_path):
            print(f"\n[Step 1/3] 后台浏览器抓取直链 + 下载", file=sys.stderr)
            video_path, _ = download_via_browser(input_path, cached_info=cached_info)
        else:
            if not check_ytdlp():
                print("[ERROR] yt-dlp 未安装!请运行: pip install --break-system-packages yt-dlp", file=sys.stderr)
                sys.exit(1)
            print(f"\n[Step 1/3] 下载视频", file=sys.stderr)
            try:
                video_path = download_video(input_path)
            except RuntimeError as e:
                print(f"[ERROR] {e}", file=sys.stderr)
                sys.exit(1)
    else:
        if not os.path.exists(input_path):
            print(f"[ERROR] 视频文件不存在: {input_path}", file=sys.stderr)
            sys.exit(1)
        video_path = os.path.abspath(input_path)
        print(f"\n[Step 1/3] 使用本地视频: {os.path.basename(video_path)}", file=sys.stderr)

    # 总时长决定走 短视频整体压缩 还是 长视频先切片再分段压缩
    src_info = get_video_info(video_path)
    total_duration = src_info["duration"]
    is_long = total_duration > SEGMENT_THRESHOLD_SEC

    if is_long:
        print(f"\n[Step 2/3] 长视频分段(总时长 {_fmt_mmss(total_duration)},每段 ≤ {SEGMENT_SECONDS}s)", file=sys.stderr)
        raw_segs = split_video_by_seconds(video_path, segment_seconds=SEGMENT_SECONDS)
        seg_total = len(raw_segs)
        compressed_segs = []
        for i, (sp, start, end) in enumerate(raw_segs):
            seg_size = os.path.getsize(sp) / 1024 / 1024
            if seg_size > target_mb or seg_size * 4 / 3 > API_MAX_MB:
                print(f"[INFO] 段 {i+1}/{seg_total} 需压缩: {seg_size:.1f}MB", file=sys.stderr)
                cp = compress_video(sp, target_mb=target_mb)
            else:
                print(f"[INFO] 段 {i+1}/{seg_total} 无需压缩: {seg_size:.1f}MB", file=sys.stderr)
                cp = sp
            compressed_segs.append((cp, start, end))
    else:
        print(f"\n[Step 2/3] 视频压缩", file=sys.stderr)
        compressed_path = compress_video(video_path, target_mb=target_mb)
        compressed_segs = [(compressed_path, 0, total_duration)]
        seg_total = 1

    # Step 3: 逐字稿
    print(f"\n[Step 3/3] AI 逐字稿提取(共 {seg_total} 段)", file=sys.stderr)
    seg_results = []
    for i, (cp, start, end) in enumerate(compressed_segs):
        cinfo = get_video_info(cp)
        print(f"[INFO] 段 {i+1}/{seg_total} 时长 {cinfo['duration']}s, 大小 {cinfo['file_size_mb']}MB", file=sys.stderr)
        video_url = video_to_base64_url(cp)
        if is_long:
            prompt = SEGMENT_TRANSCRIPT_PROMPT.format(
                seg_index=i + 1,
                seg_total=seg_total,
                offset_mmss=_fmt_mmss(start),
                duration=int(cinfo["duration"]),
            )
        else:
            prompt = TRANSCRIPT_PROMPT.format(
                file_name=cinfo["file_name"],
                duration=cinfo["duration"],
            )
        resp = call_doubao_video_api(video_url, prompt)
        text = extract_text_from_response(resp)
        if not text:
            print(f"[ERROR] 段 {i+1}/{seg_total} API 返回空,放弃", file=sys.stderr)
            sys.exit(1)
        seg_results.append((start, clean_markdown_output(text)))

    if is_long:
        transcript_md = merge_segment_transcripts(seg_results)
    else:
        transcript_md = seg_results[0][1]

    # 顶部加标题(如果用户提供)
    header = ""
    if title:
        header = f"# {title}\n\n> 时长 {int(total_duration//60)}:{int(total_duration%60):02d} | 来源: {input_path if is_url(input_path) else os.path.basename(input_path)}\n\n"
    final_md = header + transcript_md

    # 默认存盘到 skill 目录,同时 stdout 直出全文
    if save_md:
        out_dir = output_dir or DEFAULT_OUTPUT_DIR
        os.makedirs(out_dir, exist_ok=True)
        name_seed = title or Path(video_path).stem
        out_file = os.path.join(out_dir, f"{safe_filename(name_seed)}_transcript.md")
        with open(out_file, "w", encoding="utf-8") as f:
            f.write(final_md)
        print(f"\n[OK] 逐字稿已保存: {out_file}", file=sys.stderr)

    print("=" * 55, file=sys.stderr)
    print("[OK] 转录完成,完整逐字稿见 stdout", file=sys.stderr)

    # stdout 直接输出全文
    print(final_md)


def doctor():
    """依赖 + 配置体检。返回 0=全部就绪,1=有问题。"""
    print("=" * 55)
    print("  🩺 video-transcript 体检")
    print("=" * 55)
    issues = []

    # ffmpeg
    if check_ffmpeg():
        print("  ✓ ffmpeg")
    else:
        print("  ✗ ffmpeg 未安装")
        issues.append("brew install ffmpeg")

    # ffprobe(随 ffmpeg 一起)
    try:
        subprocess.run(["ffprobe", "-version"], capture_output=True, check=True)
        print("  ✓ ffprobe")
    except (FileNotFoundError, subprocess.CalledProcessError):
        print("  ✗ ffprobe 未安装(随 ffmpeg 一起装)")
        issues.append("brew install ffmpeg")

    # Python 版本
    py = f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}"
    if sys.version_info >= (3, 8):
        print(f"  ✓ Python {py}")
    else:
        print(f"  ✗ Python {py} 太旧(需 ≥ 3.8)")
        issues.append("升级 Python 到 3.8+")

    # yt-dlp(可选,YouTube 用;抖音/小红书/B站走 headless 不需要)
    if check_ytdlp():
        print("  ✓ yt-dlp")
    else:
        print("  ⚠ yt-dlp 未安装(YouTube 视频会用不了,其他平台不影响)")

    # playwright + chromium
    try:
        from playwright.sync_api import sync_playwright
        with sync_playwright() as p:
            try:
                # 不实际启动,只检查可执行文件存在
                exe = p.chromium.executable_path
                if exe and os.path.exists(exe):
                    print(f"  ✓ playwright + chromium")
                else:
                    print(f"  ✗ chromium 没装")
                    issues.append("python3 -m playwright install chromium")
            except Exception as e:
                print(f"  ✗ chromium 不可用: {e}")
                issues.append("python3 -m playwright install chromium")
    except ImportError:
        print("  ✗ playwright 未安装")
        issues.append("pip install --break-system-packages playwright")
        issues.append("python3 -m playwright install chromium")

    # .env + API Key
    if os.path.exists(ENV_FILE):
        print(f"  ✓ .env 文件: {ENV_FILE}")
    else:
        print(f"  ⚠ 没找到 .env 文件: {ENV_FILE}")

    if API_KEY:
        masked = API_KEY[:6] + "…" + API_KEY[-4:] if len(API_KEY) > 12 else "***"
        print(f"  ✓ DOUBAO_API_KEY: {masked}")
    else:
        print("  ✗ 没配 DOUBAO_API_KEY")
        issues.append(f"在 {ENV_FILE} 里写: DOUBAO_API_KEY=你的key")

    print(f"  ✓ DOUBAO_MODEL: {MODEL}")

    print("=" * 55)
    if issues:
        print(f"  ❌ 发现 {len(issues)} 个问题, 解决方法:")
        for x in issues:
            print(f"     - {x}")
        print(f"\n  或运行一键安装: bash {SKILL_DIR}/install.sh")
        return 1
    print("  ✅ 全部就绪")
    return 0


def main():
    parser = argparse.ArgumentParser(
        description="视频逐字稿提取工具(豆包视频理解)"
    )
    parser.add_argument("input", nargs="?",
                        help="视频URL(B站/YouTube/抖音/小红书) 或 本地文件路径;--doctor 时不需要")
    parser.add_argument("--title", default=None, help="视频标题(用于文档头)")
    parser.add_argument("--target-size", type=int, default=TARGET_SIZE_MB,
                        help=f"压缩目标大小(MB),默认{TARGET_SIZE_MB}")
    parser.add_argument("--no-save", dest="save_md", action="store_false",
                        help="不写 .md 文件(默认会保存到 skill 目录的 outputs/)")
    parser.add_argument("--output-dir", default=None,
                        help=f"输出目录,默认 {DEFAULT_OUTPUT_DIR}")
    parser.add_argument("--doctor", action="store_true",
                        help="体检:检查所有依赖和配置是否就绪")
    parser.set_defaults(save_md=True)

    args = parser.parse_args()

    if args.doctor:
        sys.exit(doctor())

    if not args.input:
        parser.error("缺少 input 参数(视频 URL 或本地文件路径)。--doctor 体检模式下可省略。")

    run(args.input, title=args.title, target_mb=args.target_size,
        output_dir=args.output_dir, save_md=args.save_md)


if __name__ == "__main__":
    main()
