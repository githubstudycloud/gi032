"""仓储层 —— DB 读 + fixture 回落。

策略：
  - 先查 DB；查到了就返回。
  - 表不存在 / 行不存在 / DB 不可用 → 回落到读 apps/web/public/mock/。

这样让前端 / 集成测试随时可跑（即使 DB 没数据），同时让真后端能逐步接管。
"""

from __future__ import annotations

import json
import logging
from typing import Any

from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.models import DimDropdownOption, ReportSnapshot
from app.services.fixtures import (
    load_dropdown as load_dropdown_fixture,
)
from app.services.fixtures import (
    load_report_config as load_report_config_fixture,
)
from app.services.fixtures import (
    load_report_data as load_report_data_fixture,
)

log = logging.getLogger(__name__)


def _latest_snapshot(session: Session, report_type: str, kind: str) -> str | None:
    stmt = (
        select(ReportSnapshot.payload_json)
        .where(ReportSnapshot.report_type == report_type, ReportSnapshot.kind == kind)
        .order_by(ReportSnapshot.snapshot_date.desc(), ReportSnapshot.id.desc())
        .limit(1)
    )
    return session.scalar(stmt)


def _parse_json(raw: str) -> dict[str, Any] | None:
    parsed = json.loads(raw)
    return parsed if isinstance(parsed, dict) else None


def get_report_config(report_type: str) -> dict[str, Any] | None:
    """DB 优先，找不到回落 fixture。"""
    try:
        with SessionLocal() as session:
            raw = _latest_snapshot(session, report_type, "config")
            if raw:
                return _parse_json(raw)
    except SQLAlchemyError as exc:
        log.warning("DB read failed (config %s): %s; falling back to fixture", report_type, exc)
    return load_report_config_fixture(report_type)


def get_report_data(report_type: str) -> dict[str, Any] | None:
    try:
        with SessionLocal() as session:
            raw = _latest_snapshot(session, report_type, "data")
            if raw:
                return _parse_json(raw)
    except SQLAlchemyError as exc:
        log.warning("DB read failed (data %s): %s; falling back to fixture", report_type, exc)
    return load_report_data_fixture(report_type)


def get_dropdown(code: str) -> list[dict[str, Any]]:
    """优先 DB；不可用回落 fixture。"""
    try:
        with SessionLocal() as session:
            rows = session.scalars(
                select(DimDropdownOption)
                .where(DimDropdownOption.code == code, DimDropdownOption.enabled == 1)
                .order_by(DimDropdownOption.sort_order, DimDropdownOption.id)
            ).all()
            if rows:
                return [{"value": r.value, "label": r.label} for r in rows]
    except SQLAlchemyError as exc:
        log.warning("DB read failed (dropdown %s): %s; falling back to fixture", code, exc)
    return load_dropdown_fixture(code)
