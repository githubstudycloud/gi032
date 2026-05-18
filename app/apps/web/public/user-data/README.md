# public/user-data/ — 用户自定义覆盖层

> 在这里放同名 JSON，覆盖 `public/mock/` 里的任何数据 / 配置文件，**不动项目源码**。

## 工作机制

所有页面的数据都走 `useDataSource(opts)`（见 `app/composables/use-data-source.ts`）。
JSON 模式下的解析顺序：

1. 先试 `/user-data/<jsonPath>` —— **本目录**
2. 404 / 失败 → 回落到 `/mock/<jsonPath>` —— 项目自带 mock

整文件替换：**user-data 里这个文件存在，就完全用它**；不做合并。
所以你拷过来的 JSON 必须保持原 schema 完整，不能只贴半截字段。

## 怎么用

### 第一步：找到要改的源文件

去 `public/mock/` 找对应路径的 JSON，例如：

| 想改什么 | 源文件路径 |
| --- | --- |
| AI 辅助测试设计 — 表格数据 | `public/mock/reports/design/data.json` |
| AI 辅助测试设计 — KPI / 列定义 / 筛选器 | `public/mock/reports/design/config.json` |
| 领域落地进展 — 表格数据 | `public/mock/reports/domain/data.json` |
| 领域落地进展 — KPI / 列定义 / 筛选器 | `public/mock/reports/domain/config.json` |
| 产业落地进展 / 总览 / 代码生成 同理 | `public/mock/reports/<type>/{config,data}.json` |
| 左侧导航 | `public/mock/nav.json` |
| 部门下拉 | `public/mock/dropdowns/departments.json` |
| 主题 / 字体 / 品牌 | `public/mock/{themes,fonts,branding}.json` |
| 指标管理表 | `public/mock/admin/metrics.json` |

### 第二步：拷到 user-data 同路径

把整个文件拷过来，**保持相对路径一致**（`mock/` 前缀去掉，其它原样）：

```
public/mock/reports/design/data.json
        ↓ 拷贝
public/user-data/reports/design/data.json
```

### 第三步：改完保存，浏览器刷新即生效

不用重启 `pnpm dev`。本目录在 Nuxt 静态资源根下，文件改动会立即可访问。

> **会话级缓存**：useDataSource 会记住"本会话里哪些 user-data 路径已经 404 过"，
> 避免重复 404 噪音。所以**新增**一个 user-data 文件时，**刷新整页**才会让它被试探到。
> 修改已有的 user-data 文件不受影响。

## 示例

`_examples/` 子目录里有现成的示例文件。**这些示例不会被加载**（路径前缀不对），
仅作模板参考。要启用，拷出来放到正确路径即可：

```
_examples/reports/design/data.json    ← 不会生效（路径是 _examples/...）
              ↓ 拷出来
reports/design/data.json              ← 生效
```

示例 1：[\_examples/reports/design/data.json](_examples/reports/design/data.json) ——
把 AI 辅助测试设计页前三名部门改名 + KPI 数字加 `[CUSTOM]` 标记。

示例 2：[\_examples/reports/design/config.json](_examples/reports/design/config.json) ——
把 AI 辅助测试设计页第一个 KPI 卡片的 label 改成"自定义用户数"。

## 版本控制

本目录已 `.gitignore`：除了 `README.md` 和 `_examples/`，其它都不会进 git。
所以你的覆盖文件**只在本机生效**，不会污染团队成员的环境。

要把某个覆盖共享给团队 → 直接改 `public/mock/` 里的源文件（走正常 PR 流程）。

## 切到真后端时怎么办

`runtimeConfig.public.dataSourceMode` 改成 `'api'` 后，整个 user-data 层会**自动跳过**
（API 模式不走 user-data 优先逻辑）。所以这套机制只在 JSON / 演示阶段起效，
切真后端零迁移成本。
