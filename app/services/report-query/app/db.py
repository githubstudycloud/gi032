"""SQLAlchemy 2.x 引擎 / Session 工厂。

支持 MySQL 5.7+ / PostgreSQL / SQLite，由 DATABASE_URL 切换。
查询服务原则上只读，不暴露 commit 接口给路由层。
"""

from __future__ import annotations

from collections.abc import Iterator

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.settings import get_settings


class Base(DeclarativeBase):
    """ORM 基类。生产建议用 Alembic 管理 schema，dev 可直接 Base.metadata.create_all。"""


def _build_engine() -> Engine:
    settings = get_settings()
    kwargs: dict[str, object] = {
        "echo": settings.database_echo,
        "future": True,
    }
    # SQLite 单文件不支持 pool_size / pool_recycle
    if not settings.database_url.startswith("sqlite"):
        kwargs["pool_size"] = settings.database_pool_size
        kwargs["pool_recycle"] = settings.database_pool_recycle
        kwargs["pool_pre_ping"] = True
    return create_engine(settings.database_url, **kwargs)


engine: Engine = _build_engine()
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)


def get_session() -> Iterator[Session]:
    """FastAPI 依赖：请求级 session。查询服务默认不 commit。"""
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
