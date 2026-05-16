# 第 5 章 · 可复用 Skill 模板

这一章是**通用版**（Vue / React 双栈都能用）的 4 个核心 Skill。

| Skill | 用途 | 触发关键词 |
|---|---|---|
| [frontend-design/](frontend-design/) | 强制做出审美选择，避免 AI slop | "做一个登录页"、"设计 hero"、"画个 dashboard" |
| [component-spec/](component-spec/) | 写代码前先输出规约表 | "做一个组件"、"create XYZ" |
| [a11y-check/](a11y-check/) | 无障碍审计 | "a11y check"、"WCAG audit"、"可访问性" |
| [perf-budget/](perf-budget/) | 性能预算守门人 | "为什么慢"、"perf audit"、"LCP" |

## 怎么装

### Claude Code

```bash
# 个人级（所有项目共用）
cp -r frontend-design ~/.claude/skills/
cp -r component-spec ~/.claude/skills/
cp -r a11y-check ~/.claude/skills/
cp -r perf-budget ~/.claude/skills/

# 项目级（团队共享）
cp -r frontend-design <project>/.claude/skills/
# ...其它同理
```

Windows PowerShell：

```powershell
Copy-Item -Recurse frontend-design $env:USERPROFILE\.claude\skills\
```

### OpenCode

```bash
cp -r frontend-design ~/.config/opencode/skills/
# 或项目级
cp -r frontend-design <project>/.opencode/skills/
```

### Trae IDE（v1.3+）

```bash
mkdir -p <project>/.trae/skills/
cp -r frontend-design <project>/.trae/skills/
```

### Cursor / Codex

Cursor 不直接吃 SKILL.md 格式 — 转换为 `.cursor/rules/*.mdc`：
- 保留 description 字段
- alwaysApply: false
- globs: []（agent requested 模式）
- 把 SKILL.md 内容直接粘到 frontmatter 下面

Codex 把 SKILL.md 拷到 `docs/agents/<name>.md`，在 `AGENTS.md` 里写：
```
- 设计相关任务参考 `docs/agents/frontend-design.md`
- 写组件前规约参考 `docs/agents/component-spec.md`
```

## 组合使用

最强组合（任意 UI 任务都触发）：

```
用户："做一个用户资料卡片组件"
  ↓
AI（自动加载）：
  - component-spec  → 输出规约表
  - frontend-design → 输出设计决策
  ↓
用户确认两个表格
  ↓
AI 写代码
  ↓
用户："/a11y-check UserProfile.vue"
  ↓
AI 跑无障碍检查
  ↓
用户："/perf-budget /dashboard"
  ↓
AI 跑性能审计
```

## 自定义心法

如果想给自己的项目加专属 Skill，记住：

1. **description 是招魂咒** — 写得越具体（带触发场景），AI 越能选对时机
2. **SKILL.md ≤ 500 行** — 详细内容放 reference.md / examples/
3. **Skill 内容是"驻场指令"** — 一旦加载会留在整段对话，按"永久指令"写
4. **5 个高质量 ≫ 50 个低质量** — 宁缺毋滥
5. **写完测试一次** — 用一个真实任务跑跑看 AI 是否触发对了

→ 回 [总目录](../README.md)
