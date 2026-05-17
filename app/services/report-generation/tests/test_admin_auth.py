"""admin 鉴权 4 种状态用例。"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.main import create_app
from app.settings import get_settings


@pytest.fixture(autouse=True)
def _clear_settings_cache() -> None:
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def _client_with_token(monkeypatch: pytest.MonkeyPatch, token: str) -> TestClient:
    monkeypatch.setenv("ADMIN_TOKEN", token)
    get_settings.cache_clear()
    return TestClient(create_app())


def test_dev_mode_no_token__skips_auth() -> None:
    """ADMIN_TOKEN 不设 = dev 模式 → /admin/* 不鉴权。"""
    client = TestClient(create_app())
    r = client.post("/api/admin/metrics/list", json={"page": 1, "page_size": 5})
    assert r.status_code == 200


def test_prod_no_authorization_header__401(monkeypatch: pytest.MonkeyPatch) -> None:
    client = _client_with_token(monkeypatch, "secret-x")
    r = client.post("/api/admin/metrics/list", json={"page": 1, "page_size": 5})
    assert r.status_code == 401


def test_prod_bearer_wrong_token__403(monkeypatch: pytest.MonkeyPatch) -> None:
    client = _client_with_token(monkeypatch, "right-token")
    r = client.post(
        "/api/admin/metrics/list",
        json={"page": 1, "page_size": 5},
        headers={"Authorization": "Bearer wrong-token"},
    )
    assert r.status_code == 403


def test_prod_bearer_right_token__200(monkeypatch: pytest.MonkeyPatch) -> None:
    client = _client_with_token(monkeypatch, "right-token")
    r = client.post(
        "/api/admin/metrics/list",
        json={"page": 1, "page_size": 5},
        headers={"Authorization": "Bearer right-token"},
    )
    assert r.status_code == 200


def test_prod_malformed_authorization__401(monkeypatch: pytest.MonkeyPatch) -> None:
    """没带 Bearer 前缀 → 401。"""
    client = _client_with_token(monkeypatch, "any-token")
    r = client.post(
        "/api/admin/metrics/list",
        json={"page": 1, "page_size": 5},
        headers={"Authorization": "any-token"},
    )
    assert r.status_code == 401


def test_ingest_also_requires_token(monkeypatch: pytest.MonkeyPatch) -> None:
    """/metrics/ingest 跟 /admin 一样要鉴权（写路径全保护）。"""
    client = _client_with_token(monkeypatch, "secret")
    r = client.post("/api/metrics/ingest", json={"rows": []})
    assert r.status_code == 401
