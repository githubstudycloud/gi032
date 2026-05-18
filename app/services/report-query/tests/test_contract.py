"""协议契约测试 —— 把所有 mock fixture 喂给 Pydantic 校验，防止漂移。

后端 Pydantic = source of truth。任何 mock 形状或 schema 字段变更必须保持兼容：
- mock 多/缺/类型不对 → 测试挂
- response_model 在路由层强制校验同形 schema，本测试是更早的回归网

涵盖：
- 8 个 report type 的 config.json + data.json
- 4xx envelope handler（HTTPException / 422 RequestValidationError 形状）
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.main import create_app
from app.schemas import ReportConfig, ReportData

# mock 根目录（从 services/report-query/ 出发向上回到仓库根，再进 apps/web/public/mock）
_MOCK_ROOT = Path(__file__).resolve().parents[3] / "apps" / "web" / "public" / "mock" / "reports"

# 当前 8 个 report type；新增 mock 目录会被自动发现
_REPORT_TYPES = sorted(p.name for p in _MOCK_ROOT.iterdir() if p.is_dir())


@pytest.fixture
def client() -> TestClient:
    return TestClient(create_app())


@pytest.mark.parametrize("report_type", _REPORT_TYPES)
def test_mock_config_passes_pydantic(report_type: str) -> None:
    """所有 mock config.json 必须通过 ReportConfig 严格校验（extra="forbid"）。"""
    cfg_path = _MOCK_ROOT / report_type / "config.json"
    raw = json.loads(cfg_path.read_text(encoding="utf-8"))
    try:
        ReportConfig.model_validate(raw)
    except ValidationError as e:
        pytest.fail(f"{report_type}/config.json 与 ReportConfig schema 漂移:\n{e}")


@pytest.mark.parametrize("report_type", _REPORT_TYPES)
def test_mock_data_passes_pydantic(report_type: str) -> None:
    """所有 mock data.json 必须通过 ReportData 严格校验。"""
    data_path = _MOCK_ROOT / report_type / "data.json"
    if not data_path.exists():
        pytest.skip(f"{report_type}/data.json 不存在")
    raw = json.loads(data_path.read_text(encoding="utf-8"))
    try:
        ReportData.model_validate(raw)
    except ValidationError as e:
        pytest.fail(f"{report_type}/data.json 与 ReportData schema 漂移:\n{e}")


# —— 4xx envelope 形状回归 ——————————————————————————

def test_404_returns_envelope(client: TestClient) -> None:
    """HTTPException 404 必须经过 http_exception_handler 包成 envelope。"""
    r = client.get("/api/reports/__nope__/config")
    assert r.status_code == 404
    body = r.json()
    # envelope 三字段必须齐全；code 与 http status 同步
    assert body["code"] == 404
    assert isinstance(body["message"], str) and len(body["message"]) > 0
    assert isinstance(body["trace_id"], str) and len(body["trace_id"]) == 32  # uuid4.hex
    # data 为 None 不允许返回 FastAPI 默认的 {"detail": "..."}
    assert "detail" not in body


def test_422_returns_envelope_with_issues(client: TestClient) -> None:
    """RequestValidationError 必须包成 envelope，code=40001，data.issues 含 Pydantic 错误明细。"""
    # 故意打错请求体：filters 字段类型错（应是 dict，给数组），page 给非数字
    r = client.post(
        "/api/reports/industry/data",
        json={"filters": [1, 2, 3], "page": "not-a-number"},
    )
    assert r.status_code == 422
    body = r.json()
    assert body["code"] == 40001
    assert isinstance(body["message"], str)
    assert isinstance(body["trace_id"], str) and len(body["trace_id"]) == 32
    assert "issues" in body["data"]
    assert isinstance(body["data"]["issues"], list)
    assert len(body["data"]["issues"]) >= 1


# —— response_model 漂移护栏 —————————————————————————

def test_config_response_preserves_camelcase_aliases(client: TestClient) -> None:
    """``response_model_by_alias=True`` 必须让 goodColor / cellType 输出 camelCase，
    而不是 Python 字段名 good_color / cell_type；前端依赖 camelCase。"""
    r = client.get("/api/reports/industry/config")
    assert r.status_code == 200
    cfg = r.json()["data"]
    # industry mock 的 KPI 阈值带 goodColor
    kpi_items = cfg["kpi"]["groups"][1]["items"]
    threshold_item = next(it for it in kpi_items if it.get("threshold"))
    assert "goodColor" in threshold_item["threshold"]
    assert "good_color" not in threshold_item["threshold"]
    # industry mock 的最后一列带 cellType
    actions_col = next(
        c for c in cfg["primary_view"]["tabs"][0]["header_tree"] if c["key"] == "actions"
    )
    assert actions_col.get("cellType") == "action"
    assert "cell_type" not in actions_col
