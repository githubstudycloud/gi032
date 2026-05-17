"""生成服务配置。与 report-query 同表不同端口。"""

from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    service_name: str = "report-generation"
    api_prefix: str = "/api"
    host: str = "127.0.0.1"
    port: int = 8002

    # dev 默认两端共享 sqlite 文件（路径相对 service 目录），prod 用 MySQL/PG
    database_url: str = "sqlite:///../shared.db"
    database_echo: bool = False
    database_pool_size: int = 5
    database_pool_recycle: int = 1800

    # admin 鉴权：dev 留空 = 跳过；prod 必填
    admin_token: str = ""

    # 调度配置（CRON 表达式）
    scheduler_enabled: bool = True
    ingest_cron: str = "0 */2 * * *"      # 每 2 小时拉一次外部数据
    preagg_cron: str = "10 */2 * * *"      # ingest 后 10 分钟刷预聚合

    cors_origins: list[str] = Field(default_factory=lambda: ["http://127.0.0.1:3000", "http://localhost:3000"])
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = "INFO"


@lru_cache
def get_settings() -> Settings:
    return Settings()
