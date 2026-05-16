# 第 4 章 · AI 工具配置专线

| 工具 | 文档 | 国别 | 配置文件 | 核心机制 |
|---|---|---|---|---|
| **Claude Code** | [claude-code.md](claude-code.md) | 🇺🇸 Anthropic | `CLAUDE.md` + `.claude/skills/` | Skills（progressive disclosure） |
| **Codex CLI** | [codex.md](codex.md) | 🇺🇸 OpenAI | `AGENTS.md` 多层合并 | 自动逐级 AGENTS.md |
| **OpenCode** | [opencode.md](opencode.md) | 🌐 开源 | `AGENTS.md` + `.opencode/` | AGENTS + Commands + Agents + Skills |
| **Cursor** | [cursor.md](cursor.md) | 🇺🇸 Anysphere | `.cursor/rules/*.mdc` | MDC + 4 种激活模式 |
| **Trae IDE** | [trae.md](trae.md) | 🇨🇳 字节跳动 | `.trae/rules/project_rules.md` | User Rules + Project Rules |

## 跨工具兼容性矩阵

| 工具 | 读 CLAUDE.md | 读 AGENTS.md | 读 .cursor/ | 读 .trae/ | Skills 兼容 |
|---|---|---|---|---|---|
| Claude Code | ✅ 原生 | 需 `@AGENTS.md` 引 | ❌ | ❌ | ✅ |
| Codex | 通过 `fallback_filenames` | ✅ 原生 | 通过 fallback | ❌ | ❌（用 AGENTS 分层模拟） |
| OpenCode | ✅ 兼容 | ✅ 原生 | ❌ | ❌ | ✅ |
| Cursor | ❌ | ❌ | ✅ 原生 | ❌ | 用 MDC（不同标准） |
| Trae | ❌ | ❌ | ❌ | ✅ 原生 | ✅（v1.3+） |

## "一份文件，多个工具读"的实战方案

**方案 A：让 CLAUDE.md 当唯一权威**

```
project/
├── CLAUDE.md           # 真正的内容
├── AGENTS.md           # 内容：`@CLAUDE.md`
├── .cursor/rules/
│   └── 001-base.mdc    # 内容大致复制 CLAUDE.md（手动同步，前面加 frontmatter）
└── .trae/rules/
    └── project_rules.md # 同上
```

**方案 B：用脚本同步**

写一个 `scripts/sync-rules.ts`：
- 读 `CLAUDE.md`
- 生成 `AGENTS.md`、`.cursor/rules/001-base.mdc`、`.trae/rules/project_rules.md`
- 加到 git pre-commit hook

**方案 C：用本手册的模板每个工具一份**

最省心，每个目录里都有对应的文件，互相不引用。

## 团队选型建议

| 团队类型 | 推荐 | 理由 |
|---|---|---|
| 个人独立开发 | Claude Code | Skills 生态最完善 |
| 国内创业团队 | Trae + Claude Code | 中文优化好 + 高级时切 Claude |
| 国际化团队 | Cursor + Claude Code | 主流，文档多 |
| 重度 Next.js / React | Cursor + Claude Code | MDC 颗粒度细 |
| Monorepo + 多语言 | Codex + Claude Code | AGENTS.md 多层合并最适合 |
| 开源 / 不绑特定供应商 | OpenCode | 全开源，可自部署 |

## 单一工具新手起步路径

1. **第一次接触 AI 编程** → 装 Trae（中文友好）或 Cursor，按教程跑通"做个 LoginForm"
2. **有点基础想专业化** → 装 Claude Code，配 frontend-design + Playwright MCP
3. **进入团队 / Monorepo** → 加 AGENTS.md 多层结构，给 Codex / OpenCode 兼容
4. **拒绝厂商锁定** → 切 OpenCode + Anthropic / OpenAI 多模型

## 速查：本手册对应文件

把哪个目录拷到项目根：

- Vue + Claude Code → 拷 [`vue/CLAUDE.md`](../vue/CLAUDE.md) + [`vue/.claude/skills/*`](../vue/skills/)
- Vue + Codex / OpenCode → 拷 [`vue/AGENTS.md`](../vue/AGENTS.md)
- Vue + Cursor → 拷 [`vue/.cursor/rules/`](../vue/.cursor/rules/)
- React + 任意 → 类似，看 [`react/`](../react/) 目录
- 通用 Skills（设计 / 规约 / a11y / 性能）→ [`skills/`](../skills/)

→ 回 [总目录](../README.md)
