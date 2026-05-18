"""DB-first 读 + fixture 回落的回归测试。

策略：临时换 DATABASE_URL 到一个空 SQLite，验证 fallback；再 seed 一行进去，验证 DB 优先。
"""

from __future__ import annotations

import json
import os
import tempfile
from collections.abc import Iterator
from datetime import date

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.business.reports.repo import get_dropdown, get_report_config, get_report_data
from app.framework.models import DimDropdownOption, ReportSnapshot


@pytest.fixture
def empty_db(monkeypatch: pytest.MonkeyPatch) -> Iterator[str]:
    """换到全新空 db；模块顶层 import 的 SessionLocal 也要替换。"""
    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    url = f"sqlite:///{path}"
    monkeypatch.setenv("DATABASE_URL", url)

    # 重新 import db 模块让它读新 env —— 直接替换 SessionLocal 更稳
    from app.framework import db as db_module

    new_engine = create_engine(url, future=True)
    monkeypatch.setattr(db_module, "engine", new_engine)
    monkeypatch.setattr(
        db_module, "SessionLocal",
        sessionmaker(bind=new_engine, autoflush=False, autocommit=False, expire_on_commit=False),
    )
    # repo 模块里也是 from app.framework.db import SessionLocal —— 需要给 repo.SessionLocal 也换掉
    from app.business.reports import repo as repo_module

    monkeypatch.setattr(repo_module, "SessionLocal", db_module.SessionLocal)

    try:
        yield url
    finally:
        # Windows 上文件被 SQLAlchemy 引擎打开时无法 unlink —— 先 dispose 释放句柄
        new_engine.dispose()
        try:
            os.unlink(path)
        except OSError:
            pass  # 残留临时文件由 OS 自己清，不影响测试


def test_repo_falls_back_to_fixture_when_db_has_no_tables(empty_db: str) -> None:
    """DB 表不存在 → 回落 fixture。"""
    cfg = get_report_config("summary")
    assert cfg is not None
    assert cfg["meta"]["report_type"] == "summary"


def test_repo_falls_back_when_table_exists_but_empty(empty_db: str) -> None:
    """建空表 → 仍回落 fixture。"""
    from app.framework.db import Base, engine

    Base.metadata.create_all(engine)
    data = get_report_data("industry")
    assert data is not None
    assert "tabs" in data


def test_repo_prefers_db_when_row_present(empty_db: str) -> None:
    """DB 有 row → 拿 DB 的，不读 fixture。"""
    from app.framework.db import Base, SessionLocal, engine

    Base.metadata.create_all(engine)

    custom_payload = {"meta": {"report_type": "summary", "name": "DB-injected"}}
    with SessionLocal() as session:
        session.add(ReportSnapshot(
            report_type="summary",
            snapshot_date=date.today(),
            kind="config",
            payload_json=json.dumps(custom_payload),
        ))
        session.commit()

    cfg = get_report_config("summary")
    assert cfg is not None
    assert cfg["meta"]["name"] == "DB-injected"  # ← DB 优先证据


def test_repo_uses_latest_snapshot_when_multiple_days(empty_db: str) -> None:
    """同 report_type 多个 snapshot 时取最新日期。"""
    from app.framework.db import Base, SessionLocal, engine

    Base.metadata.create_all(engine)

    with SessionLocal() as session:
        session.add(ReportSnapshot(
            report_type="summary", snapshot_date=date(2024, 1, 1),
            kind="config", payload_json='{"meta":{"report_type":"summary","name":"OLD"}}',
        ))
        session.add(ReportSnapshot(
            report_type="summary", snapshot_date=date(2026, 1, 1),
            kind="config", payload_json='{"meta":{"report_type":"summary","name":"NEW"}}',
        ))
        session.commit()

    cfg = get_report_config("summary")
    assert cfg is not None
    assert cfg["meta"]["name"] == "NEW"


def test_dropdown_falls_back_to_fixture(empty_db: str) -> None:
    """空 DB → 下拉走 fixture。"""
    items = get_dropdown("departments")
    assert isinstance(items, list)
    assert len(items) > 0
    assert {"value", "label"} <= set(items[0].keys())


def test_dropdown_prefers_db_with_sort(empty_db: str) -> None:
    """DB 有数据时按 sort_order 排序返回。"""
    from app.framework.db import Base, SessionLocal, engine

    Base.metadata.create_all(engine)
    with SessionLocal() as session:
        session.add_all([
            DimDropdownOption(code="custom", value="b", label="Bravo", sort_order=2, enabled=1),
            DimDropdownOption(code="custom", value="a", label="Alpha", sort_order=1, enabled=1),
            DimDropdownOption(code="custom", value="c", label="Charlie", sort_order=3, enabled=0),
        ])
        session.commit()

    items = get_dropdown("custom")
    assert [it["value"] for it in items] == ["a", "b"]  # enabled=0 的不返回，按 sort_order 排
