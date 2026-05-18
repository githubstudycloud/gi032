"""跟 report-query 共用同款信封（暂时复制；后续抽到 shared/）。"""

from __future__ import annotations

import uuid
from typing import Any

from pydantic import BaseModel, Field


class Envelope[T](BaseModel):
    code: int = 0
    message: str = "ok"
    trace_id: str = Field(default_factory=lambda: uuid.uuid4().hex)
    data: T | None = None


def ok(data: Any = None) -> dict[str, Any]:
    return Envelope[Any](data=data).model_dump()


def fail(code: int, message: str, data: Any = None) -> dict[str, Any]:
    return Envelope[Any](code=code, message=message, data=data).model_dump()
