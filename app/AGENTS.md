# AGENTS.md — Vue 项目（Codex CLI / OpenCode 用）

> Codex CLI 和 OpenCode 都默认读 `AGENTS.md`。
> 本文件内容与 [CLAUDE.md](CLAUDE.md) 基本一致 — 你也可以在 CLAUDE.md 里只写 `@AGENTS.md` 引用，让两边共用一份源。

## 项目快照

- **Nuxt 4** + Vite 7 + Vue 3 Composition API
- **TypeScript 5.6+** strict
- **Pinia 3** setup store（**禁止 options store**）
- UI：**shadcn-vue + Reka UI + Tailwind v4**（CSS-first `@theme`）
- 工具集：**VueUse** 优先
- 动画：**Motion for Vue** (`motion-v`)
- 校验：**Zod 4**，表单：**VeeValidate 4**
- 测试：**Vitest 3** + **@vue/test-utils**，E2E：**Playwright**
- HTTP：Nuxt `$fetch` / `useFetch`（**禁止 Axios**）

## 启动 / 构建 / 测试命令

```bash
pnpm install
pnpm dev           # 本地开发
pnpm build         # 生产构建
pnpm preview       # 预览
pnpm typecheck     # tsc --noEmit
pnpm lint          # ESLint
pnpm lint:fix
pnpm test          # Vitest
pnpm test:e2e      # Playwright
```

## 不要做

- ❌ 引入 Vuex / Element Plus / Ant Design Vue
- ❌ 写 `tailwind.config.{js,ts}`，用 v4 的 CSS `@theme`
- ❌ 用 Inter / Roboto / Arial / Helvetica 作正文字体
- ❌ 在组件里写 `axios` / `fetch` 原生调用，统一走 `$fetch`
- ❌ 在 store 里写 mutations（Pinia 没有这个概念）
- ❌ 提交未通过 `pnpm typecheck && pnpm lint && pnpm test` 的代码

## 必须做

- ✅ 写新组件前，先用"规约表"格式输出 props / emits / slots
- ✅ Server API 用 Zod 校验，错误形状 `{ error: string; code: string }`
- ✅ 异步函数显式返回类型
- ✅ 命名导出（除 Nuxt 必须 default 的 page / middleware）
- ✅ composable 用 `use` 开头，单一职责

## 目录约定（与 CLAUDE.md 同步）

```
app/{pages,layouts,components/{ui,feature},composables,stores,server,assets/css}
tests/{unit,e2e}
```

## 我们对 Codex / OpenCode 的特别要求

### Codex CLI

- Codex 会把项目根 / 子目录的所有 `AGENTS.md` 合并加载，靠近 cwd 的优先级更高
- 子包想覆盖根 AGENTS.md 的某条规则，在 `packages/xxx/AGENTS.md` 里写就行
- 临时全局覆盖：`~/.codex/AGENTS.override.md`

### OpenCode

- `/init` 命令可以扫一遍仓库自动更新本文件 — 但提交前要人工审一遍
- 自定义命令放在 `.opencode/commands/`，比如 `.opencode/commands/new-component.md`
- 见项目下 `.opencode/` 目录

## 引用 / 进一步阅读

- 详细的组件规约模板：[skills/component-spec/SKILL.md](skills/component-spec/SKILL.md)
- 详细的样式设计准则：[skills/frontend-design/SKILL.md](../skills/frontend-design/SKILL.md)
- shadcn-vue 当前已复制的组件清单：`app/components/ui/`
