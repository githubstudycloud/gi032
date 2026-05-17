"""环境驱动配置。读 .env / 环境变量，不在代码里写死任何 URL / 密钥。"""

from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """查询服务运行时配置。"""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    service_name: str = "report-query"
    api_prefix: str = "/api"
    host: str = "127.0.0.1"
    port: int = 8001

    # 数据库 ——
    # MySQL 5.7:  mysql+pymysql://user:pwd@host:3306/db?charset=utf8mb4
    # MySQL 8.0:  同上（PyMySQL 兼容 5.7/8.0）
    # PostgreSQL: postgresql+psycopg://user:pwd@host:5432/db
    # SQLite:     sqlite:///./report_query.db
    database_url: str = "sqlite:///./report_query.db"
    database_echo: bool = False
    database_pool_size: int = 5
    database_pool_recycle: int = 1800  # MySQL wait_timeout 默认 28800，提前回收

    # CORS —— 前端 dev 走 127.0.0.1:3000
    cors_origins: list[str] = Field(default_factory=lambda: ["http://127.0.0.1:3000", "http://localhost:3000"])

    # 缓存 ——
    config_cache_ttl_seconds: int = 60

    # 调试 ——
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = "INFO"


@lru_cache
def get_settings() -> Settings:
    """单例 settings。lru_cache 让 FastAPI 依赖注入零成本。"""
    return Settings()
