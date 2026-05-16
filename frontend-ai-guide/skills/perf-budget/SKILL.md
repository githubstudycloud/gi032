---
name: perf-budget
description: |
  Performance budget guardrail. Audits a route / page for Web Vitals (LCP, INP, CLS),
  bundle size, request waterfalls, image optimization, font loading, and unused code.
  Use when the user asks "is this fast", "performance audit", "why is X slow",
  "check LCP/CLS", or before shipping a public-facing page.
argument-hint: "<url-or-route>"
arguments: [target]
allowed-tools: Bash(npx *) Bash(pnpm *)
---

# 性能预算守门人

> 灵感来自 Vercel Engineering 的 React Best Practices（57 条规则按影响排序）。
> 检查顺序就是修复优先级。

## 我们的硬预算（2026 标准）

| 指标 | 目标 | 红线 |
|---|---|---|
| LCP（Largest Contentful Paint） | ≤ 2.0s | 2.5s |
| INP（Interaction to Next Paint） | ≤ 150ms | 200ms |
| CLS（Cumulative Layout Shift） | ≤ 0.05 | 0.1 |
| TBT（Total Blocking Time） | ≤ 150ms | 300ms |
| JS bundle（首屏） | ≤ 150 KB gzip | 200 KB |
| Lighthouse Performance | ≥ 95 | 90 |
| 字体加载阻塞 | 0ms | 50ms |

## 审计顺序（按影响排序，先修高的）

### 1. 请求瀑布（最高影响）

- 检查首屏是否有"必须等前一个请求才能发的"链式调用
- ✅ Server Component 并行 `await Promise.all([getX(), getY()])`
- ✅ Vue 用 `Promise.all` 并发，不要 sequential await
- ❌ `await getUser(); await getOrders(userId)` — 应该并行（如果 orders 不依赖 user 内部数据）

### 2. Bundle 大小

工具：
```bash
# Vite / TanStack Start
pnpm build --analyze

# Next.js
ANALYZE=true pnpm build

# 通用
npx vite-bundle-visualizer
```

红旗：
- moment.js / lodash / date-fns（整包导入）→ 改成模块导入 / dayjs / 原生 Intl
- 大型组件库整包 import（MUI / AntD）→ 不要用，走 shadcn 复制源码
- 图标库 import 整包（`react-icons`）→ 按需 import

### 3. 服务端 / 数据库 / SSR 性能

- 首屏 SQL 慢 → 加索引、加缓存、preload 数据
- N+1 query → 用 dataloader / Drizzle relations
- 大表全量取 → 加分页、虚拟化

### 4. 数据获取

- 用 TanStack Query 的 `staleTime` 防止重复请求
- Server Component prefetch + Client hydration
- 不要在 `useEffect` 里发请求（用 SWR / TanStack Query）

### 5. Re-renders（React 项目）

React 19 + React Compiler 已经自动处理 memo，但仍要检查：
- 组件树是否过深，导致大面积 re-render
- Context value 是否每次都新对象（破坏 memo）
- 列表 `key` 是否稳定（用 index 当 key 会全量重渲染）

Vue 项目对应：
- 大组件拆小，让 Vue 的细粒度响应只更新需要的部分
- `v-memo` 用于真正昂贵的列表项

### 6. 图片

- ✅ 用 `next/image` / `<NuxtImg>` / `<picture>` srcset
- ✅ above-the-fold 图片加 `priority` / `fetchpriority="high"`
- ✅ 用 AVIF / WebP，提供 fallback
- ✅ 显式 width / height 防 CLS
- ❌ 在 hero 区放 5MB 无压缩 PNG

### 7. 字体

- ✅ `font-display: swap`
- ✅ subset（中文必须）
- ✅ `<link rel="preload" as="font" crossorigin>` 关键字体
- ❌ `@import url(google-fonts)` 在 CSS 顶部（阻塞）

### 8. JS 执行

- TBT 高 → 找出长任务（用 Chrome DevTools MCP performance trace）
- 第三方脚本（GA / Sentry / livechat）→ defer / async / web worker
- 大型 hydration → 拆 island / 用 RSC

### 9. CSS

- 删除未用样式（Tailwind v4 默认 purge）
- `@layer` 避免重复
- 关键 CSS 内联，非关键 lazy

### 10. 高级优化

- Service Worker / PWA
- HTTP/3 / preconnect / dns-prefetch
- CDN edge caching
- 资源 hint：`<link rel="preconnect">`、`<link rel="modulepreload">`

## 工具调用

### 用 Chrome DevTools MCP

```
跑 lighthouse_audit url=$target
跑 performance_start_trace url=$target
等 5 秒
跑 performance_stop_trace
分析 performance_analyze_insight
```

### 用 Playwright MCP

```
打开 $target
等到 networkidle
截图 above-the-fold
跑 evaluate_script 拿 web-vitals
```

## 输出报告格式

```markdown
## 性能审计 — `$target`

### Web Vitals
| 指标 | 当前 | 目标 | 状态 |
|---|---|---|---|
| LCP | 3.4s | 2.0s | ❌ 超 1.4s |
| INP | 220ms | 150ms | ❌ |
| CLS | 0.03 | 0.05 | ✅ |
| TBT | 180ms | 150ms | ⚠️ |
| Lighthouse | 78 | 95 | ❌ |

### 主要问题（按影响排序）
1. **[请求瀑布]** Home page sequential await on `/api/user` then `/api/orders`
   → 改并发 Promise.all，预计 LCP 减 800ms
2. **[Bundle]** moment.js 占 65 KB
   → 换 dayjs 或原生 Intl.DateTimeFormat，省 60 KB
3. **[图片]** hero.jpg 2.1 MB
   → 转 WebP + responsive srcset，预计省 1.8 MB
4. **[字体]** 阻塞 250ms
   → 加 preload + font-display:swap

### 立即可用的 patch

\`\`\`diff
- await getUser()
- const orders = await getOrders(userId)
+ const [user, orders] = await Promise.all([
+   getUser(),
+   getOrders(userId),
+ ])
\`\`\`

### 修复后预期
LCP: 3.4s → 2.0s
Lighthouse: 78 → 93
```

## 不要做

- ❌ 报告里全是"建议优化" 没有数字
- ❌ 上来就建议"用 CDN" "加缓存"这种万金油
- ❌ 不分优先级把所有问题平铺
- ❌ 忽略"在 React Compiler 时代不用手写 memo"这件事
