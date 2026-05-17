---
name: python-fastapi-route
description: Output a structured route specification before writing any FastAPI endpoint code. Use whenever the user asks to "add an endpoint", "create POST /xxx", "expose API for ...", or before scaffolding a new router. Forces contract-first instead of code-first.
---

# python-fastapi-route

When adding a new FastAPI endpoint, output the specification table **before** writing any Python code.

## 规约表（必填）

```
Endpoint:   POST /api/xxx/yyy
Auth:       none | admin (Depends(require_admin)) | user
Service:    report-query | report-generation
Router:     app/api/<file>.py
Tag:        <openapi tag>

Request body (Pydantic):
  - field_a: str           (required)
  - field_b: int = 1       (default)
  - filter: dict[str, Any] = Field(default_factory=dict)

Path / Query params:
  - report_type: str        (path)
  - page: int = 1           (query)

Response (Envelope[T] where T = ...):
  - data: { items: list[...], page, page_size, total, has_more }
  - errors: 400 (validation), 404 (not found), 401 (no token if admin)

DB touch:
  - read:   select(...) from <table>
  - write:  N/A | upsert <table>
  - session: get_session (commit / rollback rules)

Side effects:
  - schedule a job? send email? bump counter?
  - 必须列出，否则就该是只读

Tests to write:
  - happy path
  - 4xx case
  - if admin: 401 / 403 / 200
```

## 检查清单

- [ ] 选对 service（只读走 query，写走 generation）
- [ ] Pydantic 模型 `extra="forbid"`（除非有意接陌生字段）
- [ ] Annotated[T, Path/Query/Header] 而不是默认值魔法
- [ ] `session.commit()` 只在生成服务里；查询服务不写
- [ ] 任何错误路径都返回 envelope（裸 HTTPException 由全局 handler 转）
- [ ] OpenAPI tag 设了

## 反模式

- 直接 `@app.post(...)` 挂到 main app，不写 router → ❌
- 用 `dict` / `Any` 接请求体 → ❌
- 在路由里写裸 SQL 字符串 → ❌
- 同步 IO（requests / time.sleep）→ ❌（用 httpx + async / 后台任务）
- 把业务逻辑写进路由函数 → ❌（拆到 `app/services/<file>.py`）

输出完规约表后，再写：(1) 路由代码；(2) services/ 层业务函数；(3) tests/ 用例。
