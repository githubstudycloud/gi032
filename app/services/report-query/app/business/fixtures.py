"""Fixture 加载器 —— 直接消费前端的 mock 数据，零 DB 即可跑通。

后端落 DB 后保留这层做兜底（按 env REPORT_QUERY_USE_FIXTURES=true 切换）。
"""

from __future__ import annotations

import json
import os
from functools import lru_cache
from pathlib import Path
from typing import Any

# 服务目录: services/report-query/
# 仓库根:   ../../
# 前端 mock: ../../apps/web/public/mock/
#
# 容器内布局是 /app/app/services/fixtures.py，_SERVICE_ROOT=/app，
# 没有 parents[1]，硬算会 IndexError 让模块 import 直接挂。
# 这里两种形态都能兜：
#   - dev：parents[2].parents[1]/apps/web/public/mock 命中
#   - docker：路径不存在 → _read_json 自动返回 None；env REPORT_MOCK_PATH 可显式覆盖
_SERVICE_ROOT = Path(__file__).resolve().parents[2]
_repo_parents = _SERVICE_ROOT.parents
_default_mock = (
    _repo_parents[1] / "apps" / "web" / "public" / "mock"
    if len(_repo_parents) >= 2
    else Path("/nonexistent-mock")
)
_MOCK_ROOT = Path(os.environ.get("REPORT_MOCK_PATH") or _default_mock)


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


# —— chrome 配置：branding / nav / fonts / themes ————————

@lru_cache(maxsize=1)
def load_branding() -> dict[str, Any] | None:
    """品牌 logo / 名称 / 版本。"""
    raw = _read_json(_MOCK_ROOT / "branding.json")
    return raw if isinstance(raw, dict) else None


@lru_cache(maxsize=1)
def load_nav() -> dict[str, Any] | None:
    """全站导航树。"""
    raw = _read_json(_MOCK_ROOT / "nav.json")
    return raw if isinstance(raw, dict) else None


@lru_cache(maxsize=1)
def load_fonts() -> dict[str, Any] | None:
    """字体切换器配置。"""
    raw = _read_json(_MOCK_ROOT / "fonts.json")
    return raw if isinstance(raw, dict) else None


@lru_cache(maxsize=1)
def load_themes() -> dict[str, Any] | None:
    """主题切换器配置。"""
    raw = _read_json(_MOCK_ROOT / "themes.json")
    return raw if isinstance(raw, dict) else None


@lru_cache(maxsize=1)
def load_admin_metrics_page() -> dict[str, Any] | None:
    """指标管理页 page_config + items 一锅端 —— 跟 chrome 配置一类。

    真接生产时拆成 (page_config from query / items from generation)；现阶段
    保持单端点降低前端切 api 模式的迁移成本。
    """
    raw = _read_json(_MOCK_ROOT / "admin" / "metrics.json")
    return raw if isinstance(raw, dict) else None
