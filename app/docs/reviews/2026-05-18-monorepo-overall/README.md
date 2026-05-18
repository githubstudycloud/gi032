# 2026-05-18 整体 Review — 运营看板 monorepo

> Review 触发：用户在 `/review` 时发现 repo 无 PR，转为"项目整体 review"。
> 范围：`apps/web` + `services/report-query` + `services/report-generation` + `shared/contracts`。
> 工具：4 个并行 review agent + ruff/mypy/pytest/vitest 自检。
> 执行：2026-05-18

## 目录

| 文件 | 内容 |
|---|---|
| [00-synthesis.md](00-synthesis.md) | 整体总结：TL;DR + 跨子项目主题 + 优先级清单 |
| [01-apps-web.md](01-apps-web.md) | apps/web（Nuxt 4，72 个 TS/Vue 文件）详细审查 |
| [02-report-query.md](02-report-query.md) | services/report-query（13 个 Python 文件）详细审查 |
| [03-report-generation.md](03-report-generation.md) | services/report-generation（13 个 Python 文件）详细审查 |
| [04-shared-contracts.md](04-shared-contracts.md) | shared/contracts + 跨项目（docker-compose / .env / scripts） |
| [99-architecture-evaluation.md](99-architecture-evaluation.md) | 架构评估：三层配置 + 表头分组 + 样式隔离 + 业务/架构分离 |

## 核心结论一句话

工具自检全绿（ruff/mypy/pytest/vitest），但**契约层全是漏洞**：前后端 schema 在 13+ 字段上对不上，envelope 4xx 没生效，文档承诺的 shadcn-vue 不存在。**lint 绿 ≠ 契约对**。

## 工具自检结果

| 项目 | ruff | mypy --strict | 测试 |
|---|---|---|---|
| services/report-query | ✅ | ✅ | pytest 20 passed |
| services/report-generation | ✅ | ✅ | pytest 20 passed |
| apps/web | — | — | vitest 5 spec 全过 |
