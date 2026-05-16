# Cursor IDE 完全配置

> Cursor 是 VSCode fork 的 AI 编辑器。
> 在 2026 年使用 Cursor，**忘掉 `.cursorrules`**，全用 `.cursor/rules/*.mdc`。

## 一、为什么不再用 `.cursorrules`

| | `.cursorrules`（旧） | `.cursor/rules/*.mdc`（新） |
|---|---|---|
| 文件 | 单个根目录 markdown | `.cursor/rules/` 下多个 `.mdc` |
| Frontmatter | 无 | YAML（description / globs / alwaysApply） |
| 激活模式 | 总是开 | **4 种** |
| **Agent 模式支持** | ❌ **完全无视 .cursorrules** | ✅ |
| 团队规则 | 不太行 | 完美 |

Cursor 在 Agent 模式（Composer Agent）下**完全忽略 `.cursorrules`** — 实测 0/9 规则被遵循。
**所以 2026 年必须用 `.cursor/rules/*.mdc`**。

## 二、四种激活模式（核心）

### 1. Always Apply — 总是加载

```yaml
---
description: "项目核心约定"
alwaysApply: true
---
```

每个 Chat / Composer / Agent 会话都加载。**只用于基础规则**（语言、命名、绝对禁止）。

⚠️ 总内容 ≤ 2000 token。

### 2. Auto Attach — Glob 自动触发

```yaml
---
description: "Vue SFC 约定"
alwaysApply: false
globs: ["**/*.vue", "app/components/**/*.ts"]
---
```

匹配文件**出现在对话上下文**时（被打开、被引用、被 @）才激活。

**常见坑**：只是问"做一个 Vue 组件"而不引用文件 → 不会触发。所以这种规则适合"你已经在改某文件"的场景。

### 3. Agent Requested — AI 判断

```yaml
---
description: "审计安全。当审查认证流、JWT、Session 时激活。"
alwaysApply: false
globs: []
---
```

AI 根据 `description` 判断要不要拉进来。`description` 必须**具体、行动导向**：

- ❌ "代码质量规则"（太抽象）
- ✅ "审计认证流。当审查 login / register / JWT / Session 时激活。"

### 4. Manual — `@rule-name`

```yaml
---
description: "数据库迁移检查单"
alwaysApply: false
---
```

不出现在 globs，不被 AI 自动拉。用户用 `@migration-checklist` 主动调。

## 三、典型 `.cursor/rules/` 组织

```
.cursor/rules/
├── 001-base.mdc                # alwaysApply, 基础约定
├── 010-vue-components.mdc       # glob *.vue
├── 020-shadcn-vue.mdc           # glob components/
├── 030-pinia.mdc                # glob stores/
├── 040-api-server.mdc           # glob server/api/
├── 100-frontend-design.mdc      # agent requested
└── 200-deployment-checklist.mdc # manual @
```

**数字编号习惯**：Cursor 按文件名排序加载，后面文件覆盖前面同名规则。前缀数字方便组织优先级。

## 四、可直接复制的 MDC 模板

→ Vue 项目：[`vue/.cursor/rules/`](../vue/.cursor/rules/)
→ React 项目：[`react/.cursor/rules/`](../react/.cursor/rules/)

把整个目录拷到你项目根的 `.cursor/rules/`。

## 五、Cursor 设置面板（Settings → Rules）

UI 入口：`Cmd/Ctrl + ,` → 搜 "Rules"。

| 设置 | 作用 |
|---|---|
| User Rules | 个人全局规则（不进版本控制） |
| Project Rules | 等同 `.cursor/rules/*.mdc`，可视化编辑 |
| Memories | Cursor 自己的"长期记忆"，0.42+ 加入 |

## 六、写 MDC 的几个心得

### 1. description 是 Agent 模式的"招魂咒"

Cursor Agent 决定要不要加载某 rule，**完全靠 description**。
所以写法很关键：

```yaml
description: "API 路由约定。当编写 Next.js Route Handlers、Server Actions、或处理 form data 时激活。"
```

包含：**主题词 + 触发场景 + 文件类型**。

### 2. alwaysApply: true 要克制

每个 always 规则都吃 token。原则：

- always = "如果违反就立刻不能要"的硬规则（语言版本、命名）
- 其它一律 glob 或 agent requested

### 3. globs 要精确

```yaml
# ❌ 太宽
globs: ["**/*"]

# ✅ 精确
globs: ["app/**/*.vue", "components/**/*.vue"]
```

### 4. 一个 .mdc 不超过 250 行

超了就拆。

### 5. 团队共享

`.cursor/rules/` 要 git 提交。`.cursor/rules/local/*.mdc` 可以在 `.gitignore` 个人化。

## 七、Cursor 特色功能

### Composer Agent 模式

`Cmd+I` 打开。区别 Chat：
- Agent 可以**自动写多个文件**
- 自动运行 terminal 命令
- 一次完成大任务

Agent 模式必须用 `.cursor/rules/*.mdc`，**`.cursorrules` 无视**。

### @ 符号引用

- `@filename.ts` — 引用文件
- `@folder/` — 引用整个目录
- `@rule-name` — 引用 MDC 规则
- `@docs` — 引用 Cursor 自动索引的文档
- `@web` — 联网搜索

### Background Agent / Bugbot

Cursor 0.42+ 起，能在 GitHub PR 上派 background agent 自动审 / 修。

### Memories

Cursor 自己的"长期记忆"，类似 ChatGPT 的 Memory。在 Settings → Memories 管理。

## 八、与 Claude Code / Codex 共存

**策略 1：单一权威**
项目里只放 `.cursor/rules/`，让 Claude Code 也读它。
在 `~/.codex/config.toml`：

```toml
project_doc_fallback_filenames = ["AGENTS.md", "CLAUDE.md", ".cursor/rules/001-base.mdc"]
```

但这只能让 Codex 读到一个文件，不够完整。

**策略 2：写一份硬规则，到处复用**

```
project/
├── AGENTS.md                    # Codex / OpenCode 读这个
├── CLAUDE.md                    # 内容 = `@AGENTS.md`
└── .cursor/rules/001-base.mdc   # 内容大致同步 AGENTS.md（手动维护）
```

**策略 3（推荐）**：用本手册给的全套模板，每个工具都给了对应版本。

## 九、几个让你飞起来的快捷键

| 快捷键 | 作用 |
|---|---|
| `Cmd+K` | 行内 AI 编辑 |
| `Cmd+L` | Chat |
| `Cmd+I` | Composer / Agent |
| `Cmd+Enter` | 在 Chat 里把代码 apply 到文件 |
| `Cmd+Shift+L` | 把当前选中加进 chat 上下文 |
| `Cmd+/` | 切换 Composer 模式 |

## 十、避坑

1. **`.cursorrules` 和 `.cursor/rules/` 并存** → MDC 覆盖前者，行为不可预测 → **删掉 `.cursorrules`**
2. **alwaysApply 太多** → 上下文撑爆 → 改成 glob 或 agent requested
3. **description 写得跟"标题"一样** → AI 不知道何时激活 → 加触发场景关键词
4. **没提交 `.cursor/rules/`** → 团队成员各练各的 → git 必须加
5. **windows 路径里 globs 写反斜杠** → 用正斜杠，Cursor 内部统一

→ 下一篇：[Trae IDE 配置](trae.md)
