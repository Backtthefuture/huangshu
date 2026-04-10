#!/usr/bin/env python3
"""Social-SBTI unified CLI entry point.

子命令:
    sbti doctor [--fix]             — 依赖 + 凭证体检
    sbti config show                — 打印当前 config(token 脱敏)
    sbti config jike --access-token X --refresh-token Y
                                    — 保存即刻 tokens
    sbti config jike --from-inbox   — 从 ~/.config/sbti/jike-tokens.json 吸入
    sbti config x --auth-token X --ct0 Y
                                    — 保存 X cookies
    sbti fetch jike <user|url>      — 抓即刻动态
    sbti fetch x    <handle|url>    — 抓 X 推文
    sbti finalize <scores.json>     — 匹配 + 渲染 HTML + PNG(不挂 playwright 时跳过 PNG)

所有命令默认把产物写到 `./sbti-output/` (可在 config 改 output_dir)。
"""
from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import site
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

import config  # noqa: E402
import doctor  # noqa: E402
from personalities import DIMENSIONS  # noqa: E402


# ============= URL / handle 解析 =============

JIKE_URL_RE = re.compile(r"(?:okjike\.com|jike\.com)/u/([A-Za-z0-9\-]+)")
X_URL_RE    = re.compile(r"(?:x\.com|twitter\.com)/([A-Za-z0-9_]{1,15})")

def parse_jike_target(raw: str) -> str:
    raw = raw.strip()
    m = JIKE_URL_RE.search(raw)
    if m:
        return m.group(1)
    if raw.startswith("@"):
        return raw[1:]
    return raw


def parse_x_target(raw: str) -> tuple[str, bool]:
    """Return (handle_or_id, by_id)"""
    raw = raw.strip()
    m = X_URL_RE.search(raw)
    if m:
        return m.group(1), False
    if raw.startswith("@"):
        return raw[1:], False
    if raw.isdigit():
        return raw, True
    return raw, False


# ============= config subcommand =============

def cmd_config(args: argparse.Namespace) -> int:
    if args.config_sub == "show":
        cfg = config.load()
        j = cfg.get("jike", {})
        x = cfg.get("x", {})
        print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
        print(" 📋 Social-SBTI Config")
        print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
        print(f" 配置文件: {config.config_path()}")
        print(f" 即刻 access:  {config.mask(j.get('access_token'))}")
        print(f" 即刻 refresh: {config.mask(j.get('refresh_token'))}")
        print(f" X cookies:    {x.get('cookies_path') or '(未设置)'}")
        print(f" 输出目录:     {config.get_output_dir()}")
        return 0

    if args.config_sub == "jike":
        if args.from_inbox:
            ok = config.ingest_jike_from_inbox()
            if ok:
                a, r = config.get_jike_tokens()  # type: ignore
                print(f"✓ 即刻 tokens 已从 inbox 导入")
                print(f"  access:  {config.mask(a)}")
                print(f"  refresh: {config.mask(r)}")
                return 0
            else:
                print(
                    f"✗ {config.jike_tokens_inbox()} 不存在或格式错误\n"
                    f"  请在新终端跑: jike-auth > {config.jike_tokens_inbox()}\n"
                    f"  扫码完成后重试这条命令",
                    file=sys.stderr,
                )
                return 1
        if args.access_token and args.refresh_token:
            config.set_jike_tokens(args.access_token, args.refresh_token)
            print("✓ 即刻 tokens 已保存到 config")
            return 0
        print(
            "用法:\n"
            "  sbti config jike --from-inbox\n"
            "  sbti config jike --access-token <a> --refresh-token <b>",
            file=sys.stderr,
        )
        return 1

    if args.config_sub == "x":
        if args.auth_token and args.ct0:
            p = config.set_x_cookies(args.auth_token, args.ct0)
            print(f"✓ X cookies 已保存: {p}")
            return 0
        print(
            "用法:\n"
            "  sbti config x --auth-token <a> --ct0 <b>",
            file=sys.stderr,
        )
        return 1

    print("sbti config: 需要子命令 (show / jike / x)", file=sys.stderr)
    return 1


# ============= fetch subcommand =============

def cmd_fetch(args: argparse.Namespace) -> int:
    out_dir = config.get_output_dir()

    if args.platform == "jike":
        t = config.get_jike_tokens()
        if not t:
            print("✗ 即刻 tokens 未配置。先跑: sbti config jike --from-inbox", file=sys.stderr)
            return 2
        access, refresh = t
        username = parse_jike_target(args.target)
        # 调 fetch_jike 内部函数,不走其 main()(避免重复 argparse)
        try:
            from fetch_jike import fetch_user
        except ImportError as e:
            print(f"✗ 导入 fetch_jike 失败: {e}", file=sys.stderr)
            return 2
        print(f"📡 抓取即刻 @{username} ...", file=sys.stderr)
        data = fetch_user(username, access, refresh, limit=args.limit)
        out = out_dir / f"{username}_raw.json"
        out.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        n = data.get("stats", {}).get("fetched", 0)
        print(f"✓ 抓到 {n} 条动态")
        print(f"  → {out}")
        return 0

    if args.platform == "x":
        cookies_path = config.get_x_cookies_path()
        if not cookies_path:
            print("✗ X cookies 未配置。先跑: sbti config x --auth-token ... --ct0 ...", file=sys.stderr)
            return 2
        handle, by_id = parse_x_target(args.target)
        # fetch_x 用 asyncio;直接 import 跑
        import asyncio
        try:
            from fetch_x import fetch_user_async
        except ImportError as e:
            print(f"✗ 导入 fetch_x 失败: {e}", file=sys.stderr)
            return 2
        # fetch_x 读的是 COOKIES_PATH 常量,我们通过 monkey-patch 改成 config 路径
        import fetch_x as fx
        fx.COOKIES_PATH = cookies_path
        print(f"📡 抓取 X @{handle} ...", file=sys.stderr)
        data = asyncio.run(fetch_user_async(handle, limit=args.limit, by_id=by_id))
        name = (data.get("profile", {}).get("screen_name") or handle).lower()
        out = out_dir / f"{name}_raw.json"
        out.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        n = data.get("stats", {}).get("fetched", 0)
        print(f"✓ 抓到 {n} 条推文")
        print(f"  → {out}")
        return 0

    print("unknown platform", file=sys.stderr)
    return 1


# ============= jike-auth subcommand =============

def _locate_jike_auth() -> str | None:
    """Find the jike-auth binary.

    Search order:
      1. $PATH via shutil.which
      2. user-site bin (e.g. ~/Library/Python/3.14/bin on macOS Homebrew,
         where `pip install --user` lands when PEP 668 applies)
    """
    exe = shutil.which("jike-auth")
    if exe:
        return exe
    candidate = Path(site.getuserbase()) / "bin" / "jike-auth"
    if candidate.exists() and os.access(candidate, os.X_OK):
        return str(candidate)
    return None


def cmd_jike_auth(args: argparse.Namespace) -> int:
    """Locate and exec jike-auth, preserving stdin/stdout/stderr.

    Use this instead of calling `jike-auth` directly — it handles the case
    where `pip install --user` put the binary in a user-site bin that's not
    on PATH (very common on macOS Homebrew Python under PEP 668).

    The child inherits this process's stdout, so the caller can redirect:
        sbti jike-auth > ~/.config/sbti/jike-tokens.json
    """
    exe = _locate_jike_auth()
    if not exe:
        print(
            "✗ 找不到 jike-auth。先跑: sbti doctor --fix\n"
            "  (会从 github.com/MidnightDarling/jike-skill 装)",
            file=sys.stderr,
        )
        return 2
    os.execv(exe, [exe])
    return 0  # unreachable


# ============= finalize subcommand =============

def cmd_finalize(args: argparse.Namespace) -> int:
    scores_path = Path(args.scores_file)
    if not scores_path.exists():
        print(f"✗ 文件不存在: {scores_path}", file=sys.stderr)
        return 2

    from match import enrich
    from make_card import render as render_html

    data = json.loads(scores_path.read_text(encoding="utf-8"))
    data = enrich(data)
    scores_path.write_text(
        json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    p = data["personality"]
    print("━" * 50)
    print(f"  🎭 {data.get('profile', {}).get('screen_name', '?')}")
    print(f"  人格: 【{p['code']}】· {p['cn_name']}  {p['mascot']}")
    print(f"  标语: 「{p['tagline']}」")
    print(f"  匹配: {p['similarity']}%")
    print(f"  模式: {data['pattern']}")
    print("━" * 50)

    html_path = render_html(scores_path)
    print(f"✓ HTML 已生成: {html_path}")

    # PNG (optional)
    if not args.no_png:
        try:
            import asyncio
            from render_png import render as render_png
            png_path = asyncio.run(render_png(html_path))
            print(f"✓ PNG 已生成: {png_path}")
        except ModuleNotFoundError:
            print("  (跳过 PNG:未装 playwright,可跑 `sbti doctor --fix`)")
        except Exception as e:
            print(f"  (PNG 渲染失败: {e})")

    print(f"\n打开: open {html_path}")
    return 0


# ============= main =============

def build_parser() -> argparse.ArgumentParser:
    ap = argparse.ArgumentParser(prog="sbti", description="Social-SBTI CLI")
    sub = ap.add_subparsers(dest="cmd", required=True)

    # doctor
    d = sub.add_parser("doctor", help="依赖 + 凭证体检", add_help=False)
    d.add_argument("--fix", action="store_true")
    d.add_argument("--platform", choices=["jike", "x", "both"], default="both")
    d.add_argument("-h", "--help", action="store_true")

    # config
    c = sub.add_parser("config", help="管理凭证")
    csub = c.add_subparsers(dest="config_sub", required=True)
    csub.add_parser("show", help="打印当前 config")
    cj = csub.add_parser("jike", help="保存即刻 tokens")
    cj.add_argument("--access-token")
    cj.add_argument("--refresh-token")
    cj.add_argument("--from-inbox", action="store_true",
                    help=f"从 {config.jike_tokens_inbox()} 吸入")
    cx = csub.add_parser("x", help="保存 X cookies")
    cx.add_argument("--auth-token")
    cx.add_argument("--ct0")

    # fetch
    f = sub.add_parser("fetch", help="抓取动态")
    fsub = f.add_subparsers(dest="platform", required=True)
    fj = fsub.add_parser("jike", help="抓即刻")
    fj.add_argument("target", help="即刻 username / URL")
    fj.add_argument("--limit", type=int, default=200)
    fx_ = fsub.add_parser("x", help="抓 X")
    fx_.add_argument("target", help="X handle / URL / user_id")
    fx_.add_argument("--limit", type=int, default=200)

    # finalize
    fin = sub.add_parser("finalize", help="match + 渲染")
    fin.add_argument("scores_file")
    fin.add_argument("--no-png", action="store_true")

    # jike-auth (wraps jike-skill's jike-auth binary, handles PATH resolution)
    sub.add_parser("jike-auth", help="扫码登录即刻 (tokens → stdout)")

    return ap


def main(argv: list[str] | None = None) -> int:
    ap = build_parser()
    args = ap.parse_args(argv)

    if args.cmd == "doctor":
        if getattr(args, "help", False):
            return doctor.run(["--help"])
        fix = ["--fix"] if args.fix else []
        plat = ["--platform", args.platform] if args.platform != "both" else []
        return doctor.run(fix + plat)

    if args.cmd == "config":
        return cmd_config(args)
    if args.cmd == "fetch":
        return cmd_fetch(args)
    if args.cmd == "finalize":
        return cmd_finalize(args)
    if args.cmd == "jike-auth":
        return cmd_jike_auth(args)

    ap.print_help()
    return 1


if __name__ == "__main__":
    sys.exit(main())
