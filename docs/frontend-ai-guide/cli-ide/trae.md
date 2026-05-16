# Trae IDE 完全配置

> Trae 是字节跳动出的 AI 编辑器，国内使用者多。
> 2026 年的 Trae v1.3+ 已经支持 **MCP 协议 + Skills 系统**，跟 Claude / Cursor 大致同构。

## 一、安装

下载：[trae.ai](https://traeide.com/) 或 [trae.cn](https://www.trae.cn/)

## 二、Rules 系统（核心配置）

### 配置入口

AI 对话窗口右上角 **设置图标** → **Rules**

打开后看到两块：

- **Personal Rules**（个人规则，跨项目）
- **Project Rules**（项目规则，当前 workspace）

### 文件位置

```
~/.trae/rules/user_rules.md              # 个人规则
<project>/.trae/rules/project_rules.md   # 项目规则
```

### 创建个人规则

在 Personal Rules 区点 `+ 创建 user_rules.md`，会自动创建并打开。
用自然语言写：

```markdown
# 我的个人规则

- 所有代码注释用中文，函数级别要说明核心功能和参数含义
- 默认使用 TypeScript strict 模式
- 写 React 用 shadcn/ui，写 Vue 用 shadcn-vue
- 错误处理用 try/catch，错误形状 { error: string, code: string }
- async/await，不要 .then() 链
- 写组件前先输出"规约表"
```

### 创建项目规则

类似操作，文件落在 `<project>/.trae/rules/project_rules.md`。

**优先级**：项目规则 > 个人规则。但 Trae 是合并而非覆盖（个人规则的非冲突项仍生效）。

## 三、最佳实践 — `project_rules.md` 模板

直接把本手册的 [vue/CLAUDE.md](../vue/CLAUDE.md) 或 [react/CLAUDE.md](../react/CLAUDE.md) 内容拷过去就行 — Trae 也是读纯 markdown。

更精炼的模板：

```markdown
# 项目规则（Trae）

## 栈
- Vue 3 Composition API + Nuxt 4 + Pinia 3 + shadcn-vue + Tailwind v4
- TS 5.6+ strict
- 测试 Vitest + Playwright

## 必做
- 命名导出（Nuxt page 例外）
- 异步函数显式返回类型
- 错误形状 `{ error: string; code: string }`
- 写组件先输出规约表（props/emits/slots/依赖/状态/边界）

## 禁止
- Options API、Vuex、Element Plus、Ant Design Vue
- `tailwind.config.{js,ts}`（用 v4 CSS `@theme`）
- Inter / Roboto / Arial / Helvetica 作正文字体
- `from-purple-500 to-pink-500` 类 AI slop 渐变

## 注释 / 沟通
- 所有代码注释用中文
- 回复用中文，专业术语保留英文

## MCP / Skills
- 装了 Playwright MCP — 改 UI 后自己截图看
- 装了 Chrome DevTools MCP — 性能问题用
- Skills 在 .trae/skills/ 下，详细流程都在那里
```

## 四、Skills（v1.3+）

Trae 在 v1.3 起开始支持类似 Claude Code 的 Skills。

```
<project>/.trae/skills/
└── <name>/
    └── SKILL.md
```

格式跟 Claude Code 完全一样（Trae 兼容 Agent Skills 开放标准）。

**所以**：本手册 `vue/skills/`、`react/skills/` 下的所有 Skill，**直接拷到 Trae 项目的 `.trae/skills/` 下用**。

## 五、MCP 配置（v1.3+）

Trae 1.3+ 支持 MCP 协议。在设置面板找 "MCP Servers"。

推荐装：

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    },
    "chrome-devtools": {
      "command": "npx",
      "args": ["@anthropic-ai/chrome-devtools-mcp@latest"]
    },
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp@latest"]
    }
  }
}
```

## 六、Trae 特色

### 1. 中文优化

Trae 对中文的理解 + 输出对国内开发者特别友好。在 `user_rules.md` 里加：

```markdown
- 全程中文交流，专业名词保留英文
- 解释代码时用类比，不要照搬术语
```

### 2. Builder 模式 vs Chat 模式

- **Builder**：跟 Cursor Composer 类似，能自动改多个文件
- **Chat**：单轮 Q&A

Builder 才会用 MCP / 多步骤。

### 3. 文件 @ 引用

`@文件名` 引用文件 / 目录 / 符号到对话。

## 七、与 Claude / Cursor / Codex 共存策略

最简单：

```
project/
├── CLAUDE.md                  # Claude Code 用
├── AGENTS.md                  # Codex / OpenCode 用（内容 = `@CLAUDE.md`）
├── .cursor/rules/             # Cursor 用
├── .trae/rules/project_rules.md  # Trae 用（内容大致同步 CLAUDE.md）
├── .claude/skills/            # 任意 Claude / OpenCode / Trae 都可读
└── .trae/skills/              # 同 .claude/skills/ 内容
```

可以做软链：

```bash
# Unix
ln -s .claude/skills .trae/skills

# Windows（管理员 PowerShell）
New-Item -ItemType SymbolicLink -Path .trae\skills -Target .claude\skills
```

## 八、典型工作流

```
1. 在 Trae 里打开项目
2. 设置 → Rules → 复制本手册对应模板进 project_rules.md
3. 关闭再打开（让规则生效）
4. Builder 模式 → "做一个 LoginForm"
5. AI 输出规约表，确认 → 生成代码
6. Playwright MCP 自动开浏览器截图
```

## 九、避坑

1. **规则不生效** → 改完 project_rules.md 关闭对话窗口再开
2. **Skills 不被识别** → 确认 Trae 版本 ≥ 1.3
3. **MCP 启动慢** → npx 走代理时巨慢，可改 `bunx` 或本地装好
4. **中文乱码** → 文件保存编码 UTF-8 无 BOM
5. **跟 Cursor 同时用** → Trae 不读 `.cursor/rules/`，Cursor 不读 `.trae/`，两边内容大致同步即可

## 十、其它国产 AI 编辑器一句话提示

| 工具 | 关键文件 | 备注 |
|---|---|---|
| **Trae** | `.trae/rules/project_rules.md` | 本文档 |
| **MarsCode**（豆包） | `.marscode/rules.md` | 国内豆包系，规则机制相似 |
| **CodeBuddy**（腾讯） | `.codebuddy/rules.md` | 腾讯系，规则用 markdown |
| **Tongyi Lingma**（阿里通义灵码） | IDE 设置里加 | 主要 VSCode 插件，规则较弱 |
| **iFlyCode**（讯飞） | 类似 | — |

国产工具的总原则跟 Trae 一致：**自然语言写在 markdown 里，放约定目录**。

→ 回到 [总目录](../README.md)
