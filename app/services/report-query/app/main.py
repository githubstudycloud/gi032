"""查询服务入口（只读）。

启动命令：
    uv run uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload

约定：
    - 这里只挂只读路由（config / data / drilldown / meta / chrome）。
    - 不挂任何 admin / ingest，避免误暴露写权限。
    - 同库不同端口跟 report-generation 协作，详见 docs/api-split-plan.md。

分层（Phase 4 framework/business 拆分后）：
    - ``app/framework/``: envelope / db / schemas / exceptions —— 业务无关
    - ``app/business/``:  reports / chrome / meta —— 按域分子模块
"""

from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.business.chrome import router as chrome_router
from app.business.meta import router as meta_router
from app.business.reports import config as config_router
from app.business.reports import data as data_router
from app.business.reports import drilldown as drilldown_router
from app.framework import exceptions as exception_handlers
from app.settings import get_settings


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    """启动钩子。生产用 Alembic 管表结构，dev 可在此 Base.metadata.create_all。"""
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="report-query",
        version="0.1.0",
        description="查询服务（只读）",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST"],
        allow_headers=["*"],
    )

    exception_handlers.register(app)

    app.include_router(meta_router.router, prefix=settings.api_prefix)
    app.include_router(chrome_router.router, prefix=settings.api_prefix)
    app.include_router(config_router.router, prefix=settings.api_prefix)
    app.include_router(data_router.router, prefix=settings.api_prefix)
    app.include_router(drilldown_router.router, prefix=settings.api_prefix)

    return app


app = create_app()
