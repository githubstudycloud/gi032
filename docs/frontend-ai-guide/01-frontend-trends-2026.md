# 第 1 章 · 2026 年前端生态趋势速览

> 数据来源：2025 JavaScript Rising Stars、This Week In React、Vue School 年度报告、State of JS 2025、GitHub Trending（截至 2026-05）

## 总览：一张图看懂"AI 时代的前端栈"

```
                         ┌──────────────────────┐
                         │      框架（Meta）     │
                Vue 侧   │   ─── Nuxt 4 ───     │  React 侧
   ┌────────────────────┤   ─── Next.js 15 ──  ├────────────────────┐
   │                    │   ─── TanStack Start │                    │
   │  Vue 3 (Composition│   ─── Astro 5         │  React 19          │
   │  + Vapor Mode 来了)│                       │  (Server Components│
   │                    └──────────────────────┘   + Server Actions)│
   │                                                                 │
   │  状态：Pinia 3            构建：Vite 7              状态：Zustand│
   │  路由：Vue Router          运行：Bun / Node 22      路由：TanStack│
   │  工具：VueUse              测试：Vitest 3 + Playwright  Router  │
   │  UI：shadcn-vue / Nuxt UI                           UI：shadcn/ui│
   │       （底层 Reka UI）     CSS：Tailwind v4             HeroUI   │
   │  动画：Motion for Vue                                动画：Motion │
   │                            类型：TypeScript 5.6+    数据：TanStack│
   │                                                            Query│
   └─────────────────────────────────────────────────────────────────┘
                              ↓ AI 协作层 ↓
   ┌─────────────────────────────────────────────────────────────────┐
   │  Claude Code / Codex CLI / OpenCode / Cursor / Trae IDE         │
   │  + Skills + MCP (Playwright, Chrome DevTools, Context7, Figma)  │
   └─────────────────────────────────────────────────────────────────┘
```

## 一、共同的"地基级"变化

### 1.1 Vite 已经赢了

- Next.js 之外**几乎所有 React 项目都用 Vite**
- Vue 侧 Nuxt 4 / Vite 7 全面普及
- Vitest 已经在新项目里**替代 Jest**

### 1.2 Tailwind CSS v4 成为默认

- 移除 `tailwind.config.js`，改用 CSS-first `@theme` 写法
- shadcn/ui、shadcn-vue、Nuxt UI 全线适配 v4
- AI 写样式时**强制要求**："使用 Tailwind v4 CSS-first 语法，不要再生成 config.js"

### 1.3 shadcn 风格（复制源码）成为主流

不再"npm install 一个黑盒组件库"，而是 `npx shadcn add button` 把源码 copy 到你项目里。
**对 AI 协作的意义巨大**：AI 能直接读组件源码、改它、与之保持一致。

| 库 | 仓库 | GitHub Star | 周下载 |
|---|---|---|---|
| shadcn/ui (React) | shadcn-ui/ui | 104k+ | 560k+ |
| shadcn-vue | unovue/shadcn-vue | 9.8k+ | 增长中 |
| Reka UI (Vue 无头) | unovue/reka-ui | 6.1k+ | 590k+ |
| Radix UI (React 无头) | radix-ui/primitives | 16k+ | 700k+ |

### 1.4 TanStack 在 React 生态"吃饭"

> "TanStack Is Eating React's Ecosystem" — DEV Community 2026 年初

| 包 | 用途 | 使用率 |
|---|---|---|
| TanStack Query | 服务端状态 | 68%（正面情感 42%） |
| TanStack Router | 类型安全路由 | 增长最快 |
| TanStack Start | Next.js 替代品（SSR + 流式） | 新晋黑马 |
| TanStack Table | 表格 | 事实标准 |
| TanStack Form | 表单 | 上升中 |

### 1.5 Motion（原 Framer Motion）一统动画江湖

- React：`motion/react`
- Vue：`motion-v`（同一团队 / 同款 API）

写动画提示词只需说"用 Motion 库"，AI 在两个栈下产出的代码几乎对称。

## 二、Vue 侧 2026 关键变化

### 2.1 Vapor Mode 终于要落地

> "Vapor Mode 将是 2026 年最大的性能杀器" — Vue School 年度报告

- 跳过虚拟 DOM，编译期生成命令式代码
- 包体更小、内存更省、渲染更快
- 与现有 Vue 3 SFC 兼容，逐组件开启

**对 AI 协作的影响**：未来 Skill 里可以加 "对于纯展示组件，加 `vapor` 编译指令" 这种规则。

### 2.2 Pinia 3 完全替代 Vuex

| | Pinia 3 | Vuex (维护模式) |
|---|---|---|
| TS 推断 | 完整 | 弱 |
| Mutations | 移除 | 必须 |
| 写法 | Composition API 风 | Options API 风 |
| 周下载 | 2.5M+ | 不再增长 |

**AI 提示词**："状态管理使用 Pinia 3 的 setup store 写法，不要使用 options store 也不要使用 Vuex"。

### 2.3 VueUse 已成 Vue "标准库"

- 200+ 个 composables（`useFetch`、`useDark`、`useStorage`、`useEventListener`…）
- 周下载 ≈ 1.7M
- AI 给 Vue 项目写"工具函数"时**第一选择应该是 VueUse 已有的**，避免重复造轮子。

### 2.4 UI 库对比（2026 现状）

| 库 | 风格 | 安装方式 | AI 友好度 |
|---|---|---|---|
| **shadcn-vue** | 复制源码 + Tailwind | CLI `npx shadcn-vue add` | ★★★★★ |
| **Nuxt UI** | npm 安装 + Reka UI | `npm i @nuxt/ui` | ★★★★ |
| **PrimeVue** | 传统组件库 | npm | ★★★ |
| **Vuetify** | Material Design | npm | ★★★ |
| **Element Plus** | 国内企业 | npm | ★★★ |

**新项目首选 shadcn-vue**：源码在你项目里，AI 能直接读改。

## 三、React 侧 2026 关键变化

### 3.1 框架"三足鼎立"

| 框架 | 使用率 | 评价 | 适用 |
|---|---|---|---|
| **Next.js 15** | 80% 用过，17% 负面 | "太重 + 太绑 Vercel" | 大型 SEO 站、电商 |
| **TanStack Start** | 增长最猛 | "Next 的精简替代" | 中型 App、Dashboard |
| **Astro 5** | 内容站王者 | 多框架支持 | 博客、文档、营销页 |
| **React Router v7（前 Remix）** | 老牌 | 路由优先 | SPA、迁移项目 |
| **Vite + React 纯 SPA** | 仍然大量 | 简单粗暴 | 后台、内部工具 |

### 3.2 服务端组件（RSC）/ Server Actions 普及

- 默认服务端组件，需要交互再 `'use client'`
- 数据获取从 REST API 转向 **Server Actions + 类型化 RPC**
- 但是 State of React 2025 调查显示对 RSC **仍有疑虑**，理由是"太抽象、调试难"

### 3.3 React Compiler 进入主流

- 自动 memo 化，不再手写 `useMemo` / `useCallback`
- 已在 Next.js 15 default 开启

**对 AI 提示词的影响**：不再要求 AI 加大量手动 `useMemo`，反而要提醒它**别加**。

### 3.4 UI 库格局

| 库 | 风格 | 备注 |
|---|---|---|
| **shadcn/ui** | 复制源码 + Tailwind + Radix | 事实标准，AI 时代王者 |
| **HeroUI** (前 NextUI) | npm 安装 | 漂亮但黑盒 |
| **Mantine** | npm 安装 | 全功能，企业级 |
| **MUI** | npm 安装 | 老牌，但 AI 时代不香 |
| **Park UI** | 复制源码 + Ark UI | shadcn 风格的兄弟 |

### 3.5 关键工具表

| 类别 | 推荐 | 备选 |
|---|---|---|
| 构建 | Vite 7 | Bun + native bundler |
| 测试 | Vitest 3 + Testing Library | Jest（老项目） |
| E2E | Playwright | Cypress |
| 富文本 | TipTap | Lexical |
| 表单 | TanStack Form + Zod 4 | React Hook Form + Zod |
| 状态 | Zustand / TanStack Query | Redux Toolkit |
| 路由 | TanStack Router | React Router v7 |
| 图表 | Recharts / Visx | Chart.js |
| 国际化 | next-intl / Lingui | react-i18next |

## 四、AI 时代特有的趋势

### 4.1 MCP（Model Context Protocol）成为新基础设施

让 AI 拥有"工具手脚"，2026 年最火的 MCP Server：

| MCP Server | 解决什么 | Token 消耗 |
|---|---|---|
| **Playwright** | AI 用浏览器，看截图、点按钮、跑 E2E | ~5.3k tokens |
| **Chrome DevTools** | 性能 profiling、网络分析、DOM 检查 | ~5-6k tokens |
| **Context7** | 实时拉取 1000+ 库的最新文档 | ~2k tokens（按需） |
| **Figma Dev Mode** | 读 Figma 设计稿、读 token | ~3-4k tokens |
| **Storybook** | 读组件文档、跑可视化回归 | 变量 |

### 4.2 Skills 生态爆发

Anthropic 主导的 Agent Skills 开放标准，2026 年已经有这些热门 Skill：

| Skill | 仓库 / 安装 | 用途 |
|---|---|---|
| **frontend-design** | `anthropics/frontend-design`（65k+ Star） | 强制做出审美选择，禁用 Inter / Arial 等通用字体 |
| **Shadcnblocks-Skill** | `masonjames/Shadcnblocks-Skill` | 给 AI 2500+ 个 shadcn block 的知识 |
| **React Best Practices** | Vercel 出品 | 57 条规则，覆盖请求瀑布、bundle、re-render |
| **Composition Patterns** | 社区 | React 19+ 模式，复合组件、context |
| **UI/UX Pro Max** | `nextlevelbuilder/ui-ux-pro-max-skill` | 240+ 风格、127 字体配对 |
| **Taste Skill** | `Leonxlnx/taste-skill` | 可调"设计变化度、动效强度、视觉密度" |

### 4.3 "AI 友好"反过来影响库的设计

- 库的 README 现在会专门写 "AI 集成提示"
- shadcn 系成功的核心原因：**源码在用户项目里，AI 能读到**
- TipTap、TanStack 等大型库开始提供专门的 SKILL.md / llms.txt

### 4.4 Twitter 上 2026 年最火的几个声音

- **Evan You（Vue 作者）**：列出了 Vue 在 React 库上的"对照表" — Motion → Motion for Vue, Radix → Reka, shadcn → shadcn-vue, R3F → TresJS
- **Tanner Linsley（TanStack）**：TanStack Start 已经能跑 SSR + 流式 + 类型化 RPC
- **shadcn**：在重点推 Tailwind v4 适配 + MCP Server 直接装组件
- **OpenAI / Anthropic 双线**：AGENTS.md 已经成为"AI 项目标配文件"，类似 `.editorconfig`

## 五、本章小结：你在 2026 年选栈的"安全牌"

不管做什么项目，下面这套牌打出去都不会错：

### Vue 新项目

```
Nuxt 4 + Vite 7 + Pinia 3 + Vue Router 4
+ shadcn-vue（CLI 复制源码）+ Reka UI + Tailwind v4
+ VueUse + Motion for Vue
+ TypeScript 5.6+ + Vitest 3 + Playwright
+ Zod 4（校验）+ ofetch（请求）
```

### React 新项目

```
Next.js 15（SEO 重）/ TanStack Start（轻量）/ Vite + React SPA（后台）
+ shadcn/ui（CLI 复制源码）+ Radix UI + Tailwind v4
+ TanStack Query + Zustand
+ Motion + TanStack Form + Zod 4
+ TypeScript 5.6+ + Vitest 3 + Playwright
```

### 通用 AI 协作配置

```
CLAUDE.md / AGENTS.md（精简，≤300 行）
+ Skills：frontend-design + project-specific
+ MCP：Playwright + Chrome DevTools + Context7
+ .cursor/rules/（如果用 Cursor）
```

下一章我们详细讲 Skills 系统怎么用 → [02-skills-system.md](02-skills-system.md)
