# 第 2 章 · Vue 专线

## 一、推荐栈（2026-05）

| 层 | 选择 | 备选 |
|---|---|---|
| 元框架 | **Nuxt 4** | Vite + Vue Router 4 SPA、Astro + Vue |
| 构建 | **Vite 7** | — |
| 路由 | Vue Router 4（Nuxt 内置） | unplugin-vue-router |
| 状态 | **Pinia 3**（setup store） | VueUse 的 `createGlobalState` |
| UI | **shadcn-vue + Reka UI + Tailwind v4** | Nuxt UI（同样基于 Reka UI）、PrimeVue、Element Plus |
| 工具 | **VueUse**（200+ composables） | — |
| 动画 | **Motion for Vue**（`motion-v`） | `@vueuse/motion`、AutoAnimate |
| 表单 | **VeeValidate 4 + Zod 4** 或 **Formkit 1.7** | — |
| HTTP | **ofetch**（Nuxt 内置）/ `$fetch` | Axios（不推荐新项目） |
| 测试 | **Vitest 3 + @vue/test-utils** | — |
| E2E | **Playwright** | Cypress |
| 富文本 | **TipTap 2**（with Vue 3 adapter） | — |
| 语言 | **TypeScript 5.6+** strict | — |

## 二、为什么是这套

### Nuxt 4 vs Vite + Vue Router

- **Nuxt 4**：SSR / SSG / 路由约定 / Auto-import / Server Routes 一站式 — 新项目 80% 应该选它
- **Vite + Vue + Vue Router**：只做后台 / 内部工具时用，省事
- **Vue Vapor Mode** 已经在 Nuxt 4.x 的 experimental 里，2026 H2 正式可用

### shadcn-vue 的核心价值（AI 时代）

- 不通过 npm 装，用 CLI 把**源码 copy 到你项目里**
- AI 能直接读组件实现 → 改组件、改主题、加 variant 都靠谱
- 底层是 Reka UI（前 Radix Vue 改名）+ Tailwind v4 → 无障碍 + 主题切换免费拿
- 周下载增长曲线肉眼可见，2026 年 Q2 已经 9.8k+ Star

### Pinia 3 setup store 写法

不是命令式 mutations，而是直接用 Composition API：

```ts
// stores/user.ts
import { defineStore } from 'pinia'

export const useUserStore = defineStore('user', () => {
  const name = ref('')
  const isLoggedIn = computed(() => name.value.length > 0)

  async function login(credentials: LoginPayload) {
    const data = await $fetch('/api/auth/login', { method: 'POST', body: credentials })
    name.value = data.name
  }

  return { name, isLoggedIn, login }
})
```

AI 提示词里说"用 Pinia 3 setup store 写法"，它就不会再吐 options store。

## 三、新项目脚手架（推荐命令）

```bash
# 1. 创建 Nuxt 4 项目
npx nuxi@latest init my-app
cd my-app

# 2. 装核心依赖
npm i @pinia/nuxt @vueuse/nuxt zod
npm i -D @nuxt/eslint @nuxt/test-utils vitest @vue/test-utils @playwright/test

# 3. 装 shadcn-vue（注意：这会改你的项目，不是 npm install）
npx shadcn-vue@latest init

# 4. 装动画
npm i motion-v

# 5. 初始化 Tailwind v4
npm i tailwindcss@next @tailwindcss/vite
```

## 四、典型目录结构（AI 协作友好版）

```
my-app/
├── CLAUDE.md                       # 见本目录下的模板
├── AGENTS.md                       # Codex / OpenCode 用，可与 CLAUDE.md 互引
├── .cursor/
│   └── rules/                      # Cursor 用，见本目录
│       ├── 001-base.mdc
│       ├── 010-vue.mdc
│       └── 020-shadcn-vue.mdc
├── .claude/
│   └── skills/
│       ├── new-component/
│       └── component-spec/
├── .trae/
│   └── rules/
│       └── project_rules.md        # Trae 用
├── app/
│   ├── pages/                      # 路由（Nuxt 自动）
│   ├── components/
│   │   ├── ui/                     # shadcn-vue 复制进来的组件
│   │   └── feature/                # 业务组件，按 feature 分包
│   ├── composables/                # 共享 composable
│   ├── stores/                     # Pinia
│   ├── server/                     # Nuxt server routes
│   └── assets/css/main.css         # Tailwind v4 @theme 入口
├── tests/
│   ├── unit/                       # Vitest
│   └── e2e/                        # Playwright
└── nuxt.config.ts
```

## 五、可复制的 AI 协作配置

下面三份文件，**任选你用的工具，整段拷到项目根目录**：

- [CLAUDE.md](CLAUDE.md) — Claude Code 用
- [AGENTS.md](AGENTS.md) — Codex CLI、OpenCode 用
- [.cursor/rules/](.cursor/rules/) — Cursor 用

Skills 在 [skills/](skills/) 目录下：

- `new-vue-component/` — 一键脚手架新组件
- `component-spec/` — 写组件前先输出规约
- `pinia-store/` — 标准 Pinia store 模板
- `composable-spec/` — composable 命名 + 返回值规范
- `a11y-vue/` — Vue 专属无障碍检查

## 六、AI 提示词速查（直接复制）

### 让 AI 写组件

```
按照项目 CLAUDE.md / AGENTS.md 的约定，给我做一个 LoginForm 组件：
- 使用 shadcn-vue 的 Form / Input / Button 原语
- VeeValidate 4 + Zod 4 校验
- Pinia useAuthStore 提交
- Motion for Vue 做错误提示进入动画

要求：先输出"组件规约表"（props / emits / slots / 依赖 / 状态），等我确认后再写代码。
```

### 让 AI 做主题

```
启动 frontend-design skill，从下面 5 个方向里挑 1 个：
brutalist / editorial / glassmorphism / solarpunk / dark-luxury

然后输出：
1. 字体配对（标题 + 正文，禁用 Inter/Roboto/Arial）
2. OKLCH 主色调（含 dark mode）
3. 阴影 / 圆角 token
4. 在 assets/css/main.css 用 Tailwind v4 @theme 语法落地
```

### 让 AI 重构

```
打开 src/components/feature/Dashboard/ 下所有 .vue 文件，
- 把 Vuex / options API 改成 Pinia setup store + Composition API
- 提取重复逻辑成 composables，放 app/composables/use-xxx.ts
- 用 shadcn-vue 组件替换手写 div
- 加无障碍属性，跑一遍 a11y-vue skill 检查

每改一个文件后给我列出变更点，等我 ok 再改下一个。
```

### 让 AI 调试 UI

```
启动 playwright MCP，
1. 打开 http://localhost:3000/login
2. 截图发我
3. 跑 lighthouse audit，告诉我 Performance / Accessibility / SEO 分数
4. 把 Performance < 90 的项一一列出修复方案
```

下一步：

→ 看 [CLAUDE.md 模板](CLAUDE.md)
→ 看 [Vue 专属 Skills](skills/)
→ 切到 [React 篇](../react/README.md)
