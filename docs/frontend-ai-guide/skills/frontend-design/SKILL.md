---
name: frontend-design
description: |
  Force the AI to make deliberate aesthetic choices before writing any UI code:
  pick a visual direction, commit to typography and color tokens, plan animation hierarchy,
  avoid AI slop defaults like Inter font, purple-to-pink gradients, and flat backgrounds.
  Use when the user asks to "create a landing page", "design a hero", "make a dashboard",
  "build a marketing page", "skin this UI", or whenever generating non-trivial visual UI.
user-invocable: true
---

# 前端审美准则（通用，Vue / React 共用）

> 灵感来自 Anthropic 官方 [frontend-design Skill](https://claude.com/blog/improving-frontend-design-through-skills)（65k+ Star）。
> 本 Skill 的目的：**让 AI 在写代码之前，先做出审美决策**。

## 心法

1. **绝不输出"AI 默认审美"** — Inter + 紫粉渐变 + flat 白底 = 一眼就是 AI 写的
2. **必须做出取舍** — 5 个方向选 1 个，把选择告诉用户
3. **审美决策永远在代码之前**

## 决策流程（按顺序）

### Step 1：定方向

在以下 5 个里挑 1 个并告诉用户：

| 方向 | 关键词 | 适合 |
|---|---|---|
| **Brutalist** | 粗黑边框、超大字号、网格错位、鲜艳原色 | 个人作品集、独立工具、艺术站 |
| **Editorial** | 衬线大标题、宽边距、文字优先、克制配色 | 博客、长文站、媒体、文档 |
| **Glassmorphism** | 毛玻璃、微渐变、圆角、弱阴影 | SaaS 落地、移动 App、轻奢应用 |
| **Solarpunk** | 暖绿 + 金黄 + 有机形状 + 手绘 | 公益、农业、可持续主题 |
| **Dark Luxury** | 深底 + 金属高光 + 大留白 | 高端产品、金融、奢侈品 |

**默认选 editorial** —— 因为模型 baseline 永远是 SaaS minimal，反着来就赢一半。

### Step 2：选字体（明确禁用）

❌ 禁用清单：
- Inter / Inter Display
- Roboto / Roboto Mono
- Arial / Helvetica / Helvetica Neue
- Space Grotesk
- 所有"无个性几何无衬线"做标题

✅ 推荐清单：

**标题（衬线，最稳）**
- Fraunces
- Playfair Display
- Instrument Serif
- Cormorant Garamond
- DM Serif Display

**标题（特殊无衬线）**
- Geist（Vercel 出品）
- Söhne
- Suisse Int'l

**正文**
- Geist
- Source Sans 3
- InterDisplay（仅在标题选了特别字时 OK）

**中文**
- 思源宋体 / Source Han Serif SC（搭衬线英文）
- 思源黑体 / Source Han Sans SC（搭无衬线英文）
- 霞鹜文楷（特别清新文艺）
- 鸿雷板报体（粗黑标题）

**等宽**
- Geist Mono
- JetBrains Mono
- IBM Plex Mono

**字重对比**：标题用 700-900，正文 400-500。**强对比就有冲击力**。

### Step 3：调色板（用 OKLCH）

约束：
- ❌ 不用 hex，统一 OKLCH
- ❌ 不用"主色+5 个平均强弱辅助色"调色板
- ✅ "1 主色 + 1 强调色"，其它走 neutral grey scale

模板（dark mode 友好）：

```css
@theme {
  /* light */
  --color-bg: oklch(0.98 0.01 80);     /* 暖白 */
  --color-fg: oklch(0.18 0 0);          /* 深黑 */
  --color-muted: oklch(0.94 0.01 80);
  --color-brand-500: oklch(0.65 0.18 230);
  --color-accent-500: oklch(0.78 0.16 60);

  /* dark */
  &.dark {
    --color-bg: oklch(0.15 0 0);
    --color-fg: oklch(0.95 0 0);
    --color-muted: oklch(0.22 0 0);
    --color-brand-500: oklch(0.72 0.18 230);
  }
}
```

### Step 4：渐变

❌ 禁用：
- `from-purple-500 to-pink-500`
- `from-violet-500 to-fuchsia-500`
- `from-cyan-500 to-blue-500`
- 所有"两个鲜艳跨色相"的 90° 渐变

✅ 可用：
- 同色相不同明度（OKLCH 调 L）
- 加 grain / noise 滤镜的微渐变
- SVG mesh gradient
- 几何 SVG pattern 背景

### Step 5：动画层次

**只在高影响时刻动**：
- 第一屏 hero 入场（stagger 子元素）
- CTA hover（subtle scale / color shift）
- 表单成功（绿色 pulse + checkmark draw）
- 空状态 → 有数据切换（fade + 上推）
- 路由切换（page transition）

❌ 不要：
- 所有元素一齐淡入
- 滚动到哪都触发动画
- 装饰性的"随便动"

实现：
- Vue：`motion-v`
- React：`motion/react`

Stagger 模式：

```ts
// Vue
<Motion :transition="{ delay: i * 0.08, duration: 0.4 }">

// React
<motion.div transition={{ delay: i * 0.08, duration: 0.4 }} />
```

尊重 `prefers-reduced-motion`（Motion 库自动）。

### Step 6：背景与质感

❌ 纯色 = AI slop。

✅ 三个方向选 1：

1. **CSS gradient + grain**

```css
background:
  radial-gradient(at 20% 30%, oklch(0.95 0.04 60) 0, transparent 50%),
  radial-gradient(at 80% 70%, oklch(0.95 0.04 230) 0, transparent 50%),
  url('/assets/noise.png');
background-size: cover;
background-blend-mode: overlay;
```

2. **SVG geometric pattern**

```html
<svg>
  <defs>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" stroke="oklch(0.85 0 0)" fill="none" />
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#grid)" />
</svg>
```

3. **大尺寸高品质纹理图**（unsplash / 自制）

## 输出格式（必须按此结构）

```markdown
## 设计决策报告

**方向**：editorial
**理由**：用户需求是 SaaS 落地页，希望"专业但有温度"，editorial 比 SaaS minimal 更有人味。

**字体**
- 标题：Fraunces 700-900
- 正文：Geist 400
- 中文标题：思源宋体 700
- 中文正文：思源黑体 400

**配色**（OKLCH）
- 背景：oklch(0.98 0.01 80) light / oklch(0.15 0 0) dark
- 主色：oklch(0.65 0.18 230)
- 强调色：oklch(0.78 0.16 60)

**渐变**：同色相微渐变 + grain 纹理（不用紫粉）

**动画**
- Hero 标题 stagger 入场（delay 0.1 / 0.2 / 0.3）
- CTA hover：scale 1.02 + 阴影加深
- 滚动触发：表格行 / 卡片错时进入

**背景**：subtle radial gradient + SVG 等距网格

确认以上方向后我开始写代码。
```

等用户确认（"ok" / "改 X"）→ 再写代码。

## 不要做

- ❌ 不报告就直接写代码
- ❌ 给"3 个方向让用户选" —— 你做决定，用户改
- ❌ 用模型默认 hex 颜色（必须转 OKLCH）
- ❌ 用 Inter / Roboto / Arial 作标题
- ❌ `from-purple-500 to-pink-500` 任何变体

## 参考资料

- Anthropic 官方 frontend-design: https://github.com/anthropics/claude-code-tools
- OKLCH 工具：https://oklch.com/
- 字体配对参考：https://fonts.google.com/knowledge/topics/pairings
