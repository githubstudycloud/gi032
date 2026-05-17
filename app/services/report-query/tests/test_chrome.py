"""Chrome 配置端点的回归测试 —— branding / nav / fonts / themes 必须 200 + envelope。"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.main import create_app


@pytest.fixture
def client() -> TestClient:
    return TestClient(create_app())


@pytest.mark.parametrize(
    "path",
    ["/api/branding", "/api/nav", "/api/fonts", "/api/themes", "/api/admin/metrics"],
)
def test_chrome_endpoints_return_200_envelope(client: TestClient, path: str) -> None:
    r = client.get(path)
    assert r.status_code == 200, f"{path} returned {r.status_code}"
    body = r.json()
    assert body["code"] == 0
    assert body["data"] is not None


def test_branding_has_title(client: TestClient) -> None:
    r = client.get("/api/branding")
    assert "title" in r.json()["data"]


def test_nav_has_items(client: TestClient) -> None:
    r = client.get("/api/nav")
    items = r.json()["data"]["items"]
    assert isinstance(items, list)
    assert len(items) > 0
    # 前两项应该是 home1 / home（最近的 UI 修复保留）
    keys = [it["key"] for it in items[:2]]
    assert keys == ["home1", "home"]


def test_fonts_has_default(client: TestClient) -> None:
    r = client.get("/api/fonts")
    data = r.json()["data"]
    assert data["default"] == "system"
    assert len(data["items"]) >= 4


def test_themes_has_items(client: TestClient) -> None:
    r = client.get("/api/themes")
    data = r.json()["data"]
    assert isinstance(data.get("items"), list)


def test_admin_metrics_page_has_config_and_items(client: TestClient) -> None:
    """指标管理页一锅端：page_config + 初始 items。"""
    r = client.get("/api/admin/metrics")
    data = r.json()["data"]
    assert "page_config" in data
    assert "data" in data
    assert isinstance(data["data"].get("items"), list)
    assert len(data["data"]["items"]) > 0
