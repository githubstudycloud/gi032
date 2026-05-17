"""冒烟测试：服务能起 + 主要写端点不挂。"""

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


def test_admin_metrics_list(client: TestClient) -> None:
    r = client.post("/api/admin/metrics/list", json={"page": 1, "page_size": 10})
    assert r.status_code == 200
    body = r.json()
    assert body["code"] == 0
    assert "items" in body["data"]
    assert body["data"]["total"] >= 1


def test_ingest_json(client: TestClient) -> None:
    payload = {
        "rows": [
            {
                "metric_code": "ai-user-count",
                "period_date": "2026-05-17",
                "domain_code": "core",
                "value": 1284,
            }
        ]
    }
    r = client.post("/api/metrics/ingest", json=payload)
    assert r.status_code == 200
    body = r.json()
    assert body["code"] == 0
    assert body["data"]["accepted"] == 1


def test_admin_token_when_set(monkeypatch: pytest.MonkeyPatch) -> None:
    """token 设置后，无 Authorization 必须 401。"""
    monkeypatch.setenv("ADMIN_TOKEN", "secret-123")
    # 重新建 app 以让 settings 重读
    from app.settings import get_settings

    get_settings.cache_clear()
    app = create_app()
    c = TestClient(app)
    r = c.post("/api/admin/metrics/list", json={"page": 1, "page_size": 10})
    assert r.status_code == 401
    # 带正确 token 应 200
    r = c.post(
        "/api/admin/metrics/list",
        json={"page": 1, "page_size": 10},
        headers={"Authorization": "Bearer secret-123"},
    )
    assert r.status_code == 200
    # 清掉环境，恢复 cache 给后续测试
    monkeypatch.delenv("ADMIN_TOKEN", raising=False)
    get_settings.cache_clear()
