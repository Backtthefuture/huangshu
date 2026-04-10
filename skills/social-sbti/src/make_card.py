"""scores.json → HTML 卡片 (通用渲染器,零依赖)。

依赖 match.py 已经往 scores.json 写好 personality 字段,
本脚本只负责拼 HTML。如果检测到 personality 字段缺失,会先调 enrich。

用法:
    python make_card.py data/huangshu_scores.json
    → data/huangshu-sbti.html

可选输出路径:
    python make_card.py data/huangshu_scores.json --out data/xxx.html
"""
from __future__ import annotations

import argparse
import html
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from personalities import DIMENSION_GROUPS, DIMENSIONS, PERSONALITIES
from match import enrich

TEMPLATE_PATH = Path(__file__).resolve().parent.parent / "templates" / "card.html"

DIM_LABELS = {code: label for code, label in DIMENSIONS}

PLATFORM_LABELS = {
    "jike": "即刻",
    "x": "X",
    "twitter": "X",
    "weibo": "微博",
    "xhs": "小红书",
}


def _esc(s: str | None) -> str:
    return html.escape(s or "", quote=False)


def _build_dim_groups_html(scores: list[dict]) -> str:
    by_dim = {s["dimension"]: s for s in scores}
    out = []
    for group_name, codes in DIMENSION_GROUPS:
        out.append('      <div class="group">')
        out.append(f'        <div class="group-title">{group_name}</div>')
        for code in codes:
            label = DIM_LABELS.get(code, code)
            s = by_dim.get(code, {})
            level = s.get("level", "M")
            reason = _esc(s.get("reasoning", ""))
            out.append(
                f'        <div class="row">'
                f'<span class="n">{code} {label}</span>'
                f'<span class="lv {level}">{level}</span>'
                f'<span class="desc">{reason}</span>'
                f'</div>'
            )
        out.append('      </div>')
    return "\n".join(out)


def _build_quotes_html(quotes: list[str]) -> str:
    if not quotes:
        return '    <div class="quote">（未提供引用证据）</div>'
    return "\n".join(
        f'    <div class="quote">{_esc(q)}</div>' for q in quotes
    )


def render(scores_path: Path, out_path: Path | None = None) -> Path:
    data = json.loads(scores_path.read_text(encoding="utf-8"))

    if "personality" not in data:
        data = enrich(data)
        scores_path.write_text(
            json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8"
        )

    profile = data.get("profile", {})
    pers = data["personality"]
    scores = data.get("scores", [])
    quotes = data.get("quotes", [])

    screen_name = profile.get("screen_name") or profile.get("screenName") or "匿名用户"
    bio = profile.get("bio") or ""
    platform = (profile.get("platform") or "").lower()
    platform_label = PLATFORM_LABELS.get(platform, platform or "社交")
    post_count = profile.get("post_count") or profile.get("n_posts") or 0

    source_line = f"FROM {platform_label}"
    if post_count:
        source_line += f" · {post_count} 条动态"

    desc = data.get("personality_description") or (
        f"{pers['cn_name']}型人格,暂无详细描述。"
    )
    impression = data.get("overall_impression") or ""

    file_stem = scores_path.stem.replace("_scores", "").replace("_sbti", "")

    replacements = {
        "{{SCREEN_NAME}}": _esc(screen_name),
        "{{BIO}}": _esc(bio),
        "{{CODE}}": _esc(pers["code"]),
        "{{CN_NAME}}": _esc(pers["cn_name"]),
        "{{MASCOT}}": pers.get("mascot", "🎭"),
        "{{MATCH}}": str(pers.get("similarity", 0)),
        "{{SOURCE_LINE}}": _esc(source_line),
        "{{PLATFORM_LABEL}}": _esc(platform_label),
        "{{PERSONALITY_DESCRIPTION}}": _esc(desc),
        "{{OVERALL_IMPRESSION}}": _esc(impression),
        "{{DIM_GROUPS_HTML}}": _build_dim_groups_html(scores),
        "{{QUOTES_HTML}}": _build_quotes_html(quotes),
        "{{FILE_STEM}}": _esc(file_stem),
    }

    tpl = TEMPLATE_PATH.read_text(encoding="utf-8")
    for k, v in replacements.items():
        tpl = tpl.replace(k, v)

    if out_path is None:
        out_path = scores_path.with_name(f"{file_stem}-sbti.html")
    out_path.write_text(tpl, encoding="utf-8")
    return out_path


def main() -> None:
    ap = argparse.ArgumentParser(description="Render SBTI scores.json into an HTML card")
    ap.add_argument("scores_file")
    ap.add_argument("--out", help="HTML output path")
    args = ap.parse_args()

    path = Path(args.scores_file)
    if not path.exists():
        print(f"❌ 文件不存在: {path}", file=sys.stderr)
        sys.exit(1)

    out = Path(args.out) if args.out else None
    result = render(path, out)
    print(f"✅ HTML 已生成: {result}")
    print(f"   浏览器打开: open {result}")


if __name__ == "__main__":
    main()
