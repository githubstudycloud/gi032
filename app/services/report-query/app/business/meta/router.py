"""健康检查 + 通用 dropdowns。"""

from __future__ import annotations

from fastapi import APIRouter

from app.business.reports.repo import get_dropdown
from app.framework.envelope import ok

router = APIRouter(tags=["meta"])


@router.get("/healthz")
def healthz() -> dict[str, object]:
    """活性探针。Nuxt 前端启动时也用它探后端是否就绪。"""
    return ok({"status": "ok"})


@router.get("/dropdowns/{code}")
def read_dropdown(code: str) -> dict[str, object]:
    """通用下拉数据。DB 优先（dim_dropdown_option），找不到回落 mock JSON。"""
    items = get_dropdown(code)
    return ok({"items": items})
