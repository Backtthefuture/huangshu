"""27 种 SBTI 人格元数据：代号、中文名、标语、吉祥物、15 维模板串。

长篇描述文案不在此处 —— 交给打分 LLM 基于对象现场生成，
这样每张卡都是"本人定制版"。
"""
from __future__ import annotations

DIMENSIONS = [
    ("S1",  "自尊自信"),
    ("S2",  "自我清晰"),
    ("S3",  "核心价值"),
    ("E1",  "依恋安全"),
    ("E2",  "情感投入"),
    ("E3",  "边界依赖"),
    ("A1",  "世界观"),
    ("A2",  "规则灵活"),
    ("A3",  "意义感"),
    ("Ac1", "动机"),
    ("Ac2", "决策"),
    ("Ac3", "执行"),
    ("So1", "主动性"),
    ("So2", "边界感"),
    ("So3", "真实度"),
]

DIMENSION_GROUPS = [
    ("自我模型",   ["S1", "S2", "S3"]),
    ("情感模型",   ["E1", "E2", "E3"]),
    ("态度模型",   ["A1", "A2", "A3"]),
    ("行动驱力",   ["Ac1", "Ac2", "Ac3"]),
    ("社交模型",   ["So1", "So2", "So3"]),
]

LEVEL_VAL = {"L": 1, "M": 2, "H": 3}

# 27 种人格：code → (cn_name, tagline, mascot, pattern)
PERSONALITIES: dict[str, tuple[str, str, str, str]] = {
    "CTRL":   ("拿捏者",   "怎么样,被我拿捏了吧?",     "🎛️", "HHH-HMH-MHH-HHH-MHM"),
    "ATM-er": ("送钱者",   "你以为我有钱?",            "💸",  "HHH-HHM-HHH-HMH-MHL"),
    "Dior-s": ("屌丝",     "等我逆袭",                  "🍜",  "MHM-MMH-MHM-HMH-LHL"),
    "BOSS":   ("领导者",   "给我方向盘,我来开",         "👔",  "HHH-HMH-MMH-HHH-LHL"),
    "THAN-K": ("感恩者",   "感谢一切!",                 "🙏",  "MHM-HMM-HHM-MMH-MHL"),
    "OH-NO":  ("哦不人",   "哦不!这怎么行!",           "😱",  "HHL-LMH-LHH-HHM-LHL"),
    "GOGO":   ("行者",     "gogogo~ 出发!",             "🏃",  "HHM-HMH-MMH-HHH-MHM"),
    "SEXY":   ("尤物",     "你天生丽质!",               "💋",  "HMH-HHL-HMM-HMM-HLH"),
    "LOVE-R": ("多情者",   "太多感情,现实显得荒芜",    "💘",  "MLH-LHL-HLH-MLM-MLH"),
    "MUM":    ("妈妈",     "可以叫你妈妈吗?",           "🤱",  "MMH-MHL-HMM-LMM-HLL"),
    "FAKE":   ("伪人",     "还有真人吗?",               "🎭",  "HLM-MML-MLM-MLM-HLH"),
    "OJBK":   ("无所谓人", "都行",                      "🫠",  "MMH-MMM-HML-LMM-MML"),
    "MALO":   ("吗喽",     "生活是副本,我只是个吗喽",   "🐒",  "MLH-MHM-MLH-MLH-LMH"),
    "JOKE-R": ("小丑",     "我们都是小丑",              "🤡",  "LLH-LHL-LML-LLL-MLM"),
    "WOC!":   ("握草人",   "我靠!这什么情况?!",         "😲",  "HHL-HMH-MMH-HHM-LHH"),
    "THIN-K": ("思考者",   "让我想想...",               "🤔",  "HHL-HMH-MLH-MHM-LHH"),
    "SHIT":   ("愤世者",   "这世界就是一坨...",         "💩",  "HHL-HLH-LMM-HHM-LHH"),
    "ZZZZ":   ("装死者",   "我没死,只是睡了",           "😴",  "MHL-MLH-LML-MML-LHM"),
    "POOR":   ("贫困者",   "我穷,但我专注",             "🔦",  "HHL-MLH-LMH-HHH-LHL"),
    "MONK":   ("僧人",     "无欲无求",                  "🧘",  "HHL-LLH-LLM-MML-LHM"),
    "IMSB":   ("傻者",     "我真的是傻子吗?",           "🫣",  "LLM-LMM-LLL-LLL-MLM"),
    "SOLO":   ("孤儿",     "我哭了,我怎么是孤儿",       "🦔",  "LML-LLH-LHL-LML-LHM"),
    "FUCK":   ("草者",     "这什么鬼人格!",             "🌿",  "MLL-LHL-LLM-MLL-HLH"),
    "DEAD":   ("死者",     "我...还活着吗?",            "💀",  "LLL-LLM-LML-LLL-LHM"),
    "IMFW":   ("废物",     "我真的...是废物吗?",        "🥀",  "LLH-LHL-LML-LLL-MLL"),
    # Fallback 和彩蛋
    "HHHH":   ("傻乐者",   "哈哈哈哈哈哈",              "😆",  "MMM-MMM-MMM-MMM-MMM"),
    "DRUNK":  ("酒鬼",     "烈酒烧喉,不得不醉",         "🍶",  "MMM-MMM-MMM-MMM-MMM"),
}


def pattern_to_values(pattern: str) -> list[int]:
    clean = pattern.replace("-", "")
    return [LEVEL_VAL[c] for c in clean]


def match_personality(user_levels: list[str]) -> tuple[str, str, int]:
    """Return (code, cn_name, similarity_percent)."""
    user_vals = [LEVEL_VAL[l] for l in user_levels]
    best = None
    for code, (cn, _, _, pat) in PERSONALITIES.items():
        if code in ("HHHH", "DRUNK"):
            continue  # 特殊分支不参与距离匹配
        tvals = pattern_to_values(pat)
        dist = sum(abs(a - b) for a, b in zip(user_vals, tvals))
        exact = sum(1 for a, b in zip(user_vals, tvals) if a == b)
        key = (dist, -exact)
        if best is None or key < best[0]:
            best = (key, code, cn, dist)
    assert best is not None
    _, code, cn, dist = best
    similarity = max(0, round((1 - dist / 30) * 100))
    if similarity < 60:
        return "HHHH", "傻乐者", similarity
    return code, cn, similarity


def format_pattern(levels: list[str]) -> str:
    s = "".join(levels)
    return f"{s[0:3]}-{s[3:6]}-{s[6:9]}-{s[9:12]}-{s[12:15]}"
