# 教程使用说明 + 全局心智模型

## 心智模型：AI 协作的"三层栈"

无论你用 Claude Code、Codex、OpenCode、Cursor 还是 Trae，本质上 AI 协作都是这三层东西在工作：

```
┌─────────────────────────────────────────────────────────┐
│  L3 · 临时上下文 （Chat / Selection / Diff）           │ ← 你这次说了啥
├─────────────────────────────────────────────────────────┤
│  L2 · Skills / Commands （按需加载的"专技"）            │ ← 触发式知识包
├─────────────────────────────────────────────────────────┤
│  L1 · 项目级规则文件 （CLAUDE.md / AGENTS.md / .mdc）   │ ← 一直驻场的"入职手册"
└─────────────────────────────────────────────────────────┘
                        ↑
              L0 · 模型本体的预训练知识
```

| 层 | 加载时机 | 适合放什么 | Token 成本 |
|---|---|---|---|
| **L0** | 永远在 | 公共知识、语言语法 | 0（已经在模型里） |
| **L1** | 每次会话开头 | 项目栈、命名约定、必须遵守的硬规则 | 高（每个 turn 都消耗） |
| **L2** | 关键词或命令触发 | 多步骤流程、详细参考、设计准则 | 启动只占 100 token，使用时才完整加载 |
| **L3** | 当前对话 | 当前任务的具体需求 | 视输入大小 |

**核心原则**：

- L1 写"短、硬、不变"的东西（语言版本、必用库、绝对禁止）
- L2 写"长、软、按需"的东西（设计准则、组件清单、动画规范）
- 千万别把所有规矩都塞 L1 — 会撑爆上下文，AI 注意力被稀释，反而不听话

## 各家工具的"L1 文件名"对照表

下次看到这些文件别再懵了，本质都是一个东西：

| 工具 | 项目级文件 | 用户全局文件 | 备注 |
|---|---|---|---|
| **Claude Code** | `./CLAUDE.md` | `~/.claude/CLAUDE.md` | 支持 `@file.md` 引用、子目录 CLAUDE.md 嵌套 |
| **Codex CLI** | `./AGENTS.md` | `~/.codex/AGENTS.md` | 自动从 git root 走到 cwd，逐级合并 |
| **OpenCode** | `./AGENTS.md` | `~/.config/opencode/AGENTS.md` | 也兼容读取 `CLAUDE.md` 作为回退 |
| **Cursor** | `.cursor/rules/*.mdc`（推荐）<br>或 `.cursorrules`（旧） | Settings 里写 | MDC 支持 globs 自动激活 |
| **Trae IDE** | `.trae/rules/project_rules.md` | `~/.trae/rules/user_rules.md` | 国内字节系，菜单里点 "Rules" 创建 |

> **可移植技巧**：把核心规则写在 `AGENTS.md` 里，然后在 `CLAUDE.md` 里只写一行 `@AGENTS.md`。这样 Claude Code 和 Codex / OpenCode 共用同一份规则源。Cursor 则建议建立软链 / 复制一份。

## 各家工具的"L2 触发器"对照表

| 工具 | L2 机制 | 触发方式 | 存放位置 |
|---|---|---|---|
| **Claude Code** | Skills（含旧版 commands） | `/skill-name` 或 description 关键词 | `~/.claude/skills/` 或 `.claude/skills/` |
| **Codex CLI** | 暂无原生 Skills，靠 `AGENTS.md` 分层 | — | 用文件嵌套模拟 |
| **OpenCode** | Skills + Custom Commands | `/cmd-name` | `~/.config/opencode/commands/`、`commands/` |
| **Cursor** | Auto-Attached Rules（glob） + Agent Requested Rules + `@rule-name` | 三种激活模式 | `.cursor/rules/*.mdc` |
| **Trae IDE** | Skills（v1.3+，类似 Claude） | 自动匹配 | `.trae/skills/` |

## 在开始之前 — 4 个会让你少走半年弯路的"反共识"

### 反共识 #1：不要把 CLAUDE.md 写成万字长文

很多人把项目 Wiki 整段灌进 CLAUDE.md，结果 token 烧得飞快，AI 注意力反而被稀释。

**对的写法**：CLAUDE.md 只写 ≤300 行，**详细的内容用 Skills 装**。需要时 AI 会自己拉取。

### 反共识 #2：让 AI 先"做审美决策"，再写代码

直接说"写一个登录页"→ 输出垃圾。
先让 AI 在 5 个备选风格里挑一个（如 brutalist / editorial / glassmorphism / solarpunk / retro-futur），明确字体方向、主色调、动效层次 → 输出立刻好 80%。

这就是 [Anthropic 官方 frontend-design Skill](https://claude.com/blog/improving-frontend-design-through-skills) 干的事，65k+ Star。

### 反共识 #3：用 shadcn-vue / shadcn/ui 这种"复制源码型"组件库

2026 年 AI 时代，**"组件源码直接在你项目里"比 npm install 更重要**。因为 AI 能读到组件的真实实现，改起来更准。

- Vue：`shadcn-vue` + `Reka UI`（Radix Vue 改名）
- React：`shadcn/ui` + `Radix UI`

### 反共识 #4：每个项目都装 Playwright MCP / Chrome DevTools MCP

让 AI 不止能"写"，还能"开浏览器看自己写的东西对不对"。这是 2026 年前端 AI 协作最大的解锁点 — UI 改完不再靠你截图发回去。

```bash
claude mcp add playwright -s user -- npx @playwright/mcp@latest
claude mcp add chrome-devtools -s user -- npx @anthropic-ai/chrome-devtools-mcp@latest
```

## 下一步

→ 读 [01-frontend-trends-2026.md](01-frontend-trends-2026.md) 了解大势
→ 或直接跳到你的栈：[Vue](vue/README.md) | [React](react/README.md)
