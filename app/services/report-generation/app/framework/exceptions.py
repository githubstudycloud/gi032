"""全局异常 handler —— 把所有错误包成 envelope。

跟 report-query 的 framework/exceptions.py 同源；后续抽 shared/python-lib 时合并。
"""

from __future__ import annotations

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.framework.envelope import fail


def register(app: FastAPI) -> None:
    """把三个 envelope 化的 exception handler 挂到 FastAPI app。"""

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
