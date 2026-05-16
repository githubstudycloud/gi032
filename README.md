# gi032

Vue 项目 + 配套的 AI 编程助手协作配置教程仓库。

## 目录

```
.
├── app/                ← 👈 Vue 项目（你的实际工作目录）
│   ├── CLAUDE.md       — Claude Code 项目级规则
│   ├── AGENTS.md       — Codex / OpenCode 兼容规则
│   ├── SETUP-LOG.md    — 给新手看的操作流水账
│   ├── .claude/skills/ — 8 个 Skill（5 Vue 专属 + 3 通用）
│   ├── .cursor/rules/  — 6 个 Cursor MDC 规则（备用）
│   └── scripts/
│       └── check-setup.mjs — 自检脚本
│
└── docs/               ← 参考教程（之前写的"2026 前端 + AI 新手手册"）
    └── frontend-ai-guide/
```

## 快速开始

```bash
cd app
node scripts/check-setup.mjs   # 验证配置就绪
claude                          # 启动 Claude Code
```

详细操作历史和"为什么这么设计"见 [app/SETUP-LOG.md](app/SETUP-LOG.md)。

完整教程见 [docs/README.md](docs/README.md)。

— 2026-05-16 ｜ John ｜ vickroytoshiko@gmail.com
