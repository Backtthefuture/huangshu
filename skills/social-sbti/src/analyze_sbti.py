"""
W2: 从动态 JSON → SBTI 15 维度打分 → 人格类型

用法:
    python analyze_sbti.py data/<username>_<ts>.json

依赖:
    pip install anthropic
    export ANTHROPIC_API_KEY=sk-...

输出:
    - 命令行打印 15 维度 + 人格类型 + 匹配度
    - data/<username>_<ts>_sbti.json  (原始 LLM 输出 + 最终类型)
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

try:
    from anthropic import Anthropic
except ImportError:
    print("❌ 缺少依赖。先跑: pip install anthropic", file=sys.stderr)
    sys.exit(1)


# ---------- SBTI 维度定义 ----------
DIMENSIONS = [
    ("S1", "自尊自信", "对自己的评价。H=稳定自信、坦然；L=频繁自贬、求安慰"),
    ("S2", "自我清晰度", "对自我的认知清晰度。H=知道自己要什么；L=经常困惑迷茫"),
    ("S3", "核心价值", "进取心强度。H=强目标感、成长驱动；L=随波逐流、舒适优先"),
    ("E1", "依恋安全感", "关系中的信任感。H=放心稳定；L=多疑、怕被抛弃"),
    ("E2", "情感投入度", "情感卷入程度。H=全情投入；L=克制回避、留后手"),
    ("E3", "边界与依赖", "独立空间需求。H=重视个人空间；L=依赖黏人"),
    ("A1", "世界观倾向", "对人性的看法。H=相信善意；L=防御警惕"),
    ("A2", "规则灵活度", "对规则的态度。H=守规矩；L=爱打破常规"),
    ("A3", "人生意义感", "方向感。H=目标明确；L=虚无、无意义"),
    ("Ac1", "动机导向", "进取 vs 避险。H=追成果；L=避麻烦"),
    ("Ac2", "决策风格", "决断力。H=果断；L=反复纠结"),
    ("Ac3", "执行模式", "推进力。H=主动推进；L=靠死线驱动"),
    ("So1", "社交主动性", "主动程度。H=主动外向；L=被动慢热"),
    ("So2", "人际边界感", "亲密距离。H=强边界；L=想融合亲近"),
    ("So3", "表达真实度", "场合切换。H=分层发放真实感；L=直来直去"),
]

# ---------- 25+2 人格模板（从 SKILL.md 直接抄） ----------
TEMPLATES = {
    "CTRL":   ("拿捏者",     "HHH-HMH-MHH-HHH-MHM"),
    "ATM-er": ("送钱者",     "HHH-HHM-HHH-HMH-MHL"),
    "Dior-s": ("屌丝",       "MHM-MMH-MHM-HMH-LHL"),
    "BOSS":   ("领导者",     "HHH-HMH-MMH-HHH-LHL"),
    "THAN-K": ("感恩者",     "MHM-HMM-HHM-MMH-MHL"),
    "OH-NO":  ("哦不人",     "HHL-LMH-LHH-HHM-LHL"),
    "GOGO":   ("行者",       "HHM-HMH-MMH-HHH-MHM"),
    "SEXY":   ("尤物",       "HMH-HHL-HMM-HMM-HLH"),
    "LOVE-R": ("多情者",     "MLH-LHL-HLH-MLM-MLH"),
    "MUM":    ("妈妈",       "MMH-MHL-HMM-LMM-HLL"),
    "FAKE":   ("伪人",       "HLM-MML-MLM-MLM-HLH"),
    "OJBK":   ("无所谓人",   "MMH-MMM-HML-LMM-MML"),
    "MALO":   ("吗喽",       "MLH-MHM-MLH-MLH-LMH"),
    "JOKE-R": ("小丑",       "LLH-LHL-LML-LLL-MLM"),
    "WOC!":   ("握草人",     "HHL-HMH-MMH-HHM-LHH"),
    "THIN-K": ("思考者",     "HHL-HMH-MLH-MHM-LHH"),
    "SHIT":   ("愤世者",     "HHL-HLH-LMM-HHM-LHH"),
    "ZZZZ":   ("装死者",     "MHL-MLH-LML-MML-LHM"),
    "POOR":   ("贫困者",     "HHL-MLH-LMH-HHH-LHL"),
    "MONK":   ("僧人",       "HHL-LLH-LLM-MML-LHM"),
    "IMSB":   ("傻者",       "LLM-LMM-LLL-LLL-MLM"),
    "SOLO":   ("孤儿",       "LML-LLH-LHL-LML-LHM"),
    "FUCK":   ("草者",       "MLL-LHL-LLM-MLL-HLH"),
    "DEAD":   ("死者",       "LLL-LLM-LML-LLL-LHM"),
    "IMFW":   ("废物",       "LLH-LHL-LML-LLL-MLL"),
}

LEVEL_VAL = {"L": 1, "M": 2, "H": 3}


def pattern_to_values(pattern: str) -> list[int]:
    """HHH-HMH-MHH-HHH-MHM → [3,3,3,3,2,3,3,3,3,3,3,3,3,2,3]... wait 15"""
    clean = pattern.replace("-", "")
    return [LEVEL_VAL[c] for c in clean]


def match_personality(user_levels: list[str]) -> tuple[str, str, int]:
    """返回 (code, cn_name, similarity_percent)"""
    user_vals = [LEVEL_VAL[l] for l in user_levels]
    best_code, best_cn, best_dist, best_exact = None, None, 999, -1
    for code, (cn, pat) in TEMPLATES.items():
        tvals = pattern_to_values(pat)
        dist = sum(abs(a - b) for a, b in zip(user_vals, tvals))
        exact = sum(1 for a, b in zip(user_vals, tvals) if a == b)
        if (dist < best_dist) or (dist == best_dist and exact > best_exact):
            best_code, best_cn, best_dist, best_exact = code, cn, dist, exact
    similarity = max(0, round((1 - best_dist / 30) * 100))
    if similarity < 60:
        return "HHHH", "傻乐者", similarity
    return best_code, best_cn, similarity


# ---------- LLM 打分 ----------
SYSTEM_PROMPT = """你是一个人格画像分析助手，基于用户的社交媒体动态，
对 15 个 SBTI 维度逐一打分 L/M/H。你的风格是客观冷静，严禁编造证据。
所有证据必须引用真实的 post_id。

强约束:
1. 15 个维度全部输出，顺序固定
2. 每个维度必须提供至少 1 条 supporting_evidence (post_id)，否则 level 必须是 M
3. 有明确反向证据时降一档
4. 不确定就打 M，不要强行 L 或 H
5. confidence < 0.4 的一律回退到 M
"""

USER_PROMPT_TEMPLATE = """下面是一个人的即刻动态集合，请为 SBTI 的 15 个维度打分。

## 维度定义和锚点

{dim_defs}

## 动态数据（共 {n_posts} 条）

{posts_block}

## 输出要求

请用 tool `score_sbti` 输出。对每个维度给出:
- dimension: 维度代号（S1/S2/.../So3）
- level: L / M / H
- confidence: 0.0-1.0
- supporting_evidence: [post_id,...] 至少1条
- counter_evidence: [post_id,...] 可为空
- reasoning: 不超过 40 字的中文理由
"""

SCORE_TOOL = {
    "name": "score_sbti",
    "description": "Submit the final 15-dimension SBTI scores with evidence.",
    "input_schema": {
        "type": "object",
        "properties": {
            "scores": {
                "type": "array",
                "minItems": 15,
                "maxItems": 15,
                "items": {
                    "type": "object",
                    "properties": {
                        "dimension": {"type": "string"},
                        "level": {"type": "string", "enum": ["L", "M", "H"]},
                        "confidence": {"type": "number"},
                        "supporting_evidence": {
                            "type": "array",
                            "items": {"type": "string"},
                        },
                        "counter_evidence": {
                            "type": "array",
                            "items": {"type": "string"},
                        },
                        "reasoning": {"type": "string"},
                    },
                    "required": [
                        "dimension",
                        "level",
                        "confidence",
                        "supporting_evidence",
                        "reasoning",
                    ],
                },
            },
            "overall_summary": {
                "type": "string",
                "description": "一句话总结这个人的整体画像印象",
            },
        },
        "required": ["scores", "overall_summary"],
    },
}


def build_dim_defs() -> str:
    return "\n".join(
        f"- **{code} {name}** — {desc}" for code, name, desc in DIMENSIONS
    )


def build_posts_block(posts: list[dict], max_chars: int = 180) -> str:
    lines = []
    for i, p in enumerate(posts):
        content = (p.get("content") or "").strip().replace("\n", " ")
        if len(content) > max_chars:
            content = content[:max_chars] + "…"
        if not content:
            continue
        pid = p.get("id") or f"idx_{i}"
        lines.append(f"[{pid}] {content}")
    return "\n".join(lines)


def sample_posts(posts: list[dict], target: int = 150) -> list[dict]:
    """按时间分布采样 + 过滤空内容。"""
    non_empty = [p for p in posts if (p.get("content") or "").strip()]
    if len(non_empty) <= target:
        return non_empty
    # 简单时间分层采样: 前 60% 取近期，后 40% 取更早
    n_recent = int(target * 0.6)
    n_older = target - n_recent
    return non_empty[:n_recent] + non_empty[-n_older:]


def analyze(data_file: Path) -> dict:
    data = json.loads(data_file.read_text(encoding="utf-8"))
    posts = sample_posts(data.get("posts", []), target=150)
    if not posts:
        raise SystemExit("❌ 没有可分析的动态内容")

    print(f"→ 采样 {len(posts)} 条动态送去打分...")

    client = Anthropic()
    model = os.environ.get("SBTI_MODEL", "claude-sonnet-4-5")  # 可以用 opus 更准

    user_prompt = USER_PROMPT_TEMPLATE.format(
        dim_defs=build_dim_defs(),
        n_posts=len(posts),
        posts_block=build_posts_block(posts),
    )

    resp = client.messages.create(
        model=model,
        max_tokens=4096,
        temperature=0.3,
        system=SYSTEM_PROMPT,
        tools=[SCORE_TOOL],
        tool_choice={"type": "tool", "name": "score_sbti"},
        messages=[{"role": "user", "content": user_prompt}],
    )

    tool_use = next(
        (b for b in resp.content if getattr(b, "type", None) == "tool_use"), None
    )
    if not tool_use:
        raise SystemExit(f"❌ LLM 没按预期返回 tool_use: {resp}")

    result = tool_use.input
    scores = result["scores"]

    # ---- 装配成 15 位 L/M/H 序列 ----
    order = [d[0] for d in DIMENSIONS]
    by_dim = {s["dimension"]: s for s in scores}
    levels = []
    for code in order:
        s = by_dim.get(code)
        if not s:
            levels.append("M")
            continue
        # 硬约束:没证据就 M;置信度低也回退 M
        if s.get("confidence", 0) < 0.4 or not s.get("supporting_evidence"):
            levels.append("M")
        else:
            levels.append(s["level"])

    pattern = "".join(levels)
    pattern_display = f"{pattern[0:3]}-{pattern[3:6]}-{pattern[6:9]}-{pattern[9:12]}-{pattern[12:15]}"

    code, cn, sim = match_personality(levels)

    final = {
        "profile": data.get("profile", {}),
        "n_posts_analyzed": len(posts),
        "pattern": pattern_display,
        "personality": {"code": code, "cn_name": cn, "similarity": sim},
        "dimensions": scores,
        "overall_summary": result.get("overall_summary", ""),
    }

    out = data_file.with_name(data_file.stem + "_sbti.json")
    out.write_text(json.dumps(final, ensure_ascii=False, indent=2), encoding="utf-8")

    print("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print(f"  🎭 SBTI 结果")
    print(f"  人格类型: 【{code}】· {cn}")
    print(f"  匹配度:   {sim}%")
    print(f"  模式串:   {pattern_display}")
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print(f"\n📝 整体印象: {result.get('overall_summary', '')}\n")

    print("📊 维度详情:")
    for code_dim, name, _ in DIMENSIONS:
        s = by_dim.get(code_dim, {})
        level = s.get("level", "M")
        conf = s.get("confidence", 0)
        reason = s.get("reasoning", "")
        print(f"  {code_dim:4s} {name:8s} {level}  (conf={conf:.2f}) — {reason}")

    print(f"\n💾 完整结果已保存: {out}")
    return final


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("data_file", help="fetch_jike.py 生成的 json 文件路径")
    args = ap.parse_args()
    analyze(Path(args.data_file))


if __name__ == "__main__":
    main()
