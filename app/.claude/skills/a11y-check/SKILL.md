---
name: a11y-check
description: |
  Universal accessibility (a11y) audit for both Vue SFC and React TSX files.
  Checks WCAG 2.1 AA basics — missing alt, heading hierarchy, color contrast,
  ARIA labels, keyboard navigation, focus management, color-only information,
  prefers-reduced-motion. Use when the user asks "is this accessible",
  "a11y check", "WCAG audit", or before merging UI-heavy PRs.
argument-hint: "<file-or-glob>"
arguments: [target]
allowed-tools: Read Grep Glob
---

# 无障碍检查（通用版）

读取 `$target` 指定的文件（.vue / .tsx / .jsx），按下面 12 项 + 输出标准报告。

## 必查项

### 1. 图片
- 所有 `<img>` / `<NuxtImg>` / `<Image>` 必有 `alt`
- 装饰图 `alt=""`（明确为空）
- icon 按钮 `aria-label` 必有

### 2. 标题层级
- 一页 1 个 `<h1>`
- 不跳级（h2 → h4 不行）
- 不要用 `font-size` + `font-bold` 假装标题

### 3. 按钮 vs 链接
- 动作 → `<button>`
- 跳转 → `<a>` / `<NuxtLink>` / `<Link>`
- 不允许 `<div onClick>` 当点击区（除非有 role + tabindex + 键盘事件）

### 4. 表单
- 每个 input 关联 `<label>`（htmlFor / for / 包裹）
- `required` 字段有视觉 + ARIA 双重提示
- 错误用 `aria-describedby` 链接到 input 元素
- 用 Reka UI / Radix UI 的 `<FormField>` 已自动处理

### 5. 颜色对比度
- 正文 ≥ 4.5:1
- 大字 / 粗体 ≥ 3:1
- `text-muted-foreground` + `bg-muted` 组合要确认主题里的 token 满足对比度

### 6. 键盘可达
- 所有交互能 Tab 到
- Esc 关闭弹层
- Enter / Space 触发 button
- 焦点状态可见（不能 `outline-none` 不补 ring）

### 7. 焦点管理
- Dialog / Drawer 弹出：焦点进入容器
- 关闭：焦点回 trigger
- Radix / Reka 已处理；自定义 portal 要小心

### 8. 动画
- 尊重 `prefers-reduced-motion`
- Motion / motion-v：用 `useReducedMotion()` / `usePrefersReducedMotion()` 跳过非必要动画

### 9. ARIA 滥用
- 已语义化的标签不要加冗余 ARIA（`<button role="button">` 错）
- `aria-hidden="true"` 元素不能 focusable

### 10. 颜色不是唯一信息
- 红 = 错误？要有 ❌ icon + 文字
- 必填 = 红 *？再加 `aria-required="true"`

### 11. Skip link
- 长导航页应有 `<a href="#main">跳到内容</a>`，第一个 Tab 显示

### 12. 语义 HTML
- `<main>` / `<nav>` / `<aside>` / `<header>` / `<footer>` 用对
- `<section>` 必有 `aria-labelledby` 或里面有 `<h?>`

## 输出格式

```markdown
## a11y 报告 — `<file>`

### ✅ 通过
- 所有 `<img>` 有 alt
- 标题层级正确（h1 → h2 → h3）
- 表单 label 关联

### ⚠️ 警告
- [行 42] `<div onClick>` 应改为 `<button>` + `aria-label="关闭"`
- [行 88] 颜色对比 `bg-muted/40 text-muted-foreground` 实测约 3.2:1，正文偏低

### ❌ 错误
- [行 18] `<img src="/logo.svg">` 缺 `alt`
- [行 65] h2 之后直接是 h4，跳级
- [行 110] 弹层关闭后焦点没回到 trigger

### 修复 patch
\`\`\`diff
- <img src="/logo.svg">
+ <img src="/logo.svg" alt="">
\`\`\`

\`\`\`diff
- <div className="cursor-pointer" onClick={onClose}>×</div>
+ <button type="button" aria-label="关闭" onClick={onClose}>×</button>
\`\`\`

### 评分
- 严重问题：1
- 警告：2
- 通过：N
- 总体：B（需修复 1 处严重）
```

## 进阶

- 如果 `chrome-devtools` MCP 可用：跑 `lighthouse_audit`，看 Accessibility 分数（目标 ≥ 95）
- 建议项目装 `eslint-plugin-jsx-a11y`（React）或 `eslint-plugin-vue-a11y`
- 运行时检查可加 `axe-core` 到测试里

## 不要做

- ❌ 输出一堆"建议"但没指出具体行号
- ❌ 只列 ❌ 不列 ✅（用户也想知道"我哪里做对了"）
- ❌ 用"可能"、"或许"模糊表达 — 给确定的判断
