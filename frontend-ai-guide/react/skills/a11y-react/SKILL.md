---
name: a11y-react
description: |
  Audit a React component for accessibility issues — missing alt, heading hierarchy,
  color contrast, ARIA labels, keyboard navigation, focus management.
  Use when the user asks "is this accessible", "a11y check", "WCAG audit",
  or before merging UI-heavy PRs.
argument-hint: "<file-or-glob>"
arguments: [target]
allowed-tools: Read Grep Glob
---

# React 无障碍检查

读取 `$target` 指定的 TSX 文件，按以下清单输出报告。

## 必查项

### 1. 图片
- `<img>` 必有 `alt`（装饰图 `alt=""`）
- `next/image` 同样
- `aria-label` 给纯 icon 按钮

### 2. 标题层级
- 一页 1 个 `<h1>`
- 不跳级
- 不要用 `<div className="text-2xl font-bold">` 假装标题

### 3. 按钮 vs 链接
- 动作 → `<button type="button">`（form 内默认 type=submit 要小心）
- 跳转 → `<Link>` / `<a>`
- 不要 `<div onClick>` 当点击区（除非加 role/tabindex/键盘）

### 4. 表单
- 每个 `<input>` 配 `<label>`（htmlFor / id）或 wrapped
- 错误用 `aria-describedby` 链接到 input
- 用 shadcn/ui `<Form>` / `<FormField>` 自动处理这些

### 5. 颜色对比度
- 正文 ≥ 4.5:1
- 大字 / 粗体 ≥ 3:1
- 主题 token `--color-muted-foreground` 等组合要满足对比度

### 6. 键盘
- 所有交互 Tab 可达
- Esc 关弹层
- Enter / Space 触发按钮
- 焦点可见（不能 `outline-none` 不加替代 `focus-visible:ring-2`）

### 7. 焦点管理
- Dialog 弹出：focus 进入容器；关闭：回到 trigger
- Radix UI 已经处理，但 portal 自定义要小心

### 8. 动画
- 尊重 `prefers-reduced-motion`
- Motion：用 `useReducedMotion()` 判断后跳过非必要动画

### 9. ARIA 滥用
- 已经语义化的标签不要加冗余 ARIA
- `aria-hidden="true"` 元素不能聚焦

### 10. 颜色不是唯一信息
- 红色 = 错误 → 同时有 ❌ icon + 文字

### 11. Skip link
- 长导航页应有 `<a href="#main">Skip to content</a>`

### 12. 语义 HTML
- `<main>` / `<nav>` / `<aside>` / `<header>` / `<footer>` 用对
- `<section>` 必有 `aria-labelledby` 或里面的 `<h?>`

## 输出格式

```markdown
## a11y 报告 — <文件名>

### ✅ 通过
- 项 1
- 项 2

### ⚠️ 警告
- [行 42] `<div onClick>` 应改为 `<button>`，并加 `aria-label`

### ❌ 错误
- [行 18] `<img>` 缺 alt
- [行 65] h2 → h4 跳级

### patch 建议
\`\`\`diff
- <img src="/logo.svg">
+ <img src="/logo.svg" alt="">
\`\`\`
```

## 进阶
- `chrome-devtools` MCP 跑 lighthouse_audit
- 装 `eslint-plugin-jsx-a11y` 做静态检查
- 装 `axe-core` 跑运行时检查
