"""Envelope 形状回归 —— 任何端点返回都必须有 {code, message, trace_id, data}。

这层测试防止有人手抖直接 return dict 跳过 envelope。
"""

from __future__ import annotations

import re

import pytest
from fastapi.testclient import TestClient

from app.main import create_app

HEX32 = re.compile(r"^[0-9a-f]{32}$")


@pytest.fixture
def client() -> TestClient:
    return TestClient(create_app())


def _assert_envelope_shape(body: dict[str, object]) -> None:
    assert set(body.keys()) >= {"code", "message", "trace_id", "data"}, (
        f"envelope missing keys: {set(body.keys())}"
    )
    assert isinstance(body["code"], int)
    assert isinstance(body["message"], str)
    assert isinstance(body["trace_id"], str)
    assert HEX32.match(body["trace_id"]), f"trace_id must be 32-char hex, got {body['trace_id']}"


def test_healthz_envelope(client: TestClient) -> None:
    r = client.get("/api/healthz")
    assert r.status_code == 200
    _assert_envelope_shape(r.json())


@pytest.mark.parametrize("rt", ["summary", "industry", "domain", "design", "codegen"])
def test_report_config_envelope(client: TestClient, rt: str) -> None:
    r = client.get(f"/api/reports/{rt}/config")
    assert r.status_code == 200
    _assert_envelope_shape(r.json())


@pytest.mark.parametrize("rt", ["summary", "industry", "domain", "design", "codegen"])
def test_report_data_envelope(client: TestClient, rt: str) -> None:
    r = client.get(f"/api/reports/{rt}/data")
    assert r.status_code == 200
    _assert_envelope_shape(r.json())


def test_dropdown_envelope(client: TestClient) -> None:
    r = client.get("/api/dropdowns/departments")
    assert r.status_code == 200
    _assert_envelope_shape(r.json())


def test_trace_id_unique_per_call(client: TestClient) -> None:
    """两次调用应该有两个不同的 trace_id。"""
    body1 = client.get("/api/healthz").json()
    body2 = client.get("/api/healthz").json()
    assert body1["trace_id"] != body2["trace_id"]


def test_post_data_envelope(client: TestClient) -> None:
    r = client.post(
        "/api/reports/summary/data",
        json={"filters": {}, "page": 1, "page_size": 10},
    )
    assert r.status_code == 200
    _assert_envelope_shape(r.json())


def test_post_data_422_invalid_body(client: TestClient) -> None:
    """page_size 不是 int 时 Pydantic 直接 422，HTTP 状态 != envelope。"""
    r = client.post(
        "/api/reports/summary/data",
        json={"page_size": "not_a_number"},
    )
    # FastAPI 默认 422 是 ValidationError，不走我们的全局兜底
    assert r.status_code == 422
