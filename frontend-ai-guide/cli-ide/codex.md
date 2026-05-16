# OpenAI Codex CLI 完全配置

> Codex 是 OpenAI 官方的 AI 编程 CLI（不是 2021 年那个旧 Codex 模型，是 2025 年发布的 Agent 形态）。
> 核心配置文件叫 **AGENTS.md**。

## 一、安装

```bash
# 通过 OpenAI 提供的安装方式
npm i -g @openai/codex

# 或参考 https://github.com/openai/codex 的最新方式
```

启动：

```bash
codex
```

## 二、AGENTS.md 加载机制（关键）

Codex 启动会发生 3 件事：

1. 从 git root 走到当前 cwd，逐层读 **AGENTS.md**
2. 读用户全局 `~/.codex/AGENTS.md`
3. 如果有 `~/.codex/AGENTS.override.md`，它会**完全替代**用户全局 AGENTS.md

### 文件优先级（后读后覆盖前面）

```
~/.codex/AGENTS.override.md    # 临时全局覆盖（最高）
~/.codex/AGENTS.md              # 用户全局
<git root>/AGENTS.md            # 项目根
<git root>/packages/x/AGENTS.md # 子包
<cwd>/AGENTS.md                 # 当前目录（如果跟子包不同）
```

**靠近 cwd 的文件因为后读，会覆盖前面的同名规则**。

### 大小限制

- 默认上限 `project_doc_max_bytes = 32 KiB`（合并后）
- 在 `~/.codex/config.toml` 调大：

```toml
project_doc_max_bytes = 65536
project_doc_fallback_filenames = ["AGENTS.md", "CLAUDE.md", ".cursor/rules/001-base.mdc"]
```

回退文件名意思：如果某层没有 AGENTS.md，可以认 CLAUDE.md 或某个 Cursor 规则文件。这对**跨工具复用**特别有用 —— 一套规则同时给 Claude / Codex / Cursor 用。

## 三、最佳的 AGENTS.md 写法

### 推荐结构

```markdown
# AGENTS.md

## 项目快照（一段话）
我们做 X，用 Y 技术栈。

## 常用命令
pnpm dev / pnpm build / pnpm test / ...

## 必做 / 禁止
- ✅ ...
- ❌ ...

## 目录约定
app/, components/, ...

## 代码风格
- 命名 / 类型 / 错误处理 / ...
```

### 与 CLAUDE.md 共用一份源

办法 A：项目里写 `AGENTS.md`，让 `CLAUDE.md` 只写一行：

```markdown
# CLAUDE.md
@AGENTS.md
```

办法 B：反过来，主写 `CLAUDE.md`，`AGENTS.md` 引用。

办法 C：让两个文件软链到同一个真实文件（Windows 用 mklink，Unix 用 ln -s）。

### Monorepo 用例

```
monorepo/
├── AGENTS.md                       # 通用：TS strict、pnpm、commit 规范
├── packages/
│   ├── web/
│   │   └── AGENTS.md               # 前端补充：Vue / shadcn-vue / Tailwind v4
│   └── api/
│       └── AGENTS.md               # 后端补充：Fastify / Drizzle / Zod
```

当在 `packages/web/` 启动 Codex，它会合并：
`~/.codex/AGENTS.md` + `monorepo/AGENTS.md` + `monorepo/packages/web/AGENTS.md`

## 四、临时覆盖技巧

### 场景 1：今天我想用纯英文输出

```bash
# 编辑 ~/.codex/AGENTS.override.md
echo "All your responses must be in English." > ~/.codex/AGENTS.override.md
codex
# 完事
rm ~/.codex/AGENTS.override.md
```

### 场景 2：紧急关掉项目里的某条规则

在 `~/.codex/AGENTS.override.md` 写：

```markdown
Ignore the rule about "禁止 Axios" for today.
```

## 五、Codex 当前不原生支持 Skills

不像 Claude Code 有 SKILL.md 系统，Codex 目前**靠 AGENTS.md 分层 + 内嵌引用模拟 Skills**：

### 模拟方法

```markdown
# AGENTS.md

...

## 流程参考（按需展开阅读）

- 创建新组件：阅读 `docs/agents/new-component.md`
- 写 Pinia store：阅读 `docs/agents/pinia-store.md`
- 写 Server Action：阅读 `docs/agents/server-action.md`
- 做无障碍检查：阅读 `docs/agents/a11y.md`
- 前端审美准则：阅读 `docs/agents/design.md`
```

然后把本手册 `vue/skills/*/SKILL.md` 全部拷到 `docs/agents/` 下，去掉 frontmatter 即可。

或者把 frontmatter 留着 — Codex 不会报错，只是不解析。这样**同一套文件 Claude Code 当 Skill 用，Codex 当文档查**。

## 六、配置文件 `~/.codex/config.toml`

```toml
# 项目文档最大尺寸（默认 32 KiB）
project_doc_max_bytes = 65536

# 回退文件名（找不到 AGENTS.md 时按顺序找）
project_doc_fallback_filenames = ["AGENTS.md", "CLAUDE.md"]

# 默认模型 / effort
default_model = "gpt-5.4"
default_effort = "high"

# 一些工具的开关
[tools.bash]
enabled = true

[tools.web]
enabled = true
```

## 七、典型工作流

```
1. cd 到项目根
2. 拷本手册的 vue/AGENTS.md 或 react/AGENTS.md 到根
3. 把 vue/skills/* 拷到 docs/agents/* （去掉 frontmatter）
4. codex
5. "做一个 UserProfileCard 组件，参考 docs/agents/new-component.md 流程"
```

## 八、Codex vs Claude Code 差异 cheatsheet

| 维度 | Codex | Claude Code |
|---|---|---|
| 配置文件名 | AGENTS.md | CLAUDE.md |
| 用户全局 | `~/.codex/AGENTS.md` | `~/.claude/CLAUDE.md` |
| 临时覆盖 | `~/.codex/AGENTS.override.md` | 无原生（要手动改） |
| Skills | 不原生支持，靠分层 | 原生 SKILL.md |
| MCP 支持 | 增加中 | 完整 |
| 子目录覆盖 | 自动逐层合并 | 自动逐层合并 |
| 大小限制 | 32 KiB 默认 | 无明文限制（但会撑爆 token） |

## 九、避坑

1. **AGENTS.md 太大** → 32 KiB 上限，要么 split 子包，要么调大 `project_doc_max_bytes`
2. **写了规则不生效** → 检查是不是同级有 `AGENTS.override.md` 覆盖了
3. **想跨工具复用** → 用 `project_doc_fallback_filenames = ["AGENTS.md", "CLAUDE.md"]`，写一份文件即可
4. **不想提交 `~/.codex/`** → 它本来就是 home 目录的，跟项目无关。但**项目里 AGENTS.md 一定要提交 git**

→ 下一篇：[OpenCode CLI 配置](opencode.md)
