"""ORM 模型。

最小可用 schema：
- ReportSnapshot：每个报表的 config / data 按日期存为 JSON blob。
- DimDropdownOption：通用下拉（部门 / 时间范围等）。
- MetricDef：指标定义（id / name / category / source / status / owner / formula / 更新时间）。

后续抽更细粒度的事实表 / 维度表时，会保留 ReportSnapshot 做缓存层。
"""

from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import BigInteger, Date, DateTime, Index, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class ReportSnapshot(Base):
    """每个报表的快照。kind=config / data。同 report_type+snapshot_date+kind 唯一。"""

    __tablename__ = "report_snapshot"
    __table_args__ = (
        Index("idx_report_snapshot_lookup", "report_type", "kind", "snapshot_date"),
        {"mysql_engine": "InnoDB", "mysql_charset": "utf8mb4"},
    )

    # BigInteger on MySQL/PG, Integer on SQLite（SQLite 只对 INTEGER PRIMARY KEY 启用 ROWID 自增）
    id: Mapped[int] = mapped_column(
        BigInteger().with_variant(Integer, "sqlite"),
        primary_key=True, autoincrement=True,
    )
    report_type: Mapped[str] = mapped_column(String(64), nullable=False)
    snapshot_date: Mapped[date] = mapped_column(Date, nullable=False)
    kind: Mapped[str] = mapped_column(String(16), nullable=False)  # 'config' | 'data'
    payload_json: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False,
    )


class DimDropdownOption(Base):
    """通用下拉选项。code 对应前端 source.endpoint 末段（/dropdowns/<code>）。"""

    __tablename__ = "dim_dropdown_option"
    __table_args__ = (
        Index("idx_dropdown_code_sort", "code", "sort_order"),
        {"mysql_engine": "InnoDB", "mysql_charset": "utf8mb4"},
    )

    # BigInteger on MySQL/PG, Integer on SQLite（SQLite 只对 INTEGER PRIMARY KEY 启用 ROWID 自增）
    id: Mapped[int] = mapped_column(
        BigInteger().with_variant(Integer, "sqlite"),
        primary_key=True, autoincrement=True,
    )
    code: Mapped[str] = mapped_column(String(64), nullable=False)
    value: Mapped[str] = mapped_column(String(128), nullable=False)
    label: Mapped[str] = mapped_column(String(128), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    enabled: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False,
    )


class MetricDef(Base):
    """指标管理表。前端"指标管理" CRUD 的存储底。"""

    __tablename__ = "metric_def"
    __table_args__ = (
        Index("idx_metric_def_category_status", "category", "status"),
        {"mysql_engine": "InnoDB", "mysql_charset": "utf8mb4"},
    )

    # BigInteger on MySQL/PG, Integer on SQLite（SQLite 只对 INTEGER PRIMARY KEY 启用 ROWID 自增）
    id: Mapped[int] = mapped_column(
        BigInteger().with_variant(Integer, "sqlite"),
        primary_key=True, autoincrement=True,
    )
    code: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    category: Mapped[str] = mapped_column(String(32), default="business", nullable=False)
    data_source: Mapped[str] = mapped_column(String(128), default="", nullable=False)
    status: Mapped[str] = mapped_column(String(16), default="active", nullable=False)
    owner: Mapped[str] = mapped_column(String(64), default="", nullable=False)
    formula: Mapped[str | None] = mapped_column(String(255), nullable=True)
    unit: Mapped[str | None] = mapped_column(String(32), nullable=True)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now(), nullable=False,
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
