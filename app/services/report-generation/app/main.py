"""生成服务入口（写 + 调度）。

启动命令：
    uv run uvicorn app.main:app --host 127.0.0.1 --port 8002 --workers 1

**绝对不要** `--workers > 1`：APScheduler 是进程内调度器，
多 worker 会让 ingest / preagg 重复执行，数据写入倍增。

分层（Phase 4 framework/business 拆分后）：
    - ``app/framework/``: envelope / db / models / scheduler / security / exceptions
    - ``app/business/``:  admin / ingest / meta + seed.py
"""

from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.business.admin import router as admin_router
from app.business.ingest import router as ingest_router
from app.business.meta import router as meta_router
from app.framework import exceptions as exception_handlers
from app.framework.scheduler import start_scheduler, stop_scheduler
from app.settings import get_settings


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    if settings.scheduler_enabled:
        start_scheduler()
    try:
        yield
    finally:
        stop_scheduler()


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="report-generation",
        version="0.1.0",
        description="生成服务（写 + 调度）",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE"],
        allow_headers=["*"],
    )

    exception_handlers.register(app)

    app.include_router(meta_router.router, prefix=settings.api_prefix)
    app.include_router(ingest_router.router, prefix=settings.api_prefix)
    app.include_router(admin_router.router, prefix=settings.api_prefix)

    return app


app = create_app()
