"""钻取端点的回归测试。"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.main import create_app


@pytest.fixture
def client() -> TestClient:
    return TestClient(create_app())


def test_drilldown_returns_items(client: TestClient) -> None:
    r = client.post(
        "/api/reports/summary/drilldown/ai-user-detail",
        json={
            "row": {"domain_code": "core"},
            "page": 1,
            "page_size": 5,
        },
    )
    assert r.status_code == 200
    body = r.json()
    assert body["code"] == 0
    items = body["data"]["items"]
    assert len(items) == 5  # page_size 透传
    assert all("metric" in it for it in items)


def test_drilldown_default_page_size(client: TestClient) -> None:
    r = client.post(
        "/api/reports/industry/drilldown/sample-ref",
        json={"row": {}},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["data"]["page_size"] == 50  # 默认值


def test_drilldown_carries_context(client: TestClient) -> None:
    """返回结果应该带上请求时的 ref / row 上下文，方便前端 modal 显示。"""
    r = client.post(
        "/api/reports/domain/drilldown/foo",
        json={"row": {"project_code": "p-1"}, "page": 1, "page_size": 3},
    )
    body = r.json()
    ctx = body["data"]["context"]
    assert ctx["report_type"] == "domain"
    assert ctx["ref"] == "foo"
    assert ctx["row"] == {"project_code": "p-1"}


def test_drilldown_accepts_optional_cell_and_filter(client: TestClient) -> None:
    r = client.post(
        "/api/reports/codegen/drilldown/bar",
        json={
            "row": {"a": 1},
            "cell": {"column": "ai_user_count", "value": 100},
            "filter": {"time_range": "30d"},
            "page": 2,
            "page_size": 10,
        },
    )
    assert r.status_code == 200
    assert r.json()["data"]["page"] == 2
