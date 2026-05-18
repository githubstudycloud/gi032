"""查询服务入口（只读）。

启动命令：
    uv run uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload

约定：
    - 这里只挂只读路由（config / data / drilldown / meta）。
    - 不挂任何 admin / ingest，避免误暴露写权限。
    - 同库不同端口跟 report-generation 协作，详见 docs/api-split-plan.md。
"""

from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api import chrome as chrome_router
from app.api import config as config_router
from app.api import data as data_router
from app.api import drilldown as drilldown_router
from app.api import meta as meta_router
from app.envelope import fail
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

    @app.exception_handler(HTTPException)
    async def http_exception_handler(_req: Request, exc: HTTPException) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content=fail(code=exc.status_code, message=str(exc.detail)),
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        _req: Request, exc: RequestValidationError,
    ) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=fail(
                code=40001,
                message="请求参数校验失败",
                data={"issues": exc.errors()},
            ),
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(_req: Request, exc: Exception) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=fail(code=500, message=f"未捕获异常: {exc.__class__.__name__}"),
        )

    app.include_router(meta_router.router, prefix=settings.api_prefix)
    app.include_router(chrome_router.router, prefix=settings.api_prefix)
    app.include_router(config_router.router, prefix=settings.api_prefix)
    app.include_router(data_router.router, prefix=settings.api_prefix)
    app.include_router(drilldown_router.router, prefix=settings.api_prefix)

    return app


app = create_app()
