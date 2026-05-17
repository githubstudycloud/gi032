# shared/

跨项目共享的契约。当前里面是规约文档，后续会加：

- `contracts/openapi/` — 各 service 暴露的 OpenAPI schema（用 `uv run python -m app ... dump-openapi` 导出）
- `contracts/protocol/` — V2 协议示例 + JSON Schema（前后端 review 必看）
- `fixtures/` — 链接到 `apps/web/public/mock/` 的契约级别约束

**唯一规则**：任何字段改动要先改这里、再改 services/* 的 schemas.py 和 apps/web/app/types/report-config.ts。三处保持同步。
