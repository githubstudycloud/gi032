# AGENTS.md — React 项目（Codex CLI / OpenCode 用）

> 与 [CLAUDE.md](CLAUDE.md) 同源。也可以让 CLAUDE.md 仅写 `@AGENTS.md` 引用。

## 项目快照

- **Next.js 15**（App Router + RSC）/ TanStack Start / Vite + React SPA
- **TypeScript 5.6+** strict
- **React 19+**，**Server Component 默认**
- **React Compiler 已启用** — 不手动 memo
- UI：**shadcn/ui + Radix UI + Tailwind v4**
- 数据：**TanStack Query** + Server Actions
- 全局 client state：**Zustand**
- 表单：**TanStack Form + Zod 4**
- 动画：**Motion**（`motion/react`）
- 测试：**Vitest 3** + **Testing Library**，E2E：**Playwright**
- 富文本：**TipTap 2**
- HTTP：**fetch / ofetch**（**禁止 Axios**）

## 命令

```bash
pnpm install
pnpm dev           # 本地开发
pnpm build         # 生产构建
pnpm start         # 启动生产服务
pnpm typecheck     # tsc --noEmit
pnpm lint
pnpm lint:fix
pnpm test          # Vitest
pnpm test:e2e      # Playwright
```

## 不要做

- ❌ Class 组件、Redux（新代码）、Axios、MUI / Ant Design / Chakra
- ❌ 手动 `useMemo` / `useCallback` 包一切（React Compiler 已处理）
- ❌ `tailwind.config.{js,ts}`（v4 CSS `@theme`）
- ❌ Inter / Roboto / Arial / Helvetica 作正文字体
- ❌ `from-purple-500 to-pink-500` 类 AI slop 渐变
- ❌ 在 Server Component 里用 `useState` / `useEffect` —— 加 `'use client'`
- ❌ 在 Client Component 里直接 `import { db }`（DB 操作只能在 server 文件 / action）

## 必须做

- ✅ Server Component 默认，需要交互才 `'use client'`
- ✅ Server Action 用 `'use server'` + Zod 校验
- ✅ TanStack Query 用 `queryOptions()` 工厂模式
- ✅ 命名导出（除 Next 要求 default 的 page / layout / route）
- ✅ 异步函数显式返回类型
- ✅ 错误形状 `{ error: string; code: string }`
- ✅ i18n 化用户可见文本

## 目录约定

```
app/{(marketing),(app),api}/
components/{ui,feature}/
lib/  hooks/  stores/  types/
tests/{unit,e2e}/
```

## 工具差异化建议

### Codex CLI

- Codex 从 git root 走到 cwd 合并所有 `AGENTS.md`
- 想覆盖根规则：在子包 `packages/xxx/AGENTS.md` 写
- 临时全局：`~/.codex/AGENTS.override.md`

### OpenCode

- `/init` 扫仓库自动生成 AGENTS.md（提交前人工审）
- 自定义命令：`.opencode/commands/*.md`
- 全局规则：`~/.config/opencode/AGENTS.md`

## 进一步阅读

- 组件规约模板：[skills/component-spec/SKILL.md](skills/component-spec/SKILL.md)
- 设计准则：[../skills/frontend-design/SKILL.md](../skills/frontend-design/SKILL.md)
- TanStack Query 模板：[skills/tanstack-query/SKILL.md](skills/tanstack-query/SKILL.md)
- Server Actions 模板：[skills/server-actions/SKILL.md](skills/server-actions/SKILL.md)
