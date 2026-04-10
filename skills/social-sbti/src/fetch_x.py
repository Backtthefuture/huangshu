"""W1.X: 从 X / Twitter 抓取用户推文 → 统一 JSON schema

用法:
    # 1. 先把你的 X cookies 导出成 /tmp/x_cookies.json (格式见 README)
    # 2. 按 @handle 抓:
    python fetch_x.py @username --limit 200
    # 3. 按 user id 抓:
    python fetch_x.py 123456789 --limit 200 --by-id
    # 4. 按完整 URL 抓:
    python fetch_x.py "https://x.com/username" --limit 200

输出:
    data/x_<handle>_<ts>.json  同 Jike 版一致的 schema
"""
from __future__ import annotations

import argparse
import asyncio
import json
import os
import re
import sys
import time
from datetime import datetime
from pathlib import Path

# Apply monkey-patch BEFORE importing Client (fixes 2026 ondemand.s layout)
sys.path.insert(0, str(Path(__file__).resolve().parent))
import twikit_patch  # noqa: F401

try:
    from twikit import Client
except ImportError:
    print("❌ 缺少依赖。先跑: pip install twikit", file=sys.stderr)
    sys.exit(1)


DATA_DIR = Path(__file__).resolve().parent.parent / "data"
DATA_DIR.mkdir(exist_ok=True)

COOKIES_PATH = Path("/tmp/x_cookies.json")


def extract_handle(text: str) -> str | None:
    """从 @handle / URL / 纯名字里提取 screen_name。"""
    # URL: https://x.com/username or https://twitter.com/username
    m = re.search(r"(?:x\.com|twitter\.com)/([A-Za-z0-9_]+)", text)
    if m:
        return m.group(1)
    # @handle
    m = re.match(r"@?([A-Za-z0-9_]{1,15})$", text.strip())
    if m:
        return m.group(1)
    return None


def normalize_tweet(t) -> dict:
    """twikit Tweet 对象 → 我们的 pipeline schema."""
    return {
        "id": getattr(t, "id", None),
        "created_at": getattr(t, "created_at", None),
        "content": getattr(t, "text", "") or getattr(t, "full_text", "") or "",
        "like_count": getattr(t, "favorite_count", 0),
        "retweet_count": getattr(t, "retweet_count", 0),
        "reply_count": getattr(t, "reply_count", 0),
        "view_count": getattr(t, "view_count", 0),
        "lang": getattr(t, "lang", None),
        "is_reply": bool(getattr(t, "in_reply_to", None)),
        "is_retweet": bool(getattr(t, "retweeted_tweet", None)),
        "has_media": bool(getattr(t, "media", None)),
    }


async def fetch_user_async(
    identifier: str,
    limit: int = 200,
    by_id: bool = False,
) -> dict:
    if not COOKIES_PATH.exists():
        raise SystemExit(
            f"❌ cookies 文件不存在: {COOKIES_PATH}\n"
            "   导出步骤见 README: 在浏览器 DevTools -> Application -> Cookies -> x.com\n"
            "   至少需要 auth_token 和 ct0 两个 cookie,保存成 JSON"
        )

    proxy = os.environ.get("https_proxy") or os.environ.get("HTTPS_PROXY")
    client = Client("en-US", proxy=proxy) if proxy else Client("en-US")
    client.load_cookies(str(COOKIES_PATH))
    # 不再提前调 client.user() — 那个走 /1.1/account/settings.json 容易被 CF
    # 挡掉。直接进入 get_user_by_screen_name,失败再报错。

    # 解析目标用户
    if by_id:
        user = await client.get_user_by_id(identifier)
    else:
        screen_name = extract_handle(identifier) or identifier.lstrip("@")
        print(f"→ 查找用户: @{screen_name}")
        user = await client.get_user_by_screen_name(screen_name)

    profile = {
        "id": user.id,
        "screen_name": user.screen_name,
        "name": user.name,
        "bio": getattr(user, "description", "") or "",
        "followers_count": getattr(user, "followers_count", 0),
        "following_count": getattr(user, "following_count", 0),
        "statuses_count": getattr(user, "statuses_count", 0),
        "created_at": str(getattr(user, "created_at", "")),
        "verified": getattr(user, "verified", False) or getattr(user, "is_blue_verified", False),
    }
    print(f"  {profile['name']} @{profile['screen_name']} · {profile['followers_count']} followers")

    # 分页抓取
    print(f"→ 拉取最近 {limit} 条推文...")
    posts_raw: list = []
    last_err = None
    page = await user.get_tweets("Tweets", count=40)

    while page is not None and len(page) > 0:
        posts_raw.extend(list(page))
        print(f"  · 已拉 {len(posts_raw)} 条")
        if len(posts_raw) >= limit:
            break
        time.sleep(1.2)  # 自限速:X 反爬严,别贪
        try:
            page = await page.next()
        except Exception as e:
            last_err = str(e)
            print(f"⚠️  分页异常: {e}", file=sys.stderr)
            break

    posts = [normalize_tweet(t) for t in posts_raw[:limit]]

    return {
        "profile": profile,
        "posts": posts,
        "stats": {
            "fetched": len(posts),
            "requested": limit,
            "error": last_err,
            "fetched_at": datetime.now().isoformat(),
            "platform": "x",
        },
    }


def main() -> None:
    ap = argparse.ArgumentParser(description="Fetch X/Twitter user posts")
    ap.add_argument("identifier", help="@handle, URL, 或 user_id")
    ap.add_argument("--limit", type=int, default=200)
    ap.add_argument("--by-id", action="store_true", help="传入的是 user id 而非 handle")
    args = ap.parse_args()

    data = asyncio.run(fetch_user_async(args.identifier, args.limit, args.by_id))

    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    handle = data["profile"].get("screen_name", "unknown")
    out = DATA_DIR / f"x_{handle}_{ts}.json"
    out.write_text(json.dumps(data, ensure_ascii=False, indent=2, default=str), encoding="utf-8")

    print(f"\n✅ 完成。")
    print(f"   用户: @{handle} ({data['profile'].get('name','?')})")
    print(f"   抓到: {data['stats']['fetched']} 条推文")
    print(f"   输出: {out}")


if __name__ == "__main__":
    main()
