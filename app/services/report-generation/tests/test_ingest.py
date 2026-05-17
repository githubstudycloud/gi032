"""ingest CSV / JSON 边界用例。"""

from __future__ import annotations

import io

import pytest
from fastapi.testclient import TestClient

from app.main import create_app


@pytest.fixture
def client() -> TestClient:
    return TestClient(create_app())


def test_ingest_csv_counts_rows(client: TestClient) -> None:
    """合法 CSV → accepted 数 == 数据行数（不含表头）。"""
    csv = "metric_code,date,value\nai-user-count,2026-05-17,1284\nai-requirements,2026-05-17,186\n"
    files = {"file": ("test.csv", io.BytesIO(csv.encode("utf-8")), "text/csv")}
    r = client.post("/api/metrics/ingest/csv", files=files)
    assert r.status_code == 200
    body = r.json()
    assert body["code"] == 0
    assert body["data"]["rows"] == 2


def test_ingest_csv_empty_file__rows_zero(client: TestClient) -> None:
    files = {"file": ("empty.csv", io.BytesIO(b""), "text/csv")}
    r = client.post("/api/metrics/ingest/csv", files=files)
    assert r.status_code == 200
    assert r.json()["data"]["rows"] == 0


def test_ingest_csv_only_header__rows_zero(client: TestClient) -> None:
    files = {"file": ("hdr.csv", io.BytesIO(b"a,b,c\n"), "text/csv")}
    r = client.post("/api/metrics/ingest/csv", files=files)
    assert r.json()["data"]["rows"] == 0


def test_ingest_csv_utf8_bom_handled(client: TestClient) -> None:
    """带 BOM 的 UTF-8 CSV 不挂。"""
    csv = "﻿metric_code,value\nai-x,1\n".encode()
    files = {"file": ("bom.csv", io.BytesIO(csv), "text/csv")}
    r = client.post("/api/metrics/ingest/csv", files=files)
    assert r.status_code == 200
    assert r.json()["data"]["rows"] == 1


def test_ingest_json_rows_accepted(client: TestClient) -> None:
    payload = {"rows": [
        {
            "metric_code": "ai-user-count",
            "period_date": "2026-05-17",
            "domain_code": "core",
            "value": 1284,
        },
        {
            "metric_code": "ai-requirements",
            "period_date": "2026-05-17",
            "value": 186,
            "source": "Jira",
            "version_no": 2,
        },
    ]}
    r = client.post("/api/metrics/ingest", json=payload)
    assert r.status_code == 200
    body = r.json()
    assert body["data"]["accepted"] == 2


def test_ingest_json_empty_rows__accepted_zero(client: TestClient) -> None:
    r = client.post("/api/metrics/ingest", json={"rows": []})
    assert r.status_code == 200
    assert r.json()["data"]["accepted"] == 0


def test_ingest_json_invalid_body__422(client: TestClient) -> None:
    """rows 字段缺 metric_code → Pydantic 校验失败。"""
    r = client.post("/api/metrics/ingest", json={"rows": [{"value": 1}]})
    assert r.status_code == 422
