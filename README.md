# The Long Way · 公路旅行

一个正在开发的第一人称无限公路旅行游戏：温馨的老式旅行车、Painted Valley 所代表的手绘动画美学、多种宏大地貌，以及四季和昼夜变化。

**这是开发交接版本，不是完成版。完整 Blender 旅行车尚未建成，当前游戏仍使用临时车辆。**

## 在另一台电脑上接续

将仓库根目录的 **[prompt.md](prompt.md)** 单独交给能读写文件、执行命令的 AI，并说：“读取这个文件，直接按其中要求下载工程并接续开发。”它包含仓库地址、下载步骤、目标和关键参考，无需旧聊天记录。

- [完整需求](AI接续开发需求.md)：做什么，最终交付什么。
- [当前状态与证据边界](docs/HANDOFF_STATUS.md)：已完成、未完成、已有验证。
- [环境与工具恢复](docs/SETUP.md)：启动游戏、浏览器测试、Blender MCP。
- [第三方来源与许可](THIRD_PARTY_NOTICES.md)。

## 本地启动

先安装与锁文件兼容的 Node.js（>=20）和 npm，然后执行：

```sh
git clone https://github.com/luhaobin-lab/the-long-way-dev-handoff.git
cd the-long-way-dev-handoff
npm ci
npm run dev
```

打开终端打印的本地网址。默认操作：W/S 加速与刹车、A/D 转向、鼠标拖动观察、空格回正视角、R 回到道路、C 切换视角、E 自动观景驾驶、Esc 暂停。

```sh
npm test
npm run build
```

浏览器实测另见 `docs/SETUP.md`。下载与运行现有游戏不需要 SUNBURST 或 GitHub 账号；后续制作车辆需在新电脑配置 Blender MCP，重新生成参考图才需要 SUNBURST 服务。

## 目录

| 路径 | 内容 |
| --- | --- |
| `src/` | 驾驶、世界、渲染、季节昼夜、UI 代码 |
| `assets/vehicle/reference/` | 两张 SUNBURST 参考图、提示词、公开来源摘要 |
| `docs/` | 完整研究、评审、设计、交接说明 |
| `tests/`、`scripts/` | 逻辑与浏览器验证、Blender MCP 辅助脚本 |
| `artifacts/` | 当前驾驶、九类地貌、四季昼夜关键截图及完整历史测试报告；不是全部针对当前版本的验收 |
| `references/` | 上游版本清单和来源说明 |

以 `prompt.md`、`AI接续开发需求.md` 及用户后续指示为当前需求。旧 Oil Paint 研究、历史硬件目标和早期技术选择仅供追溯。
