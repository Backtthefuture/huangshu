"""从 scores.json 做人格匹配,把结果写回同文件。

输入 schema (必填字段):
    {
      "profile": {"screen_name": "...", "platform": "...", "post_count": 200},
      "scores": [
        {"dimension":"S1","level":"H","confidence":0.9,
         "evidence":["post_id",...],"reasoning":"..."},
        ... 共 15 条 ...
      ]
    }

可选字段 (LLM 打分时可一并生成,会被保留):
    overall_impression, personality_description, quotes[]

输出会在原文件中追加/更新:
    pattern, personality: {code, cn_name, similarity, tagline, mascot, pattern}

用法:
    python match.py data/huangshu_scores.json
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from personalities import (
    DIMENSIONS,
    PERSONALITIES,
    format_pattern,
    match_personality,
)


def enrich(data: dict) -> dict:
    order = [code for code, _ in DIMENSIONS]
    by_dim = {s["dimension"]: s for s in data.get("scores", [])}

    levels: list[str] = []
    for code in order:
        s = by_dim.get(code)
        if not s:
            levels.append("M")
            continue
        # 硬约束:置信度 < 0.4 或无证据 → 回退 M
        conf = s.get("confidence", 0)
        evid = s.get("evidence") or s.get("supporting_evidence") or []
        if conf < 0.4 or not evid:
            levels.append("M")
        else:
            levels.append(s["level"])

    pattern = format_pattern(levels)

    # 酒鬼门控:scores.json 里如果带了 "drunk": true,直接走彩蛋
    if data.get("drunk"):
        code, cn = "DRUNK", "酒鬼"
        sim = 100
    else:
        code, cn, sim = match_personality(levels)

    cn_name, tagline, mascot, tpl_pattern = PERSONALITIES[code]
    data["pattern"] = pattern
    data["personality"] = {
        "code": code,
        "cn_name": cn_name,
        "tagline": tagline,
        "mascot": mascot,
        "template_pattern": tpl_pattern,
        "similarity": sim,
    }
    return data


def main() -> None:
    ap = argparse.ArgumentParser(description="Match SBTI scores.json to a personality")
    ap.add_argument("scores_file", help="path to <name>_scores.json")
    args = ap.parse_args()

    path = Path(args.scores_file)
    data = json.loads(path.read_text(encoding="utf-8"))
    enriched = enrich(data)
    path.write_text(
        json.dumps(enriched, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    p = enriched["personality"]
    print("━" * 50)
    print(f"  🎭 {enriched.get('profile', {}).get('screen_name', '?')}")
    print(f"  人格: 【{p['code']}】· {p['cn_name']}  {p['mascot']}")
    print(f"  标语: 「{p['tagline']}」")
    print(f"  匹配: {p['similarity']}%")
    print(f"  模式: {enriched['pattern']}")
    print("━" * 50)
    print(f"\n💾 已写回: {path}")


if __name__ == "__main__":
    main()
