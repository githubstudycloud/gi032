"""健康检查 + 通用 dropdowns。"""

from __future__ import annotations

from fastapi import APIRouter

from app.envelope import ok
from app.services.fixtures import load_dropdown

router = APIRouter(tags=["meta"])


@router.get("/healthz")
def healthz() -> dict[str, object]:
    """活性探针。Nuxt 前端启动时也用它探后端是否就绪。"""
    return ok({"status": "ok"})


@router.get("/dropdowns/{code}")
def get_dropdown(code: str) -> dict[str, object]:
    """通用下拉数据。code 对应 fixtures/dropdowns/<code>.json。

    DB 落地后改成查 dim_* 表。
    """
    items = load_dropdown(code)
    return ok({"items": items})
