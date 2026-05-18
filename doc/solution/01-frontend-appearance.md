# 01 — 语言 / 字体 / 样式自由切换

> 愿景：「语言字体样式可自由切换」

## 1. 现状盘点

### 已实现

| 维度 | 实现 | 文件 | 持久化 |
|---|---|---|---|
| **语言** | zh-CN / en-US 双语 | `LocaleSwitcher.vue` + `i18n/locales/*.json` | cookie `ops-dashboard:locale` |
| **字体** | 4 套（system / noto / lxgw / playfair） | `FontSwitcher.vue` + `use-font.ts` | localStorage `ops-dashboard:font` |
| **主题** | 3 套（light / dark-ops / business） | `ThemeSwitcher.vue` + `use-theme.ts` | localStorage `ops-dashboard:theme` |
| **FOUC 防护** | 内联 IIFE 在 `<head>` 读 localStorage 提前设 class | `nuxt.config.ts` app.head | 无闪烁 |

### 差距分析

| 能力 | 现在 | 目标 |
|---|---|---|
| 主题数量 | 3 套硬编码 | 用户可自建主题（运行时色板编辑） |
| 色彩自由度 | CSS 变量固定在 `@theme` | 运行时覆盖 CSS 变量 |
| 字体自由度 | 4 套固定字体栈 | 用户可上传/选择任意 Google Fonts |
| 偏好持久化 | localStorage（单设备） | 服务端持久化（跨设备同步） |
| 品牌定制 | branding.json 静态 | 管理后台可编辑品牌信息 |
| 配色方案 | 全局统一 | 页面/模块级配色 override |

## 2. 方案设计

### 2.1 主题系统升级：CSS 变量 + 运行时覆盖

**核心思路**：保持 Tailwind v4 `@theme` 作为默认基线，在其上增加一层「运行时 CSS 变量覆盖」。

```
┌─────────────────────────────────────────────┐
│  Layer 1: @theme（编译时基线，Tailwind v4）   │
│    --color-brand-500: oklch(0.65 0.18 230)  │
├─────────────────────────────────────────────┤
│  Layer 2: 预设主题（:root[data-theme=X]）    │
│    现有 light / dark-ops / business          │
├─────────────────────────────────────────────┤
│  Layer 3: 用户自定义覆盖（运行时注入）        │  ← 新增
│    :root { --color-brand-500: oklch(...) }   │
│    来源：用户偏好 API / 管理后台配置          │
└─────────────────────────────────────────────┘
```

**实现方式**：

```typescript
// composables/use-theme-customizer.ts（新增）
interface ThemeOverrides {
  colors?: Record<string, string>;    // CSS 变量名 → oklch 值
  fonts?: {
    display?: string;
    body?: string;
    mono?: string;
  };
  radius?: string;
  shadow?: Record<string, string>;
}

export function useThemeCustomizer() {
  const overrides = ref<ThemeOverrides>({});

  // 从服务端拉用户偏好
  async function loadUserTheme(): Promise<void> {
    // json 模式：读 /user-data/theme-overrides.json
    // api 模式：GET /api/users/me/theme
  }

  // 注入 CSS 变量
  function applyOverrides(o: ThemeOverrides): void {
    const root = document.documentElement;
    if (o.colors) {
      for (const [key, value] of Object.entries(o.colors)) {
        root.style.setProperty(key, value);
      }
    }
    if (o.fonts?.body) {
      root.style.setProperty('--font-body', o.fonts.body);
    }
    // ...同理 radius, shadow
  }

  return { overrides, loadUserTheme, applyOverrides };
}
```

### 2.2 主题编辑器 UI

提供一个可视化面板，让用户调整核心色板：

```
┌─ 主题编辑器（Drawer / Dialog）─────────────────┐
│                                                │
│  基础主题：[light ▼]  ← 选一个预设作为起点      │
│                                                │
│  ── 品牌色 ──                                  │
│  主色    [■ ████████ ] oklch(0.65 0.18 230)    │
│  强调色  [■ ████████ ] oklch(0.70 0.20 150)    │
│                                                │
│  ── 语义色 ──                                  │
│  成功    [■ ████████ ] oklch(0.72 0.18 155)    │
│  警告    [■ ████████ ] oklch(0.80 0.16 85)     │
│  错误    [■ ████████ ] oklch(0.55 0.22 27)     │
│                                                │
│  ── 字体 ──                                    │
│  正文    [Noto Sans SC    ▼]                   │
│  标题    [Source Han Serif ▼]                   │
│  等宽    [JetBrains Mono  ▼]                   │
│                                                │
│  ── 圆角 ──                                    │
│  ○ 直角(0)  ● 小(0.375rem)  ○ 大(0.875rem)    │
│                                                │
│  [预览]  [重置]  [保存]                         │
└────────────────────────────────────────────────┘
```

### 2.3 字体扩展方案

```
现有字体加载链路：
  fonts.json → FontSwitcher.vue → use-font.ts → <html data-font="X">
    → CSS @font-face 按 X 激活对应字体栈

扩展：
  1. fonts.json 增加 `custom` 分类，允许指定 URL
  2. 运行时动态加载 @font-face
  3. 离线场景：vendor-fonts.mjs 预下载 → 本地 /fonts/ 目录
```

**fonts.json 扩展格式**：

```jsonc
{
  "families": [
    {
      "key": "system",
      "label": "系统默认",
      "category": "builtin",
      "stack": "system-ui, -apple-system, sans-serif"
    },
    {
      "key": "noto",
      "label": "Noto Sans SC",
      "category": "builtin",
      "stack": "'Noto Sans SC', sans-serif",
      "css_url": "/fonts/noto-sans-sc.css"    // 离线已有
    },
    {
      "key": "custom-1",                       // 用户自定义
      "label": "霞鹜文楷",
      "category": "custom",
      "stack": "'LXGW WenKai', cursive",
      "css_url": "https://cdn.example.com/lxgw.css",
      "offline_fallback": "/fonts/lxgw.css"
    }
  ]
}
```

### 2.4 偏好服务端持久化

```
当前：localStorage（单浏览器、单设备）

目标：
  写：用户改主题/字体/语言 → POST /api/users/me/preferences { theme, font, locale, overrides }
  读：页面加载 → GET /api/users/me/preferences → 覆盖 localStorage 默认值
  降级：后端不可用时，localStorage 兜底（当前行为不变）

数据模型（后端）：
  user_preference 表：
    user_id   VARCHAR(64) PK
    key       VARCHAR(64) PK   -- 'theme' / 'font' / 'locale' / 'theme_overrides'
    value     JSON
    updated_at DATETIME
```

### 2.5 品牌配置管理化

```
当前：branding.json 是静态文件

目标：
  管理后台 /system/branding 页面（复用 ManagementTable 模式的表单版本）
    - 编辑 logo URL、品牌名、副标题、favicon
    - 实时预览
    - 保存到 DB → report_snapshot(kind='branding') 或专表
  查询服务：GET /api/branding → DB-first，fixture fallback
```

## 3. 文件变更清单

| 操作 | 文件 | 说明 |
|---|---|---|
| 新增 | `composables/use-theme-customizer.ts` | 运行时 CSS 变量覆盖 |
| 新增 | `components/layout/ThemeEditor.vue` | 主题编辑器面板 |
| 修改 | `composables/use-font.ts` | 支持动态 @font-face 加载 |
| 修改 | `composables/use-theme.ts` | 加载用户自定义覆盖层 |
| 扩展 | `public/mock/fonts.json` | 增加 custom 分类和 css_url 字段 |
| 新增 | `types/theme-customizer.ts` | ThemeOverrides 类型定义 |
| 后端 | `services/report-query/app/api/preferences.py` | 用户偏好 CRUD |
| 后端 | `services/report-query/app/models.py` | user_preference 模型 |

## 4. 关键决策

| 决策 | 选项 | 选择 | 理由 |
|---|---|---|---|
| 色彩空间 | hex / hsl / oklch | oklch | 与现有 @theme 一致，感知均匀 |
| 主题编辑器形态 | 独立页面 / Drawer / Dialog | Drawer | 可实时预览当前页面，不离开上下文 |
| 自定义字体加载 | 全量预加载 / 按需加载 | 按需加载 | 字体文件大，只在用户选中时加载 |
| 偏好同步策略 | 写时同步 / 定期批量 | 写时同步 | 偏好修改频率低，即时同步体验好 |
