# 左侧菜单图标 / Nav Icons

左侧侧栏的二级分组（如「概览」）与三级叶子（如「总览」）的图标都从这个目录加载。

## 目录结构

```
public/nav-icons/
├── default/          ← 仓库自带默认图标，跟代码一起走 git
│   ├── overview.svg
│   ├── dashboard.svg
│   └── ...
└── custom/           ← 可选；业务方自定义图标（覆盖同名 default）
    └── overview.svg  ← 放这里就会优先用它
```

## 加载顺序

`<NavIcon name="overview" />` 渲染时按下面顺序找文件：

1. `/nav-icons/custom/<name>.svg` —— 业务方自定义
2. `/nav-icons/default/<name>.svg` —— 仓库默认
3. 都没有 → 兜底小圆点

第一次找不到 custom 后会缓存（同一 session 内不再请求该 name 的 custom），所以**控制台首次看到的 404 是预期行为**，不影响功能。

## 怎么换图标

### 1. 覆盖现有图标（不改代码）

把同名 SVG 放进 `custom/` 即可。例：想换「概览」的图标：

```
cp my-overview.svg apps/web/public/nav-icons/custom/overview.svg
```

刷新页面，二级菜单「概览」的图标会变成你的版本。原默认还在 `default/` 里，删除 custom 文件就恢复。

### 2. 给一个新菜单加图标

在 `apps/web/public/mock/nav.json`（或你的后端 `/api/nav` 返回里）给该 item 加 `icon` 字段：

```json
{ "key": "my-new-leaf", "label": "我的页面", "icon": "my-icon", "path": "/x/y" }
```

然后在 `default/my-icon.svg` 或 `custom/my-icon.svg` 放对应文件。

## SVG 规范

为了视觉统一，新增图标建议：

- `viewBox="0 0 24 24"`，宽高 24×24
- `stroke` 用 `#64748b`（slate-500，跟现有默认一致）
- `stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"`
- 描边路径为主，少用填充
- 单文件 < 1 KB

参考 `default/overview.svg` 或 `default/dashboard.svg`。

## 现有 icon name 一览

详见 [`apps/web/public/mock/nav.json`](../mock/nav.json) 里每个节点的 `icon` 字段。

二级分组常用：`overview, agent, flow, target, tools, settings, inbox, monitor, log, users, task, rules`

叶子常用：`dashboard, factory, layers, blueprint, code, play, report, smartphone, puzzle, sparkles, crosshair, bug, message, flask, shield, book, gauge, user, activity, chart, table, search, inbox-all, clock, check, pie-chart, server, cpu, bell, shield-check, key, sliders, history`

## 注意事项

- SVG 通过 `<img>` 标签加载，CSS `color` / `currentColor` **不会**作用到内部路径。
  自定义图标请把颜色直接写死在 SVG 里（推荐 `#64748b`），别用 `currentColor`。
- 如果你需要主题随动的图标（亮/暗主题不同色），优先做两套 SVG 通过 `custom/` 切换，
  或改 `NavIcon.vue` 改成 inline `<svg>` 注入方案。
- 文件名就是 `icon` 字段值，扩展名固定 `.svg`。其它格式（PNG/WebP）目前不支持。
