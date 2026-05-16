# 第 2 章 · Skills 系统全解

> 这一章是整本手册的"内功心法"。把 Skills 搞懂，后面所有工具用起来都是一通百通。

## 一、为什么需要 Skills

### 没有 Skills 的世界

你打开 Claude Code / Cursor / Codex，每次会话开头都要重新告诉它：

- 我们用 Vue 3 + Pinia + shadcn-vue
- 命名约定是 ...
- 表单要这么写、API 错误要那么处理
- 写组件前要先输出规约表
- 我们的设计风格是 brutalist、字体绝不能用 Inter
- ...

如果你把这些**全塞 CLAUDE.md / AGENTS.md**：

- 文件越来越长（5000 行不夸张）
- 每个 turn 都消耗大量 token
- 模型注意力被稀释，反而不听话
- 团队成员看着犯困、改起来犯怵

### 有 Skills 的世界（progressive disclosure）

Skill 是一个"按需加载的知识包"：

- **启动时**：只把每个 Skill 的 `name + description` 加载进上下文（一个 Skill ≈ 100 token）
- **使用时**：AI 发现"这个任务跟某个 Skill 的描述匹配"才加载完整内容
- **多文件**：SKILL.md 里可以引用 `reference.md`、`examples/`、`scripts/`，这些更是"用到才读"

**实际数据**：一个有 8 个 Skill、共 10000 行文档的项目，**启动只消耗 500 token**，而不是 70000 token。

## 二、SKILL.md 文件格式（Claude Code 官方标准）

> Claude Code 遵循 [Agent Skills 开放标准](https://agentskills.io)，OpenCode、Trae IDE v1.3+ 都兼容。

### 最小可用 Skill

```
~/.claude/skills/summarize-changes/
└── SKILL.md
```

```yaml
---
description: Summarizes uncommitted changes and flags anything risky. Use when the user asks what changed, wants a commit message, or asks to review their diff.
---

## Current changes

!`git diff HEAD`

## Instructions

Summarize the changes above in two or three bullet points, then list any risks
you notice such as missing error handling, hardcoded values, or tests that need
updating. If the diff is empty, say there are no uncommitted changes.
```

注意：

- `!``` git diff HEAD ``` ` 这种语法是 **dynamic context injection** — Claude Code 会先执行命令，把输出嵌进去，AI 才看到结果
- `description` 是 AI 决定"要不要用这个 Skill"的唯一信号，**写法决定一切**

### 完整 frontmatter 字段表

```yaml
---
name: my-skill                       # 默认用目录名
description: 这个 skill 做什么 + 何时使用 # 必填（强烈建议）
when_to_use: 触发短语 / 示例请求      # 追加到 description
argument-hint: "[组件名] [格式]"      # 自动补全提示
arguments: [component, format]       # 命名位置参数 → $component, $format
disable-model-invocation: true       # 不让 AI 自动触发，只能 /skill-name 手动
user-invocable: false                # 反过来：只有 AI 能触发，不出现在 / 菜单
allowed-tools: Read Grep Bash(git *) # 这个 skill 激活时免审批的工具
model: claude-opus-4-7               # 强制用某个模型
effort: high                         # 强制 effort 级别
context: fork                        # 让 skill 在 subagent 里跑
agent: Explore                       # 配合 context: fork 用
paths: ["src/components/**/*.vue"]    # 只在编辑这些文件时自动激活
shell: powershell                    # Windows 用户可以指定 PS
---
```

### 多文件结构

```
my-skill/
├── SKILL.md          # 入口（≤500 行）
├── reference.md      # 详细参考（用到时才读）
├── examples/
│   └── sample.vue    # 期望输出示例
└── scripts/
    └── helper.py     # 可执行脚本（${CLAUDE_SKILL_DIR}/scripts/helper.py）
```

在 SKILL.md 里这样引用：

```markdown
## 详细参考

需要完整 API 时阅读 [reference.md](reference.md)。
所有期望的组件结构示例在 [examples/sample.vue](examples/sample.vue)。

## 工具脚本

运行批量重命名：
\`\`\`bash
python3 ${CLAUDE_SKILL_DIR}/scripts/helper.py --rename
\`\`\`
```

## 三、Skill 存放位置与优先级

| 范围 | 路径 | 适用 |
|---|---|---|
| 企业级 | 由 managed settings 配置 | 整个组织 |
| 个人级 | `~/.claude/skills/<name>/SKILL.md` | 你所有项目 |
| 项目级 | `.claude/skills/<name>/SKILL.md` | 当前项目 |
| 插件级 | `<plugin>/skills/<name>/SKILL.md` | 装了这个插件的地方 |

**冲突解决**：企业 > 个人 > 项目。插件用 `plugin-name:skill-name` 命名空间，不会冲突。

**热加载**：Claude Code 会监听这些目录，**编辑 SKILL.md 不用重启 session**。

**Monorepo 友好**：从子目录启动 Claude Code，会自动找到父目录的 `.claude/skills/`。打开子目录的文件时，也会查 `packages/frontend/.claude/skills/`。

## 四、四种 Skill 设计模式

### 模式 1：Reference Skill（背景知识）

适用：项目约定、命名规则、API 模式

```yaml
---
name: api-conventions
description: API design patterns used in this codebase. Auto-load when working with route handlers or controllers.
user-invocable: false
paths: ["app/api/**/*.ts", "src/server/**/*.ts"]
---

When writing API endpoints:
- Use RESTful naming conventions
- Return consistent error formats: `{ error: string, code: string }`
- Always validate request body with Zod
- Wrap async handlers with `withErrorHandler`
```

### 模式 2：Workflow Skill（多步骤任务）

适用：commit、deploy、新功能脚手架

```yaml
---
name: new-vue-component
description: Scaffold a new Vue 3 component with Pinia store, test, and Storybook story.
argument-hint: "<ComponentName>"
arguments: [name]
disable-model-invocation: true
allowed-tools: Read Write Edit Bash(npx *)
---

Create the following files for a new component called `$name`:

1. `src/components/$name/$name.vue` — SFC with `<script setup lang="ts">`, scoped Tailwind classes
2. `src/components/$name/$name.test.ts` — Vitest test using `@vue/test-utils`
3. `src/components/$name/$name.stories.ts` — Storybook 8 CSF format
4. Add export to `src/components/index.ts`

Use Pinia store `useAppStore()` if state is needed. Reka UI primitives if accessibility is needed.
```

调用方式：`/new-vue-component LoginForm`

### 模式 3：Forked Subagent Skill（隔离执行）

适用：耗时分析、不想污染主上下文

```yaml
---
name: deep-research
description: Research a topic thoroughly in an isolated context.
argument-hint: "<topic>"
context: fork
agent: Explore
---

Research $ARGUMENTS thoroughly:
1. Find relevant files using Glob/Grep
2. Read and analyze the code
3. Summarize findings with specific file references and line numbers
```

注意：`context: fork` 必须配合**明确的任务指令**，纯"约定/规则"放在 fork 模式里没意义。

### 模式 4：Skill + Script（输出可视化产物）

适用：生成 HTML 报告、依赖图、覆盖率可视化

```yaml
---
name: codebase-visualizer
description: Generate an interactive collapsible tree visualization of your codebase.
allowed-tools: Bash(python3 *)
---

Run from project root:
\`\`\`bash
python3 ${CLAUDE_SKILL_DIR}/scripts/visualize.py .
\`\`\`

This creates `codebase-map.html` in the current directory and opens it.
```

## 五、写出"AI 会主动用"的 Skill — description 撰写心法

description 是 AI 决定要不要加载 Skill 的**唯一**信号。写得好它就用，写得差它就装看不见。

### 反面教材

```yaml
description: 帮助前端开发  # 太抽象
description: shadcn 工具    # 不知道何时该用
description: 我的设计偏好    # 不知道触发条件
```

### 正面写法

```yaml
description: |
  Generate a new shadcn-vue component with Tailwind v4 classes and Reka UI accessibility primitives.
  Use when the user asks to "create a new component", "scaffold a UI element", or mentions specific components
  like Button, Dialog, Toast, Form. Also use when adding interactive UI to a Vue page.
```

**公式**：
**`[动词] + [产物] + [栈细节]`** + **`Use when [3-5 个具体触发场景]`**

## 六、Skill content lifecycle（关键概念）

> 一旦 Skill 被加载，它的内容**会留在对话里所有后续 turn**，不会重新读。
> 所以你写 SKILL.md 时要**像写一份永久指令**，不是一次性步骤。

### 自动压缩（auto-compaction）行为

- 当上下文要爆时，Claude Code 会做摘要
- 摘要后，每个被调用过的 Skill 会**重新附加前 5000 token**
- 多个 Skill 共享 25000 token 预算
- 老 Skill 可能被丢弃 — 这时候在对话里**显式重新调用一次**就能拉回来

## 七、常见踩坑

### 坑 1：Skill 不触发

- description 关键词太抽象 → 加入用户会说的原话（"写一个登录页"、"我要做表单"）
- 没装到对的目录 → 检查 `~/.claude/skills/` vs `.claude/skills/`
- 在 `What skills are available?` 里看看到底有没有

### 坑 2：Skill 触发太频繁

- description 太宽泛 → 加 `Only use when ...`
- 把 `disable-model-invocation: true` 打开，改成手动 `/cmd`

### 坑 3：description 被截断

- 单 Skill description + when_to_use 上限 **1536 字符**
- Skill 列表总预算 = 模型上下文 × 1%（可调）
- 太多 Skill 时低频的会被**只保留名字**，AI 就匹配不到了 → 用 `skillOverrides` 配置把低频的设为 `name-only`

### 坑 4：动态注入 `!`command`` 不工作

- 检查 `allowed-tools` 是否包含对应 Bash 模式
- Windows 用户可能要加 `shell: powershell` 且开 `CLAUDE_CODE_USE_POWERSHELL_TOOL=1`

## 八、Skill 在其它工具里的等价物

| 工具 | 名称 | 标准兼容 |
|---|---|---|
| Claude Code | Skills（含旧 commands） | 原生 |
| OpenCode | Skills + Custom Commands | 兼容 Agent Skills 标准 |
| Trae IDE v1.3+ | Skills（菜单 → AI 设置 → Skills） | 兼容 |
| Cursor | Rules（MDC，glob 自动激活） | 自家格式，但概念相通 |
| Codex CLI | 暂无原生 Skills，靠 `AGENTS.md` 分层近似实现 | — |

**跨工具复用技巧**：
把 Skill 设计成单文件 + 标准 frontmatter，命名为 `SKILL.md` 放在 `<topic>/SKILL.md`。
然后：

- Claude Code / OpenCode / Trae：直接放对应目录
- Cursor：复制成 `.cursor/rules/<topic>.mdc`，frontmatter 调整字段名
- Codex：在 `AGENTS.md` 里 `@<topic>/SKILL.md` 引用

## 九、本章小结 — 5 条你必须记住的话

1. **Skills 是 AI 协作的核心抽象**，不是花架子
2. **CLAUDE.md / AGENTS.md 放硬规则，Skills 放详细流程**，分工明确
3. **description 决定一切**，写它时想象用户原话
4. **SKILL.md 内容一旦加载就驻场**，按"永久指令"写
5. **5 个高质量 Skill 胜过 50 个低质量 Skill**，宁缺毋滥

下一章我们进入实战，[Vue 篇](vue/README.md) 和 [React 篇](react/README.md) 各自有完整可复制的栈模板。
