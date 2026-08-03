# 黄叔开源 Skill 集合

> 为 [Claude Code](https://docs.anthropic.com/en/docs/claude-code) 打造的实用 Skill，开箱即用。

## Skill 目录

| Skill | 它能干什么 | 适合什么时候用 |
|-------|------------|----------------|
| [私董会（advisory-board）](skills/advisory-board/) | 请 12 位顶级思想家从不同角度帮你拆问题 | 面临重大商业决策，需要多视角碰撞 |
| [Social-SBTI（social-sbti）](skills/social-sbti/) | 根据公开社交动态生成娱乐向人格画像卡 | 给自己或公开公众人物做娱乐向人格画像 |
| [视频逐字稿（video-transcript）](skills/video-transcript/) | 把 B 站/抖音/小红书/YouTube 视频转成可搜索、可引用的逐字稿 | 做笔记、做素材、做总结 |
| [BOSS 求职助手（boss-zhipin-scraper）](skills/boss-zhipin-scraper/) | 校准真实 JD，按确认的数量和档位持续筛选并触达岗位 | 在 BOSS 直聘搜索、分析和联系适合自己的岗位 |

点击 Skill 名称可以看完整说明。新手只需要看下面这段安装命令。

## 小白安装

先打开 macOS 的「终端」，复制对应的一行命令，粘贴进去回车。安装完后，完全退出 Claude Code 再重新打开。

### 私董会

```bash
npx skills add Backtthefuture/huangshu --skill advisory-board -a claude-code -g -y
```

### Social-SBTI

```bash
npx skills add Backtthefuture/huangshu --skill social-sbti -a claude-code -g -y
```

### 视频逐字稿

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/Backtthefuture/huangshu/main/skills/video-transcript/bootstrap.sh)
```

### BOSS 求职助手

在 Codex 中直接粘贴下面这句话：

```text
请使用 skill-installer 安装这个 Skill：https://github.com/Backtthefuture/huangshu/tree/main/skills/boss-zhipin-scraper
```

也可以在终端执行：

```bash
python3 ~/.codex/skills/.system/skill-installer/scripts/install-skill-from-github.py --url https://github.com/Backtthefuture/huangshu/tree/main/skills/boss-zhipin-scraper
```

## 这些命令是什么意思

普通 Skill 用 `npx skills add ...` 安装：它的作用就是把指定 Skill 下载到 Claude Code 能看见的位置。

需要额外配置的 Skill 用 `bootstrap.sh` 安装：它像一个安装向导，会先下载 Skill，再检查依赖、补配置。比如 `video-transcript` 需要视频处理工具、浏览器引擎和豆包 API Key。

命令里的 `-a claude-code` 不能省。省掉后可能会装到别的目录，Claude Code 看不见。

## 🛠️ 工具（Tools）

除了 Skill 本体，这里还收录黄叔自用的 Skill 周边工具。

| 工具 | 说明 | 首次安装 | 再次启动 |
|-----|------|---------|---------|
| [Skill Hub](tools/skill-hub/) | 本地 Web UI，扫描全机器所有 Claude Skills，可视化编辑、去重、相似检测、版本快照、7 天回收站 | `npm install -g https://github.com/Backtthefuture/huangshu/raw/main/tools/skill-hub/release/claude-skill-hub.tgz && skill-hub` | `skill-hub` |

> 装的是 `tools/skill-hub/release/claude-skill-hub.tgz` 这个预构建 tarball（绕开 `npm install -g github:...` 在 npm 11 + node 24 上的悬空软链 bug）。每次 skill-hub 源码变更后 tarball 会同步重打。
>
> 首次装完会自动启动并打开浏览器；之后任何时候只要在终端敲 `skill-hub` 就能重新启动，或者直接访问 `http://localhost:3456`（如果服务还在跑）。更新到最新版本：再跑一次首次安装的那条命令即可。

## 贡献

欢迎提交 Issue 和 PR。如果你基于这些 Skill 做了有趣的改造，也欢迎分享。

## 许可

MIT License
