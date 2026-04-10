"""把任意 HTML 结果卡渲染成长 PNG。

依赖:
    pip install playwright
    playwright install chromium

用法:
    python render_png.py data/vista8-sbti.html
    → data/vista8-sbti.png  (device pixel ratio 2, 截 .page 元素)

设计:
    - 截的是 .page 这个容器 (所有卡片的外包装),不是整个 body
    - 这样四周会自动裁掉 body 的 padding,得到紧贴卡片的干净长图
    - 注入一行 CSS 隐藏 .floating-save 按钮,避免保存按钮出现在图里
    - device_scale_factor=2 出 retina 高清图,适合手机分享
"""
from __future__ import annotations

import argparse
import asyncio
import sys
from pathlib import Path

try:
    from playwright.async_api import async_playwright
except ImportError:
    print("❌ 缺少依赖。先跑:", file=sys.stderr)
    print("   pip install playwright && playwright install chromium", file=sys.stderr)
    sys.exit(1)


HIDE_BUTTON_CSS = """
.floating-save { display: none !important; }
body { padding: 20px 16px !important; }
"""


async def render(html_path: Path, out_path: Path | None = None, width: int = 880) -> Path:
    if out_path is None:
        out_path = html_path.with_suffix(".png")

    file_url = f"file://{html_path.resolve()}"

    async with async_playwright() as p:
        browser = await p.chromium.launch()
        context = await browser.new_context(
            viewport={"width": width, "height": 1200},
            device_scale_factor=2,
        )
        page = await context.new_page()
        await page.goto(file_url, wait_until="domcontentloaded")

        # 注入 CSS 隐藏截图按钮
        await page.add_style_tag(content=HIDE_BUTTON_CSS)

        # 等字体 / 图片 / emoji 加载完
        try:
            await page.wait_for_load_state("networkidle", timeout=8000)
        except Exception:
            pass  # 单页离线 HTML 不一定触发 networkidle

        # 截 .page 元素 (如果没有就截整页)
        element = await page.query_selector(".page")
        if element is None:
            await page.screenshot(path=str(out_path), full_page=True)
        else:
            await element.screenshot(path=str(out_path))

        await browser.close()

    return out_path


def main() -> None:
    ap = argparse.ArgumentParser(description="Render SBTI HTML card to PNG")
    ap.add_argument("html", help="HTML file path")
    ap.add_argument("--out", help="output PNG path (default: same dir, .png)")
    ap.add_argument("--width", type=int, default=880, help="viewport width (default 880)")
    args = ap.parse_args()

    html_path = Path(args.html)
    if not html_path.exists():
        print(f"❌ HTML 文件不存在: {html_path}", file=sys.stderr)
        sys.exit(1)

    out_path = Path(args.out) if args.out else None
    result = asyncio.run(render(html_path, out_path, args.width))
    print(f"✅ PNG 已生成: {result}")
    print(f"   文件大小: {result.stat().st_size / 1024:.1f} KB")


if __name__ == "__main__":
    main()
