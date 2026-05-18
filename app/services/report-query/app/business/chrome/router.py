"""Chrome 配置端点：branding / nav / fonts / themes。

前端 chrome（顶部 logo / 导航 / 切换器）走这 4 个端点。
DB-first 模式下也优先 fixtures（这 4 个东西很少变，没必要 DB 化；以后想换可以加表）。
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from app.business.fixtures import (
    load_admin_metrics_page,
    load_branding,
    load_fonts,
    load_nav,
    load_themes,
)
from app.framework.envelope import ok

router = APIRouter(tags=["chrome"])


@router.get("/branding")
def get_branding() -> dict[str, object]:
    raw = load_branding()
    if raw is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="branding not found")
    return ok(raw)


@router.get("/nav")
def get_nav() -> dict[str, object]:
    raw = load_nav()
    if raw is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="nav not found")
    return ok(raw)


@router.get("/fonts")
def get_fonts() -> dict[str, object]:
    raw = load_fonts()
    if raw is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="fonts not found")
    return ok(raw)


@router.get("/themes")
def get_themes() -> dict[str, object]:
    raw = load_themes()
    if raw is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="themes not found")
    return ok(raw)


@router.get("/admin/metrics")
def get_admin_metrics_page() -> dict[str, object]:
    """指标管理页配置 + 初始数据。

    注意：这是只读快照路径，跟 generation 的 /api/admin/metrics/{list,upsert,delete}
    （需要 admin token）不冲突 —— 前端 list 视图先吃这份，后续 CRUD 走 generation。
    """
    raw = load_admin_metrics_page()
    if raw is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="admin metrics page config not found",
        )
    return ok(raw)
