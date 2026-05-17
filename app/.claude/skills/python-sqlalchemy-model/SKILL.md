---
name: python-sqlalchemy-model
description: Add or modify SQLAlchemy 2.x ORM models with multi-DB compatibility (MySQL 5.7+/8.0/PostgreSQL/SQLite), proper indexes, soft delete patterns, and migration awareness. Use when the user asks to "add a table", "model X", "create ORM for Y", or when touching app/models.py.
---

# python-sqlalchemy-model

## 必守

1. **基类**：所有 model 继承项目内 `Base(DeclarativeBase)`，不用 `declarative_base()`。
2. **2.x 风格**：`Mapped[T]` + `mapped_column(...)`，不用旧的 `Column(...)`。
3. **多 DB 兼容**：表参数用 `__table_args__` + 项目级 helper 自动跳过非 MySQL 不支持的字段（charset/collation/engine）。
4. **主键**：用 `id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)`，**不要 UUID 当主键**（除非有强需求）。
5. **时间戳**：`created_at` / `updated_at` 默认带，`server_default=func.now()`，`onupdate=func.now()`。
6. **索引**：查询字段必须有索引；多字段联合索引按 `(高基数, 低基数)` 顺序。
7. **软删除**：用 `deleted_at: Mapped[datetime | None]`，**不要物理删**（除非历史无意义）。
8. **多版本数据**：用版本号 + 软失效标记表（参考 gi031 `ai_metric_invalid_mark`），别直接 update 历史。

## MySQL 5.7 / 8.0 注意

- 默认 charset `utf8mb4`，collation `utf8mb4_unicode_ci`（5.7）或 `utf8mb4_0900_ai_ci`（8.0）。项目级 `MYSQL_TABLE_ARGS` 自动选。
- 索引名加表前缀（`idx_<table>_<col>`）便于排查。
- 5.7 不支持 `JSON_TABLE`，复杂 JSON 查询用应用层解析。
- VARCHAR 长度按业务上限给，不要 `VARCHAR(255)` 一把梭（utf8mb4 下会浪费索引页）。

## 范例

```python
from __future__ import annotations
from datetime import datetime
from sqlalchemy import BigInteger, DateTime, Index, String, func
from sqlalchemy.orm import Mapped, mapped_column
from app.db import Base

class MetricDef(Base):
    __tablename__ = "metric_def"
    __table_args__ = (
        Index("idx_metric_def_category_status", "category", "status"),
        {"mysql_engine": "InnoDB", "mysql_charset": "utf8mb4"},
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    category: Mapped[str] = mapped_column(String(32), default="business", nullable=False)
    status: Mapped[str] = mapped_column(String(16), default="active", nullable=False)
    owner: Mapped[str | None] = mapped_column(String(64), nullable=True)
    formula: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
```

## 反模式

- 字符串 `Column("col_name", String)` → 用 `Mapped[str] = mapped_column(...)`
- 主键用 `String(32)`（UUID）但没索引策略 → 用 `BigInteger autoincrement`
- 所有字符串都 `String(255)` → 按业务上限
- 没有 created_at / updated_at → 追溯都没法做
- 全大写表名 / 字段名 → 用 snake_case
- 物理删 + 没保留历史 → 用软删除
