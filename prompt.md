# The Long Way：自动下载并接续开发

你是接续开发 AI。请直接执行下面的任务：下载现有工程、检查实际状态、恢复运行环境，然后持续开发到完整交付。不要只回复计划，也不需要用户逐项指挥。你可以自行研究、选择技术路线、安排并行工作与验证；保留已有有用成果。

## 1. 先取得工程

- **公开仓库**：https://github.com/luhaobin-lab/the-long-way-dev-handoff
- **Git 地址**：https://github.com/luhaobin-lab/the-long-way-dev-handoff.git
- **无 Git 时下载 ZIP**：https://github.com/luhaobin-lab/the-long-way-dev-handoff/archive/refs/heads/main.zip
- **分支**：`main`

在这台电脑合适的可写工作目录执行：

```sh
git clone https://github.com/luhaobin-lab/the-long-way-dev-handoff.git
cd the-long-way-dev-handoff
npm ci
npm test
npm run build
npm run dev
```

公开下载不需要 GitHub 登录。自行检查 Git、Node.js 和 npm；缺少时按当前操作系统配置兼容环境，或下载 ZIP 解压。当前锁文件需要 Node.js >=20。如果目录已经存在，先检查其来源和未提交修改，复用正确工程或新建独立目录，不要覆盖已有工作。让开发服务器持续运行，打开它实际打印的网址并真正进入游戏。

下载后按顺序读取：

1. 根目录 `AI接续开发需求.md`：完整产品需求，是当前主要依据。
2. `docs/HANDOFF_STATUS.md`、`docs/SETUP.md`：真实进度、证据限制及跨电脑环境恢复。
3. `docs/vehicle-sunburst-sheet-review.md`、两张车辆参考图。
4. 按需要查阅 `docs/renderer-integration.md`、`docs/world-system.md`、`docs/expanded-world-architecture.md` 和源码。

**本文件、完整需求和用户后续指示优先于旧文档。** 当前视觉方向是 Painted Valley；旧 Oil Paint 方向已被用户更正。旧硬件目标不是接续要求。现有 Three.js / Vite / TypeScript 是工程现状，具体实现方案由你判断，不要求照搬过去选择。

## 2. 我们要做出的游戏

让玩家坐进一辆可爱、温馨、有生活感的老式家庭旅行车，以第一人称沿着永远延伸的公路旅行。车内像一个温暖的小家，车外是唯美、宏大、变化丰富的世界。玩家愿意一直开下去，是因为期待下一个转弯、山口或海岸出现的景色。

- 以 **Painted Valley 的吉卜力式手绘动画美学**为核心：协调的色块、温暖阳光、有色阴影、层次丰富的植被、巨大优美的云、具有空气感的远景。全世界、车辆、四季与夜晚保持统一审美。
- 世界包含**平原、森林、盆地、海边、雪山、沙漠、火山、冰原、小镇**。差异体现在真实地形轮廓、尺度、植物、水体、建筑和气氛上；远景必须足够壮丽，带来探索欲望。
- 公路无限延伸，时宽时窄，上山下山、穿林沿海、翻越山口、进入截然不同的区域；道路和地形自然结合，转场连贯，不穿山、不悬空、不突变。旅行节奏既有舒缓观看，也有强烈视觉奇观。
- 每次新旅程的地貌顺序、路线、地形与景观组合都应显著不同，并保留种子重访与问题复现能力。
- 实现连续的**春夏秋冬**与**清晨到深夜的完整昼夜循环**，影响植被、积雪、水体、天空、云、光影和气氛，并适应不同地貌。夜间要美，也要能借助车灯、仪表看清并驾驶。
- 第一人称驾驶要舒适：合理驾驶位、清楚仪表、可观察侧窗与后排、自然的加减速转向和坡地运动、可恢复到道路。方向盘、车轮、仪表应真实响应；前挡风玻璃外的道路与景观占据主要视野。

## 3. 车辆制作顺序必须保留

**SUNBURST 外观三视图和内饰多视角参考 → 检查同车一致性 → Blender MCP 制作整辆车 → 接入游戏第一人称驾驶 → 对照实拍迭代。**

已有参考图位于：

- `assets/vehicle/reference/wanderer-sunburst-exterior-three-views.png`
- `assets/vehicle/reference/wanderer-sunburst-interior-four-views.png`

先利用现有图，按评审解决左右舵、比例、仪表等矛盾。确需补图时使用 SUNBURST；无法使用时说明具体限制，不要偷偷换模型后仍声称使用了 SUNBURST。

目标是一辆低矮修长、玻璃面积大、窗柱较细的原创老式旅行车：蜂蜜橘车身、奶油车顶、暖红橙发动机盖、低矮行李架、木色内饰、奶油座椅和格纹。**统一为左舵。** 完整车内、外壳、门窗、前后排、仪表和小物件必须处于同一个真实空间；不要把旧临时厢式车辆当最终车型。

需要最终交付可编辑 `.blend`、游戏使用的模型、参考图及真实模型／游戏对照画面。成功导出模型不等于造型和驾驶体验合格。

## 4. 关键参考网址

- **Painted Valley（主视觉）**：https://patch.gg/blendi/painted-valley
- **Painted Valley 源码**：https://git.patch.gg/blendi/painted-valley.git
- **Michael Isaak 车辆参考**：https://michaelisaak.com/the-mitchells-vs-the-machines
- **Slow Roads（无尽道路与旅行）**：https://slowroads.io/
- **Slow Roads 作者技术说明**：https://anslo.medium.com/slow-roads-tl-dr-a664ac6bce40
- **Euro Truck Simulator 2（驾驶舱与乘坐感）**：https://store.steampowered.com/app/227300/Euro_Truck_Simulator_2/
- **The Long Drive（随机长途公路）**：https://store.steampowered.com/app/1017180/The_Long_Drive/
- **Pacific Drive 开发者访谈**：https://www.unrealengine.com/developer-interviews/pacific-drive-is-a-run-based-driving-survival-game-with-an-ever-changing-mysterious-landscape
- **Pacific Drive 地形与森林分享**：https://gdcvault.com/play/1035387/Twisting-Terrain-and-Populating-Forests
- **Outbound**：https://store.steampowered.com/app/2681030/Outbound/
- **Outbound 开发团队访谈**：https://unity.com/blog/square-glade-games-outbound-community-choice-award

研究原作者、团队和公开源码；未公开的算法视为本项目自己的设计，不要假称来自原作。保留复用代码与素材的许可证。第三方研究图片未随公开仓库重新分发，可通过以上网址查看。

## 5. 接续起点与工作方式

当前已有可启动的驾驶基础、Painted Valley 渲染整合、连续道路地形、九类地貌初步内容、季节昼夜代码、SUNBURST 两张参考图和测试资料。**完整 Blender 旅行车未完成、未接入；最终整合体验也未验收。** 旧截图、单独模块测试、逻辑测试通过，都不能证明游戏已经完整或足够美。

先运行基线并查看源码与真实画面，建立清楚的 GOAL 和 LOOP。优先完成车辆和驾驶位，再与多地貌、四季昼夜共同迭代。按“研究 → 制作 → 运行 → 实际驾驶 → 截图 → 独立评审 → 修正 → 再验证”持续推进。定期交付可试玩版本与真实截图，不要长时间只汇报研究或工具操作。

新电脑不需要原电脑账号或服务回执就能运行现有游戏。Blender MCP、可用浏览器和新的 SUNBURST 调用需在新环境检查配置，具体说明见 `docs/SETUP.md`。工具缺失时先做不受影响的工作；遇到必须由用户处理的权限或服务限制，准确说明阻塞项，不要伪称完成。

最终交付一个能持续游玩的完整游戏、完整可编辑车辆、自然且丰富的无限世界、四季昼夜、操作说明、真实测试与视觉评审、来源许可及剩余问题。必须实际进入游戏、驾驶并验证整合结果后才能宣称完成。

**现在开始下载工程并接续执行。让车成为温暖的小家，让道路始终值得追随，让窗外的世界美得令人想一直走下去。**
