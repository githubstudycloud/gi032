# 第 3 章 · React 专线

## 一、推荐栈（2026-05）

| 层 | 选择 | 备选 |
|---|---|---|
| 元框架 | **Next.js 15**（App Router + RSC）或 **TanStack Start** | Astro 5、Vite + React SPA、Remix → React Router v7 |
| 构建 | **Vite 7**（非 Next） / Next 自带 turbopack | Bun bundler |
| 路由 | App Router（Next）/ **TanStack Router** | React Router v7 |
| 状态 | **Zustand** + **TanStack Query** | Jotai、Redux Toolkit |
| UI | **shadcn/ui + Radix UI + Tailwind v4** | HeroUI、Mantine、Park UI |
| 表单 | **TanStack Form + Zod 4** | React Hook Form + Zod |
| 动画 | **Motion**（前 Framer Motion） | AutoAnimate |
| 数据 | TanStack Query / Server Actions | tRPC、SWR |
| 富文本 | **TipTap 2** | Lexical |
| 测试 | **Vitest 3 + Testing Library** | Jest（老项目） |
| E2E | **Playwright** | Cypress |
| 语言 | **TypeScript 5.6+** strict | — |

## 二、为什么是这套

### Next.js 15 vs TanStack Start vs Vite SPA

- **Next.js 15**：当 SEO 重要、要 Server Components / Server Actions、生态最广 → 落地页、电商、文档站
- **TanStack Start**：要全栈但讨厌 Next 的"重和绑 Vercel"，要类型安全到极致 → Dashboard、中后台 SaaS
- **Vite + React SPA**：纯后台 / 内部工具，不需要 SSR → 工具站

> 2026 数据：80% 开发者用过 Next.js，但负面情感 17%（最高），TanStack Start 增长最快。

### shadcn/ui — AI 时代王者

- 104k+ Star，560k+ 周下载
- 不通过 npm 装：`npx shadcn@latest add button` → 源码进项目
- 底层 Radix UI（无头 + 无障碍）+ Tailwind v4
- **AI 能直接读组件源码并按你的需求改** — 这是它统治 AI 编程时代的原因

### TanStack Query 而非自己 fetch

- 缓存、重试、乐观更新、刷焦点重 fetch、SSR hydration — 都给你
- 68% 用过，42% 正面情感（行业最高）
- React Compiler 时代不再需要 useMemo / useCallback 优化，TanStack 内部已经做了

### React Compiler 已稳定

- Next.js 15 默认开启
- 写代码**不再加大量 `useMemo` / `useCallback`** — 编译器搞定
- AI 提示词里要写："不要加手动 memo，React Compiler 已经处理"

## 三、新项目脚手架

### 选项 A：Next.js 15

```bash
npx create-next-app@latest my-app --typescript --tailwind --app --eslint
cd my-app

# shadcn/ui（必装）
npx shadcn@latest init

# 必要库
npm i zustand @tanstack/react-query @tanstack/react-form zod motion
npm i -D vitest @vitejs/plugin-react @testing-library/react @playwright/test
```

### 选项 B：TanStack Start

```bash
npx create-start-app@latest my-app
cd my-app
npx shadcn@latest init
npm i zustand @tanstack/react-query motion
```

### 选项 C：Vite + React SPA

```bash
npm create vite@latest my-app -- --template react-ts
cd my-app
npm i tailwindcss@next @tailwindcss/vite
npx shadcn@latest init
npm i zustand @tanstack/react-query @tanstack/react-router motion
```

## 四、典型目录结构

### Next.js App Router 版

```
my-app/
├── CLAUDE.md
├── AGENTS.md
├── .cursor/rules/                 # MDC 规则
├── .claude/skills/                # Skills
├── app/
│   ├── (marketing)/               # 路由组
│   │   └── page.tsx
│   ├── (app)/
│   │   ├── dashboard/page.tsx
│   │   └── layout.tsx
│   ├── api/
│   │   └── users/route.ts         # Route Handler
│   ├── globals.css                # Tailwind v4 @theme 入口
│   └── layout.tsx
├── components/
│   ├── ui/                        # shadcn/ui 复制源码
│   └── feature/                   # 业务组件
├── lib/                           # 工具函数 / 服务端 utils
├── hooks/                         # 自定义 hook
├── stores/                        # Zustand
├── types/                         # 全局类型
├── tests/{unit,e2e}/
└── next.config.ts
```

### TanStack Start 版

```
my-app/
├── app/
│   ├── routes/                    # 文件路由
│   ├── components/
│   │   ├── ui/
│   │   └── feature/
│   ├── server/                    # server functions
│   ├── lib/
│   └── styles/app.css
├── package.json
└── app.config.ts
```

## 五、AI 协作配置（直接拷的）

- [CLAUDE.md](CLAUDE.md)
- [AGENTS.md](AGENTS.md)
- [.cursor/rules/](.cursor/rules/)
- [skills/](skills/)

## 六、提示词速查

### 让 AI 写组件

```
按 CLAUDE.md 的约定，做一个 <UserProfileCard> 组件：
- 在 components/feature/user/ 下
- 用 shadcn/ui 的 Card / Avatar / Button
- 数据来自 TanStack Query useUser(userId)
- 加载用 <Skeleton>，错误用 <ErrorState>
- 动画用 Motion（淡入 + 上推 8px）

要求：先输出"规约表"（props / 数据依赖 / 状态 / 边界 case），确认后再生成代码。
不要加 useMemo / useCallback — React Compiler 已经在。
```

### 让 AI 做表单

```
做一个 <RegisterForm>：
- TanStack Form + Zod 4 schema
- shadcn/ui 的 Form / Input / Button / FormMessage
- 提交后调用 server action `registerUser`
- 成功后 router.push('/welcome')
- 错误用 Sonner toast

先输出 Zod schema + TanStack Form 字段表，再写组件。
```

### 让 AI 改 server state

```
我要在 dashboard 加一个"删除用户"功能。
- 用 Server Action `deleteUser(id)`，调用前 confirm
- TanStack Query mutation：onSuccess 失效 ['users'] 缓存
- Optimistic update：删除前先从 list 移除，失败再 rollback
- toast 成功 / 失败

先输出 Action 函数签名 + Mutation hook 返回值，再写。
```

### 让 AI 检查性能

```
启动 chrome-devtools MCP：
1. 跑 lighthouse audit http://localhost:3000
2. 抓 5 秒 performance trace
3. 找出 LCP > 2.5s / CLS > 0.1 / TBT > 200ms 的原因
4. 给出修复建议（注意 React Compiler 已经在）
```

下一步：

→ [CLAUDE.md 模板](CLAUDE.md)
→ [React Skills](skills/)
→ 回去看 [Vue 篇](../vue/README.md)
