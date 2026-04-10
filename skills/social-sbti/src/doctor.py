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
import os
import shutil
import site
import subprocess
import sys
from pathlib import Path

import config  # type: ignore  # same-dir import

# jike-skill 未发布到 PyPI,直接从 GitHub 装
JIKE_GIT_SPEC = "jike-skill[qr] @ git+https://github.com/MidnightDarling/jike-skill.git"

ESSENTIAL_PACKAGES = [
    # (import_name, pip_spec_for_install, display_name, label)
    ("jike",       JIKE_GIT_SPEC,  "jike-skill[qr]", "即刻 fetcher"),
    ("twikit",     "twikit",       "twikit",         "X fetcher"),
    ("playwright", "playwright",   "playwright",     "HTML → PNG 渲染"),
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


def _user_site_bin() -> Path:
    return Path(site.getuserbase()) / "bin"


def _pip_install(pip_spec: str) -> int:
    """Install a package, retrying with --user --break-system-packages on PEP 668.

    Homebrew Python / Debian / system pythons mark themselves as
    externally-managed (PEP 668) and refuse `pip install` without a venv.
    Falling back to `--user --break-system-packages` is the least-surprising
    thing for a skill that wants to Just Work.
    """
    base = [sys.executable, "-m", "pip", "install"]
    rc = subprocess.call(base + [pip_spec])
    if rc == 0:
        return 0
    print(f"{DIM}  retry with --user --break-system-packages{RESET}")
    return subprocess.call(base + ["--user", "--break-system-packages", pip_spec])


def _warn_user_site_path() -> None:
    """If a user-site `bin/` holds jike-auth but is not on PATH, print how to fix."""
    user_bin = _user_site_bin()
    if not (user_bin / "jike-auth").exists():
        return
    path_parts = os.environ.get("PATH", "").split(os.pathsep)
    if str(user_bin) in path_parts:
        return
    print(f"\n{YELLOW}⚠ jike-auth 已装到 {user_bin},但不在 PATH 中。{RESET}")
    print(f"  永久生效(下次新终端):")
    print(f"    echo 'export PATH=\"{user_bin}:$PATH\"' >> ~/.zshrc")
    print(f"  本次会话 skill 会用 `sbti jike-auth` 包装命令自动定位,不用改 PATH。")


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
    missing: list[tuple[str, str, str]] = []  # (mod, pip_spec, display)
    for mod, pip_spec, display, label in ESSENTIAL_PACKAGES:
        if _has_module(mod):
            print(f" {OK} {label:<18} ({mod})")
        else:
            print(f" {BAD} {label:<18} 缺: pip install {display}")
            missing.append((mod, pip_spec, display))
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
        for mod, pip_spec, display in missing:
            print(f"{DIM}  pip install {display}{RESET}")
            rc = _pip_install(pip_spec)
            if rc != 0:
                print(f" {BAD} {display} 装失败")
                return 2
        # 如果装了 playwright,再尝试装 chromium
        if any(mod == "playwright" for mod, _, _ in missing):
            print(f"{DIM}  playwright install chromium{RESET}")
            subprocess.call([sys.executable, "-m", "playwright", "install", "chromium"])
        _warn_user_site_path()
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
