"""Fixture 加载器 —— 直接消费前端的 mock 数据，零 DB 即可跑通。

后端落 DB 后保留这层做兜底（按 env REPORT_QUERY_USE_FIXTURES=true 切换）。
"""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

# 服务目录: services/report-query/
# 仓库根:   ../../
# 前端 mock: ../../apps/web/public/mock/
_SERVICE_ROOT = Path(__file__).resolve().parents[2]
_REPO_ROOT = _SERVICE_ROOT.parents[1]
_MOCK_ROOT = _REPO_ROOT / "apps" / "web" / "public" / "mock"


def _read_json(path: Path) -> Any | None:
    if not path.is_file():
        return None
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


@lru_cache(maxsize=64)
def load_report_config(report_type: str) -> dict[str, Any] | None:
    """读 apps/web/public/mock/reports/<type>/config.json。"""
    return _read_json(_MOCK_ROOT / "reports" / report_type / "config.json")


@lru_cache(maxsize=64)
def load_report_data(report_type: str) -> dict[str, Any] | None:
    """读 apps/web/public/mock/reports/<type>/data.json。"""
    return _read_json(_MOCK_ROOT / "reports" / report_type / "data.json")


@lru_cache(maxsize=64)
def load_dropdown(code: str) -> list[dict[str, Any]]:
    """读 apps/web/public/mock/dropdowns/<code>.json。"""
    raw = _read_json(_MOCK_ROOT / "dropdowns" / f"{code}.json")
    if raw is None:
        return []
    if isinstance(raw, dict):
        items = raw.get("items", [])
        return list(items) if isinstance(items, list) else []
    if isinstance(raw, list):
        return list(raw)
    return []
