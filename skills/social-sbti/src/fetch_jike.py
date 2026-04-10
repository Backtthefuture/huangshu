"""
W1: 即刻数据抓取
用法:
    1. 先装依赖:
        pip install jike-skill[qr]
    2. 扫码登录拿 token:
        jike auth
       把 access_token / refresh_token 记下来
    3. 抓取指定用户的动态:
        python fetch_jike.py <username> \
            --access-token <TOKEN> \
            --refresh-token <TOKEN> \
            --limit 200

输出:
    data/<username>_<timestamp>.json
    统一 schema: { profile, posts[], stats }
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
from datetime import datetime
from pathlib import Path

try:
    from jike import JikeClient, TokenPair
except ImportError:
    print("❌ 缺少依赖。先跑: pip install jike-skill[qr]", file=sys.stderr)
    sys.exit(1)


DATA_DIR = Path(__file__).resolve().parent.parent / "data"
DATA_DIR.mkdir(exist_ok=True)


def normalize_post(raw: dict) -> dict:
    """把 jike-skill 的原始帖子对象压成我们 pipeline 需要的最小字段。
    jike-skill 的具体字段名以实际返回为准，这里做宽松容错。
    """
    def g(*keys, default=None):
        for k in keys:
            if isinstance(raw, dict) and k in raw and raw[k] is not None:
                return raw[k]
        return default

    return {
        "id": g("id", "_id", "ref"),
        "created_at": g("createdAt", "created_at", "time"),
        "content": g("content", "text", "body", default=""),
        "topic": g("topic", {}).get("content") if isinstance(g("topic"), dict) else g("topic"),
        "like_count": g("likeCount", "likes_count", default=0),
        "comment_count": g("commentCount", "comments_count", default=0),
        "repost_count": g("repostCount", "reposts_count", default=0),
        "is_repost": bool(g("target", "quote")),
        "has_image": bool(g("pictures", "images")),
    }


def fetch_user(
    username: str,
    access_token: str,
    refresh_token: str,
    limit: int = 200,
) -> dict:
    tokens = TokenPair(access_token=access_token, refresh_token=refresh_token)
    client = JikeClient(tokens)

    print(f"→ 拉取用户资料: {username}")
    try:
        profile = client.profile(username=username)
    except Exception as e:
        print(f"⚠️  profile 失败: {e}")
        profile = {"username": username, "_error": str(e)}

    print(f"→ 拉取最近 {limit} 条动态 (personalUpdate/single)...")
    # NOTE: JikeClient.user_posts 内置指向 /1.0/userPost/listMore (已下线,返回 404),
    # 真实可用的是 /1.0/personalUpdate/single (与官方 export.py 一致)。
    posts_raw: list[dict] = []
    load_more_key = None
    last_err = None

    while len(posts_raw) < limit:
        body: dict = {"username": username, "limit": min(20, limit - len(posts_raw))}
        if load_more_key:
            body["loadMoreKey"] = load_more_key
        try:
            res = client._request("POST", "/1.0/personalUpdate/single", json=body)
        except Exception as e:
            last_err = str(e)
            print(f"⚠️  分页抓取异常: {e}", file=sys.stderr)
            break

        batch = res.get("data") if isinstance(res, dict) else None
        if not batch:
            break
        posts_raw.extend(batch)
        print(f"  · 已拉 {len(posts_raw)} 条")

        if res.get("loadMoreIsEnd"):
            break
        load_more_key = res.get("loadMoreKey")
        if not load_more_key:
            break
        time.sleep(0.6)  # 自限速,别惹风控

    posts = [normalize_post(p) for p in posts_raw[:limit]]

    return {
        "profile": profile if isinstance(profile, dict) else {"raw": str(profile)},
        "posts": posts,
        "stats": {
            "fetched": len(posts),
            "requested": limit,
            "error": last_err,
            "fetched_at": datetime.utcnow().isoformat() + "Z",
        },
    }


def main():
    ap = argparse.ArgumentParser(description="Fetch Jike user's posts into JSON")
    ap.add_argument("username", help="即刻用户名 (username)")
    ap.add_argument("--access-token", required=True)
    ap.add_argument("--refresh-token", required=True)
    ap.add_argument("--limit", type=int, default=200)
    args = ap.parse_args()

    data = fetch_user(
        username=args.username,
        access_token=args.access_token,
        refresh_token=args.refresh_token,
        limit=args.limit,
    )

    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    out = DATA_DIR / f"{args.username}_{ts}.json"
    out.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"\n✅ 完成。")
    print(f"   用户: {args.username}")
    print(f"   抓到: {data['stats']['fetched']} 条动态")
    print(f"   输出: {out}")


if __name__ == "__main__":
    main()
