# 第三方来源与许可

## Painted Valley

- 项目：https://patch.gg/blendi/painted-valley
- 源码：https://git.patch.gg/blendi/painted-valley.git
- 研究版本：`e523a37e6c86df433a960a46702b09776e73a0e2`
- 本项目使用的源码：`src/render/vendor/painted-valley/`
- 原代码许可：MIT，完整文本保留在该目录 `LICENSE`。
- 原上游说明：该目录 `LICENCE-NOTES.md`；本项目修改说明：`ADAPTATIONS.md`。
- 原文件哈希：`references/painted-valley-source-manifest.json`。

上游许可说明描述的是完整上游工程，不代表其中列出的全部人物、音频、纹理或 LFS 资源都随本项目分发。本项目没有分发上游未公开的环境录音，也不需要这些录音启动。

## npm 依赖

Three.js 的原许可为 MIT。直接与传递依赖的固定版本记录在 `package-lock.json`，安装后各包的许可证位于对应 `node_modules` 包中；依赖本身未作为目录重复上传。分发打包构建时应继续保留相关许可通知。

## Blender MCP

辅助脚本可配合 https://github.com/ahujasid/mcp-for-blender 使用。外部工具源码克隆及 Python 环境没有随本仓库重复上传；恢复方式见 `docs/SETUP.md`。该工具上游为 MIT，安装或再分发时保留其许可证。

## 视觉研究与生成图

- Michael Isaak 作品：https://michaelisaak.com/the-mitchells-vs-the-machines ，用于研究车型、比例与空间。未取得这些原始作品的素材复用许可，因此原始图片及页面缓存不进入公开仓库。
- Slow Roads、ETS2、The Long Drive、Pacific Drive、Outbound 为体验与设计研究参考；链接见完整需求及研究文档，不包含其游戏资产。
- `assets/vehicle/reference/` 中两张图片为本项目的 SUNBURST 生成设计参考，提示词、哈希和记录范围见同目录公开来源摘要。未对它们附加或宣称第三方原作的许可。
- `artifacts/` 是本项目运行与测试过程产生的证据；应结合各报告说明判断版本及范围。

本文件仅说明来源与已知许可，不将整个项目自动重新许可为 MIT。
