# 提问记录（PROMPT LOG）

> 用于回溯：每条记录一次用户提问、当时的项目状态、关键决策、产出物。
> **时间倒序**（最新在最上面）。

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
