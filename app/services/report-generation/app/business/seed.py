"""数据 seed —— 把前端 mock 文件灌入 DB，让查询服务有真东西可读。

调用方式：
    uv run python -m app.business.seed              # 默认 SQLite，幂等
    uv run python -m app.business.seed --reset      # 先 drop 全部表再灌

也通过 POST /api/admin/seed 暴露，方便容器里调用。
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import sys
from datetime import date
from pathlib import Path

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.framework.db import Base, SessionLocal, engine
from app.framework.models import DimDropdownOption, MetricDef, ReportSnapshot

log = logging.getLogger("seed")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

# 优先用环境变量 SEED_MOCK_PATH（docker bind mount），否则推 monorepo 相对路径
_ENV_PATH = os.environ.get("SEED_MOCK_PATH")
if _ENV_PATH:
    _MOCK_ROOT = Path(_ENV_PATH)
elif Path("/seed-mock").is_dir():
    _MOCK_ROOT = Path("/seed-mock")
else:
    # __file__ = services/report-generation/app/business/seed.py
    # parents[4] = monorepo 根（Phase 4 拆分后比之前多一层 business/）
    _REPO_ROOT = Path(__file__).resolve().parents[4]
    _MOCK_ROOT = _REPO_ROOT / "apps" / "web" / "public" / "mock"

REPORT_TYPES = ("summary", "industry", "domain", "design", "codegen")
DROPDOWN_CODES = ("departments", "time-ranges")


def _read_json(path: Path) -> object:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def seed_reports(session: Session, snapshot_day: date) -> int:
    """灌每个报表的 config + data。"""
    n = 0
    for rt in REPORT_TYPES:
        for kind in ("config", "data"):
            src = _MOCK_ROOT / "reports" / rt / f"{kind}.json"
            if not src.is_file():
                log.warning("missing fixture: %s", src)
                continue
            payload = json.dumps(_read_json(src), ensure_ascii=False)

            existing = session.scalar(
                select(ReportSnapshot).where(
                    ReportSnapshot.report_type == rt,
                    ReportSnapshot.kind == kind,
                    ReportSnapshot.snapshot_date == snapshot_day,
                )
            )
            if existing:
                existing.payload_json = payload
            else:
                session.add(ReportSnapshot(
                    report_type=rt, snapshot_date=snapshot_day,
                    kind=kind, payload_json=payload,
                ))
            n += 1
    return n


def seed_dropdowns(session: Session) -> int:
    """灌通用下拉（部门 / 时间范围）。"""
    n = 0
    for code in DROPDOWN_CODES:
        src = _MOCK_ROOT / "dropdowns" / f"{code}.json"
        if not src.is_file():
            log.warning("missing dropdown fixture: %s", src)
            continue
        raw = _read_json(src)
        items_raw = raw.get("items", []) if isinstance(raw, dict) else raw
        if not isinstance(items_raw, list):
            log.warning("dropdown %s: unexpected shape, skipping", code)
            continue
        items: list[dict[str, object]] = items_raw
        # 清旧的，重灌
        session.execute(delete(DimDropdownOption).where(DimDropdownOption.code == code))
        for i, it in enumerate(items):
            session.add(DimDropdownOption(
                code=code,
                value=str(it.get("value", "")),
                label=str(it.get("label", "")),
                sort_order=i,
                enabled=1,
            ))
            n += 1
    return n


def seed_metrics(session: Session) -> int:
    """灌指标管理表 ——
    从 summary config.json 的 kpi.groups[*].items[*] 里抽 key / label / unit / description。
    """
    cfg_path = _MOCK_ROOT / "reports" / "summary" / "config.json"
    if not cfg_path.is_file():
        log.warning("summary config not found for metric seed")
        return 0
    cfg = _read_json(cfg_path)
    if not isinstance(cfg, dict):
        return 0
    groups = (cfg.get("kpi") or {}).get("groups") or []

    seeded_codes: set[str] = set()
    n = 0
    for g in groups:
        cat = g.get("key", "business")
        for it in g.get("items", []):
            code = it.get("key")
            if not code or code in seeded_codes:
                continue
            existing = session.scalar(select(MetricDef).where(MetricDef.code == code))
            payload = {
                "code": code,
                "name": it.get("label", code),
                "category": cat,
                "data_source": "AI 平台埋点",
                "status": "active",
                "owner": "数据组",
                "unit": it.get("unit"),
                "description": (it.get("description") or "").split("\n", 1)[0],
            }
            if existing:
                for k, v in payload.items():
                    setattr(existing, k, v)
            else:
                session.add(MetricDef(**payload))
            seeded_codes.add(code)
            n += 1
    return n


def run(reset: bool = False) -> dict[str, int]:
    if reset:
        log.info("--reset: dropping all tables")
        Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)

    today = date.today()
    counts: dict[str, int] = {}
    with SessionLocal() as session:
        counts["reports"] = seed_reports(session, today)
        counts["dropdowns"] = seed_dropdowns(session)
        counts["metrics"] = seed_metrics(session)
        session.commit()

    log.info("seed done: %s", counts)
    return counts


def main() -> int:
    parser = argparse.ArgumentParser(description="seed report-generation DB from mock fixtures")
    parser.add_argument("--reset", action="store_true", help="drop tables first")
    args = parser.parse_args()
    run(reset=args.reset)
    return 0


if __name__ == "__main__":
    sys.exit(main())
