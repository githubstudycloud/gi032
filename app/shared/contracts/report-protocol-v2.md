# 报表协议 V2（前后端契约）

详细文档见 [`docs/report-platform-v2.md`](../../docs/report-platform-v2.md)。本文件作为**单点入口**，列出三处必须同步的地方：

| 协议字段 | 前端 (TS) | 后端 (Python) | Mock fixture |
|---|---|---|---|
| `ReportConfig` | `apps/web/app/types/report-config.ts` | `services/report-query/app/schemas.py` | `apps/web/public/mock/reports/<type>/config.json` |
| `ReportData` | 同上 | 同上 | `apps/web/public/mock/reports/<type>/data.json` |
| 钻取 (`DrilldownDef`) | 同上 | 同上 | （动态接口，无固定 mock） |

## 修改流程

1. 改 `docs/report-platform-v2.md` 描述 + 例子。
2. 改前端 TS：`apps/web/app/types/report-config.ts`。
3. 改后端 Pydantic：`services/report-query/app/schemas.py`（+ `services/report-generation/...` 如有写入路径）。
4. 改 mock fixture：相应 JSON。
5. 跑 `apps/web/tests/mock-fixtures.spec.ts` —— 引用一致性回归。
6. 跑 `services/report-query/tests/test_smoke.py` —— 后端契约回归。

任何一处漏改，CI 都会挂。
