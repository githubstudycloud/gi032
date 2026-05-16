# CLAUDE.md — React 项目（Next.js 15 / TanStack Start + shadcn/ui + Tailwind v4）

> 项目根目录放这一份。这是"硬规则"，详细流程在 `.claude/skills/`。

## 项目快照

- 框架：Next.js 15（App Router）/ TanStack Start / Vite + React SPA（视项目而定）
- 语言：TypeScript 5.6+，`strict: true`，禁止 `any` 除非有注释
- React：19+，**默认 Server Component**，需要交互才 `'use client'`
- **React Compiler 已启用** — 不要手动加 `useMemo` / `useCallback`
- UI：shadcn/ui（源码在 `components/ui/`）+ Radix UI + Tailwind v4（CSS-first @theme）
- 数据：TanStack Query（client state）+ Server Actions / Route Handlers（server state）
- 全局 client state：Zustand
- 表单：TanStack Form + Zod 4
- 动画：Motion（`motion/react`，不是旧的 framer-motion）
- 测试：Vitest 3 + Testing Library，E2E：Playwright
- 富文本：TipTap 2

## 绝对禁止

- ❌ Class 组件（除非维护老代码）
- ❌ Redux（除非项目早就在用）— 新代码用 Zustand
- ❌ Axios — 用 fetch / ofetch
- ❌ 手动 `useMemo` / `useCallback` 包一切 — React Compiler 处理
- ❌ MUI / Ant Design / Chakra 之类的"npm 装"型 — 用 shadcn/ui
- ❌ `tailwind.config.{js,ts}`（Tailwind v4 已迁移到 CSS `@theme`）
- ❌ Inter / Roboto / Arial / Helvetica / Space Grotesk 作正文字体
- ❌ `bg-gradient-to-r from-purple-500 to-pink-500` 这种 AI slop 渐变
- ❌ Default export（除非框架要求 — Next page、route handler、middleware）

## 强制做法

- ✅ Server Component 默认；只在需要 useState / useEffect / 浏览器 API 时 `'use client'`
- ✅ Server Action 用 `'use server'`，输入用 Zod 校验
- ✅ TanStack Query 用 `queryOptions()` 工厂模式定义查询，避免 key 拼写错
- ✅ 全局 store 切片化（Zustand `combine` 或多 store）
- ✅ 组件命名 PascalCase，文件名与组件名一致（PascalCase）
- ✅ hook 命名 `useXxx`
- ✅ 所有异步函数显式返回类型
- ✅ 错误形状统一 `{ error: string; code: string }`
- ✅ 用户可见文本走 i18n（next-intl 或 Lingui），不写硬编码中英文

## 目录约定（Next 版）

```
app/
├── (marketing)/           # 路由组
├── (app)/                 # 登录后区域
├── api/                   # Route handlers
├── globals.css            # Tailwind v4 @theme
└── layout.tsx
components/{ui,feature}/
lib/                       # 服务端 utils（auth、db、actions）
hooks/                     # 客户端 hook
stores/                    # Zustand
types/
tests/{unit,e2e}/
```

## Tailwind v4 写法

```css
/* app/globals.css */
@import "tailwindcss";

@theme {
  --color-brand-50: oklch(0.98 0.02 230);
  --color-brand-500: oklch(0.65 0.18 230);
  --color-brand-900: oklch(0.28 0.10 230);

  --font-display: "Fraunces", "Source Han Serif SC", serif;
  --font-body: "Geist", "Noto Sans SC", system-ui;
  --font-mono: "Geist Mono", "JetBrains Mono", monospace;

  --radius-lg: 0.875rem;
  --shadow-lift: 0 8px 30px rgb(0 0 0 / 0.08);
}

@layer base {
  body { @apply bg-background text-foreground font-body antialiased; }
}
```

## "组件三步走"

任何新组件，AI 必须按此顺序输出：

1. **规约表**（props / 数据依赖 / 状态 / 边界 case / 无障碍要点）
2. **示例用法**（在哪个页面用、传什么数据）
3. **代码实现**（完整文件）

跳过 1 / 2 直接写代码 → 重来。

## Server Component / Client Component 边界

```tsx
// app/dashboard/page.tsx —— Server Component（默认）
export default async function DashboardPage() {
  const data = await getUsers()    // 直接 await，不需要 useEffect
  return <UsersList initial={data} />
}

// components/feature/UsersList.tsx —— 仅在需要交互才 'use client'
'use client'
import { useQuery } from '@tanstack/react-query'
export function UsersList({ initial }) {
  const { data } = useQuery({ queryKey: ['users'], initialData: initial })
  // ...
}
```

## MCP 与 Skills

启用了：
- `playwright` MCP — 改完 UI 自己截图看
- `chrome-devtools` MCP — 性能分析
- `context7` MCP — 不确定 API 时拉文档
- `.claude/skills/new-react-component/` — `/new-react-component Name`
- `.claude/skills/tanstack-query/` — 标准 useQuery / useMutation 写法
- `.claude/skills/server-actions/` — Server Action 模板 + 校验
- `.claude/skills/a11y-react/` — 无障碍审计

## 提交前自检

- [ ] `pnpm typecheck` 全过
- [ ] `pnpm test` 全过
- [ ] `pnpm lint` 全过
- [ ] 改 UI 跑 Playwright 截图 / Lighthouse ≥ 95
- [ ] commit 信息 conventional commits 格式（中文）
