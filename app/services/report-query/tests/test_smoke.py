"""冒烟测试：服务能起、关键端点 200、Envelope 形状正确。"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.main import create_app


@pytest.fixture
def client() -> TestClient:
    return TestClient(create_app())


def test_healthz(client: TestClient) -> None:
    r = client.get("/api/healthz")
    assert r.status_code == 200
    body = r.json()
    assert body["code"] == 0
    assert body["data"] == {"status": "ok"}
    assert isinstance(body["trace_id"], str) and len(body["trace_id"]) > 0


@pytest.mark.parametrize("report_type", ["summary", "industry", "domain", "design", "codegen"])
def test_config_loads_from_fixture(client: TestClient, report_type: str) -> None:
    r = client.get(f"/api/reports/{report_type}/config")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["code"] == 0
    assert body["data"]["meta"]["report_type"] == report_type


@pytest.mark.parametrize("report_type", ["summary", "industry", "domain", "design", "codegen"])
def test_data_loads_from_fixture(client: TestClient, report_type: str) -> None:
    r = client.get(f"/api/reports/{report_type}/data")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["code"] == 0
    assert "tabs" in body["data"]


def test_config_404_on_unknown_type(client: TestClient) -> None:
    r = client.get("/api/reports/__nope__/config")
    assert r.status_code == 404
