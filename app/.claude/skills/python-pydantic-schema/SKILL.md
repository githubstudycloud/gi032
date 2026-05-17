---
name: python-pydantic-schema
description: Design and create a Pydantic v2 schema (request / response / config model) with strict mode, proper defaults, validators, and shared contract sync. Use when the user asks to "add a model", "create a schema for X", "design the request body", or when extending app/schemas.py.
---

# python-pydantic-schema

写 Pydantic v2 模型时按以下规约。

## 必守

1. **基类**：业务 schema 都继承一个项目内的 `StrictModel`（`ConfigDict(extra="forbid", str_strip_whitespace=True)`），杜绝陌生字段悄悄写入。
2. **类型注解**：`from __future__ import annotations` + 所有字段标类型（包括 `Literal` 枚举）。
3. **默认值**：用 `Field(default_factory=list)` / `Field(default_factory=dict)`，**绝不** `= []` / `= {}` / `Field(default=[])`。
4. **可选 vs 必填**：必填字段不给默认值；可选字段标 `T | None = None`（不是 `Optional[T]`）。
5. **校验**：用 `field_validator` / `model_validator`，**不要**在调用方做防御性检查。
6. **配置**：`model_config = ConfigDict(...)`，**不要** `class Config:`（v1 写法）。

## 跨语言一致性

任何新 Pydantic 模型如果跨前后端：
1. 改 `services/<service>/app/schemas.py`
2. 改 `apps/web/app/types/*.ts`
3. 改 `shared/contracts/...`
4. 改 mock fixture 让结构与模型一致

漏改 → 测试挂。

## 范例

```python
from __future__ import annotations
from typing import Annotated, Any, Literal
from pydantic import BaseModel, ConfigDict, Field, field_validator

class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

class QueryRequest(StrictModel):
    filters: dict[str, Any] = Field(default_factory=dict)
    page: int = Field(default=1, ge=1, le=10000)
    page_size: int = Field(default=20, ge=1, le=200)
    sort: list[dict[str, str]] = Field(default_factory=list)
    compare: Literal["none", "prev_period", "prev_year"] = "none"

    @field_validator("filters")
    @classmethod
    def _strip_empty(cls, v: dict[str, Any]) -> dict[str, Any]:
        return {k: x for k, x in v.items() if x not in (None, "", [])}
```

## 反模式

- 多字段都是 `Any` → 应该具体类型（即使是 `Literal["a","b"]` 也比 `str` 强）
- 用 `dataclass` 而非 `BaseModel`（除非只是值容器） → 推荐 BaseModel
- 在 schema 里 `__init__` 改默认 → 用 validator
- `Optional[X]` 而非 `X | None`（项目 target Py 3.12+）
- `from typing import List, Dict, Optional` → 用 builtin `list / dict` + `T | None`
