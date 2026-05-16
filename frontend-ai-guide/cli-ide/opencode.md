# OpenCode CLI 完全配置

> OpenCode 是开源的 AI 编程 CLI（[opencode.ai](https://opencode.ai/)），支持多模型（Claude / GPT / Gemini / Qwen / 本地等）。
> 在 AGENTS.md 基础上，加了原生的 **Custom Commands / Agents / Skills** 系统。

## 一、安装

```bash
# macOS / Linux
brew install opencode-ai/tap/opencode

# 或 npm
npm i -g opencode-ai
```

启动：

```bash
opencode
```

## 二、配置文件全景

```
~/.config/opencode/                     # 用户全局
├── AGENTS.md                            # 全局规则
├── opencode.json                        # 全局配置（模型、provider、key）
├── commands/                            # 全局自定义命令
│   └── new-component.md
├── agents/                              # 全局自定义 agent
│   └── code-reviewer.md
└── skills/                              # 全局 skills
    └── design/SKILL.md

<project>/                               # 项目级
├── AGENTS.md                            # 项目规则（最常用）
├── opencode.json                        # 项目配置
├── .opencode/
│   ├── commands/                        # 项目命令
│   ├── agents/                          # 项目 agent
│   └── skills/                          # 项目 skills
```

**优先级**：项目级 > 全局。

**兼容性**：OpenCode 也会回退读 `CLAUDE.md`、`~/.claude/CLAUDE.md` —— 这意味着你可以**只写 CLAUDE.md / AGENTS.md 任选一个**，OpenCode 都能用。

## 三、`/init` 自动生成 AGENTS.md

```bash
opencode
> /init
```

OpenCode 会扫一遍仓库，识别栈、关键文件、构建命令，生成或更新 `AGENTS.md`。

**注意**：自动生成的版本会偏"啥都列上"。你需要人工审一遍：
- 删掉无用的描述性内容
- 加上"禁止"项
- 加上"必须先输出规约表"之类的硬约束

## 四、Custom Commands（最常用功能）

### 基本写法

`.opencode/commands/new-component.md`：

```markdown
---
description: 创建新的 Vue / React 组件，先输出规约表
---

为组件 $ARGUMENTS 创建文件：

1. 输出组件规约表（props / emits / 依赖 / 状态 / 边界 case）
2. 等用户确认 OK
3. 生成 SFC / TSX、test 文件、Storybook 故事
4. 在 components/index.ts 加导出
```

调用：

```
/new-component LoginForm
```

`$ARGUMENTS` 会被替换成 `LoginForm`。

### 高级：参数 + 工具权限

```markdown
---
description: 部署到 staging
allowed_tools: ["Bash(pnpm build *)", "Bash(pnpm deploy *)"]
---

部署 $ARGUMENTS 到 staging：
1. pnpm build
2. pnpm deploy --env staging --target $ARGUMENTS
3. 报告部署结果
```

## 五、Custom Agents

OpenCode 的 Agent 比 Command 更"自治"，有自己的 system prompt 和工具集。

`.opencode/agents/code-reviewer.md`：

```markdown
---
name: code-reviewer
description: 对 PR 做代码审查
model: anthropic/claude-opus-4-7
tools: ["read", "grep", "bash(git diff *)"]
---

You are a senior frontend engineer reviewing a PR.

Focus on:
- Code quality and patterns
- Error handling
- Performance issues (especially React re-renders, Vue reactivity)
- Accessibility
- Security (XSS, SSRF, injection)

Be specific. Cite file:line. Suggest patches.
```

或者用 `opencode.json` 配置：

```json
{
  "agents": {
    "code-reviewer": {
      "model": "anthropic/claude-opus-4-7",
      "system": "You are a senior frontend engineer reviewing a PR...",
      "tools": ["read", "grep", "bash"]
    }
  }
}
```

## 六、Skills 系统（兼容 Claude Code 标准）

OpenCode 2026 起原生支持 Agent Skills 开放标准。

`.opencode/skills/component-spec/SKILL.md`：

```yaml
---
description: Output component specification before writing code
---

Output the component spec table first, then write code only after user confirms.
...
```

**意味着你可以把本手册 vue/skills/、react/skills/ 下的所有 Skill 直接拷过来**。

## 七、`opencode.json` 完整示例

```json
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "anthropic": { "api_key": "{env:ANTHROPIC_API_KEY}" },
    "openai":    { "api_key": "{env:OPENAI_API_KEY}" }
  },
  "default_model": "anthropic/claude-opus-4-7",
  "instructions": [
    "AGENTS.md",
    "CONTRIBUTING.md",
    "docs/guidelines.md",
    "packages/*/AGENTS.md"
  ],
  "permissions": {
    "bash": "ask",
    "edit": "allow",
    "write": "allow"
  },
  "mcp": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    },
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp@latest"]
    }
  }
}
```

`instructions` 字段会把列出的文件全部合并进 LLM 上下文 —— 比单纯靠 AGENTS.md 灵活。

`permissions`：
- `"ask"` — 每次问
- `"allow"` — 自动允许
- `"deny"` — 自动拒绝

## 八、推荐设置（前端项目）

`opencode.json`：

```json
{
  "provider": {
    "anthropic": { "api_key": "{env:ANTHROPIC_API_KEY}" }
  },
  "default_model": "anthropic/claude-opus-4-7",
  "instructions": ["AGENTS.md"],
  "permissions": {
    "bash": "ask",
    "edit": "allow",
    "write": "allow"
  },
  "mcp": {
    "playwright": { "command": "npx", "args": ["@playwright/mcp@latest"] },
    "chrome-devtools": { "command": "npx", "args": ["@anthropic-ai/chrome-devtools-mcp@latest"] },
    "context7": { "command": "npx", "args": ["-y", "@upstash/context7-mcp@latest"] }
  }
}
```

## 九、社区资源

| 仓库 | 内容 |
|---|---|
| `joelhooks/opencode-config` | 个人完整配置参考 |
| `gotar/opencode-config` | 带专门 agent / commands / skills 的配置 |

## 十、典型工作流

```
1. cd 到项目根
2. opencode
3. /init    ← 让它扫仓库生成 AGENTS.md
4. 人工审改 AGENTS.md，加上"禁止 / 必须 / 规约"
5. 把本手册的 skills/ 拷到 .opencode/skills/
6. opencode 重启
7. /new-component LoginForm
```

## 十一、避坑

1. **`/init` 生成的内容太啰嗦** → 人工删一半
2. **想用本地模型** → `provider` 加 ollama 配置
3. **想换默认 agent** → 命令行 `opencode --agent code-reviewer`
4. **MCP 启动慢** → 检查 npx 是否每次都在下载，可改用本地路径

→ 下一篇：[Cursor 配置](cursor.md)
