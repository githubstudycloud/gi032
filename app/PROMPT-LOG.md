# 提问记录（PROMPT LOG）

> 用于回溯：每条记录一次用户提问、当时的项目状态、关键决策、产出物。
> **时间倒序**（最新在最上面）。

---

## #008 — 2026-05-16 — 实现"总览"页（/ai-test/overview/summary）

### 用户提问

> 开始画二级菜单概览下的总览页面。3 个 div：(1) 筛选只含部门 + 查询/重置；(2) 核心指标分组（用户/业务/能力共 12 项），每张卡 ? + 值 + 环比箭头；(3) 试点进展明细 2 tabs（三大先锋产业 + 四大领域）2 级表头表格 + 分页。表头和数据都从 JSON 加载，给后端接管留口子。

### 路由

`app/pages/ai-test/overview/summary.vue`（静态路由自动优先于 catch-all `[...slug].vue`）。

### 数据层

- `public/mock/pages/ai-test-overview-summary.json`（一份大 JSON，filters + metrics 三组 + pilots 两 tab）
- `app/types/overview-summary.ts`：Filter / Metric / MetricGroup / TableColumn (递归 children) / PilotTable / Pagination 等
- `app/composables/use-overview-summary.ts`：`useOverviewSummary(params?)` 走我们的 `useDataSource`，返回 `data / filters / metrics / pilots / error / pending / refresh`。`params` 已预留 `department`，后端切到 `/api/pages/ai-test/overview/summary` 即可

### 组件

- `app/components/page/overview-summary/MetricCard.vue` —— 顶 label + ? title 提示；中偏左大数值 (font-display, tabular-nums)；中偏下 ▲/▼/● + 环比；按钮可点（emit drill），focus ring + hover 边框升级
- `app/components/page/overview-summary/MultiLevelTable.vue` —— 接收 `columns` 树（顶层叶子 rowspan=2 跨两行，顶层有 children 的就 colspan=N + 第二行子列）；leaves 计算扁平叶子；操作列特殊渲染（"详情" 是按钮、"不涉及" 是灰色文字）；缺失 `—` 显示弱化色；分页占位 footer

### 页面装配

`summary.vue` 用 `useNav` 拿面包屑、`useOverviewSummary` 拿数据；筛选 `selectedDept` 跟 query/reset 占位；tab 切 `activeTabKey` ref 派生 `activeTab`；drill / row detail 暂 console.log 占位（待用户说要跳哪页）。整段包 `<ClientOnly>` + skeleton fallback（跟其它客户端取数据的 page 一致）。

### 中途修的 bug

**表格 CJK 文字逐字垂直堆叠**：第一版 `<table class="w-full">` 强制 100% 宽度，13 个叶子列没空间，每个 CJK 字被 wrap 成一行。改 `min-w-full` 也没用 —— 真正问题是 table-layout 还是按容器宽度排。**修法**：`style="width: max-content; min-width: 100%"`，让表格按内容自然撑开，父容器 `overflow-x-auto` 处理水平滚动。

### 实测（Chrome DevTools MCP）

- `/ai-test/overview/summary` ✓：面包屑 AI辅助测试运营 / 概览 / 总览
- 筛选 ✓：5 个部门 dropdown + 查询/重置
- 核心指标 ✓：3 组（用户1 / 业务7 / 能力4）共 12 张卡，每张 ? + 值 + ▲/▼ + 环比；底部 footnote 在
- Tab 1 三大先锋产业试点进展 ✓：6 顶层列 + 11 叶子列 2 级表头，3 行（汽车/金融/能源），金融"不涉及"+其它列 — 灰色；横向滚动条工作
- Tab 切到四大领域 ✓：6 顶层列 + 17 叶子列 2 级表头，4 行（智能终端/云与计算/网络产品/汽车解决方案）
- 控制台 0 error / 0 warning

### 用户下一步可选

- 卡片点击下钻 → 跳详情页（哪张卡跳到哪？需用户说明 路由 + 字段）
- 表格"详情"按钮 → 跳行明细（同上）
- 筛选维度扩展（dateRange / role 等）
- 下一个具体页（"产业落地进展" / "领域落地进展" / 通用测试 Agent 下任一）

---

## #007 — 2026-05-16 — 加 6 个三级菜单 + iframe 嵌入 + dark-ops 主题 + Edge 样式偶发不出来的修法

### 用户提问

> 先把二级菜单 AI辅助专项测试下再加 AI辅助DTS问题分析 / VOC / Beta / 安全 / 资料 / 性能；Edge 有时样式加载不出来，做下优化；加 dark-ops 深色监控主题；顶部和左侧菜单支持嵌入页面 URL，加"首页1"嵌入谷歌、系统管理下加"搜索页面"嵌入谷歌作为示例。

### 1. 6 个三级菜单（5 分钟）

改 `public/mock/nav.json` 的 `ai-test-special.children`：
- AI辅助精准测试（已有）
- + AI辅助DTS问题分析   /ai-test/special/dts
- + AI辅助VOC问题分析   /ai-test/special/voc
- + AI辅助Beta问题分析  /ai-test/special/beta
- + AI辅助安全测试     /ai-test/special/security
- + AI辅助资料测试     /ai-test/special/doc
- + AI辅助性能测试     /ai-test/special/perf

### 2. iframe 嵌入功能

- NavItem 类型加 `embed?: string` 字段
- 新增 `app/components/common/EmbedFrame.vue`：URL bar + 新窗口打开 + **常驻警示条**（说明 X-Frame-Options / CSP frame-ancestors 限制）+ iframe 主体
- catch-all `pages/[...slug].vue`：检测到 `current.embed` 渲染 `<EmbedFrame>`，否则继续渲染占位 FilterBar + DataTable
- nav.json 加 2 个示例：
  - 顶部一级 "首页1"：path `/embed/home1`、single、embed `https://www.google.com/`
  - 系统管理下三级 "搜索页面"：path `/ai-test/system/search`、embed `https://www.google.com/`

**重要陷阱**：第一版 EmbedFrame 用 4s 定时器检测 `onload` 没触发就显示 hint。但浏览器对 X-Frame-Options 被阻挡的 iframe **也会触发 load 事件**（加载的是 `chrome-error://chromewebdata/`），导致 hint 永远不出现。改成常驻显示警示条，不依赖 load 检测。

### 3. Edge 样式偶发加载不出来

**根因**（curl + Select-String 找到）：Nuxt 4 + Vite 7 + Windows 下 dev HTML 把 main.css 引用了**两次**：
```
<link rel="stylesheet" href="/_nuxt/assets/css/main.css" crossorigin>
<link rel="stylesheet" href="/_nuxt/C:/Users/John/Desktop/claude/20260515/app/app/assets/css/main.css" crossorigin>
```
Edge 的缓存策略下偶发两个都没及时加载，导致页面无样式。

**修法**：`nuxt.config.ts` 的 `app.head.style` 加内联 critical CSS baseline —— 字体栈 + body bg + smoothing + color-scheme，main.css 即使完全没加载页面也不会"全白裸 HTML"。

```js
// 简化版
'html{color-scheme:light}html.theme-dark-ops{color-scheme:dark}' +
'*,*::before,*::after{box-sizing:border-box}html,body{margin:0;padding:0}' +
'body{font-family:"Noto Sans SC",...;background:#f5f7fa;color:#1a2030;...}' +
'html.theme-dark-ops body{background:#14181f;color:#f2f4f7}'
```

### 4. dark-ops 深色监控主题

`main.css` 加 `html.theme-dark-ops` 块：
- ink 阶**完全反向**：ink-50 = 0.155 0.012 240（最深，页面底），ink-900 = 0.965 0.006 240（最亮，主标题）
- brand 阶**重定义**：brand-50 = 0.300 0.060 220（深色 chip 底，活动叶子用），brand-600 = 0.745 0.180 220（亮青蓝主操作），brand-700 = 0.820 0.150 220（强调文字）
- shadow 改成**高光描边**：1px 浅 ring + 强黑阴影增强层级感
- body 背景渐变换深青色 radial

`themes.json` 加第 4 个 preset。

### 5. Dark mode 衍生的硬编码白色问题

dark-ops 上线后发现：顶部 / 侧栏 / 卡片仍然是白色，被 Chrome auto-dark 强转。两步根治：

a. **加 `color-scheme: light/dark` 声明**（在 baseline + 主题块里）→ Chrome 不再 auto-dark
b. **加 `--color-surface` token 解耦"卡片表面"语义** → 不再依赖 `bg-white`
   - light/business/ant 主题：`--color-surface: oklch(1 0 0)`（白）
   - dark-ops：`--color-surface: oklch(0.215 0.012 240)`（比 ink-50 略浅）
   - 把 8 个文件里的 `bg-white` / `bg-white/95` 全部替换成 `bg-surface` / `bg-surface/95`

### 实测（Chrome DevTools MCP）

- `/ai-test/special/dts` ✓：侧栏 AI辅助专项测试下面 7 个项全在，面包屑正确
- `/ai-test/system/search` ✓：iframe 显示 "www.google.com 拒绝了我们的连接请求"，警示条常驻
- 切 dark-ops ✓：`html.className = 'theme-dark-ops'`，顶部/侧栏/卡片**全深底**，主色变亮青蓝
- 切回 minimal ✓：完全恢复亮色钢蓝
- 控制台 0 error / 0 warning

### 用户下一步

如果都 OK，下轮开始做具体页（用户上轮说"完成后开始设计具体页"）。具体哪页先：总览 / DTS问题分析 / AI辅助测试设计 待用户挑。

---

## #006 — 2026-05-16 — 实现风格切换器（minimal / business / ant 三套 preset，按 §3.7 落地清单）

### 用户提问

> 先按你推荐的来

→ 实施 STYLE-GUIDE.md §3.7 落地清单：3 套 preset（现代极简 / 商务 / 中文后台），暂不做深色。

### 产出文件

- `app/types/theme.ts`：Theme + ThemesResponse 类型
- `public/mock/themes.json`：3 个 preset（key / label / subtitle / swatch / htmlClass）
- `app/assets/css/main.css`：新增 `html.theme-business` + `html.theme-ant` token 覆盖块（约 60 行），还跟着调了 body 的 radial-gradient 背景色相
- `app/composables/use-theme.ts`：useTheme 暴露 themes / activeKey / activeTheme / setTheme，跨组件用 useState 共享
- `app/components/layout/ThemeSwitcher.vue`：3 色 swatch + chevron 触发按钮 + 下拉面板（VueUse onClickOutside / Esc 关闭 / Transition / aria-haspopup）
- `nuxt.config.ts`：head 加 FOUC 内联 script（HTML 解析阶段同步把 html class 设好）
- `app/components/layout/AppTopBar.vue`：右上版本号左侧嵌入 ThemeSwitcher，包 `<ClientOnly>` + skeleton fallback
- `README.md`：加"切样式风格"小节

### 关键架构决策（debug 出来的）

**localStorage 存的是 htmlClass 完整字符串**（`''` / `'theme-business'` / `'theme-ant'`），不是 key。
- 原因：FOUC inline script 是 HTML 解析阶段同步执行的，拿不到 themes.json（异步加载）。如果 localStorage 存 key 然后 FOUC 拼 `"theme-" + key`，遇到 key=`ant-cn` 就会拼成 `theme-ant-cn`，跟 CSS 里写的 `html.theme-ant` 对不上 —— **刷新后样式失效**。
- 现在：FOUC 直接 `documentElement.className = localStorage.getItem(...)` 零拼接、零状态不一致。
- 副作用：localStorage 调试值不直观（看到的是 `theme-business` 而不是 `business`），但写在了文件注释和文档里。

### 浏览器实测（Chrome DevTools MCP）

| 步骤 | htmlClass | localStorage | 视觉 |
|---|---|---|---|
| 初次访问（清 localStorage） | `''` | `null` | 现代极简（钢蓝 235°） |
| 点商务 | `theme-business` | `theme-business` | 紫蓝主色 + 大圆角 + 深柔阴影 |
| 点中文后台 | `theme-ant` | `theme-ant` | Daybreak Blue + 锐角 + 扁平阴影 |
| F5 刷新 | `theme-ant` 保持 | `theme-ant` 保持 | 主题不丢，**无 FOUC 闪一下默认主题** |

控制台 0 error / 0 warning。

### 中途 debug 故事

第一版 setTheme 把 `localStorage.setItem(STORAGE_KEY, key)` 改成存 cls 之前：切到 ant 之后刷新，html.className 变成 `theme-ant-cn`，CSS 没有这个 class → 主题失效。
排查方式：`evaluate_script` 拿 `documentElement.className` 直接看，发现拼接 bug。
修法：localStorage 直接存 htmlClass，FOUC / setTheme 都不拼接。同时加 watcher 校验 cls 是否在 preset 里，不在就退到 default（处理老格式 / 删 preset 的 case）。

### 用户下一步

如果想加深色监控（dark-ops），先按 STYLE-GUIDE §3.8 把阴影 / chart 配色板重新设计；按 §3.7 ≈ 多 1h。
或者直接进具体页（"总览" / "AI辅助测试设计" 等）实现。

---

## #005 — 2026-05-16 — 写样式风格文档 + 切换器模块设计（暂不实现）

### 用户提问

> 单独写一个样式风格文档，介绍当前样式还有介绍一下这类看板的主流样式有哪些，我能否加个样式风格切换功能，在右上角点击风格切换可以变成其他风格，这个模块设计下提交推送

### 解读

- "单独写" → 新文档（不堆进 CLAUDE.md 也不堆进 README）
- "设计下" → 这轮**只设计**（架构 + 落地清单 + 工作量评估），不写实现代码
- 提交推送 → 本轮闭环

### 产出

**STYLE-GUIDE.md（约 350 行）三部分：**

1. **当前样式档案**：设计立场（克制 / 编辑 / 内部工具）；OKLCH 主色阶 + ink 中性色阶 + 状态色；字体（思源宋 display + Noto Sans body + JetBrains mono，禁 Inter）；11 档字号阶；圆角 / 阴影 / 边框；中等密度间距；动效仅 transition-colors。

2. **主流看板风格 survey（8 类 + 选型矩阵）**：
   - Linear 现代极简（我们当前）★★★★★
   - Stripe 柔和商业 ★★★★
   - Ant Design 中文后台 ★★★★
   - Bloomberg Terminal 终端密度 ★★★
   - Datadog/Grafana 暗黑数据 ★★★
   - Material 3 ★★
   - Apple HIG ★★
   - Glass / Neumorphism ★（已退潮，提一下）
   - 每个给：视觉特征 / 典型字体 / 色域 / 适用 / 代表产品

3. **切换器设计**：
   - 推荐方案：**CSS Variables × `@theme` × `<html class>`**（Tailwind v4 CSS-first 天然适合）。卸载方案 B (动态 import css) 和方案 C (Tailwind plugin)，给了理由。
   - 数据模型：`public/mock/themes.json` 走同一套 useDataSource，每个 preset 给 `key/label/swatch/htmlClass`
   - 持久化：localStorage `ops-dashboard:theme` + plugin 首屏注入（防 FOUC）
   - Composable：`useTheme()` 暴露 `themes / current / setTheme`
   - UI：右上角调色板小按钮 → 下拉列表（swatch + 名称 + 当前项打勾）
   - 10 步落地清单，工作量 **3.5h（含深色）/ 2.5h（不含深色）**
   - 风险：深色模式不是简单反白；建议第一版先 minimal + business + ant，深色后置

### 关键决策（写在文档里防止下轮自己又来一遍）

- 切风格**只换 token**（颜色 / 阴影 / 字体可选），**不改密度 / 不改布局**。密度 toggle 跟主题正交，后续 `useDensity()` 单独做。
- 第一版 3 个 preset：现代极简 / 商务 / 中文后台。深色监控**先不做**（需要重新设计阴影 + 反色检查 + chart 配色板）。

### 同时改

- CLAUDE.md "引用其他文件"节加一条 STYLE-GUIDE 入口

### 用户下一步

如果觉得这个设计 OK，下一轮我就按 §3.7 落地清单实施（≈ 2.5h）。

---

## #004 — 2026-05-16 — 开局域网访问 + 补 README

### 用户提问

> 我的服务目前在测试中要允许外部访问，还有缺乏启动安装的 readme 说明

### 拆解

- "外部访问"范围确认：**同局域网**（同 WiFi/办公网），不需要起公网隧道。
- 缺一份能给同事拷过去就能跑起来的 README，覆盖装 / 跑 / LAN / 加菜单 / 切后端 / 踩坑。

### 改了什么

- `nuxt.config.ts`：`devServer.host` 从 `'127.0.0.1'` 改成 `'0.0.0.0'`，让 dev 同时听 loopback 和 LAN 所有 IPv4 网卡。
- 新增 `README.md`：9 节 —— 环境要求 / 5 分钟启动 / 局域网访问（含防火墙 + 网络隔离 + ngrok/cloudflared 备选）/ 脚本 / 项目结构 / 加菜单 + 切后端 两个最常改的口子 / Windows + Node 24 踩坑表 / 跑前自检 / 相关文档。

### 浏览器实测

`Get-NetTCPConnection -LocalPort 3000` 显示 `0.0.0.0:3000 Listen`。三个 URL 各发一次 GET：
- `http://127.0.0.1:3000/`        → HTTP 200, 6936 B
- `http://localhost:3000/`        → HTTP 200, 6936 B
- `http://192.168.0.130:3000/`    → HTTP 200, 6936 B

### 用户下一步

把"用例列表"或他想先做的具体页拎出来从 catch-all 占位拆成独立 page。

---

## #003 — 2026-05-16 — 重构布局（左上 LOGO + 顶部一级 + 左侧 2-3 级，按 section 切换）+ 完整 AI辅助测试运营 菜单 + 样式打磨

### 用户提问（要点）

> 运营看板作为左上角大 LOGO，右边是一级菜单（首页 / AI辅助测试运营 / 用户反馈 / 后台运维 / 系统设置）。点首页 = 单页（无侧栏）；点 AI辅助测试运营 = 左侧出 2-3 级（用户给了完整 6 大组结构）。菜单名后续动态加。当前样式不够美观，先把这些做完再做具体页。

### 关键决策

- **数据结构**：把 `nav-top.json` + `nav-sidebar.json` **合并成一棵树** `nav.json`。顶部 = 树的根；侧栏 = 当前激活根的 children。一处维护，符合"菜单动态增"。
- **类型 / composable 统一**：用一个 `NavItem` 替代之前的 TopMenuItem / SidebarMenuItem，用一个 `useNav()` 替代之前的 useTopMenu / useSidebarMenu，并派生 `activeTop / activeTopKey / showSidebar`（根据当前 route 反查所在的一级）。
- **layout 条件侧栏**：`showSidebar` 取决于 `activeTop.single`（只有"首页"标 `single: true`），其它一级都有侧栏。
- **侧栏二级默认展开**：用户进到 `/ai-test` 不用挨个点开就能看到所有 3 级链接；3 级仍是叶子链接。

### 中途踩的 3 个新坑（顺手修了）

1. **`@pinia/nuxt@0.6.1` 把 Pinia 2 拉了进来**（跟我 package.json 写的 Pinia 3 冲突），SSR payload plugin 里炸 `obj.hasOwnProperty is not a function`。当前没用 Pinia，**modules 里去掉 `@pinia/nuxt`**；等真用 store 再升 0.11+ 加回。
2. **`useNav` 里 `useRoute()` 在 `await useDataSource()` 之后调** → Nuxt 上下文已丢，500。把 `useRoute()` 提到任何 await 之前。
3. **hydration mismatch**：`useNav`（与 `useBranding`）都是 client-only 拉，SSR 看到空数据、client 看到完整数据 → 节点数对不上。把 index 的"进入模块"卡片段 + catch-all 的 PageHeader 各包一层 `<ClientOnly>` 加 skeleton fallback。

### 样式调整

- 主色：OKLCH 235° 钢蓝，铺了 50–900 完整阶
- 中性色：略带蓝调的 ink 灰，避免冷死灰
- 字体：display 用思源宋（标题更有版式张力）、body 用 Noto Sans SC、mono 用 JetBrains Mono
- 阴影：用蓝调阴影 token，卡片有层次但不脏
- 顶部菜单活跃项：底部 brand-600 蓝条 + brand 文字
- 侧栏活跃叶子：左侧 3px brand-600 蓝条 + brand-50 浅底 + brand-700 文字
- 背景：上方加一层 radial-gradient 极淡蓝光晕，避免一片死白

### 产出文件

- 新：`public/mock/nav.json`、`app/composables/use-nav.ts`
- 删：`public/mock/nav-top.json`、`public/mock/nav-sidebar.json`、`app/composables/use-top-menu.ts`、`app/composables/use-sidebar-menu.ts`、`app/components/layout/AppSidebarBrand.vue`
- 改：`app/types/nav.ts`（统一 NavItem）、`app/utils/nav-flat.ts`（改名 flattenNav）、`app/layouts/default.vue`（条件侧栏）、`app/components/layout/AppTopBar.vue`（大 LOGO + 一级菜单）、`app/components/layout/AppSidebar.vue`（section 标题 + 子树）、`app/components/layout/AppSidebarItem.vue`（二级默认展开 + 三级活动条）、`app/pages/index.vue`（hero + 关键指标 + 模块入口 + 最近动态）、`app/pages/[...slug].vue`、`app/components/common/*`、`app/assets/css/main.css`、`nuxt.config.ts`（移除 @pinia/nuxt）

### 浏览器实测

- `/`：顶部 LOGO + 5 个一级菜单（首页高亮）+ Hero + 4 张指标卡 + 4 张模块入口 + 最近动态。无侧栏。
- `/ai-test`：顶部 AI辅助测试运营 高亮 + 侧栏显示该 section 完整树（6 个二级组 + 全部三级）+ 主区域 PageHeader + FilterBar + 占位表格。
- `/ai-test/overview/summary`：侧栏中 "总览" 项左侧蓝条高亮 + 浅蓝底；面包屑 "AI辅助测试运营 / 概览 / 总览"；H1 "总览"。
- 控制台 0 error / 0 warning。

### 后续提到的方向

- 用户接下来要做具体页面 —— 先做空骨架，等他确认页面内容再填。

---

## #002 — 2026-05-16 — 修复启动报错（IPv6-only / SSR worker OOM / 组件不解析 / hydration mismatch）

### 用户提问（原文）

> git 不用写入邮箱和用户名，还有我启动后报错。你自己跑一下修复。

### 调查过程（逐层缩小）

1. **环境**：本机无 pnpm，Node 24.15.0；用 `corepack pnpm@9.12.0` 起。
2. **第一坑：`nuxt dev` 只绑 IPv6 `::1`**。Windows + Node 24 的 `dns.lookup` 默认 IPv6-first，`nuxt dev` 默认 host 是 `localhost`，但实际只在 `::1` 监听 → 浏览器 `localhost:3000` 走 IPv4 连不上。**修：`devServer.host = '127.0.0.1'`**。
3. **第二坑：SSR worker OOM**（"Worker terminated due to reaching memory limit: JS heap out of memory"）。任意页面顶层 `await useFetch / useAsyncData + $fetch` 都触发 —— Nitro 2.13.4 在 Windows + Node 24 上的 dev worker 内存限制问题。试过 `NODE_OPTIONS=--max-old-space-size=4096`（不传递到 worker_thread）、试过 `ssr: false`（vite-builder 报 "No entry found in rollupOptions.input"，4.4.5 已知 bug）。**修：`useDataSource` 加 `{ server: false }`**，数据只在客户端拉。
4. **第三坑：自定义组件不解析**。Nuxt 4 默认对子目录加路径前缀（`components/layout/AppTopBar.vue` → `<LayoutAppTopBar/>`），我模板里写 `<AppTopBar/>` → 解析失败 → SSR 渲染为 `<!---->`。**修：`components: [{ path: '~/components', pathPrefix: false }]`**。
5. **第四坑：hydration mismatch**。`server: false` 后，SSR 时 `pending=false`，client 初始 `pending=true` → 文本/类名/节点 mismatch。**修：layout 里用 `<ClientOnly>` 包住 `AppTopBar` / `AppSidebar`，给 SSR 提供 skeleton fallback**。

### 验证（Chrome DevTools MCP）

- 首页 `/` ✓：顶部菜单 + 左侧 5 个模块 + 4 张统计卡 + 框架说明 + 最近动态
- 点 AI辅助测试运营 ✓：展开 2 级（用例管理 / 执行报告 / 知识库）
- 再点 用例管理 ✓：展开 3 级（用例列表 / 智能生成 / 用例评审）
- 点 用例列表 ✓：跳 `/ai-test/case/list`，面包屑 / 标题 / 筛选 / 6 行占位表格全在
- 控制台 0 error / 0 warning

### 改了什么

- `nuxt.config.ts`：加 `devServer.host = '127.0.0.1'`、加 `components: [{ path, pathPrefix: false }]`
- `composables/use-data-source.ts`：`useAsyncData` 加 `server: false`
- `layouts/default.vue`：`AppTopBar` / `AppSidebar` 包 `<ClientOnly>` + skeleton fallback
- `.gitignore`：加 `dev.log` / `install.log` / `.tmp-*`

### 假设 / 留给后续

- 数据全部走客户端拉 = 当前就是 SPA-like 行为。生产部署后接入后端 CORS 应该直接通；如果要保留 SSR 取数据（SEO / 首屏更快），需要换 Node 22 LTS 或等 Nitro 修 Worker OOM。
- 用户**不需要**写入 git config（已记） —— 提交时继续用 `git -c user.name -c user.email` 一次性覆盖。

---

## #001 — 2026-05-16 — 项目初始化与基础框架

### 用户提问（原文摘要）

> 开始新建一个目录，编写vue项目。后端数据暂时用多个 json 文件控制，并且后续可以切换到返回对应 json 格式的接口，页面请求 json 数据的参数要预留，对明显层级关系的要保留，因为我必须在下周就出一个动态的页面给领导看，领导对样式要求也很高，但接口来不及写了。还有如果后续接口和 json 数据不一致但包含，要预留数据转换的方法，方便后期直接快速对接后端。
>
> 然后首先我顶部有菜单，一个层级菜单栏。左侧顶部显示"运营看板"，目前分别是 首页 / AI辅助测试运营 / 用户反馈 / 后台运维 / 系统设置。首页就一个单页面。其余几个会在左侧有个左侧菜单栏，可能有 2-3 层层级菜单分别指向一个页面，页面里面有 选项 + 表格。
>
> 先搭建基础框架，然后顶部和左侧、左侧顶部大标题都要在本地 json 配置显示，这 3 块数据可能有几个后续从后台加载。先完成这部分提交推送。在 CLAUDE.md 记录一个记录文件，记录我每次提问。

### 当时项目状态

- `app/` 下只有 `CLAUDE.md`、`AGENTS.md`、`SETUP-LOG.md`、`scripts/`、`.claude/`、`.cursor/`
- 还没初始化 Nuxt 项目
- git 工作区干净，分支 `master`，已配 `origin = githubstudycloud/gi032`

### 关键诉求拆解

| # | 诉求 | 落地方式 |
|---|---|---|
| 1 | Vue 项目 | Nuxt 4（按 CLAUDE.md），源码在 `app/app/`，配置在根 |
| 2 | 后端先 JSON，后续切接口 | `runtimeConfig.public.dataSourceMode: 'json' \| 'api'`，一处切全局 |
| 3 | 请求参数预留 | `useDataSource({ params })` 签名固定，JSON 模式不消费但接收 |
| 4 | 层级关系保留 | 菜单数据用 `children: SidebarMenuItem[]` 递归，组件 `AppSidebarItem` 自递归渲染 |
| 5 | 字段不一致时数据转换 | `useDataSource({ transform })` 在每个具体 composable 里声明，业务页面不动 |
| 6 | 顶部一级菜单 | `AppTopBar` 渲染 `public/mock/nav-top.json` |
| 7 | 左侧上方"运营看板"大标题 | `AppSidebarBrand` 渲染 `public/mock/branding.json` |
| 8 | 左侧 5 个模块 + 2-3 层子菜单 | `AppSidebar` + `AppSidebarItem` 递归，数据在 `public/mock/nav-sidebar.json` |
| 9 | 首页单页面 | `pages/index.vue`（统计卡 + 说明 + 动态列表） |
| 10 | 其余页面有 选项 + 表格 | `pages/[...slug].vue` 通用占位（PageHeader + FilterBar + DataTablePlaceholder） |
| 11 | 提问记录 | 本文件，CLAUDE.md 加引用 |

### 关键设计决策

- **数据层抽象**：`composables/use-data-source.ts` 是唯一入口，三个具体 composable（`useBranding` / `useTopMenu` / `useSidebarMenu`）各自声明 jsonPath / apiPath / params / transform。**后端来了之后，业务页面一行不动，只改 composable 里的 transform。**
- **路由用 catch-all**：`pages/[...slug].vue` 根据 URL 反查 `nav-sidebar.json`，渲染统一占位页。这样下周演示前不需要手写几十个页面文件；正式开发时再按需拆分独立页面。
- **样式选型**：Tailwind v4 + `@theme` token；正文字体用 Noto Sans SC（按 CLAUDE.md 禁止 Inter），主色用 OKLCH 偏冷蓝，避免紫粉渐变。
- **不立即落地**：i18n / shadcn-vue / Pinia store / Playwright 截图 —— 这次只搭壳，按 CLAUDE.md 后续逐步补齐。

### 假设（用户没说，我先垫了默认值，可直接改 JSON）

- 顶部三个占位项：**工作台 / 监控大盘 / 工具集** —— 改 `public/mock/nav-top.json`
- 左侧 5 个模块的二三级子菜单：按业务直觉给了"用例管理 / 反馈收件箱 / 服务监控 / 账号管理…" —— 改 `public/mock/nav-sidebar.json`
- 数据源默认模式：`json`

### 产出文件清单

```
app/
├── package.json
├── nuxt.config.ts
├── tsconfig.json
├── .gitignore
├── .nvmrc
├── PROMPT-LOG.md                              ← 本文件
├── public/mock/
│   ├── branding.json                          ← 左侧大标题
│   ├── nav-top.json                           ← 顶部一级菜单
│   └── nav-sidebar.json                       ← 左侧 2-3 层菜单
└── app/
    ├── app.vue
    ├── assets/css/main.css                    ← Tailwind v4 @theme
    ├── layouts/default.vue                    ← 顶部 + 左侧 + 内容
    ├── pages/
    │   ├── index.vue                          ← 首页（单页）
    │   └── [...slug].vue                      ← 通用占位页
    ├── components/
    │   ├── layout/
    │   │   ├── AppTopBar.vue
    │   │   ├── AppSidebar.vue
    │   │   ├── AppSidebarBrand.vue
    │   │   └── AppSidebarItem.vue             ← 递归
    │   └── common/
    │       ├── PageHeader.vue
    │       ├── FilterBar.vue                  ← "选项"
    │       └── DataTablePlaceholder.vue       ← "表格"
    ├── composables/
    │   ├── use-data-source.ts                 ← 核心抽象
    │   ├── use-branding.ts
    │   ├── use-top-menu.ts
    │   └── use-sidebar-menu.ts
    ├── types/
    │   ├── nav.ts
    │   └── data-source.ts
    └── utils/
        └── nav-flat.ts                        ← 树扁平化（路径 → 面包屑）
```

### 用户下一步要做

```bash
cd app
pnpm install      # 首次安装依赖
pnpm dev          # 起开发服务器
```

打开 http://localhost:3000，应看到顶部菜单 + 左侧菜单 + 首页统计卡；点 AI辅助测试运营 → 用例管理 → 用例列表，应进入 catch-all 占位页。

### 切到后端接口时怎么做（速记）

1. `nuxt.config.ts` 改 `runtimeConfig.public.dataSourceMode = 'api'`、设 `apiBase = 'https://your-backend'`
2. 实际接口路径就是各 composable 里的 `apiPath`：`/api/branding`、`/api/nav/top`、`/api/nav/sidebar`
3. 后端返回结构和当前 JSON 不一致 → 在 composable 的 `transform` 里映射，例如：
   ```ts
   transform: (raw: any) => ({
     title: raw.data.systemName,        // 后端把 title 叫 systemName
     subtitle: raw.data.description,
     // ...
   })
   ```
4. 业务页面 / 组件不需要改动

### 还没做（下一轮再来）

- [ ] 接 shadcn-vue 组件（替换当前手写 Tailwind 占位）
- [ ] i18n（当前 UI 微文案如"查询/重置"是硬编码）
- [ ] Pinia store（当前不需要全局状态）
- [ ] 把 catch-all 占位页按业务拆成独立 page
- [ ] Playwright 截图 / a11y / 性能审计
