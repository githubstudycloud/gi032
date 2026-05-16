# Claude Code 完全配置（新手 30 分钟通关）

> Claude Code 是 Anthropic 官方的 AI 编程 CLI / IDE 扩展。本文档教你如何配置它"听话又出活"。

## 一、安装

```bash
# 全局安装
npm i -g @anthropic-ai/claude-code

# 启动
claude
```

第一次启动会让你登录 Anthropic 账号或填 API key。

## 二、四个核心配置位置（必记）

```
~/.claude/                          # 用户级（你所有项目共用）
├── CLAUDE.md                       # 全局指令
├── skills/                         # 全局 skills
│   └── <name>/SKILL.md
├── commands/                       # 全局自定义命令（旧式，建议改用 skills）
└── settings.json                   # 全局设置

<项目>/                              # 项目级
├── CLAUDE.md                       # 项目指令（最重要！）
├── .claude/
│   ├── skills/                     # 项目 skills
│   ├── settings.json               # 项目设置（团队共享，提交 git）
│   └── settings.local.json         # 项目本地设置（不提交，gitignore）
```

**优先级**：项目 > 用户 > 内置。

## 三、CLAUDE.md 怎么写（4 个原则）

### 原则 1：短而硬

≤ 300 行。不写长流程（流程进 Skills）。

### 原则 2：写"做什么 + 不做什么"双向约束

```markdown
## 强制做法
- ✅ 命名导出
- ✅ async/await

## 禁止
- ❌ Class 组件
- ❌ Axios
```

### 原则 3：用 `@file.md` 引用

```markdown
项目栈细节见 @AGENTS.md
API 约定见 @docs/api-conventions.md
```

### 原则 4：用子目录 CLAUDE.md 做"作用域覆盖"

Claude Code 从启动目录到 git root **逐层加载** CLAUDE.md，离 cwd 近的优先级高。

```
my-monorepo/
├── CLAUDE.md             # 整个 repo 通用
├── packages/
│   ├── frontend/
│   │   └── CLAUDE.md     # 仅在 frontend 子包激活
│   └── backend/
│       └── CLAUDE.md     # 仅在 backend 激活
```

直接把本手册的 [vue/CLAUDE.md](../vue/CLAUDE.md) 或 [react/CLAUDE.md](../react/CLAUDE.md) 拷到项目根即可。

## 四、Skills 安装方式

### 方式 A：从社区市场装

```bash
# Anthropic 官方前端设计 Skill（65k+ Star）
npx skills add anthropics/claude-code --skill frontend-design

# UI/UX Pro Max（240+ 风格）
claude plugin add nextlevelbuilder/ui-ux-pro-max-skill

# Shadcnblocks Skill（2500+ shadcn block 知识）
claude plugin add masonjames/Shadcnblocks-Skill
```

### 方式 B：手写

```bash
mkdir -p ~/.claude/skills/my-skill
```

`~/.claude/skills/my-skill/SKILL.md`：

```yaml
---
name: my-skill
description: 一句话说清做什么 + 何时使用
---

具体指令...
```

热加载：保存即生效，不用重启。

### 方式 C：项目级（团队共享）

```bash
mkdir -p .claude/skills/team-rule
# 编辑 SKILL.md
git add .claude/skills/
git commit -m "feat: 添加团队 skill"
```

## 五、MCP 服务器（必装 3 个）

MCP 让 AI 拥有"工具手脚"。前端开发必装：

```bash
# Playwright — 让 AI 用浏览器
claude mcp add playwright -s user -- npx @playwright/mcp@latest

# Chrome DevTools — 性能/网络分析
claude mcp add chrome-devtools -s user -- npx @anthropic-ai/chrome-devtools-mcp@latest

# Context7 — 实时拉文档（1000+ 库）
claude mcp add context7 -s user -- npx -y @upstash/context7-mcp@latest
```

设计稿驱动开发再加：

```bash
# 启动 Figma Dev Mode 后
claude mcp add --transport sse figma-dev-mode-mcp-server http://127.0.0.1:3845/sse
```

## 六、settings.json 关键字段

`.claude/settings.json` 例子：

```json
{
  "skillListingBudgetFraction": 0.02,
  "permissions": {
    "allow": [
      "Bash(pnpm *)",
      "Bash(git status)",
      "Bash(git diff *)",
      "Read",
      "Edit",
      "Write"
    ],
    "deny": [
      "Bash(rm -rf *)",
      "Bash(git push --force *)"
    ]
  },
  "skillOverrides": {
    "deploy": "off",
    "legacy-context": "name-only"
  }
}
```

`skillOverrides`：
- `"on"`（默认）：完整 description 进入上下文
- `"name-only"`：只露名字，省 token
- `"user-invocable-only"`：AI 不能自动用，只能 `/cmd`
- `"off"`：彻底隐藏

## 七、几个让你飞起来的 / 命令

| 命令 | 作用 |
|---|---|
| `/help` | 帮助 |
| `/init` | 让 Claude 扫描你仓库生成初版 CLAUDE.md |
| `/clear` | 清空对话历史（保留 CLAUDE.md / Skills） |
| `/compact` | 压缩上下文 |
| `/model` | 切模型（Opus / Sonnet / Haiku） |
| `/review` | Claude Code 内置的 PR review skill |
| `/security-review` | 安全审查 |
| `/skill-name` | 触发任意 Skill |
| `/permissions` | 管理工具权限 |
| `/doctor` | 诊断配置（看 token 预算等） |

## 八、典型工作流（前端 Vue / React）

### 起步（第一次进项目）

```
1. cd 到项目根
2. 把本手册 vue/ 或 react/ 下的 CLAUDE.md 拷到根目录
3. 把 .claude/skills/ 拷过来
4. claude
5. /init   ← 让 Claude 扫描后扩充 CLAUDE.md（人工审）
```

### 日常开发

```
1. claude
2. "帮我做一个 UserProfileCard 组件" ← 会触发 component-spec
3. 看规约表，回 "ok"
4. AI 生成代码，跑测试
5. "/a11y-react UserProfileCard.tsx" ← 无障碍检查
6. "用 Playwright 截图给我看效果"  ← MCP 自动开浏览器
```

### 调试 UI

```
"用 chrome-devtools 跑一下 lighthouse audit，再抓 5 秒 perf trace，
告诉我 LCP 慢在哪"
```

## 九、避坑

1. **CLAUDE.md 写太长** → AI 注意力被稀释 → 分流到 Skills
2. **太多 Skill** → 启动 description 列表超预算 → 用 `skillOverrides` 把低频改 `name-only`
3. **`@file` 引用循环** → 注意层级
4. **Windows 用户 Skill 里跑 `!`shell命令`` 失败** → 加 `shell: powershell` + 环境变量 `CLAUDE_CODE_USE_POWERSHELL_TOOL=1`
5. **企业账号 + 个人 Skill 冲突** → 企业管理员可以下发覆盖配置
6. **改了 Skill 不生效** → 重启 Claude Code（新建顶层目录需要重启）

## 十、Plugin 生态推荐（截至 2026-05）

| Plugin | 类别 | 备注 |
|---|---|---|
| `anthropic/frontend-design` | 设计 | 必装，65k+ Star |
| `nextlevelbuilder/ui-ux-pro-max-skill` | 设计 | 240+ 风格 |
| `Leonxlnx/taste-skill` | 设计 | 可调"设计变化度" |
| `masonjames/Shadcnblocks-Skill` | 组件 | 2500+ shadcn block |
| `secondsky/claude-skills` | 综合 | Cloudflare / React / Tailwind |
| `wilwaldon/Claude-Code-Frontend-Design-Toolkit` | 元资源 | "全套前端 AI 配方" |

→ 下一篇：[Codex CLI 配置](codex.md)
