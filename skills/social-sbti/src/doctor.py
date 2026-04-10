"""Preflight health check for social-sbti.

`sbti doctor`         — 只体检,报告问题 + 修复建议
`sbti doctor --fix`   — 检测到缺包时自动 pip install

退出码:
    0 = 全绿
    1 = 有警告(仍可用)
    2 = 缺关键依赖/凭证,无法继续
"""
from __future__ import annotations

import argparse
import importlib.util
import shutil
import subprocess
import sys
from pathlib import Path

import config  # type: ignore  # same-dir import

ESSENTIAL_PACKAGES = [
    # (import_name, pip_name, 说明)
    ("jike",       "jike-skill[qr]",  "即刻 fetcher"),
    ("twikit",     "twikit",          "X fetcher"),
    ("playwright", "playwright",      "HTML → PNG 渲染"),
]

GREEN = "\033[32m"
YELLOW = "\033[33m"
RED = "\033[31m"
DIM = "\033[2m"
RESET = "\033[0m"
OK = f"{GREEN}✓{RESET}"
WARN = f"{YELLOW}!{RESET}"
BAD = f"{RED}✗{RESET}"


def _has_module(name: str) -> bool:
    return importlib.util.find_spec(name) is not None


def _playwright_chromium_installed() -> bool:
    if not _has_module("playwright"):
        return False
    try:
        from playwright._impl._driver import compute_driver_executable  # type: ignore
        compute_driver_executable()  # smoke, doesn't actually need result
    except Exception:
        pass
    # cheap check: look for the cache dir
    cache = Path.home() / "Library" / "Caches" / "ms-playwright"
    if not cache.exists():
        cache = Path.home() / ".cache" / "ms-playwright"
    if not cache.exists():
        return False
    return any(p.name.startswith("chromium") for p in cache.iterdir())


def run(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(prog="sbti doctor")
    ap.add_argument("--fix", action="store_true", help="自动 pip install 缺失的包")
    ap.add_argument("--platform", choices=["jike", "x", "both"], default="both",
                    help="仅检查指定平台的凭证(默认全查)")
    args = ap.parse_args(argv)

    issues: list[tuple[str, str]] = []  # (severity, message)
    warnings = 0
    errors = 0

    print(f"{DIM}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{RESET}")
    print(f" 🔍 Social-SBTI Doctor")
    print(f"{DIM}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{RESET}")

    # Python 版本
    v = sys.version_info
    if v >= (3, 10):
        print(f" {OK} Python {v.major}.{v.minor}.{v.micro}")
    else:
        print(f" {BAD} Python {v.major}.{v.minor} (需要 >= 3.10)")
        errors += 1

    # 包依赖
    missing: list[tuple[str, str]] = []
    for mod, pkg, label in ESSENTIAL_PACKAGES:
        if _has_module(mod):
            print(f" {OK} {label:<18} ({mod})")
        else:
            print(f" {BAD} {label:<18} 缺: pip install {pkg}")
            missing.append((mod, pkg))
            errors += 1

    # playwright chromium
    if _has_module("playwright"):
        if _playwright_chromium_installed():
            print(f" {OK} playwright chromium")
        else:
            print(f" {WARN} playwright chromium 未装 → 跑: playwright install chromium")
            warnings += 1

    # 凭证检查
    plat = args.platform
    if plat in ("jike", "both"):
        # 先尝试从 inbox 吸入(jike-auth > inbox 的场景)
        if config.ingest_jike_from_inbox():
            print(f" {OK} 即刻 tokens (从 jike-tokens.json 自动保存)")
        else:
            t = config.get_jike_tokens()
            if t:
                a, r = t
                print(f" {OK} 即刻 tokens (access={config.mask(a)}, refresh={config.mask(r)})")
            else:
                print(f" {BAD} 即刻 tokens 未配置")
                print(f"    → 新开终端跑: jike-auth > {config.jike_tokens_inbox()}")
                errors += 1

    if plat in ("x", "both"):
        p = config.get_x_cookies_path()
        if p and p.exists():
            print(f" {OK} X cookies ({p})")
        else:
            print(f" {BAD} X cookies 未配置")
            print(f"    → 跑: sbti config x  (会引导你粘贴 auth_token 和 ct0)")
            errors += 1

    # 输出目录
    outdir = config.get_output_dir()
    print(f" {OK} 输出目录 {outdir}")

    print(f"{DIM}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{RESET}")

    # --fix: 装缺失的包
    if args.fix and missing:
        print(f"\n{YELLOW}▶ 自动修复: 安装缺失的包...{RESET}")
        pip = [sys.executable, "-m", "pip", "install"]
        for mod, pkg in missing:
            print(f"{DIM}  pip install {pkg}{RESET}")
            rc = subprocess.call(pip + [pkg])
            if rc != 0:
                print(f" {BAD} {pkg} 装失败")
                return 2
        # 如果装了 playwright,再尝试装 chromium
        if any(mod == "playwright" for mod, _ in missing):
            print(f"{DIM}  playwright install chromium{RESET}")
            subprocess.call([sys.executable, "-m", "playwright", "install", "chromium"])
        print(f"{GREEN}✓ 依赖已就绪,请重新跑 sbti doctor 确认{RESET}")
        return 0

    if errors:
        print(f"\n{RED}{errors} 项未就绪{RESET}"
              f"{'。warn=' + str(warnings) if warnings else ''}")
        return 2
    if warnings:
        print(f"\n{YELLOW}{warnings} 项警告,但可以继续{RESET}")
        return 1
    print(f"\n{GREEN}全部就绪,可以开始分析!{RESET}")
    return 0


if __name__ == "__main__":
    sys.exit(run())
