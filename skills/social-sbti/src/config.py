"""Persistent user config for social-sbti.

位置: $XDG_CONFIG_HOME/sbti/config.json (默认 ~/.config/sbti/config.json)

结构:
    {
        "jike":  {"access_token": "...", "refresh_token": "..."},
        "x":     {"cookies_path": "/abs/path/to/x_cookies.json"},
        "output_dir": "./sbti-output"
    }

所有字段都可能缺失。读的时候给默认值,写的时候只写非空字段。
"""
from __future__ import annotations

import json
import os
from pathlib import Path

DEFAULT_OUTPUT_DIR = "./sbti-output"


def config_dir() -> Path:
    xdg = os.environ.get("XDG_CONFIG_HOME")
    base = Path(xdg) if xdg else Path.home() / ".config"
    d = base / "sbti"
    d.mkdir(parents=True, exist_ok=True)
    return d


def config_path() -> Path:
    return config_dir() / "config.json"


def x_cookies_path() -> Path:
    """Canonical X cookies path (outside config.json for cleanliness)."""
    return config_dir() / "x_cookies.json"


def jike_tokens_inbox() -> Path:
    """Drop-off path for `jike-auth > <this>` during first-time setup."""
    return config_dir() / "jike-tokens.json"


def load() -> dict:
    p = config_path()
    if not p.exists():
        return {}
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}


def save(cfg: dict) -> None:
    config_path().write_text(
        json.dumps(cfg, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    # 保护 config 里的 token:chmod 600
    try:
        os.chmod(config_path(), 0o600)
    except OSError:
        pass


# ---- Jike ----

def get_jike_tokens() -> tuple[str, str] | None:
    cfg = load()
    j = cfg.get("jike") or {}
    a = j.get("access_token")
    r = j.get("refresh_token")
    if a and r:
        return a, r
    # fallback: 环境变量
    a = os.environ.get("JIKE_ACCESS_TOKEN")
    r = os.environ.get("JIKE_REFRESH_TOKEN")
    if a and r:
        return a, r
    return None


def set_jike_tokens(access_token: str, refresh_token: str) -> None:
    cfg = load()
    cfg["jike"] = {
        "access_token": access_token.strip(),
        "refresh_token": refresh_token.strip(),
    }
    save(cfg)


def ingest_jike_from_inbox() -> bool:
    """读 ~/.config/sbti/jike-tokens.json(由 `jike-auth > ...` 写入),
    搬进 config,删掉原文件。成功返回 True。"""
    p = jike_tokens_inbox()
    if not p.exists():
        return False
    try:
        data = json.loads(p.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return False
    a = data.get("access_token")
    r = data.get("refresh_token")
    if not (a and r):
        return False
    set_jike_tokens(a, r)
    try:
        p.unlink()
    except OSError:
        pass
    return True


# ---- X ----

def get_x_cookies_path() -> Path | None:
    cfg = load()
    x = cfg.get("x") or {}
    p = x.get("cookies_path")
    if p:
        path = Path(p).expanduser()
        if path.exists():
            return path
    # fallback: 规范位置
    canon = x_cookies_path()
    if canon.exists():
        return canon
    return None


def set_x_cookies(auth_token: str, ct0: str) -> Path:
    path = x_cookies_path()
    path.write_text(
        json.dumps(
            {"auth_token": auth_token.strip(), "ct0": ct0.strip()},
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )
    try:
        os.chmod(path, 0o600)
    except OSError:
        pass
    cfg = load()
    cfg["x"] = {"cookies_path": str(path)}
    save(cfg)
    return path


# ---- Output dir ----

def get_output_dir(cwd: Path | None = None) -> Path:
    cfg = load()
    raw = cfg.get("output_dir") or DEFAULT_OUTPUT_DIR
    base = Path(cwd) if cwd else Path.cwd()
    if Path(raw).is_absolute():
        out = Path(raw)
    else:
        out = base / raw
    out.mkdir(parents=True, exist_ok=True)
    return out


def mask(tok: str | None, keep: int = 4) -> str:
    if not tok:
        return "(未设置)"
    if len(tok) <= keep * 2:
        return "*" * len(tok)
    return f"{tok[:keep]}...{tok[-keep:]}"
