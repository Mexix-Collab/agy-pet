# Changelog

All notable changes to **AGY Pet (`agy-pet`)** (derived from `0DNANCY/agy-claude-style`) are documented in this file.

## [v2.0.0] - 2026-11-25 (AGY Pet Edition)

### 🐾 全新独立透明桌面宠物 & 输入框趴框伴侣
- **Windows WebView2 + DirectComposition 透明桌面宠物 (`DesktopNeko.cs` / `pet-ui.html`)**：
  - 内置 114 段高清透明 WebM 动作（发行安装包自带），支持工作状态联动、随机小剧场、时段彩蛋、睡眠循环及右键打开目录扩展自定义 `.webm`。
  - 多会话 / 子代理 / Swarm 实时任务进度胶囊栈（支持展开详情与紧凑数字圆圈一键切换）。
  - 右键新增 **「👑 称呼设置」**（默认「老大」，内置 8 种常用称呼预设及自定义称呼），实时同步全部碎碎念、问候与待办提醒。
  - 集成自由拖拽弹簧跟手、双击弹弓发射与空中抓取积分、实时天气卡片、头顶轻量待办清单（含到期前 15 分钟提醒）、Q 弹点击音效及悬停快捷键（`S` / `D` / `W` / `C`）。
- **输入框 20 套趴框 / 坐姿猫娘动画**：
  - 内置 10 套趴框 + 10 套坐姿透明 WebM 动画、双击查看配额气泡及高上下文自动 `/compact` 提醒卡片。
- **后台唤醒防白屏修复**：
  - 修复从后台托盘点击任务状态切回前台时，冷启动过早触发缺参路由导致白屏加载转圈的问题，改用纯净单实例唤醒 + 侧边栏就绪守卫 + 自动继承 `project` 查询参数。

### 🎨 全新 `AGY Pet` 品牌、现代高 DPI 安装器与 `agy-fast` 加速集成
- **品牌更名与平滑迁移**：正式更名为 **AGY Pet (`agy-pet`)**，全新像素异色瞳猫耳图标、全新深紫星空渐变高 DPI 现代安装器面板（彻底消除文字截断），安装时自动平滑迁移旧版 `agy-claude-style` 用户配置与待办并清理旧快捷方式。
- **内置 `agy-fast` 加速插件一键管理**：安装器与桌面宠物右键均支持一键部署与启停 [INK-Q/agy-fast](https://github.com/INK-Q/agy-fast)（保留完整 MIT License）。
- **开源合规清理**：移除非开源商业字体，全部改用零版权风险系统圆体/黑体/楷体/漫画体栈；代码仓库与大体积动画素材分离，完整动画随 Release 安装包分发。

## [Upstream History] — `0DNANCY/agy-claude-style`

### 🌐 语言支持增强（Swarm UI 侧栏 & Plan / Orchestrator 模式）
- **Swarm 蜂群侧栏（`/swarm` 面板）完整 5 语言本地化**：
  - Node（`cdp.js`）、Windows C#（`CdpClient.cs`）与 macOS Swift（`CdpClient.swift`）三端 CDP 目标过滤统一支持 `plugin://swarm--` 侧栏 OOPIF `iframe` 目标，并自动随主窗口语言切换通过轻量 `refreshConfig` 实时同步。
  - 新增 `sidecar-core.js` 侧栏精简运行时：在 `plugin:` 协议上下文下跳过主窗口 `style.css` 与 UI 增强，仅挂载可逆 DOM 翻译器，精准保护帖子正文、成员句柄、任务描述与叙述者视图，同时放行 `<select><option>` 筛选选项翻译，卸载时无损还原。
- **Plan / Orchestrator / Coordinator / Plugins 词典补齐**：
  - 扩充 `i18n-locales.js` 约 180+ 条 5 语言静态词条与 25 条动态正则规则，覆盖 Swarm 面板（Overview / Board / Members / Graph / Raw / Hive / Replay / GIF 导出）及主窗口新版 Orchestrator 模型设置、Coordinator/Subagent 控件、Pause/Resume 提示与插件管理界面。

## [v2.0.0] - 2026-11-21

`v2.0.0` 为重大架构与体验升级版本：正式引入 **「启动器托管模式（随宿主生灭、零后台常驻）」**（#4、#14），并全面整合 **PR #13**（@zhyan0603 / ZihanYAN）在守护进程安全加固、轻量配置热更新与 Token HUD 方面的深度优化。

### 🚀 启动器托管模式与双模式切换（#4、#14）
- **三端统一无窗启动器（`--launch` / `--managed`）**：
  - Windows `agy-claude-style-watcher.exe` 与 macOS `agy-claude-style-watcher` 新增 `--launch`、`--relaunch`、`--replace`、`--startup-grace <sec>`（默认 `90` 秒），Node 端 `inject.js` 同步新增 `--managed` 一键组合参数与 `npm run managed`。
  - 启动时优先复用并激活已有 CDP 窗口；未运行或未开启 CDP 时按参数/配置以 `--remote-debugging-port=0` 启动或温和重启，随后直接进入 `--exit-on-host-close` 监听并在宿主关闭后自动退出。
  - 新增重复实例去重（托管启动不重复驻留）与 **90 秒启动宽限保护**：若在首个窗口附着前宿主启动失败或中途关闭，watcher 会在宽限期后自动退出并清理 `.watch.pid`，避免孤儿进程挂起；普通 `--watch` 守护模式即使配置了 `exitOnHostClose: true` 也不会误触发宽限退出。
- **Windows 与 macOS 独立安装器双模式改造**：
  - 安装器 GUI 与 CLI 均默认推荐 **托管启动模式（免后台常驻）**，同时完整保留 **常驻守护模式（开机自启）**，支持 `--mode=managed|daemon`、`--managed`、`--daemon`、`--desktop-shortcut` / `--no-desktop-shortcut`（Windows）、`--app-launcher` / `--no-app-launcher`（macOS），并兼容 `--no-autostart`。
  - 托管模式下平时 **0 后台进程常驻**：不写入 Windows Startup / macOS `LaunchAgent`；仅当安装时检测到 Antigravity 已开启 CDP 会话才拉起一次性 `--exit-on-host-close` 监听接管当前会话。
  - 升级自动保留已有 `config.json` 并通过 `.install-mode` 记录当前模式；从常驻模式切换至托管模式时，主动删除旧版 Startup 快捷方式 / `LaunchAgent` plist 并停止原常驻进程；卸载时一并清理所有启动入口。
  - 统一启动入口：Windows 安装目录、开始菜单及桌面生成 `Antigravity (AGY Claude Style).lnk`（指向无黑框 watcher `--launch --relaunch --exit-on-host-close`）；macOS 生成 `Antigravity (AGY Claude Style).app` 与 `launch-antigravity.command`。
- **脚本模式升级**：
  - `launch.bat` 与 `launch.sh` 默认以托管模式启动并在关闭宿主后自动退出，传入 `--daemon` 可切回常驻守护模式；`watch-hidden.vbs` 支持命令行参数透传（无参保持默认 `--watch --replace`）。
- **零侵入安全原则**：全程不改动 Antigravity 原版安装目录，不使用 DLL 劫持或 IFEO 映像劫持，避免安全软件误报并保持 Windows / macOS / Linux 跨平台统一。

### 🛡️ 守护进程安全加固与轻量配置热更新（整合自 #13，致谢 @zhyan0603）
- **Fail-Closed PID 归属校验**：
  - 在 `cdp.js`、`inject.js`、`remove.js` 与 Windows C# / macOS Swift 安装器及守护进程中引入严格进程归属判定，综合校验可执行文件路径、命令行参数、`--dir` 及 macOS `/private/(var|tmp|etc)` 软链路径（支持 `--watch` 与 `--managed`）。
  - 仅终止确认属于目标安装目录的守护进程；遇到失效或属于其他程序的 PID 仅清理锁文件而不误杀；进程信息无法确认时执行 **Fail-Closed 拒绝策略**，既不发信号也不覆盖 `.watch.pid`。
  - `watch.sh` 与 `launch.sh` 统一改用 `$PWD/inject.js` 绝对路径启动，消除相对路径判重盲区；Windows 卸载自删除改用编码 PowerShell `-LiteralPath` 安全处理特殊路径字符。
- **`<2KB` 轻量配置热更新与三方配置合并**：
  - 将页面注入脚本拆分为不可变完整运行时（`bootstrapScriptId`）与独立短配置脚本（`configScriptId`）。仅编辑 `config.json` 或在面板切换设置时，仅下发 `<2KB` 配置脚本并触发 `window.__agClaudeStyle.refreshConfig()`，避免重复传输整包运行时与样式表；新开窗口、页面重载及轻量刷新回退时均保持最新配置生效。
  - 共享 `CONFIG_VALIDATORS` 单一校验源并消除重复校验表；`config.json` 改用临时文件原子替换写入（替换失败保留原文件）；前端 `loadSettings` 对前后配置快照与 `localStorage` 执行 **3-way 合并**，保留本地 UI 偏好不被外部非相关变更覆盖；对齐三端 `autoRelaunchWithCdp` 缺省值为 `true`，Windows `MiniJson.cs` 补齐 `\u2028`/`\u2029` 转义。

### 📊 Token HUD 增强与运行时性能优化（整合自 #13）
- **低上下文预警与精准 `/compact`**：上下文剩余 `<= 20%`（琥珀色预警）及 `<= 10%`（红色紧急）时，状态环、顶部 HUD `/compact` 按钮与详情浮窗同步展示提醒并支持点击一键填充 `/compact`；多会话视图下优先向当前卡片关联输入框填入指令。
- **配额联动与剪贴板反馈**：开启底部 HUD（`hudBottomBar`）时，即使圆环处于 `context` 模式也会同步拉取模型配额；点击复制遥测报告在剪贴板拒绝或失败时显示明确 `✕ 失败` 状态反馈。
- **绘制与缓存优化**：草稿输入时的弹层数据刷新通过 `requestAnimationFrame` 合并并优先局部更新数字节点；过滤非输入区的 `.monaco-editor` 与 `.xterm` 高频 DOM 变更；为主会话与子代理轨迹缓存增加 LRU 淘汰；首页字符波纹静止时跳过冗余计算并在零尺寸容器下安全创建与卸载绘制资源。

### 🧪 自动化测试扩充
- 全平台自动化测试扩展至 **84 项**（覆盖托管启动、90s 启动宽限、重复实例去重、Windows/macOS 双模式切换与卸载 E2E、fail-closed PID 归属保护、原子配置替换、`<2KB` 轻量热更新、低上下文预警及零尺寸波纹卸载）。

**Full Changelog**: https://github.com/0DNANCY/agy-claude-style/compare/v1.3.0...v2.0.0

---

## [v1.3.0] - 2026-11-20

- **Remote（Cloud）模式 Token HUD 与用量遥测支持（#11）**：接入 `AgentState` 流式遥测与状态订阅，解决 Remote 会话下 HUD、状态条、内联统计与 `#T` 轮次徽章缺失的问题，并支持带有 `v1/default/jetski_remote_agents_3p/...` 前缀的 `cascadeId` 与更准确的模型上下文上限/速度统计。
- **CI / Release 工作流优化与产物命名统一（#12）**：引入共享工作流 `.github/workflows/_build-and-test.yml`，统一输出 `AGY-Claude-Style-v<version>-Windows-x64.exe`、`AGY-Claude-Style-v<version>-macOS-universal.dmg` 与 `SHA256SUMS.txt`。

**Full Changelog**: https://github.com/0DNANCY/agy-claude-style/compare/v1.1.1...v1.3.0

---

## [v1.1.1] - 2026-11-20

- 修复 PR #8 复查反馈的问题（#9、#10）：加固 CDP 自动重启接管前对原生可执行路径的校验，修复流式回复阶段 `#T` 徽章跳位与用量统计双倍计数，并降低全局 DOM 监听开销。

**Full Changelog**: https://github.com/0DNANCY/agy-claude-style/compare/v1.1.0...v1.1.1

---

## [v1.1.0] - 2026-11-20

- 适配 **Antigravity 2.33.0+** 默认关闭 CDP 调试端口的变更（#2、#3、#5、#6、#7、#8）：新增 `--launch` / `--relaunch`、默认启用 `autoRelaunchWithCdp`、Windows 开始菜单启动快捷方式与 macOS `launch-antigravity.command`，修复 Token HUD 实时刷新、对话轮次统计与侧边栏样式。

**Full Changelog**: https://github.com/0DNANCY/agy-claude-style/compare/v1.0.0...v1.1.0

---

## [v1.0.0] - 2026-11-15

- 首个公开版本（#1）：基于 CDP 的 Antigravity 无损实时样式注入、Studio 首页与字符波纹场、Token HUD、5 语言翻译、像素螃蟹 `Clawd`、思考强度滑块，以及 Windows（C#）与 macOS（Swift Universal）独立免 Node.js 安装器。
