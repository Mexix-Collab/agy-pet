<div align="center">

<img src="assets/clawd-banner.svg" alt="AGY Pet — Desktop Pet & Studio UI Banner" width="880" />

# 🐾✨ AGY Pet (`agy-pet`)

**让会看你写代码、会播报任务进度、还会互动撒娇的透明桌面宠物 & 趴框伴侣陪你在 Google Antigravity 里写代码** `(๑•̀ㅂ•́)و✧`

为 **Google Antigravity**（Windows / macOS / Linux）打造的一体化透明桌面宠物、输入框趴框伴侣、Studio 界面重塑、5 语言本地化、Token HUD 遥测与 `agy-fast` 加速集成套件。<br/>
基于 Antigravity 内置 **Chrome DevTools Protocol（CDP）** 调试端口实现无损动态注入——**不改动任何原版安装文件**，支持热更新与一键无痕退潮还原 🌊

<p>
  <a href="#核心特性"><img src="https://img.shields.io/badge/Desktop_Pet-114_WebM_Animations-A78BFA?style=flat-square" alt="Desktop Pet: 114 WebM Animations" /></a>
  <a href="#核心特性"><img src="https://img.shields.io/badge/Dock_Pet-20_Animations_+_Clawd-F472B6?style=flat-square" alt="Dock Pet: 20 Animations + Clawd" /></a>
  <a href="#快速开始"><img src="https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-4D6BFE?style=flat-square" alt="Platform: Windows | macOS | Linux" /></a>
  <a href="#核心特性"><img src="https://img.shields.io/badge/i18n-5_Languages-E2A45F?style=flat-square" alt="i18n: 5 Languages" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-8FA4FF?style=flat-square" alt="License: MIT" /></a>
</p>

[✨ 核心特性](#核心特性) · [🦀 伴侣互动指南](#clawd-饲养指南) · [🔄 运行模式](#运行模式对比) · [🚀 马上领养](#快速开始) · [⚙️ 配置调教](#配置说明) · [🗂️ 项目结构](#项目结构) · [💌 来源声明](#来源声明)

</div>

> [!NOTE]
> **来源与二次开发声明**：本项目基于 [0DNANCY/agy-claude-style](https://github.com/0DNANCY/agy-claude-style)（MIT License）二次开发；Studio UI 灵感及部分源码来源于 [Nwflower/dsh-claude-style](https://github.com/Nwflower/dsh-claude-style)；Codex / 梁武峰思考强度滑杆分别参考 [Microqian2th/dsh-codex-effort-slider](https://github.com/Microqian2th/dsh-codex-effort-slider) 与 [mobius/dsh-performance-slider](https://github.com/mobius/dsh-performance-slider)；独立桌面宠物交互设计与物理玩法参考 [PC2005-cloud/dsh-pet](https://github.com/PC2005-cloud/dsh-pet)；内置集成的 `agy-fast` 加速插件来源于 [INK-Q/agy-fast](https://github.com/INK-Q/agy-fast)（MIT License）。完整说明与第三方组件清单详见 [来源声明与第三方致谢](#来源声明)。

---

<a id="目录"></a>
## 🗺️ 目录

- [✨ 核心特性](#核心特性)
- [🦀 小螃蟹 Clawd 饲养指南](#clawd-饲养指南)
- [🎒 环境要求](#环境要求)
- [🚀 快速开始](#快速开始)
  - [🔄 运行模式对比：托管启动 vs 常驻守护](#运行模式对比)
  - [🪟 方式一：Windows 独立安装器（目标机器无需 Node.js）](#方式一windows-独立安装器目标机器无需-nodejs)
  - [🍎 方式二：macOS 独立应用（目标机器无需 Node.js）](#方式二macos-独立应用目标机器无需-nodejs)
  - [💻 方式三：Node.js 脚本模式（Windows / macOS / Linux）](#方式三nodejs-脚本模式windows--macos--linux)
- [⚙️ 配置说明 (`config.json`)](#配置说明)
- [🗂️ 项目结构](#项目结构)
- [🧪 开发、测试与构建](#开发测试与构建)
- [💌 来源声明](#来源声明)
- [📜 开源协议](#开源协议)

---

<a id="核心特性"></a>
## ✨ 核心特性

### 🌌 1. Studio 首页与会呼吸的字符波纹海
- **保留原生特征与主题配色**：首页顶部保留 Antigravity 原生拱形 Logo（支持 `accent` / `foreground` 配色切换），与问候语水平对齐；提供 `obsidian`（黑曜石蓝暗色）、`claude` 与 `host`（跟随宿主）三套调色板，自动适配深色与浅色主题 🎨。
- **实时字符矩阵波纹场 (`homeRipple`)**：在首页铺设等宽字母数字二维波动网格，带云雾漂移氛围效果；轻点空白处就像把小石子丢进字符星空，触发柔和的阻尼水波纹扩散动画 `~(˘▾˘~)`。
- **编程用量仪表盘 (`概览` / `模型` · `全部` / `30 天` / `7 天`)**：自动聚合本地对话轨迹并剔除子代理重复会话计数，展示 6 项核心指标（会话数、消息数、Token 总量、活跃天数、高峰时段、最常用模型）、`26×7` 周日历热力图、30d/7d 模型堆叠柱状图，以及**60+ 本经典著作 Token 折算标尺**——悄悄告诉你今天写的代码相当于读了几本《爱丽丝漫游奇境》或《哈利·波特》📖✨。

### ⌨️ 2. 极简重排输入框、丝滑光标与温柔侧栏
- **极简输入框 (`composerRestyle`)**：将工作区与环境选择胶囊重排为 `28px` 极简细边样式，底栏控件轻巧落于画布之上，支持 `studio` / `host` 提示占位风格（`placeholderStyle`）。
- **丝滑打字光标 (`smoothCaret`)**：为输入框渲染平滑插值位移动画光标（`.ag-cs-smooth-caret`），兼容多行换行与中文输入法（IME）候选输入态，敲字像德芙一样丝滑 🍫。
- **侧栏样式优化 (`sidebarRestyle` / `sidebarCompact`)**：统一侧边栏行高与悬停高亮板，支持开启更紧凑的条目间距。

### 🎚️ 3. 三风格交互式思考强度滑块 (`effortSliderStyle`)
点击模型名旁的思考强度徽章（`Low` / `Medium` / `High` / `XHigh` / `Max` 等级映射，并保留宿主 `Extra` 标识），弹出可视化推理档位滑块调节器：
- **Claude Code (`claude`)**：5 行动态矩阵噪声点阵、发光竖向胶囊滑块与 `effortAccent` 蓝紫渐变色阶。
- **ChatGPT Codex (`chatgpt`)**：蓝→紫渐变进度条、高档位星云扫光、星空粒子及阻尼刻度手感 ✨。
- **梁武峰 (`liangwufeng`)**：内置 31 帧 320×320 WebP 抠像人像背景，支持 `performanceBackdrop`（`card` 卡片内 / `page` 全窗口 / `off` 关闭）三种渲染模式。

### 📊 4. 贴心 Token HUD 与右下角电量小圆环
- **右下角剩余用量圆环 (`ringMode`) & 低余量告警**：支持在**当前上下文剩余可用百分比 (`context`)** 与**模型配额剩余百分比 (`quota`)** 之间切换，随剩余容量动态变色提示（🔵 `>30%` 元气满满 · 🟡 `≤30%` 注意补水 · 🔴 `≤10%` 快见底啦）；当上下文余量 **`≤20%`（黄色提醒）** 或 **`≤10%`（红色紧急告警）** 时，`context` 模式圆环、`hudTopBar` `/compact` 按钮及浮窗顶部横幅会高亮提示，点击横幅或 `/compact` 即可向**当前所在对话输入框**精准填入 `/compact`。
- **每轮对话 Token 徽章 (`turnBadges`)**：在每轮 AI 回复底部展示 `#T{n}` 模型名、上下文总量与本轮增量、输出与思考 Token、工具调用次数、子代理汇总、输出速率（`tok/s`）及缓存命中率。
- **4 标签页深度遥测浮窗**：
  - **上下文拆分**：展示系统提示与规则、工具声明、对话历史消息、工具执行结果明细（支持展开查看）、实时草稿 Token 估算（输入时局部平滑刷新），并提供低余量警示横幅一键填充 `/compact` 与复制遥测报告摘要操作（成功显示 `✓ 已复制`，剪贴板写入失败或不可用时明确提示 `✕ 失败`）。
  - **对话轮次**：按轮次回溯上下文增长与每轮耗时速率详情。
  - **工具与子代理**：统计子代理调用明细与工具结果 Token 排行榜。
  - **模型配额**：实时查看各模型配额池剩余百分比与 5h / 周重置倒计时 ⏳。
- **可选环绕式 HUD**：提供 `hudTopBar`、`hudBottomBar`、`hudRimProgress`、`hudFooterChip`、`hudCompact` 五项可折叠增强开关，默认关闭，按需启用；其中开启 `hudBottomBar` 后，**即使 `ringMode` 处于 `context` 模式也会同步拉取并展示当前模型配额余量**。

### 🦀 5. 输入框小跟班（像素螃蟹 `Clawd` + 20 套趴框/坐姿猫娘动画）(`mascot`)
- 支持经典双层像素小螃蟹 `Clawd`（内置 **19 套双层精灵图动画**）以及 **20 套输入框上沿趴框/坐姿猫娘透明 WebM 动画**（10 套趴框 + 10 套坐姿），随对话状态在待机、盯打字、思考、写代码、后台守候、庆祝、害羞、犯困打盹间自动联动。
- 支持双击快速查看 5h/周配额余量气泡，以及上下文高占用时自动弹出可一键触发 `/compact` 的轻量提醒卡片；当输入框上方出现排队消息、`/` 命令菜单或问答确认卡片时自动避让，绝不遮挡按钮。

### 🐾 6. Windows 独立透明桌面宠物（WebView2 + DirectComposition 硬件合成）
- **114 段高清透明 WebM 动画**：支持工作状态联动（思考/编码/归档/等待/庆祝/报错）、自动随机小剧场与漫游、时段彩蛋与睡眠循环，并支持右键打开 `anims/webm/` 目录放入自定义 `.webm` 扩展动作。
- **实时任务进度胶囊栈**：自动聚合当前 Antigravity 多会话、子代理与 Swarm 蜂群进度，支持一键展开详情或在「完整进度框 / 紧凑数字圆圈」间切换。
- **个性化称呼与丰富交互**：
  - 右键「👑 称呼设置」可随时切换宠物对你的称呼（默认 **「老大」**，内置 `老大 / 主人 / 老板 / 大人 / 老师 / 大佬 / 伙伴 / 朋友` 预设，并支持自定义称呼），碎碎念、问候与待办提醒实时同步生效。
  - 支持自由拖拽弹簧跟手、双击弹弓蓄力发射与空中抓取积分小游戏、实时天气气泡、头顶轻量待办清单（含到期前 15 分钟提醒）、Q 弹点击音效与悬停快捷键（`S` 睡觉、`D` 待办、`W` 天气、`C` 聊一句）。

### ⚡ 7. 可选集成 `agy-fast` 加速插件
- Windows 安装器与桌面宠物右键均提供 `agy-fast`（[INK-Q/agy-fast](https://github.com/INK-Q/agy-fast)）一键部署与启停开关（需本机 Node.js >= 20），通过批量检索、多块原子编辑、符号大纲切片读取与并发校验显著降低工具调用轮次与额度消耗。

### 🌐 8. 5 语言全局切换 & 设置面板原生集成
- **5 语言全局本地化 (`language`)**：支持 **简体中文 (`zh-CN`) / 繁體中文 (`zh-TW`) / 粵語 (`yue`) / English (`en`) / 日本語 (`ja`)** 实时切换，作用于整个 Antigravity 主界面、Plan / Orchestrator 编排模式、插件面板以及 **Swarm 蜂群侧栏 (`plugin://swarm--` OOPIF)**；自动跳过代码编辑器、终端、对话/帖子正文与 `data-ag-no-i18n` 保护区，移除插件时无损还原。
- **原生设置集成**：在 Antigravity `设置 → 外观` 底部自动注入可视化开关，修改通过 CDP `Runtime.addBinding` 以轻量热更新即时生效，并经字段校验后原子写入 `config.json` 持久化。

---

<a id="clawd-饲养指南"></a>
## 🦀 小螃蟹 Clawd 饲养指南

Clawd 是由 [crab-assets.js](crab-assets.js) 与 [mascot-core.js](mascot-core.js) 驱动的双层像素小生命，住在你的输入框右上角 🏡：

<div align="center">
  <img src="assets/clawd-moods.svg" alt="Clawd 5 Iconic Pixel Moods" width="880" />
</div>

### 🎮 怎么和 Clawd 互动？（彩蛋全收录）

| 互动方式 | 触发方法 | Clawd 的反应 |
| --- | --- | --- |
| 👉 **轻戳小钳子** | 单击 Clawd 的左半边或右半边身体 | 害羞扭头给你看不同方向的小动作 (`poke-left` / `poke-right`) |
| 🤭 **疯狂挠痒痒** | `450ms` 内快速连点 Clawd **4 下** | 触发爆笑踢腿大反应 (`tickle`)，眼睛笑成 `^ ^`！ |
| 🤏 **拎起来晃一晃** | 按住鼠标左键拖拽 Clawd | 进入悬空手舞足蹈模式 (`drag`)，松手才乖乖落地 |
| 💤 **挂机小憩** | 对话安静超过 **60 秒** | 自动缩成一团进入 `sleeping` 呼呼模式，点一下或发消息立刻伸懒腰 `waking` |
| 🎉 **任务报喜** | AI 回复完成或出现错误时 | 成功了开心蹦跶 (`happy`)，出错了也会陪你慌张一下 (`error`) |

<details>
<summary>🎀 <b>点此展开：偷看 Clawd 的全部 19 套双层精灵图档案</b></summary>

- **日常发呆 & 随机彩蛋**：`idle`（待机呼吸）、`idle-look`（左顾右盼）、`idle-wave`（举钳打招呼）、`idle-laptop`（抱着迷你笔记本敲代码）
- **认真营业中**：`thinking`（托腮冒气泡思考）、`typing`（哒哒哒飞速打字）、`building`（敲敲打打搞建设）、`compacting`（打包整理上下文）、`music`（戴上小耳机听歌）、`conducting`（挥舞指挥棒）
- **心情与睡眠**：`happy`（撒花蹦跶）、`notification`（来新消息啦）、`error`（哎呀报错了）、`sleeping`（冒着 `Zzz` 睡觉）、`waking`（睡醒伸懒腰）
- **玩家互动专属**：`poke-left`（被戳左边）、`poke-right`（被戳右边）、`tickle`（怕痒爆笑）、`drag`（被拎起来晃）

</details>

---

<a id="环境要求"></a>
## 🎒 环境要求

- **Google Antigravity Desktop**：运行中且开启了内置 CDP 调试端口（插件会自动读取系统用户目录下的 `Antigravity/DevToolsActivePort` 文件，也可通过环境变量 `AG_CDP_PORT` 或安装器 `--cdp-port` 参数显式指定端口）：
  - Windows：`%APPDATA%\Antigravity\DevToolsActivePort`
  - macOS：`~/Library/Application Support/Antigravity/DevToolsActivePort`
  - Linux：`${XDG_CONFIG_HOME:-~/.config}/Antigravity/DevToolsActivePort`

> [!IMPORTANT]
> **Antigravity 2.33.0+ 启动说明**：从 `2.33.0` 起，Antigravity 不再默认生成 `DevToolsActivePort`，需附加 `--remote-debugging-port=0` 启动参数：
> - **macOS**：推荐使用安装器生成的 `Antigravity (AGY Pet).app`、`launch-antigravity.command`，或在脚本模式运行 `npm run managed` / `./launch.sh --relaunch`（自动附加 `--remote-debugging-port=0` 启动或温和重启，并拉起随宿主退出 watcher）。也可手动 `open -a Antigravity --args --remote-debugging-port=0`。
> - **Windows**：推荐使用安装器创建的桌面 / 开始菜单「`Antigravity (AGY Pet)`」快捷方式（`Antigravity (AGY Pet).lnk`），或在脚本模式运行 `npm run managed` / `launch.bat --relaunch`（自动附加 `--remote-debugging-port=0` 启动或温和重启，并拉起随宿主退出 watcher）。
> - **默认自动接管**：默认启用 `"autoRelaunchWithCdp": true`，在**托管一键启动**（原生快捷方式 / `.app` / `.command` / `npm run managed`）与**常驻守护**模式下，检测到 Antigravity 已运行但未开启 CDP（且未携带 `--remote-debugging-port` 启动参数）时都会自动温和重启一次并附加调试参数；如需关闭可在 `config.json` 中设为 `false`。
- **Node.js >= 22**（仅脚本模式、测试与从源码构建安装器需要）：项目零第三方 npm 依赖，直接使用 Node.js 内置的 `fetch`、`WebSocket` 与 `node:test`。
- **.NET Framework 4.x (`csc.exe`)**（仅在 Windows 上从源码构建独立安装包时需要，Windows 10/11 系统默认自带）。
- **Xcode Command Line Tools (`swiftc`)**（仅在 macOS 上从源码构建 `.app` / `.dmg` 时需要，macOS 安装命令行工具后自带）。

---

<a id="快速开始"></a>
## 🚀 快速开始

> [!TIP]
> **开箱即用（推荐）**：本 Git 代码仓库保持轻量**仅存放源码（不含 114 段大体积桌面宠物 `.webm` 动画文件）**。请直接前往 [Releases](https://github.com/Mexix-Collab/agy-pet/releases) 下载内置全套动画的完整独立安装包 `AGY-Pet-v<version>-Windows-x64.exe`，目标机器无需安装 Node.js！

<a id="运行模式对比"></a>
### 🔄 运行模式对比：托管启动（推荐默认） vs 常驻守护

AGY Pet 提供两种运行模式。**默认推荐「托管启动模式」**，平时无需任何后台进程驻留；如果你习惯直接点击系统原版 Antigravity 图标启动，也可以一键切换为「常驻守护模式」：

| 对比维度 | 🐾 托管启动模式（免后台常驻 · **推荐默认**） | 🛰️ 常驻守护模式（开机自启 · 兼容原习惯） |
| --- | --- | --- |
| **开机自启** | ❌ 不注册开机自启 | ✅ 注册开机自启（Windows Startup / macOS `LaunchAgent`） |
| **平时后台驻留** | **0 进程常驻**（未启动 Antigravity 时不占任何后台进程） | 1 个轻量原生守护进程在后台持续监听 |
| **日常启动入口** | 通过插件启动入口打开：<br/>• Windows：开始菜单 / 桌面「`Antigravity (AGY Pet)`」快捷方式<br/>• macOS：`Antigravity (AGY Pet).app` 或 `launch-antigravity.command`<br/>• 脚本模式：`launch.bat` / `./launch.sh` / `npm run managed` | 直接点击系统原版 Antigravity 桌面或程序坞图标 |
| **CDP 启动与接管** | 自动附加 `--remote-debugging-port=0` 启动（若已运行且未开 CDP，快捷方式/启动器及 `npm run managed` 会自动温和重启；`launch.bat` / `./launch.sh` 可加 `--relaunch`），并拉起带 `--exit-on-host-close` 的 watcher | 后台持续监听 CDP；若发现未开 CDP 的实例且 `autoRelaunchWithCdp` 为 `true` 时自动温和重启接管 |
| **关闭后行为与宽限保护** | Antigravity 所有窗口及进程关闭后 **watcher 自动退出**，不留后台进程；且内置 **90 秒启动宽限保护**（`--startup-grace`），防止启动失败或中途取消时孤儿进程挂起 | 持续在后台待命等待下次启动（除非在 `config.json` 中手动设置 `"exitOnHostClose": true`） |

> [!NOTE]
> **零侵入安全原则与自由切换**：
> - 两种模式均严格遵守**零修改 Antigravity 安装目录文件**、**不使用 DLL 劫持或 IFEO 映像劫持**、**零安全误报**的原则。
> - 安装后可**随时重新运行安装器**（在界面直接切换模式，或传入 `--mode=managed` / `--mode=daemon`）在两种模式间自由切换；从常驻守护切回托管启动时，安装器会自动卸载并删除开机自启项、停止原常驻后台进程。

---

<a id="方式一windows-独立安装器目标机器无需-nodejs"></a>
### 🪟 方式一：Windows 独立安装器（目标机器无需 Node.js）

1. 直接从 [Releases](https://github.com/Mexix-Collab/agy-pet/releases) 下载内置 114 段高清透明动画的 `AGY-Pet-v2.0.0-Windows-x64.exe`，或在已安装 Node.js >= 22 的 Windows 环境克隆仓库从源码构建：
   ```bash
   git clone https://github.com/Mexix-Collab/agy-pet.git
   cd agy-pet
   npm run build:installer
   ```
   > 提示：从源码自行构建时，可将自定义透明 `.webm` 动作放入 `neko-studio/webm-opt/` 目录，或安装后通过宠物右键「📂 打开动画素材目录」放入扩展动画。

2. 双击运行 `AGY-Pet-v<version>-Windows-x64.exe`（可分发到未安装 Node.js 的 Windows 电脑直接运行）：
   - **GUI 模式选择**：安装器界面提供运行模式切换单选框——**「免后台常驻 · 随 Antigravity 启动并自动退出（推荐）」**（托管启动模式）与**「开机自启 · 后台常驻监听」**（常驻守护模式），并可勾选**「在桌面创建「`Antigravity (AGY Pet)`」启动快捷方式」**与**「集成并启用 `agy-fast` 加速插件」**。选择后点击「开始安装」（已安装时显示「应用模式 / 升级」）即可安装或无损切换模式。
   - **资源部署与无缝迁移**：自动检测本机 Antigravity Desktop，将独立运行环境与插件资源部署至 `%LOCALAPPDATA%\agy-pet`（升级时保留原有 `config.json` / `desktop-pet.json` / `pet-todos.json`，从旧版 `agy-claude-style` 升级亦自动平滑迁移配置并清理旧快捷方式）。
   - **统一托管启动快捷方式 (`Antigravity (AGY Pet).lnk`)**：安装器会在安装目录、开始菜单（及可选桌面）生成 `Antigravity (AGY Pet).lnk`，直接指向 `agy-pet-watcher.exe --launch --relaunch --exit-on-host-close --dir "<installDir>"`。双击即可带 CDP 启动（或温和重启接管）Antigravity，并在宿主关闭后自动退出 watcher。
   - **两种模式行为**：
     - **托管启动模式（默认）**：不注册 Windows Startup 开机自启（若此前安装过常驻模式，会自动清理 `AGY-Pet.lnk` 并停止旧常驻守护）；安装完成时仅在检测到 Antigravity 已开启 CDP 端口的情况下才临时拉起 `--exit-on-host-close` watcher 完成注入，否则保持后台 0 进程常驻。
     - **常驻守护模式**：额外注册 Windows 开机自启快捷方式（`Startup\AGY-Pet.lnk`）并立即启动后台静默守护进程 `agy-pet-watcher.exe` 持续监听。
   - **卸载还原**：两种模式均会注册 Windows「设置 → 应用」卸载项；在安装器界面点击「卸载并恢复」或在系统「设置 → 应用」中卸载，可自动停止守护、删除 Startup / 开始菜单 / 桌面快捷方式并恢复原生界面。

3. 安装器支持的命令行参数：
   ```text
   AGY-Pet-v2.0.0-Windows-x64.exe [--silent | /S | -s] [--uninstall] [--status]
                                  [--mode=managed | --mode=daemon | --managed | --daemon]
                                  [--desktop-shortcut | --no-desktop-shortcut]
                                  [--agy-fast | --no-agy-fast]
                                  [--no-autostart] [--no-kill-legacy]
                                  [--install-dir <路径>] [--cdp-port <端口>]
                                  [--out <结果JSON路径>] [--popup]
   ```
   - `--mode=managed` / `--managed`：以托管启动模式安装或切换（默认模式，不写入 Startup 自启）。
   - `--mode=daemon` / `--daemon`：以常驻守护模式安装或切换（写入 Startup 开机自启并常驻后台）。
   - `--desktop-shortcut` / `--no-desktop-shortcut`：控制是否在桌面创建 `Antigravity (AGY Pet).lnk` 启动快捷方式（默认创建）。
   - `--agy-fast` / `--no-agy-fast`：控制是否同时部署并启用内置 `agy-fast` 加速插件（默认启用）。
   - `--no-autostart`：跳过 Startup、开始菜单、桌面快捷方式及卸载注册表写入（未显式传 `--mode` 时按 `managed` 模式处理）。

---

<a id="方式二macos-独立应用目标机器无需-nodejs"></a>
### 🍎 方式二：macOS 独立应用（目标机器无需 Node.js）

1. 直接从 [Releases](https://github.com/Mexix-Collab/agy-pet/releases) 下载 `AGY-Pet-v2.0.0-macOS-universal.dmg`（对应版本），或在已安装 Node.js >= 22 与 Xcode Command Line Tools 的 macOS 环境从源码构建：
   ```bash
   git clone https://github.com/Mexix-Collab/agy-pet.git
   cd agy-pet
   npm run build:macos
   ```
   构建完成后会在项目根目录生成通用架构（`arm64` + `x86_64`）的 `AGY Pet.app` 与 `AGY-Pet-v<version>-macOS-universal.dmg` 🐾。

2. 打开 `.dmg`，将 `AGY Pet.app` 拖入「应用程序」（或直接双击运行）：
   - 若首次打开时 macOS 提示“无法验证开发者”（Release 构建采用 Ad-hoc 签名），请**右键点击 `AGY Pet.app` → 打开**，或在终端执行 `xattr -cr "/Applications/AGY Pet.app"`。
   - **GUI 模式选择**：打开 `AGY Pet.app` 后，可在界面选择运行模式——**「免后台常驻 · 随 Antigravity 启动并自动退出（推荐）」**（托管启动模式）或**「开机自启 · 后台常驻监听」**（常驻守护模式），并勾选**「在 `~/Applications` 创建「`Antigravity (AGY Pet).app`」启动器」**（默认勾选），然后点击「开始安装」（已安装时显示「应用模式 / 升级」）。
   - **资源部署与托管启动入口**：自动检测本机 `Antigravity.app`，将独立运行时与插件资源部署至 `~/Library/Application Support/agy-pet`（升级时自动保留已有 `config.json`，并写入 `.install-mode`），同时生成两个托管启动入口：
     - **`Antigravity (AGY Pet).app`**：生成在安装目录与 `~/Applications/`（默认），点击后在后台脱离启动 `agy-pet-watcher --launch --relaunch --exit-on-host-close --dir "<installDir>"`，自动附加 CDP 参数启动或温和重启 Antigravity 并在宿主关闭后自动退出。
     - **`launch-antigravity.command`**：位于安装目录 `~/Library/Application Support/agy-pet/launch-antigravity.command`，内部同样调用上述托管启动命令并在后台脱离运行，方便在访达或终端中直接启动。
   - **两种模式行为**：
     - **托管启动模式（默认）**：**不注册 `LaunchAgent`**（若此前存在 `~/Library/LaunchAgents/io.github.agy-pet.plist` 会自动 unload 并删除），平时后台 0 进程常驻；日常通过 `Antigravity (AGY Pet).app` 或 `launch-antigravity.command` 启动即可。
     - **常驻守护模式**：注册 `LaunchAgent`（`~/Library/LaunchAgents/io.github.agy-pet.plist`）实现登录自启，并立即启动原生 Swift 后台守护进程 `agy-pet-watcher` 实时注入及热更新。
   - **卸载还原**：重新打开 `AGY Pet.app` 点击「卸载并恢复原版」，即可自动停止守护、卸载并删除 `LaunchAgent`、清理 `~/Applications/Antigravity (AGY Pet).app` 与安装目录并恢复原版界面。

3. 安装器支持的命令行参数：
   ```text
   "/Applications/AGY Pet.app/Contents/MacOS/AGY Pet" \
     [--silent | /S | -s] [--uninstall] [--status] \
     [--mode=managed | --mode=daemon | --managed | --daemon] \
     [--app-launcher | --no-app-launcher] \
     [--no-autostart] [--no-kill-legacy] \
     [--install-dir <路径>] [--cdp-port <端口>] \
     [--out <结果JSON路径>] [--popup]
   ```
   - `--mode=managed` / `--managed`：以托管启动模式安装或切换（默认模式，不注册 `LaunchAgent`）。
   - `--mode=daemon` / `--daemon`：以常驻守护模式安装或切换（写入 `LaunchAgent` 登录自启并常驻后台）。
   - `--app-launcher` / `--no-app-launcher`：控制是否在 `~/Applications` 创建 `Antigravity (AGY Pet).app` 启动器（默认创建）。
   - `--no-autostart`：跳过 `LaunchAgent` 与 `~/Applications` 启动器写入（未显式传 `--mode` 时按 `managed` 模式处理）。

---

<a id="方式三nodejs-脚本模式windows--macos--linux"></a>
### 💻 方式三：Node.js 脚本模式（Windows / macOS / Linux）

1. 克隆仓库并准备配置文件（可选，若不创建 `config.json` 将自动使用内置默认配置）：
   ```bash
   git clone https://github.com/Mexix-Collab/agy-pet.git
   cd agy-pet
   cp config.example.json config.json
   ```

2. 按操作系统选择对应启动方式：

   - **Windows**：
     - `launch.bat [--relaunch] [--daemon]`：
       - **默认托管模式**（不带 `--daemon`）：调用 `node inject.js --launch` 以 `--remote-debugging-port=0` 启动 Antigravity（若已运行且未开 CDP，需附带 `--relaunch` 才会温和重启，或直接改用 `npm run managed` 按配置自动接管），并通过 `watch-hidden.vbs` 无黑框拉起带 `--watch --exit-on-host-close --skip-if-running` 的 watcher；宿主关闭后自动退出（含 90 秒启动宽限保护），平时不留常驻后台进程。
       - **常驻守护模式**（`launch.bat --daemon`）：通过 `watch-hidden.vbs --watch --replace` 启动常驻后台守护进程（不随宿主关闭自动退出）。
       - **`watch-hidden.vbs` 参数转发**：支持将传入的命令行参数原样转发给 `node inject.js`；不传参数直接运行（如 `watch.bat` / `autostart-on.bat`）时默认回退为 `--watch --replace`。
     - `npm run managed`：跨平台等价于 `node inject.js --managed`（即 `--launch --watch --exit-on-host-close`），一条命令完成带 CDP 启动/接管与随宿主退出监听（`npm run launch` / `npm run relaunch` 则仅执行单次带 CDP 启动/重启 `node inject.js --launch [--relaunch]`）。
     - `watch.bat`（或 `npm run watch`）：无黑框后台启动常驻守护进程（`watch-hidden.vbs` 默认 `--watch --replace`），持续检测并注入新窗口/重载页面，并在 `style.css`、`*.js`、`config.json` 变动时自动热更新。日志输出至 `watch.log`。
     - `inject.bat`（或 `npm run inject`）：单次立即注入当前所有 Antigravity 窗口（窗口刷新后失效）。
     - `remove.bat`（或 `npm run remove`）：停止后台守护进程并无损清除所有注入节点与属性，恢复原生界面。
     - `autostart-on.bat` / `autostart-off.bat`：为当前脚本目录开启或取消 Windows 开机自启（通过 `watch-hidden.vbs` 启动常驻守护）。

   - **macOS / Linux**：
     ```bash
     chmod +x *.sh
     ./launch.sh              # 默认托管模式：以绝对路径 "$PWD/inject.js" 带 CDP 启动 Antigravity 并拉起 --watch --exit-on-host-close --skip-if-running（关闭宿主后自动退出，含 PID 归属校验去重）
     ./launch.sh --relaunch   # 若 Antigravity 已运行但未开 CDP，自动温和重启后再接管
     ./launch.sh --daemon     # 常驻守护模式：以绝对路径 "$PWD/inject.js" 拉起 --watch --replace 后台常驻监听
     npm run managed          # 跨平台一站式托管启动（等价于 node inject.js --managed）
     ./watch.sh               # 以绝对路径启动常驻后台守护（nohup node "$PWD/inject.js" --watch --replace）
     ./inject.sh              # 单次注入
     ./remove.sh              # 停止守护（Fail-Closed 校验 PID 归属）并恢复原生界面
     ```

> [!TIP]
> 只是想先尝鲜看看小螃蟹？先运行一次 `npm run inject` 就能立刻在 Antigravity 里看到 Clawd；平时推荐使用 `npm run managed`（或 `launch.bat` / `./launch.sh`）免常驻随开随用，随时想恢复原貌只需 `npm run remove`，干干净净不留痕迹 `(ﾉ◕ヮ◕)ﾉ*:･ﾟ✧`

---

<a id="配置说明"></a>
## ⚙️ 配置说明 (`config.json`)

所有配置均可在 Antigravity `设置 → 外观` 中实时可视化调整，也可以直接编辑 `config.json`（监听进程会自动执行 `<2KB` 轻量配置热更新）。默认完整键值定义见 [cdp.js](cdp.js) 中的 `DEFAULT_CONFIG`，常用配置模板见 [config.example.json](config.example.json)。

| 配置键 | 可选值 / 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `language` | `'zh-CN'` \| `'zh-TW'` \| `'yue'` \| `'en'` \| `'ja'` | `'zh-CN'` | 🌐 全局界面与插件面板语言（简中/繁中/粤语/英文/日语） |
| `palette` | `'obsidian'` \| `'claude'` \| `'host'` | `'obsidian'` | 🎨 配色方案（黑曜石蓝暗色 / Claude / 跟随宿主） |
| `homeLayout` | `'studio'` \| `'classic'` \| `'off'` | `'studio'` | 🏠 新会话首页布局模式 |
| `homeRipple` | `boolean` | `true` | 🌊 首页交互式字符矩阵波纹背景 |
| `composerRestyle` | `boolean` | `true` | 💊 极简胶囊工作区栏与输入框重排 |
| `mascot` | `'crab'` \| `'off'` | `'crab'` | 🦀 输入框右上角像素螃蟹挂件 `Clawd` |
| `logoInk` | `'accent'` \| `'foreground'` | `'accent'` | ✒️ 首页 Antigravity Logo 线条色调 |
| `inlineStats` | `boolean` | `true` | 🍩 启用内嵌会话统计与右下角剩余用量圆环 |
| `ringMode` | `'context'` \| `'quota'` | `'context'` | 🔋 右下角圆环显示上下文剩余或模型配额剩余 |
| `turnBadges` | `boolean` | `true` | 🏷️ 对话流每轮 AI 回复底部显示 Token 徽章 |
| `hudTopBar` | `boolean` | `false` | 📏 输入框顶部上下文进度条 |
| `hudBottomBar` | `boolean` | `false` | 📊 输入框底部详细 HUD 遥测栏（开启后即使在 `context` 模式也同步显示模型配额余量） |
| `hudRimProgress` | `boolean` | `false` | 🌈 输入框边框环绕上下文进度条 |
| `hudFooterChip` | `boolean` | `false` | 💠 底栏剩余容量标签胶囊 |
| `hudCompact` | `boolean` | `false` | 🧩 Token HUD 紧凑排版模式 |
| `effortSliderStyle` | `'claude'` \| `'chatgpt'` \| `'liangwufeng'` | `'claude'` | 🎚️ 思考强度滑块浮窗风格 |
| `effortAccent` | `boolean` | `true` | 💜 Claude 模式下启用蓝紫思考强度色阶 |
| `performanceBackdrop` | `'card'` \| `'page'` \| `'off'` | `'card'` | 🖼️ 梁武峰模式下 31 帧人像背景渲染范围 |
| `smoothCaret` | `boolean` | `true` | ✨ 输入框丝滑插值打字光标 |
| `sidebarRestyle` | `boolean` | `true` | 📑 侧边栏 Claude 风格行高与悬停高亮 |
| `sidebarCompact` | `boolean` | `false` | 📏 侧边栏紧凑间距模式 |
| `placeholderStyle` | `'studio'` \| `'host'` | `'studio'` | 💬 输入框占位提示文本风格 |
| `autoRelaunchWithCdp` | `boolean` | `true` | 🔄 Antigravity 2.33.0+ 运行中未开 CDP 时自动温和重启并附加 `--remote-debugging-port=0` |
| `exitOnHostClose` | `boolean` | `false` | 🛑 常驻守护在已注入的 Antigravity 宿主全部关闭后是否自动退出（托管模式会通过 `--exit-on-host-close` 强制开启） |
| `pollIntervalMs` | `integer`（`250`–`60000`，UI 下限 `1000`） | `2500` | ⏱️ UI 遥测轮询间隔（毫秒；`config.example.json` 省略此项，运行时自动回退默认值 `2500`） |

> [!NOTE]
> **关于 `exitOnHostClose` 与托管启动模式的行为区别**：
> - **托管启动模式**（Windows `Antigravity (AGY Pet).lnk`、macOS `.app` / `launch-antigravity.command`、`launch.bat` / `./launch.sh` / `npm run managed`）：watcher 启动时会显式携带 `--exit-on-host-close`（或 `--managed`），**即使 `config.json` 中 `exitOnHostClose` 为 `false`，也会在 Antigravity 全部窗口及进程关闭后自动退出**，并启用 **90 秒启动宽限保护**（`--startup-grace`）防止宿主启动失败或中途关闭时孤儿进程挂起。
> - **常驻守护模式**（直接运行 `node inject.js --watch` / `launch.bat --daemon` / `./launch.sh --daemon` / 安装器 `daemon` 模式）：默认 `exitOnHostClose: false` 会保持后台常驻；如果你手动在 `config.json` 中将其改为 `true`，守护进程只会在**至少成功注入过一次窗口且之后所有宿主全部关闭**时退出，不会在开机等待 Antigravity 打开期间因启动宽限超时提前退出。

### 🛡️ 热更新、配置合并与守护进程安全机制
- **轻量 `<2KB` 配置热更新**：当仅 `config.json` 变动（或通过设置面板调整开关）且 `style.css` 与运行时脚本哈希未变时，Node.js 与 Windows/macOS 原生监听进程均仅向页面下发不足 `2KB` 的配置刷新脚本（保留整包启动脚本并独立更新配置脚本），避免重复注入整包运行时与样式表。
- **原子写入与 3-Way 配置合并**：通过设置面板或安装器保存修改时，先校验字段合法性再通过临时文件重命名**原子写入** `config.json`，防止并发写入损坏；前端加载时将前后 `config.json` 快照与 `localStorage` 本地状态执行 **3-way 合并**，仅将外部实际修改过的键值覆盖到当前界面，完整保留你本地调整过的其他 UI 偏好。
- **Fail-Closed PID 归属校验**：启动、停止（`remove.js` / 安装器卸载）或替换（`--replace`）监听进程时，均校验 `.watch.pid` 对应进程的命令行、可执行文件与目标目录归属——仅终止确认属于本目录的 `--watch` / `--managed` 或原生 watcher；失效或确认属于其他程序的 PID 仅清理锁文件而不误杀；当进程信息无法检查或相对路径无法验证归属时执行 **Fail-Closed 拒绝策略**，绝不误杀未知进程或盲目覆写/删除 `.watch.pid`。

---

<a id="项目结构"></a>
## 🗂️ 项目结构

```text
agy-pet/
├── .github/workflows/                 # GitHub Actions CI 测试与自动构建发布 Release 工作流
│   ├── _build-and-test.yml            # 共享可复用工作流（统一版本解析、跨平台测试与产物命名）
│   ├── ci.yml                         # PR / main 分支跨平台测试与编译验证
│   └── release.yml                    # 推送 v* 标签或手动触发自动发布 Windows/macOS 安装包
├── CHANGELOG.md                       # 版本变更日志（Release 工作流自动抽取对应版本说明）
├── assets/                            # README 可爱像素螃蟹 Clawd 视觉插图资源
├── cdp.js                             # CDP 客户端、配置校验/原子写入、PID 归属校验、注入/轻量刷新表达式与 ensureAntigravityWithCdp 启动协调
├── inject.js                          # 单次注入、--managed 托管启动与 --watch 热更新监听进程（含 <2KB 配置刷新与设置绑定）
├── remove.js                          # 校验 PID 归属后停止守护/监听进程并清理恢复原生界面
├── config.example.json                # 默认配置文件模板
├── style.css                          # 全套主题调色板、首页 Studio、HUD 与滑块样式
├── ui-runtime.js                      # 主运行时：Store/Fiber 桥接、首页仪表盘、HUD 浮窗、设置面板集成
├── i18n-core.js                       # 5 语言 DOM 翻译引擎（含保护区与无损还原）
├── i18n-locales.js                    # 简中 / 繁中 / 粤语 / 英文 / 日语多语言词典（含 Swarm 与 Plan/Orchestrator）
├── sidecar-core.js                    # Swarm 侧栏精简翻译运行时（跳过主样式注入并保护帖子/成员正文）
├── usage-core.js                      # 会话轨迹解析、Token 拆分、配额池匹配、热力图与书籍标尺计算
├── effort-core.js                     # 推理档位解析、阻尼刻度数学模型与 3 套滑块逻辑
├── mascot-core.js                     # 像素螃蟹 Clawd 状态机（休眠、唤醒、反应、状态优先级）
├── ripple-core.js                     # 首页字符矩阵噪声与二维水波方程求解器
├── crab-assets.js                     # 内置 19 套像素螃蟹双层精灵图（body + ink PNG Data URI）
├── perf-assets.js                     # 内置 31 帧 320×320 WebP 人像序列
├── installer/                         # Windows (C#) 与 macOS (Swift) 独立安装器及原生托管/守护进程源码
│   ├── common/
│   │   ├── AgyFastHelper.cs           # agy-fast 加速插件一键部署、启停与卸载辅助模块
│   │   ├── CdpClient.cs               # C# 轻量 CDP 客户端、窗口激活、启动协调与配置热更新同步
│   │   └── MiniJson.cs                # 零依赖 JSON 解析与序列化
│   ├── setup/
│   │   ├── Program.cs                 # Windows 安装/托管与常驻模式切换/升级/卸载 GUI 与 CLI 入口
│   │   └── app.manifest               # Windows DPI 与清单配置
│   ├── watcher/
│   │   ├── Program.cs                 # Windows 无窗 CDP 托管启动器与后台守护进程（支持 --launch / --exit-on-host-close / --no-desktop）
│   │   ├── DesktopNeko.cs             # Windows DirectComposition + WebView2 透明桌面宠物宿主、物理引擎、天气/待办服务与右键菜单
│   │   ├── pet-ui.html                # 桌面宠物 Web 前端（114 段动画状态机、任务进度胶囊栈、气泡/天气/待办/弹弓交互）
│   │   ├── WebView2Loader.dll         # Microsoft Edge WebView2 运行时加载器
│   │   ├── app.manifest               # Windows DPI 感知清单
│   │   └── assets/                    # 桌面宠物音效等附加资源（click-duck.wav 等）
│   └── macos/
│       ├── Common/                    # Swift 零依赖 JSON 解析与 URLSession WebSocket CDP 客户端 / 启动协调
│       ├── Setup/main.swift           # macOS Cocoa GUI / 托管启动器 (.app / .command) / LaunchAgent 安装与卸载入口
│       └── Watcher/main.swift         # macOS 原生 CDP 托管启动器与后台守护进程（支持 --launch / --exit-on-host-close / 90s 宽限保护）
├── plugins/
│   └── agy-fast/                      # 内置打包的 agy-fast 加速插件（来源：INK-Q/agy-fast，保留完整 MIT LICENSE）
├── neko-studio/                       # 绿幕反混合抠像脚本（clean_greenscreen_webm.py）与提示词指南（114 段动画通过 Release 安装包分发）
├── scripts/
│   ├── build-common.mjs               # 共享构建工具（图标生成、清单、ZIP 打包）
│   ├── build-installer.mjs            # 编译生成 Windows 独立 AGY-Claude-Style-v<version>-Windows-x64.exe
│   └── build-macos.mjs                # 编译生成 macOS Universal .app 与 .dmg
├── test/                              # 基于 node:test 的单元测试与安装器 E2E 测试套件
├── launch.bat / launch.sh             # 带 CDP 参数启动 Antigravity（默认托管模式随宿主退出，加 --daemon 切换常驻；launch.sh 以绝对路径启动）
├── watch.bat / watch.sh               # 常驻后台守护启动脚本（watch.sh 使用 "$PWD/inject.js" 绝对路径）
├── watch-hidden.vbs                   # Windows 无黑框隐藏启动封装（透传参数给 inject.js，无参默认 --watch --replace）
├── inject.bat / inject.sh             # 单次注入脚本
├── remove.bat / remove.sh             # 停止监听/守护与还原脚本
└── autostart-on.bat / autostart-off.bat # Windows 开机自启快捷方式管理脚本
```

---

<a id="开发测试与构建"></a>
## 🧪 开发、测试与构建

```bash
# 运行全部单元测试与对应平台的安装器端到端测试（Node.js >= 22）
npm test

# 在 Windows 上从源码编译生成独立 AGY-Claude-Style-v<version>-Windows-x64.exe
npm run build:installer

# 在 macOS 上从源码编译生成 Universal .app 与 AGY-Claude-Style-v<version>-macOS-universal.dmg
npm run build:macos

# 运行单次注入 / 托管启动 / 常驻监听 / 卸载还原
npm run inject
npm run managed
npm run watch
npm run remove
```

### 🚀 自动构建与发布 Release

仓库已配置 GitHub Actions 工作流（[_build-and-test.yml](.github/workflows/_build-and-test.yml)、[release.yml](.github/workflows/release.yml) 与 [ci.yml](.github/workflows/ci.yml)）：
- **推送版本标签自动发布**：推送形如 `v2.0.0` 的标签（`git tag v2.0.0 && git push origin v2.0.0`），会自动在 `ubuntu-latest`、`windows-latest` 与 `macos-latest` 上完成测试、编译 `AGY-Claude-Style-v2.0.0-Windows-x64.exe` 与 `AGY-Claude-Style-v2.0.0-macOS-universal.dmg`（附带 `SHA256SUMS.txt`）并自动创建 GitHub Release（同时抽取 [CHANGELOG.md](CHANGELOG.md) 对应版本日志）。
- **手动触发**：也可以在 GitHub 仓库 **Actions → Release → Run workflow** 手动触发编译并发布。

测试套件包含对注入包语法、模拟 DOM 挂载/无损卸载、5 语言翻译引擎、思考强度滑块数学模型、用量统计与配额匹配、二维波纹场、螃蟹状态机，以及 Windows `installer.exe` 与 macOS `.app` 编译/静默安装/CDP 注入/设置同步热更新/保留配置升级/卸载清理全流程的自动化验证。

---

<a id="来源声明"></a>
## 💌 来源声明与第三方致谢

本项目在设计与实现过程中基于或参考了以下开源项目、运行时组件与开放服务，特此明确列出并致谢 🌸：

### 1. 上游基础与衍生来源
- **上游基础项目（二次开发起点）**：[0DNANCY/agy-claude-style](https://github.com/0DNANCY/agy-claude-style)（MIT License）
  - 本项目在其 `v2.0.0` 基础上扩展开发，承接 CDP 无损动态注入、托管/守护双模式架构、5 语言 i18n、Token HUD、设置面板集成及 Windows/macOS 原生构建框架。
- **Studio UI 风格与部分源码灵感**：[Nwflower/dsh-claude-style](https://github.com/Nwflower/dsh-claude-style)（承接自上游）
- **Codex 思考强度滑杆样式**：[Microqian2th/dsh-codex-effort-slider](https://github.com/Microqian2th/dsh-codex-effort-slider)（承接自上游）
- **梁武峰思考强度滑杆样式**：[mobius/dsh-performance-slider](https://github.com/mobius/dsh-performance-slider)（承接自上游）

### 2. 桌面宠物交互设计与内置插件
- **桌面宠物交互形态、动画分类池与物理玩法灵感**：[PC2005-cloud/dsh-pet](https://github.com/PC2005-cloud/dsh-pet)
  - 参考其透明桌面宠物交互理念、动作分类组织、弹簧拖拽/双击弹弓抛投/空中抓取计分（`score-popup`）、牛奶白碎碎念气泡、实时天气与头顶待办清单及悬停快捷键体验；Windows 桌面宠物宿主与前端由本项目基于 C# WinForms + DirectComposition + WebView2 独立实现。
- **内置加速插件 `agy-fast`**：[INK-Q/agy-fast](https://github.com/INK-Q/agy-fast)（MIT License，作者 `inkwhite`）
  - 位于 `plugins/agy-fast/`，完整保留其原始 [LICENSE](plugins/agy-fast/LICENSE) 与元信息，在安装器与宠物右键中提供可选的一键部署/启停集成。

### 3. 第三方运行时组件与开放 API
- **Microsoft Edge WebView2 Loader (`WebView2Loader.dll`)**：来自 Microsoft Edge WebView2 SDK 可再分发加载器，用于在 Windows 上通过 DirectComposition 渲染透明桌宠页面。
- **Open-Meteo API**（[open-meteo.com](https://open-meteo.com/)）：用于桌面宠物实时天气查询与城市地理编码（非商业免费开放接口）。
- **ip-api.com** / **ipwho.is**：当用户未手动配置天气城市时，用作出口 IP 粗略城市定位的回退接口（用户可随时在宠物右键自定义城市名）。

### 4. 素材与字体合规说明
- **动画素材**：114 段桌面宠物透明 WebM 动画及 20 套输入框趴框/坐姿猫娘动画均为 AI 生成并通过自研绿幕反混合抠像脚本（`neko-studio/clean_greenscreen_webm.py`）二次加工制作。
- **气泡字体**：开源仓库不附带受商业版权保护的字体文件，默认使用系统圆体/黑体字体栈；如需自定义可爱字体，请自行获取拥有合法授权或 SIL OFL 开源协议的 `.ttf` 字体文件。

---

<a id="开源协议"></a>
## 📜 开源协议

本项目基于 [MIT License](LICENSE) 开源，并完整保留上游项目与内置第三方组件的原始版权声明。

<div align="center">

```text
      ╭───────────────────────────────────╮
      │  "What's up next? Let's ship it!" │
      ╰─────────────────┬─────────────────╯
                 ████████████████
                 ██▀▀████████▀▀██
             ████████████████████████
                 ████████████████
                 ██ ██      ██ ██
```

<sub>愿每一行代码都有小螃蟹默默陪你加油 `(っ˘ω˘ς ) ☕️` · 喜欢的话欢迎点亮右上角 ⭐ Star！</sub>

</div>
