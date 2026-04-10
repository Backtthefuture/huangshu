# X / Twitter 抓取配置

X 是三个平台里反爬最狠的，必须用你自己浏览器里的登录态 cookies。

## Step 1: 在浏览器登录 X

打开 Chrome / Edge / Firefox，正常登录 [https://x.com](https://x.com)。

## Step 2: 导出 cookies 到 `/tmp/x_cookies.json`

### 方法 A（推荐）: 用 DevTools 手动复制关键 cookie

1. 在 x.com 页面按 `Cmd+Option+I` 打开 DevTools
2. 切换到 **Application** 标签（Firefox 是 **Storage**）
3. 左侧 **Cookies** → `https://x.com`
4. 找到两个关键 cookie，复制它们的 **Value**：
   - `auth_token`（长字符串）
   - `ct0`（长字符串，CSRF token）
5. 把它们粘贴进这个模板保存为 `/tmp/x_cookies.json`：

```json
{
  "auth_token": "你的_auth_token_值",
  "ct0": "你的_ct0_值"
}
```

### 方法 B: 用 Chrome 扩展 "Cookie-Editor"

1. 装 [Cookie-Editor](https://chrome.google.com/webstore/detail/cookie-editor/hlkenndednhfkekhgcdicdfddnkalmdm)
2. 在 x.com 页面点扩展图标 → **Export** → **JSON**
3. 会复制一个数组到剪贴板，把它转成 twikit 要的 dict 格式：

```bash
python3 -c "
import json, pyperclip
arr = json.loads(pyperclip.paste())  # or 手动粘贴
d = {c['name']: c['value'] for c in arr}
json.dump(d, open('/tmp/x_cookies.json', 'w'), indent=2)
print('ok')
"
```

## Step 3: 验证 cookies 有效

```bash
cd social-sbti
python3 -c "
import asyncio
from twikit import Client
async def main():
    c = Client('en-US')
    c.load_cookies('/tmp/x_cookies.json')
    me = await c.user()
    print(f'登录成功: @{me.screen_name} ({me.name})')
asyncio.run(main())
"
```

应该打印 `登录成功: @你的handle`。

## Step 4: 抓取任意用户

```bash
# 按 @handle
python src/fetch_x.py @elonmusk --limit 200

# 按 URL
python src/fetch_x.py "https://x.com/sama" --limit 200

# 按 user_id（避免 handle 变更问题）
python src/fetch_x.py 44196397 --limit 200 --by-id
```

## ⚠️ 注意事项

1. **频率控制**：脚本已经加了 1.2s 自限速，**别乱改**。X 风控极严。
2. **账号封禁风险**：持续高频抓取会让你的账号被限流甚至封禁。这是你自己的账号，建议：
   - 单次不超过 500 条
   - 一天不跑超过 10 个不同用户
   - 如果被风控，停一天再试
3. **cookies 会过期**：通常几周到几个月。过期后重新按 Step 2 导出即可。
4. **不要把 cookies 文件 commit 到 git**，这等于把你账号给人。
