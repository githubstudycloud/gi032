# CLAUDE.md — Vue 项目（Nuxt 4 + Pinia 3 + shadcn-vue + Tailwind v4）

> 把这份文件放在项目根目录。Claude Code 启动时会自动加载。
> 这是"硬规则 + 必备上下文"，不写流程；流程都在 `.claude/skills/` 里。

## 项目快照

- 框架：Nuxt 4（Vite 7, Vue 3 with Composition API, Vue Vapor Mode 关闭，等正式版）
- 语言：TypeScript 5.6+，`strict: true`，禁止 `any` 除非有注释解释
- 状态：Pinia 3，**只用 setup store** 写法
- UI：shadcn-vue（源码在 `app/components/ui/`）+ Reka UI primitives + Tailwind CSS v4（CSS-first @theme）
- 工具：VueUse —— 在你想写工具函数之前，**先 grep VueUse 有没有**
- 动画：Motion for Vue（`motion-v` 包），不要用 `@vue/transition` 写复杂动画
- 表单：VeeValidate 4 + Zod 4
- HTTP：Nuxt 的 `$fetch` / `useFetch` / `useAsyncData`，**不要用 Axios**
- 测试：Vitest 3 + @vue/test-utils（unit），Playwright（e2e）

## 绝对禁止

- ❌ Options API（除非维护 < Vue 3 的老代码）
- ❌ Vuex
- ❌ Pinia options store 写法 — 一律 setup store
- ❌ 引入 Element Plus / Ant Design Vue 之类的传统组件库 — 我们用 shadcn-vue
- ❌ 写新的 `tailwind.config.js`（v4 已经迁移到 CSS `@theme`）
- ❌ 自己手撸 `useFetch` / `useDebounce` 等 — VueUse 已有
- ❌ Inter / Roboto / Arial / Helvetica / Space Grotesk 作为正文字体 — AI slop 的标志
- ❌ 紫色到粉色的渐变（`from-purple-500 to-pink-500`）— 同上
- ❌ 默认导出（`export default`）— 除非框架要求（如 Nuxt page、middleware），其它一律命名导出

## 强制做法

- ✅ 所有异步函数返回类型显式标注
- ✅ 所有 props / emits / slots 显式声明 + TS 类型
- ✅ 错误处理使用 `try/catch` 包装，错误形状统一 `{ error: string; code: string }`
- ✅ Server Routes 用 Zod schema 校验请求体，失败返回 400 + `{ error, code, issues }`
- ✅ 用户可见文本走 i18n（`useI18n()`），不写硬编码中英文
- ✅ 组件名 PascalCase，文件名 kebab-case 或 PascalCase（保持一致即可，但 shadcn-vue 出来的是 PascalCase）
- ✅ composable 命名以 `use` 开头，返回 `{ ... }` 对象，单一职责
- ✅ Pinia store 命名 `useXxxStore`，导出在 `stores/` 目录下

## 目录约定

```
app/
├── pages/              # Nuxt 路由（不写 index.vue 之外的 layout 逻辑）
├── layouts/            # 布局 SFC
├── components/
│   ├── ui/             # shadcn-vue 复制源码进来（不要手改命名空间）
│   └── feature/        # 业务组件，按功能分包（Dashboard/、Profile/）
├── composables/        # use-xxx.ts，自动 import
├── stores/             # useXxxStore.ts，自动 import
├── server/
│   ├── api/            # /api/xxx.post.ts 等
│   └── utils/          # server 端工具
└── assets/css/main.css # Tailwind v4 @theme 入口
```

## Tailwind v4 写法约定

- 主题 token 全部在 `assets/css/main.css` 用 `@theme` 声明
- 不要写 `tailwind.config.{js,ts}`
- 颜色用 **OKLCH**（不是 hex / hsl），便于色彩空间一致

示例：

```css
/* assets/css/main.css */
@import "tailwindcss";

@theme {
  --color-brand-50: oklch(0.98 0.02 230);
  --color-brand-500: oklch(0.65 0.18 230);
  --color-brand-900: oklch(0.28 0.10 230);
  --font-display: "Fraunces", "Source Han Serif SC", serif;
  --font-body: "InterDisplay", "Noto Sans SC", system-ui;
  --radius-lg: 0.875rem;
}
```

## 我们的"组件三步走"

任何新组件，AI 必须按这个顺序输出：

1. **规约表**：props / emits / slots / 内部状态 / 外部依赖
2. **示例用法**：在哪个 page 用、给什么数据
3. **代码实现**：SFC 全文

如果跳过 1、2 直接写 3 — 我会让你重来。

## 引用其他文件

- 设计风格细则：`.claude/skills/frontend-design/SKILL.md`（如果装了官方 frontend-design）
- 详细的 shadcn-vue 组件清单：见 `app/components/ui/` 实际文件
- API schema 约定：`docs/api-conventions.md`
- **提问历史 / 决策记录**：`PROMPT-LOG.md` —— 每次开新对话前先翻一下，了解上次做了什么；本轮接到新提问后追加一条（**时间倒序**），格式见文件头。

## MCP 与 Skills

MCP（如果你装了）：
- `playwright` — 改完 UI 你必须自己截图看一眼
- `chrome-devtools` — 性能 / 网络问题用它
- `context7` — 不确定 API 时先查文档，不要凭记忆写

项目内 Skills（启动 Claude Code 后自动加载，共 9 个）：

自有：
- `component-spec` — 写组件前先输出"规约表"
- `new-vue-component` — `/new-vue-component <Name>` 脚手架
- `pinia-store` — Pinia 3 setup store 模板
- `composable-spec` — composable 命名 + 清理规范
- `a11y-vue` — `/a11y-vue <file>` 无障碍检查
- `frontend-design` — 强制做出审美选择
- `a11y-check` / `perf-budget` — 通用审计

第三方（vendored）：
- `vue-best-practices` — Vue 3 五步工作流 + 23 个 reference 详情。
  来源 [hyf0/vue-skills](https://github.com/hyf0/vue-skills)（MIT，社区主流，作者意图未来归 Vue 官方）。
  涉及 `.vue` 文件 / Vue Router / Pinia / Vite + Vue 时**优先参考它**；
  与本 CLAUDE.md 冲突时**以 CLAUDE.md 为准**。

## 已踩过的坑（本机 Windows + Node 24 专项）

- Nuxt 4.4 + Node 24 在 Windows 上：`nuxt dev` 只绑 IPv6 `::1`、Nitro dev worker SSR `$fetch` 触发 OOM。本项目用 `devServer.host='127.0.0.1'` + `useDataSource` 内部 `useAsyncData({ server: false })` 绕开。要恢复 SSR 取数据，先切 Node 22 LTS。
- Nuxt 4 默认对 `components/<dir>/Foo.vue` 加目录前缀（`<DirFoo/>`）。本项目用 `components: [{ path: '~/components', pathPrefix: false }]` 走扁平命名，模板里直接 `<Foo/>`。
- 用户不在本机 git config 里写 user.name / user.email。提交时 Claude 用 `git -c user.name="John" -c user.email="vickroytoshiko@gmail.com" commit ...` 一次性覆盖。

## 提交前自检

- [ ] `pnpm typecheck` 全过
- [ ] `pnpm test` 全过
- [ ] `pnpm lint` 全过
- [ ] 改 UI 的话，跑一次 Playwright 截图
- [ ] commit 信息中文，遵循 conventional commits（`feat:`、`fix:`、`refactor:`…）
