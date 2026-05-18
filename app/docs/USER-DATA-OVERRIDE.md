# 用户自定义数据覆盖层（user-data）

> 在 `apps/web/public/user-data/` 里放同名 JSON，就能覆盖 `apps/web/public/mock/` 下任何配置 / 数据文件，**完全不动项目源码**。  
> 适用场景：演示前临时改数字 / 改部门名 / 改 KPI 标签 / 改导航；本机定制不污染团队仓库。

## 1. 工作原理

所有页面的数据 / 配置都通过 `useDataSource()`（见 [apps/web/app/composables/use-data-source.ts](../apps/web/app/composables/use-data-source.ts)）读取。
JSON 模式下的解析顺序：

```
useDataSource({ jsonPath: '/reports/design/data.json' })
        │
        ├─ 1. 试  GET  /user-data/reports/design/data.json    ← 你的覆盖文件
        │      └─ 200 → 用这个，结束
        │      └─ 404 → 进入下一步（本会话记忆此路径已缺失）
        │
        └─ 2. 试  GET  /mock/reports/design/data.json         ← 项目自带 mock
```

**整文件替换**：user-data 里的文件存在就**完全用它**，不做字段合并。所以拷过来的 JSON 必须保持原 schema 完整，缺字段会导致 UI 报错或渲染空白。

**会话级缓存**：useDataSource 维护 `missingUserPaths: Set<string>`，每个 user-data 路径**本会话只试探一次**。所以：
- 改**已有**的 user-data 文件 → 浏览器刷新立即生效
- **新增**一个 user-data 文件 → 必须**整页强刷**（Ctrl+F5）才会被试探到

**API 模式自动跳过**：`runtimeConfig.public.dataSourceMode = 'api'` 时整个 user-data 层不参与，零迁移成本。

## 2. 30 秒上手

```powershell
# 1. 从 _examples/ 把任意示例拷出来（去掉 _examples/ 路径前缀）
copy apps\web\public\user-data\_examples\reports\design\data.json `
     apps\web\public\user-data\reports\design\data.json

# 2. 编辑这个新文件（VSCode / 任意编辑器都行）
code apps\web\public\user-data\reports\design\data.json

# 3. 浏览器打开 http://localhost:3000/ai-test/general/design
#    Ctrl+F5 强刷一次 → 看到 [CUSTOM] 数据生效
```

不需要重启 `pnpm dev`。public 目录下的文件改动 Nuxt 不缓存。

## 3. 覆盖范围速查表

按文件路径一一对应。把表里"源文件路径"里的 `mock/` 改成 `user-data/` 就是覆盖路径。

| 想改什么 | 源文件路径 |
| --- | --- |
| 总览 — 表格 / KPI 数据 | `apps/web/public/mock/reports/summary/data.json` |
| 总览 — 列定义 / KPI 标签 / 筛选器 | `apps/web/public/mock/reports/summary/config.json` |
| 产业落地进展 — 表格 / KPI 数据 | `apps/web/public/mock/reports/industry/data.json` |
| 产业落地进展 — 列定义 / KPI 标签 / 筛选器 | `apps/web/public/mock/reports/industry/config.json` |
| 领域落地进展 — 表格 / KPI 数据 | `apps/web/public/mock/reports/domain/data.json` |
| 领域落地进展 — 列定义 / KPI 标签 / 筛选器 | `apps/web/public/mock/reports/domain/config.json` |
| AI 辅助测试设计 — 表格 / KPI 数据 | `apps/web/public/mock/reports/design/data.json` |
| AI 辅助测试设计 — 列定义 / KPI 标签 / 筛选器 | `apps/web/public/mock/reports/design/config.json` |
| AI 辅助测试代码生成 — 表格 / KPI 数据 | `apps/web/public/mock/reports/codegen/data.json` |
| AI 辅助测试代码生成 — 列定义 / KPI 标签 / 筛选器 | `apps/web/public/mock/reports/codegen/config.json` |
| 左侧导航 / 顶部菜单 | `apps/web/public/mock/nav.json` |
| "部门"下拉项 | `apps/web/public/mock/dropdowns/departments.json` |
| "时间范围"下拉项 | `apps/web/public/mock/dropdowns/time-ranges.json` |
| 主题列表（顶栏主题切换器） | `apps/web/public/mock/themes.json` |
| 字体列表（顶栏字体切换器） | `apps/web/public/mock/fonts.json` |
| 品牌信息（logo / 名称） | `apps/web/public/mock/branding.json` |
| 指标管理表（/ai-test/system/metrics） | `apps/web/public/mock/admin/metrics.json` |

## 4. 典型操作示例

### 4.1 临时改 KPI 数字（演示用）

```powershell
# 比如领域落地进展页 "AI用户数" 想从 1284 改成 9999
copy apps\web\public\mock\reports\domain\data.json `
     apps\web\public\user-data\reports\domain\data.json
```

打开拷出来的文件，找到：

```json
{ "key": "ai-user-count", "value": "1,284", "mom": "+12.3%", "trend": "up" }
```

改成：

```json
{ "key": "ai-user-count", "value": "9,999", "mom": "+99.9%", "trend": "up" }
```

保存，浏览器 Ctrl+F5。

### 4.2 改 KPI / 列的显示标签

KPI 标签和表格列标签在 `config.json` 而不是 `data.json`，要拷的是 config：

```powershell
copy apps\web\public\mock\reports\design\config.json `
     apps\web\public\user-data\reports\design\config.json
```

编辑 config.json，把 `"label": "AI用户数"` 改成 `"label": "本月活跃用户"`，刷新即可。

### 4.3 改部门下拉列表

想在所有页面的"部门"筛选器里改下拉项：

```powershell
copy apps\web\public\mock\dropdowns\departments.json `
     apps\web\public\user-data\dropdowns\departments.json
```

编辑里面的 items 数组。注意：所有报表页共享这个文件，改一处全站生效。

### 4.4 改左侧导航项 / 菜单顺序

```powershell
copy apps\web\public\mock\nav.json `
     apps\web\public\user-data\nav.json
```

## 5. 撤销 / 禁用某个覆盖

| 想要什么 | 怎么做 |
|---|---|
| 临时停用一个覆盖 | 把 `user-data/<path>.json` 改名为 `<path>.json.bak`（或随便加个后缀）。刷新整页即回落到 mock。 |
| 彻底删除一个覆盖 | 直接删 `user-data/<path>.json`。刷新整页生效。 |
| 一次性清空所有覆盖 | `rd /s /q apps\web\public\user-data\reports`（保留 `_examples/` 和 `README.md`）。 |
| 完全关闭 user-data 机制 | `nuxt.config.ts` 里把 `userDataBase` 设成空字符串 `''`，或干脆删掉这个字段（拿到默认 `/user-data` 后做 fetch 全部 404 回落，但有 console 噪音）。**推荐**直接清空 user-data 目录而不是关机制。 |

## 6. 版本控制

根 `.gitignore` 已加：

```
apps/web/public/user-data/*
!apps/web/public/user-data/README.md
!apps/web/public/user-data/_examples/
```

效果：
- `_examples/` 和 `README.md` 进 git（团队共享模板和说明）
- 其它你拷出来的覆盖文件 **不进 git**（本机生效）
- `git status` 不会被你的覆盖文件刷屏

要把某个覆盖共享给团队 → 直接改 `apps/web/public/mock/` 里的源文件，走正常 PR 流程。

## 7. 调试 / 排错

### 我改了文件但页面没反应

依次检查：

1. **路径对吗？** `user-data/<这里>` 必须跟 `mock/<这里>` 完全一致（不含 `mock/` 前缀）。例：
   ```
   mock/reports/design/data.json
        ↓
   user-data/reports/design/data.json   ✓
   user-data/mock/reports/design/data.json   ✗ 多了 mock/
   user-data/_examples/reports/design/data.json   ✗ 在 _examples 子目录里，不会被加载
   ```

2. **整页强刷了吗？** 新增 user-data 文件必须 Ctrl+F5。会话级缓存只有强刷才重置。

3. **JSON 合法吗？** 浏览器 DevTools → Network → `/user-data/reports/design/data.json` 看响应。
   - 200 但页面没变 → JSON 语法 / 形状有问题（看 Console 报错）
   - 404 → 文件路径错了，回到第 1 步

4. **JSON 字段全了吗？** 整文件替换不合并，缺字段直接渲染空。建议从 mock 拷整文件后再改。

### 浏览器 Console 出现 404 噪音

正常现象。useDataSource 第一次访问每个路径时都会试探 user-data，没有覆盖文件就 404。本会话不会再试第二次。

要消除噪音 → 提供覆盖文件，或者把 `userDataBase` 设成一个不存在的 URL（也会噪音但更少）。

### 真后端模式还会读 user-data 吗？

不会。`runtimeConfig.public.dataSourceMode = 'api'` 时 useDataSource 走 API 分支，完全不碰 user-data。这层只在 JSON / 演示阶段起作用。

## 8. 涉及代码

| 文件 | 改动 |
|---|---|
| [apps/web/app/composables/use-data-source.ts](../apps/web/app/composables/use-data-source.ts) | JSON 模式下增加 user-data 优先回落逻辑 |
| [apps/web/nuxt.config.ts](../apps/web/nuxt.config.ts) | `runtimeConfig.public.userDataBase = '/user-data'` |
| [apps/web/public/user-data/README.md](../apps/web/public/user-data/README.md) | 目录就地说明（短版） |
| [apps/web/public/user-data/\_examples/](../apps/web/public/user-data/_examples/) | 示例文件（data + config 各一） |
| [.gitignore](../.gitignore) | 忽略 user-data 下用户文件 |
