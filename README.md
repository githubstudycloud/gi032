# gi032 — 2026 前端 + AI 编程助手 新手通关手册

> 仓库地址：https://github.com/githubstudycloud/gi032.git
> 适合：用 Vue / React 写前端，又想把 Claude Code / Codex / OpenCode / Cursor / Trae 这些 AI 工具用得"听话又出活"的同学。

## 这本手册要解决什么问题

很多人接触 AI 编程助手时遇到的不是"会不会用"的问题，而是：

- 让它写一个登录页，吐出来的总是 **Inter 字体 + 紫色渐变 + 一堆 div** 这种"AI slop"
- 项目里明明用的是 Pinia + shadcn-vue，AI 一上来就写 Vuex + 自己手撸组件
- 同一个 prompt，在 Claude Code 是一种行为，在 Cursor 又是另一种，根本无法稳定输出
- 各家工具的"规则文件"叫法都不一样：`CLAUDE.md` / `AGENTS.md` / `.cursorrules` / `user_rules.md`…到底放哪、写啥

这本手册的目标是：**给 Vue 和 React 各搭一套可以直接复制的、稳定输出现代风格的 AI 协作工程模板**，让你在任何主流 AI 编辑器里写出来的代码都符合 2026 年前端生态的最佳实践。

## 目录导航

### 第 0 章 · 上手准备

- [frontend-ai-guide/README.md](frontend-ai-guide/README.md) — 教程使用说明 + 全局心智模型

### 第 1 章 · 大势所趋（必读）

- [01-frontend-trends-2026.md](frontend-ai-guide/01-frontend-trends-2026.md) — 2026 年 Vue / React 生态趋势速览（含 Twitter、GitHub 数据）
- [02-skills-system.md](frontend-ai-guide/02-skills-system.md) — Skills 是什么？为什么它比 CLAUDE.md 更省 token

### 第 2 章 · Vue 专线

- [vue/README.md](frontend-ai-guide/vue/README.md) — Vue 2026 推荐栈（Nuxt 4 + Vite 7 + Pinia 3 + Reka UI + shadcn-vue + VueUse）
- [vue/CLAUDE.md](frontend-ai-guide/vue/CLAUDE.md) — 可直接复制到 Vue 项目的 CLAUDE.md 模板
- [vue/AGENTS.md](frontend-ai-guide/vue/AGENTS.md) — Codex / OpenCode 通用 AGENTS.md 模板
- [vue/.cursor/rules/](frontend-ai-guide/vue/.cursor/rules/) — Cursor MDC 规则集
- [vue/skills/](frontend-ai-guide/vue/skills/) — Vue 专属 Skills（组件、Pinia、Composition API）

### 第 3 章 · React 专线

- [react/README.md](frontend-ai-guide/react/README.md) — React 2026 推荐栈（Next.js 15 / TanStack Start + shadcn/ui + TanStack Query + Tailwind v4）
- [react/CLAUDE.md](frontend-ai-guide/react/CLAUDE.md) — React 项目 CLAUDE.md 模板
- [react/AGENTS.md](frontend-ai-guide/react/AGENTS.md) — Codex / OpenCode 通用模板
- [react/.cursor/rules/](frontend-ai-guide/react/.cursor/rules/) — Cursor MDC 规则集
- [react/skills/](frontend-ai-guide/react/skills/) — React 专属 Skills

### 第 4 章 · 各家工具配置（实操）

- [cli-ide/claude-code.md](frontend-ai-guide/cli-ide/claude-code.md) — Claude Code（含 Skills、Plugins、MCP）
- [cli-ide/codex.md](frontend-ai-guide/cli-ide/codex.md) — OpenAI Codex CLI（AGENTS.md 三层结构）
- [cli-ide/opencode.md](frontend-ai-guide/cli-ide/opencode.md) — OpenCode CLI（AGENTS + commands + agents）
- [cli-ide/cursor.md](frontend-ai-guide/cli-ide/cursor.md) — Cursor（MDC 四种激活模式）
- [cli-ide/trae.md](frontend-ai-guide/cli-ide/trae.md) — Trae IDE（user_rules + project_rules）

### 第 5 章 · 可复用 Skill 模板

- [skills/frontend-design/](frontend-ai-guide/skills/frontend-design/) — 强制做出审美选择的元 Skill
- [skills/component-spec/](frontend-ai-guide/skills/component-spec/) — 让 AI 在写组件前先输出"规约表"
- [skills/a11y-check/](frontend-ai-guide/skills/a11y-check/) — 无障碍快速检查清单
- [skills/perf-budget/](frontend-ai-guide/skills/perf-budget/) — 性能预算守门人

## 怎么用这本手册（30 分钟速通）

1. **先看第 1 章** 了解 2026 年前端潮流 + Skills 工作原理（10 分钟）
2. **从 Vue / React 中挑你用的那个**，把对应目录里的 `CLAUDE.md`、`AGENTS.md`、`.cursor/rules/` 整段拷到你项目根目录（5 分钟）
3. **挑 1 个 AI 工具** 跟着第 4 章对应文档操作一次（10 分钟）
4. **打开第 5 章的 frontend-design Skill**，让它接管"审美决策"（5 分钟）

完事之后，你随便让 AI 写个落地页、Dashboard、表单，输出都会自动落在 2026 年的现代风格里。

## 一句话总结

> **CLAUDE.md / AGENTS.md / Cursor Rules 决定"AI 知道什么"，Skills 决定"AI 在合适的时候做什么"**。
> 前者像入职手册（一次性灌输），后者像企业 Wiki（按需检索）。两者配合，AI 才不会每次都重新学一遍你的项目。

— 2026-05-16 ｜ John ｜ vickroytoshiko@gmail.com
