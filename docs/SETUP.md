# 在新电脑恢复环境

## 游戏

使用与 `package-lock.json` 兼容的 Node.js（>=20）与 npm，在仓库根目录运行：

```sh
npm ci
npm test
npm run build
npm run dev
```

打开 Vite 打印的网址。端口占用时不要假定仍是 5173；浏览器测试可显式指定真实地址。现有游戏无需私密环境变量、图像生成账号或 Blender 即可启动。

## 浏览器验证

浏览器脚本按顺序选择 `CHROME` 环境变量指定的可执行文件、存在的 macOS Chrome、Playwright 自带 Chromium。没有前两者时先执行：

```sh
npx playwright install chromium
```

Linux 若缺系统库，按 Playwright 提示配置依赖（必要时使用 `npx playwright install --with-deps chromium`）。然后在开发服务器运行时执行：

```sh
npm run test:drive -- --mode smoke --url http://127.0.0.1:5173 --out artifacts/handoff-smoke
```

其他脚本位于 `scripts/`，分别验证气候、地貌、混合与流式地形。先检查脚本的地址和输出目录，再执行，避免覆盖需要保留的旧证据。`CHROME` 是完整浏览器可执行文件路径，按当前系统的环境变量语法设置。

## Blender MCP

这是后续建车工具，不影响现有游戏启动。新电脑需要 Blender、Python >=3.10 以及可用的 Blender MCP 服务。可以使用已配置的等效真实 MCP 连接；现有辅助脚本使用上游 [MCP for Blender](https://github.com/ahujasid/mcp-for-blender)，本机研究时的提交为 `8f40787fbde8e6d8fe51c5a3553e5635fff40d2b`（版本 2.2.9）。

如要恢复这套辅助脚本，在仓库根目录执行：

```sh
git clone https://github.com/ahujasid/mcp-for-blender.git tools/blender-mcp
git -C tools/blender-mcp checkout 8f40787fbde8e6d8fe51c5a3553e5635fff40d2b
python -m venv .venv
```

根据系统激活 `.venv`（macOS/Linux：`source .venv/bin/activate`；Windows PowerShell：`.venv\Scripts\Activate.ps1`），随后：

```sh
python -m pip install ./tools/blender-mcp
```

在独立 Blender 实例中运行 `scripts/start-blender-mcp.py`，或使用 Blender 的 `--python` 参数传入该脚本绝对路径。它根据脚本位置定位项目，并在 `127.0.0.1:9877` 启动服务。不要覆盖其他已打开的 Blender 项目；脚本不自动生成车辆。

在已安装 `mcp` 的 Python 环境运行：

```sh
python scripts/blender-mcp-call.py get_scene_info
```

客户端优先使用 `BLENDER_MCP_PYTHON` 指定的服务端 Python，其次使用已安装 `blender_mcp` 的当前 Python；兼容旧 `.tools` 环境的回退仅供旧机器使用。工具返回默认方块仅说明连接成功，不代表建模完成。完整说明与许可见所克隆工具的 README / LICENSE。

## SUNBURST

两张参考图已保存在仓库，读取和使用它们不需要原生成服务。若要重新生成，先检查当前 AI 环境是否提供 SUNBURST 能力，确认实际调用的模型。提示词和公开生成记录在 `assets/vehicle/reference/`；原服务凭据和会话标识没有公开，也不应写入仓库。
