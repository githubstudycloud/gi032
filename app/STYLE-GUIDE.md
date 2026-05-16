# STYLE-GUIDE — 运营看板样式风格档案 + 主流风格综述 + 切换器设计

> 三个部分：
> **一** = 我们现在长什么样、为什么这样；
> **二** = 这类看板的主流风格都长什么样、什么时候选哪个；
> **三** = "右上角点击切换风格"这个功能的完整技术设计（不在本轮实现，下一轮再做）。

---

## 一、当前样式档案

### 1.1 设计立场

**克制 / 编辑 / 内部工具**。
不是面向 C 端，所以不堆动画、不堆装饰；但是要给到领导看，所以排版要稳、字号字重要克制，阅读不累。

### 1.2 调色板（OKLCH）

主色一阶（钢蓝 235°），中性灰一阶（带蓝调），状态色用 Tailwind 内置（emerald / amber / rose）。

#### 主色 brand（235° 钢蓝）

| token | OKLCH | 用在哪 |
|---|---|---|
| `brand-50`  | `0.975 0.012 235` | 活动叶子背景、轻 chip 底 |
| `brand-100` | `0.945 0.025 235` | hover 表面 |
| `brand-500` | `0.620 0.140 235` | 装饰光斑、副强调 |
| `brand-600` | `0.530 0.145 235` | **主操作**（主按钮、活动条、链接） |
| `brand-700` | `0.440 0.135 235` | 主按钮 hover / 强文字 |
| `brand-900` | `0.270 0.080 235` | （备用，目前没用）|

> 250-900 之间还铺了 200/300/400/800，预留给后续 chart 用。

#### 中性 ink（带蓝调的灰）

| token | OKLCH | 用在哪 |
|---|---|---|
| `ink-50`  | `0.985 0.003 240` | 页面底色 |
| `ink-100` | `0.965 0.005 240` | 表头底、hover 行 |
| `ink-150` | `0.945 0.007 240` | skeleton 占位 |
| `ink-200` | `0.920 0.008 240` | 边框、分隔线（70% 透明度用） |
| `ink-300` | `0.860 0.010 240` | 输入框边框、滚动条拇指 |
| `ink-500` | `0.620 0.015 240` | 次要文字、副标题、metadata |
| `ink-700` | `0.380 0.018 240` | 默认正文、菜单项 |
| `ink-900` | `0.190 0.015 240` | 标题、强调文字 |

> 为什么不用纯灰（H=0 或无色）：纯灰在浅底上会显得"冷死"，加一点点 240° 蓝相，整体显得"清爽 / 工程感"。

#### 状态色（Tailwind 默认）

- 成功 / 已完成：`emerald-50/700`
- 警告 / 待处理：`amber-50/700`
- 错误 / 异常：`rose-50/600`
- 信息 / 进行中：`brand-50/700`（用主色而非 sky，统一色系）

### 1.3 字体

| 用途 | 栈 | 字重 |
|---|---|---|
| body（菜单、正文、表格） | Noto Sans SC → PingFang SC → HarmonyOS Sans SC → Microsoft YaHei → system-ui | 400 / 500 / 600 |
| display（页头、卡片大标题） | Source Han Serif SC → Noto Serif SC → Songti SC | 600 |
| mono（ID、版本号、代码） | JetBrains Mono → SFMono-Regular | 400 / 500 |

> **故意用思源宋（Serif）做 display**：纯黑体看板像"PPT 模板"，加一笔衬线立刻有版式张力，给到"运营看板"这种半媒体半数据的语境刚好。
> **故意禁掉 Inter / Roboto**（写在 CLAUDE.md 里）：被 AI 生成网站用滥了，第一眼就"AI slop"。

#### 字号阶（实际项目里用到的）

```
10px   → metadata 角标 / 微型 caption
11px   → 表头 uppercase、breadcrumb
12px   → 卡片次要信息 / 标签
13px   → 表格正文、菜单项、按钮
14px   → 段落正文
15px   → 侧栏 section 标题、卡片标题
16px   → 顶部 LOGO 标题、模块入口卡标题
18px   → 顶部"运营看板"主标题
26px   → 页头 H1（PageHeader）
28px   → 关键指标数字
40px   → Hero 主标题（首页）
```

字号阶**只有 11 档**，整个 UI 里没有别的中间值（避免 13.5 / 14.5 这种乱）。

### 1.4 圆角 / 阴影 / 边框

| token | 值 | 用在哪 |
|---|---|---|
| `radius-md` | `0.5rem` (8px)  | 按钮、输入框、菜单项 |
| `radius-lg` | `0.75rem` (12px) | 卡片、表格、筛选条 |
| `radius-xl` | `1rem` (16px)    | Hero 容器、模态 |

阴影只有两档（写成 `@theme` token 调蓝调，不用纯黑）：

```
--shadow-card:  低饱和蓝阴影 + 1px 边框光圈 / 静态卡片
--shadow-hover: 中等阴影 / 鼠标 hover
```

边框：默认 `1px solid ink-200/70`（半透明，避免边框过重）。

### 1.5 间距密度

| 用途 | 推荐值 |
|---|---|
| 顶部菜单高度 | 64px (`h-16`) |
| 侧栏菜单条高度 | 32-36px (`h-8` / `h-9`) |
| 表格行高 | 12px paddingY |
| 卡片内边距 | 20px (`p-5`) |
| 主区域水平 padding | 32px (`px-8`) |
| 主区域上 padding | 32px (`py-8`) |

整体"中等密度"—— 比 Bloomberg / Ant 宽松，比 Stripe / Vercel 紧凑。适合"一屏看 6 行表格 + 一组筛选 + 标题面包屑"。

### 1.6 动效

仅 2 类，都是 `transition-colors` 级别的（150-200ms）：

- hover 背景 / 文字色变化
- 侧栏 chevron 旋转

**故意没有**：scroll-triggered 动画、parallax、fade-in、骨架闪烁动画。看板要看的是数据，不是动画。

---

## 二、主流看板风格 survey

按"识别度从高到低"排，每种给三件事：**视觉特征 / 适用 / 代表产品**。

### 2.1 Linear / Modern Minimal（极简现代）

我们当前风格大体走这条线。

- **特征**：中性灰 90%，主色克制（只在活动/CTA），无衬线，留白多，圆角小（6-8px），1px 浅边框，几乎不用阴影
- **典型字体**：Inter / SF Pro / Inter Display
- **典型色域**：紫 (Linear) / 黑 (Notion) / 中性 (Vercel)
- **适用**：内部工具、给工程师 / PM 看
- **代表**：[Linear](https://linear.app)、[Vercel Dashboard](https://vercel.com/dashboard)、[Notion](https://notion.so)、[Resend](https://resend.com)

### 2.2 Stripe / Friendly Business（柔和商业）

- **特征**：主色更鲜艳（紫 / 蓝紫），圆角中（12px），柔和长投影，多用 illustration / icon 装饰，宽松密度
- **典型字体**：定制无衬线 + 偶尔大字号 display
- **典型色域**：紫 #6772E5 / 蓝紫渐变
- **适用**：面向开发者的 B2B SaaS、付费看板
- **代表**：[Stripe Dashboard](https://dashboard.stripe.com)、[Plaid](https://plaid.com)、[Mercury](https://mercury.com)

### 2.3 Bloomberg / Terminal（终端密度）

- **特征**：深色底（甚至纯黑）、等宽字体、橙黄绿强调、极致密度（一屏几十行），几乎无圆角，几乎无空白
- **典型字体**：等宽全程（Bloomberg 用 BloombergProse）
- **典型色域**：黑底 + 橙 (#ffa500) / 绿 (#0c0) / 红
- **适用**：金融 / 交易员 / 同时看 8-10 个数据源
- **代表**：[Bloomberg Terminal](https://bloomberg.com/professional/solution/bloomberg-terminal/)、[TradingView](https://tradingview.com)、`htop`

### 2.4 Datadog / Grafana / 暗黑数据可视化

- **特征**：深色底 + 高对比 chart 色板（紫 / 青 / 橙 / 黄），适合长时间盯，密度高，圆角小，强 chart-first
- **典型字体**：无衬线（Datadog 用 IBM Plex）
- **典型色域**：#1B1F23 底 + 8-12 色 categorical 板（Tableau 经典色板）
- **适用**：监控、observability、长时间观测
- **代表**：[Datadog](https://datadoghq.com)、[Grafana](https://grafana.com)、[New Relic](https://newrelic.com)

### 2.5 Material 3 / Google（强 token / 强 elevation）

- **特征**：强烈彩色主题（"动态色"自动从 logo 派生），多档 elevation 阴影，FAB / chip / dialog 套件齐全，圆角大（12-28px）
- **典型字体**：Roboto / Roboto Flex
- **典型色域**：M3 Tonal Palette（一个 hue 出 13 阶）
- **适用**：跨 Web/Android 一致体验、Google 生态
- **代表**：[Google Analytics](https://analytics.google.com)、[Google Cloud Console](https://console.cloud.google.com)、[Firebase](https://firebase.google.com)

### 2.6 Ant Design / Element Plus（中文企业后台）

- **特征**：紧凑密度（一屏堆很多），表格优先，主色蓝（#1677ff），强状态色（4-5 种 tag），饱和度比 Linear 高
- **典型字体**：PingFang SC / 系统默认中文字体
- **典型色域**：Daybreak Blue #1677ff
- **适用**：国内 B 端 SaaS、运营 / 风控 / CRM 后台
- **代表**：阿里 / 字节 / 美团内部大量后台、[Ant Design Pro 示例](https://pro.ant.design)

### 2.7 Apple HIG / iOS Settings（系统级克制）

- **特征**：极致灰阶，仅在 toggle 用品牌色（蓝），分组 + 圆角矩形容器，背景 `#F2F2F7` 系统灰
- **典型字体**：SF Pro
- **典型色域**：灰 + 蓝点缀
- **适用**：系统设置类、配置面板
- **代表**：iOS / macOS 设置、[Cron / Notion Calendar](https://notion.so/product/calendar)

### 2.8 Glassmorphism / Vibrancy（磨砂/拟态）

> 提一下作背景；2020-2022 流行，目前**已退潮**，不推荐用在数据看板，会让数字读起来吃力。

- **特征**：`backdrop-filter: blur()` 半透明卡 + 彩色背景大色块透出来
- **适用**：Hero 区域装饰、登录页；**不适合**密集数据
- **代表**：早期 Notion AI、部分 SaaS landing

---

### 2.9 风格选型建议（给运营看板）

对照本项目（内部、给领导看、JSON 驱动、近期内部预览）：

| 风格 | 适合度 | 备注 |
|---|---|---|
| **Linear 现代极简**（**当前**） | ★★★★★ | 默认稳妥，干净不出错 |
| Stripe 柔和商业 | ★★★★ | 想让看板"更产品感"可切，但要小心别 AI slop |
| Ant 中文后台 | ★★★★ | 国内大多数同事熟悉这个语言，沟通成本低 |
| Bloomberg 终端 | ★★★ | 监控页 / 大盘适合开一个深色模式（**不是**全站换皮） |
| Material 3 | ★★ | 跟 Web 风格弱关，且圆角偏大与"严肃运营"不太搭 |
| Apple HIG | ★★ | 偏个人工具感，不太适合"对外汇报" |
| Glass / Neumorphism | ★ | 装饰可以，主界面避免 |

**结论**：保留 Linear 现代极简作默认；为切换器实现时**至少做 3 个 preset**：默认（Linear）、商务（Stripe-flavored）、深色监控（Bloomberg/Datadog 混血）。Ant 风格作为可选扩展。

---

## 三、风格切换器 —— 模块设计（**本轮不实现**）

### 3.1 用户故事

- 作为运营，我想在不同场景切风格 —— 给领导汇报用"商务"，自己上工用"现代极简"，盯监控时切"深色"
- 切完刷新页面要还在那个风格上（持久化）
- 整套切换不能让 Tailwind class 全炸（不能改 markup，只能改 token）

### 3.2 技术方案选型

#### 方案 A —— CSS Variables × `@theme` × `<html class>` （**推荐**）

利用 Tailwind v4 CSS-first 的本质：所有颜色都已经 token 化（`oklch(var(...))` 经过 `@theme` 编译），切风格只是把这些变量在不同 class scope 下重新声明。

```css
/* main.css */
@import "tailwindcss";

/* 默认（Linear minimal）*/
@theme {
  --color-brand-600: oklch(0.530 0.145 235);
  --color-ink-50:    oklch(0.985 0.003 240);
  --font-body:       "Noto Sans SC", ...;
  /* ... */
}

/* 商务（Stripe-flavored）*/
html.theme-business {
  --color-brand-600: oklch(0.490 0.180 280);  /* 紫 */
  --color-ink-50:    oklch(0.985 0.005 280);  /* 微紫底 */
  /* font 保持 */
}

/* 深色监控 */
html.theme-dark-ops {
  --color-brand-600: oklch(0.680 0.180 220);  /* 亮青 */
  --color-ink-50:    oklch(0.180 0.010 240);  /* 深底 */
  --color-ink-100:   oklch(0.220 0.010 240);
  --color-ink-900:   oklch(0.950 0.010 240);  /* 浅文字 */
  /* ... 完整反转 ink 阶 */
}
```

切换 = 给 `<html>` 加 / 换一个 class。所有 Tailwind class（`bg-brand-600`、`text-ink-700` 等）**不用动**，自动跟着变。

**优点**：零侵入业务代码、运行时切换不闪烁、SSR 兼容（class 写在 html）。

#### 方案 B —— 多套 main.css，运行时 dynamic import

切风格 = 卸载老 css 加载新 css。复杂、有 FOUC（无样式闪屏），不推荐。

#### 方案 C —— Tailwind 多 mode plugin

依赖第三方插件，跟 Tailwind v4 的 CSS-first 哲学冲突。不推荐。

**结论：方案 A**。

### 3.3 数据模型

`public/mock/themes.json`（保持"配置可被后端接管"的一致性）：

```jsonc
{
  "default": "minimal",
  "items": [
    {
      "key": "minimal",
      "label": "现代极简",
      "subtitle": "Linear / Notion 风",
      "swatch": ["#0f1419", "#2d6cdf", "#f7f8fa"],
      "htmlClass": ""                         // 不加 class = 默认
    },
    {
      "key": "business",
      "label": "商务",
      "subtitle": "Stripe / Mercury 风",
      "swatch": ["#1a1f36", "#635bff", "#f6f9fc"],
      "htmlClass": "theme-business"
    },
    {
      "key": "dark-ops",
      "label": "深色监控",
      "subtitle": "Datadog / Grafana 风",
      "swatch": ["#e6edf3", "#3fb6ff", "#0d1117"],
      "htmlClass": "theme-dark-ops"
    },
    {
      "key": "ant-cn",
      "label": "中文后台",
      "subtitle": "Ant Design 风（可选）",
      "swatch": ["#000000", "#1677ff", "#f0f2f5"],
      "htmlClass": "theme-ant"
    }
  ]
}
```

走 `useDataSource` 一样能 JSON ↔ API 切。

### 3.4 持久化

- **localStorage key**：`ops-dashboard:theme`
- **SSR safety**：服务端读不到 localStorage，渲染时用 default。客户端 mount 后取 localStorage 同步到 `<html>`。可能短暂闪烁（FOUC）—— 标准做法是注入一段**首屏内联 script**在 `<head>` 里同步读 localStorage 设置 html class，**这一步 Nuxt 用 plugin 做**。

```ts
// app/plugins/theme.client.ts
export default defineNuxtPlugin(() => {
  const stored = localStorage.getItem('ops-dashboard:theme');
  if (stored) document.documentElement.classList.add(stored);
});
```

或者更稳的方式是用 [VueUse](https://vueuse.org) 的 `useColorMode()` —— 它自带 SSR-safe class 注入。

### 3.5 Composable API

```ts
// app/composables/use-theme.ts
export function useTheme() {
  const themes = useState<Theme[]>('themes', () => []);
  const current = useState<string>('current-theme', () => 'minimal');

  function setTheme(key: string): void {
    current.value = key;
    const cls = themes.value.find(t => t.key === key)?.htmlClass ?? '';
    document.documentElement.className = cls;   // 只保留一个 theme- class
    localStorage.setItem('ops-dashboard:theme', cls);
  }

  return { themes, current, setTheme };
}
```

### 3.6 UI 设计（右上角入口）

#### 放在哪

`AppTopBar.vue` 的最右侧、"v0.1.0 · 内部预览" **左边**。一个圆形按钮（24-28px），点开弹下拉。

#### 形态

```
┌──────────────────────────────────────────────────────────────────────────┐
│ [运] 运营看板    首页  AI…  反馈  运维  设置        ⚙[●●●]  v0.1.0 · 内部 │
└──────────────────────────────────────────────────────────────────────────┘
                                                       └─ 切风格入口
```

按钮 = 三个色块叠在一起的小调色板 icon（用当前主题的 swatch 渲）。

点开下拉：

```
┌────────────────────────────────┐
│  风格                          │
│  ────────────────────────      │
│  ● ● ●  现代极简     ✓        │ ← 当前
│         Linear / Notion 风     │
│                                │
│  ● ● ●  商务                   │
│         Stripe / Mercury 风    │
│                                │
│  ● ● ●  深色监控               │
│         Datadog / Grafana 风   │
│                                │
│  ● ● ●  中文后台（可选）       │
│         Ant Design 风          │
└────────────────────────────────┘
```

每行：3 色 swatch（用 theme 自己的色块）+ 名称 + 子标题；当前项右上角 ✓。

### 3.7 落地清单（实施时按这个）

| # | 改 | 工作量 | 备注 |
|---|---|---|---|
| 1 | `app/assets/css/main.css` 加 3 个 `html.theme-X` 块，定义各自的 token 覆盖 | 0.5h | 关键体力活，每套需要 8-12 个变量 |
| 2 | `public/mock/themes.json` 新建 | 0.1h | 4 个 preset |
| 3 | `app/types/theme.ts` 新增 `Theme` 接口 | 0.1h | |
| 4 | `app/composables/use-theme.ts` 实现 setTheme / 持久化 | 0.3h | 用 VueUse `useColorMode` 减少 50% 代码 |
| 5 | `app/plugins/theme.client.ts` 首屏同步 | 0.1h | 防 FOUC |
| 6 | `app/components/layout/ThemeSwitcher.vue` 下拉组件 | 1h | 用 Reka UI Popover 或简单 details |
| 7 | `AppTopBar.vue` 嵌入 ThemeSwitcher | 0.1h | |
| 8 | dark-ops 主题下补**反色检查**：白底卡片改深底卡片，shadow token 改高光描边 | 1h | 深色不只是反 token，要重新设计阴影 |
| 9 | 加 a11y：键盘可达、`aria-haspopup` | 0.2h | |
| 10 | README 加"切风格"说明 | 0.1h | |

**总工作量 ≈ 3.5 小时**（含 dark-ops 反色）。
**不含 dark-ops** ≈ 2.5h（只做 minimal + business + ant-cn）。

> **实施状态**（2026-05-17）：1–10 全部落地。当前 4 套主题（minimal / business / ant-cn / dark-ops）
> 已在 [public/mock/themes.json](public/mock/themes.json) 注册并在 [main.css](app/assets/css/main.css)
> 用 `html.theme-X` 覆盖；右上角切换器 + FOUC 防护脚本 + `localStorage` 持久化（key `ops-dashboard:theme`，
> 存的是 htmlClass 完整字符串，跟 [nuxt.config.ts](nuxt.config.ts) inline script 对齐，零拼接）。
> dark-ops 反色（surface / 边框 / shadow → 高光描边）也已做。

### 3.8 风险与权衡

- **深色模式不是简单反白**：阴影从"投影"变"高光描边"、状态色饱和度要降一档（深底上彩色过曝）、chart 配色要换暗系板。**第一版先不上深色**，让 minimal / business / ant 跑稳再说。
- **第三方组件失控**：将来如果接 shadcn-vue / Reka UI 等，组件源码里可能有硬编码颜色 —— 需要在 vendoring 时把颜色全部走 token。本项目暂时手写组件，无此风险。
- **持久化 cross-tab**：用户在 A tab 切了，B tab 不同步。无伤大雅，但如果想同步：用 BroadcastChannel + storage event。
- **缓存键冲突**：localStorage 上线后改 key 名会导致老用户掉到默认。`ops-dashboard:theme` 加版本前缀 `v1:theme` 更稳。

### 3.9 不在切换器范围内的样式

切风格**只换 token**（颜色 / 阴影 / 字体可选），**不改密度 / 不改布局**。
密度（紧凑 vs 宽松）应当是独立的 toggle，跟主题正交。日后单独做 `useDensity()` 即可。

---

## 四、附：本文与其它文档的关系

- 硬规则 / 黑名单（什么字体不能用、什么颜色不能上）：见 [CLAUDE.md](CLAUDE.md)。本文不重复，只列**当前实际用了什么**和**风格选型理由**。
- 历次决策记录：见 [PROMPT-LOG.md](PROMPT-LOG.md)。
- 安装 / 启动 / 局域网：见 [README.md](README.md)。
