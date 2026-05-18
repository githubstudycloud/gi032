"""seed 命令幂等性 + 行数。"""

from __future__ import annotations

import os
import tempfile
from collections.abc import Iterator

import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker


@pytest.fixture
def isolated_db(monkeypatch: pytest.MonkeyPatch) -> Iterator[str]:
    """每个测试自己一份 SQLite，跑完删除。"""
    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    url = f"sqlite:///{path}"
    monkeypatch.setenv("DATABASE_URL", url)

    from app.business import seed as seed_module
    from app.framework import db as db_module

    new_engine = create_engine(url, future=True)
    NewSession = sessionmaker(
        bind=new_engine, autoflush=False, autocommit=False, expire_on_commit=False,
    )
    monkeypatch.setattr(db_module, "engine", new_engine)
    monkeypatch.setattr(db_module, "SessionLocal", NewSession)
    # seed.py 顶层 `from app.framework.db import Base, SessionLocal, engine`，要同步替换它的局部引用
    monkeypatch.setattr(seed_module, "engine", new_engine)
    monkeypatch.setattr(seed_module, "SessionLocal", NewSession)

    try:
        yield url
    finally:
        new_engine.dispose()
        try:
            os.unlink(path)
        except OSError:
            pass


def _counts(url: str) -> dict[str, int]:
    from app.framework.models import DimDropdownOption, MetricDef, ReportSnapshot

    engine = create_engine(url, future=True)
    Session = sessionmaker(bind=engine)
    with Session() as session:
        return {
            "snapshots": len(session.scalars(select(ReportSnapshot)).all()),
            "dropdowns": len(session.scalars(select(DimDropdownOption)).all()),
            "metrics": len(session.scalars(select(MetricDef)).all()),
        }


def test_seed_creates_expected_counts(isolated_db: str) -> None:
    """从空 DB 灌入后，三张表都有预期数量。"""
    from app.business.seed import run

    counts = run(reset=True)
    assert counts["reports"] == 10  # 5 type × 2 kind
    assert counts["dropdowns"] == 9  # 4 time-range + 5 dept
    assert counts["metrics"] >= 12   # summary KPI 数

    db_counts = _counts(isolated_db)
    assert db_counts["snapshots"] == 10
    assert db_counts["dropdowns"] == 9


def test_seed_is_idempotent(isolated_db: str) -> None:
    """第二次跑相同 mock，行数不变（upsert 行为）。"""
    from app.business.seed import run

    run(reset=True)
    counts_first = _counts(isolated_db)

    run(reset=False)  # 再来一次，不 reset
    counts_second = _counts(isolated_db)

    assert counts_first == counts_second, (
        f"seed 应该幂等，但行数变了: {counts_first} -> {counts_second}"
    )


def test_seed_reset_drops_old_data(isolated_db: str) -> None:
    """--reset 应该清掉之前的数据，不会累加。"""
    from app.business.seed import run
    from app.framework.db import SessionLocal
    from app.framework.models import DimDropdownOption

    run(reset=True)
    # 手插一条无关数据
    with SessionLocal() as session:
        session.add(DimDropdownOption(code="garbage", value="x", label="X", sort_order=0))
        session.commit()

    # reset 再灌
    run(reset=True)
    with SessionLocal() as session:
        garbage = session.scalars(
            select(DimDropdownOption).where(DimDropdownOption.code == "garbage")
        ).all()
        assert garbage == []  # 应该被 --reset 清掉
