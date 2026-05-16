---
name: a11y-vue
description: |
  Audit a Vue SFC for accessibility issues (a11y) — missing alt, heading hierarchy,
  color contrast, ARIA labels, keyboard navigation, focus management.
  Use when the user asks "is this accessible", "a11y check", "WCAG audit",
  or before merging UI-heavy PRs.
argument-hint: "<file-or-glob>"
arguments: [target]
allowed-tools: Read Grep Glob
---

# Vue 无障碍检查清单

读取 `$target` 指定的 SFC 文件（或匹配的所有文件），按以下清单逐项检查并输出报告。

## 必查项

### 1. 图片
- 所有 `<img>` 有 `alt`
- 装饰性图用 `alt=""` 明确为空
- `<NuxtImg>` 同样要求

### 2. 标题层级
- 一个页面只有 1 个 `<h1>`
- 标题不跳级（h2 → h4 不行）
- 模板里没有 `font-size` 假装的标题（应该用真正的 h 标签）

### 3. 按钮 vs 链接
- 触发动作（开关 modal、提交）用 `<button>`
- 跳转用 `<NuxtLink>` / `<a>`
- 禁止用 `<div @click>` 做点击区（除非已加 role/tabindex/键盘事件）

### 4. 表单
- 每个 `<input>` 有关联 `<label>`（for / id）或包裹在 label 内
- `required` 字段有视觉 + ARIA 双重提示
- 错误提示用 `aria-describedby` 连接到 input
- 用 Reka UI 的 `<FormField>` / `<FormItem>` 已经自带这些 — 优先用

### 5. 颜色对比度
- 正文 ≥ 4.5:1
- 大字 / 粗体 ≥ 3:1
- 用 `bg-muted text-muted-foreground` 这种 token 组合时确认主题里 token 满足对比度

### 6. 键盘可达
- 所有交互元素能 Tab 到
- Esc 关闭弹层
- Enter / Space 触发按钮
- 焦点状态可见（不要 `outline: none` 不加替代）

### 7. 焦点管理
- 弹出 Dialog / Drawer 时焦点进入容器内
- 关闭时焦点回到触发按钮
- Reka UI 已经处理，但自己写的 portal 要注意

### 8. 动画
- 尊重 `prefers-reduced-motion`
- Motion for Vue：用 `useReducedMotion()` 判断后跳过非必要动画

### 9. ARIA 滥用
- 不要在已经语义化的标签上加冗余 ARIA（`<button role="button">` 错）
- `aria-hidden="true"` 的元素不能聚焦

### 10. 颜色不是唯一信息
- 红色 = 错误？同时也要有 ❌ icon + 文字
- 必填字段 = 红 \* ？再加上 `aria-required="true"`

## 输出格式

```markdown
## a11y 报告 — <文件名>

### ✅ 通过
- 项 1
- 项 2

### ⚠️ 警告
- [行 42] `<div @click>` 应改为 `<button>` 并加 `aria-label`

### ❌ 错误
- [行 18] `<img>` 缺少 `alt` 属性
- [行 65] h2 → h4 跳级

### 建议修复 patch
\`\`\`diff
- <img src="/logo.svg">
+ <img src="/logo.svg" alt="">
\`\`\`
```

## 进阶：跑 Lighthouse

如果有 `chrome-devtools` MCP，触发：
```
chrome-devtools: lighthouse_audit url=<本地 URL>
```
看 Accessibility 分数，目标 ≥ 95。
