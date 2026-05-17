"""admin 端点鉴权。dev token 空 = 跳过；prod 必须设置。"""

from __future__ import annotations

from typing import Annotated

from fastapi import Header, HTTPException, status

from app.settings import get_settings


def require_admin(authorization: Annotated[str | None, Header()] = None) -> None:
    """Bearer token 简单鉴权。后续如果接 OAuth2 / SSO，这里换实现即可。"""
    settings = get_settings()
    expected = settings.admin_token
    if not expected:
        return  # dev 模式，跳过

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="missing or malformed Authorization header",
        )
    token = authorization.removeprefix("Bearer ").strip()
    if token != expected:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="bad admin token")
