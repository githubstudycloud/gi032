"""统一响应信封 —— 所有 API 走 {code, message, trace_id, data}。"""

from __future__ import annotations

import uuid
from typing import Any

from pydantic import BaseModel, Field


class Envelope[T](BaseModel):
    """统一响应信封。code=0 为成功，其它为错误码。"""

    code: int = 0
    message: str = "ok"
    trace_id: str = Field(default_factory=lambda: uuid.uuid4().hex)
    data: T | None = None


def ok(data: Any = None) -> dict[str, Any]:
    """成功响应。"""
    return Envelope[Any](data=data).model_dump()


def fail(code: int, message: str, data: Any = None) -> dict[str, Any]:
    """失败响应。code != 0。"""
    return Envelope[Any](code=code, message=message, data=data).model_dump()
