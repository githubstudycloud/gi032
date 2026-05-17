---
name: python-pytest-spec
description: Design pytest tests with proper fixtures, parametrize, TestClient injection, and DB isolation. Use when adding tests for FastAPI endpoints, services layer, or new modules. Forces 1 happy path + 1 boundary + 1 error case per behaviour.
---

# python-pytest-spec

## 必守

1. **每个行为 ≥ 3 个用例**：1 happy + 1 边界（空 / 满 / 临界值） + 1 错误（4xx / 异常）。
2. **fixtures > setup/teardown**：用 `@pytest.fixture`，避免 `setUp` / `tearDown` 模式。
3. **隔离**：DB 测试用临时 SQLite（`tempfile`），不污染主 db；fixture `scope="function"` 默认。
4. **断言信封**：HTTP 测试必看 `r.status_code` + `body["code"]` + `body["data"]` 形状。
5. **parametrize > 复制**：相似用例用 `@pytest.mark.parametrize` 跑矩阵。
6. **mock 谨慎**：能用真实组件就别 mock；mock 跨服务边界（外部 HTTP / SMTP / 文件）。

## 命名

- 测试文件：`tests/test_<unit>.py`（pytest 默认发现）。
- 测试函数：`test_<场景>__<期望>()` 或 `test_<行为>_<条件>()`，禁止纯名词。

## 范例

```python
import pytest
from fastapi.testclient import TestClient
from app.main import create_app

@pytest.fixture
def client() -> TestClient:
    return TestClient(create_app())

@pytest.mark.parametrize("report_type", ["summary", "industry", "domain"])
def test_config_loads_for_known_types(client: TestClient, report_type: str) -> None:
    r = client.get(f"/api/reports/{report_type}/config")
    assert r.status_code == 200
    body = r.json()
    assert body["code"] == 0
    assert body["data"]["meta"]["report_type"] == report_type

def test_config_returns_404_for_unknown_type(client: TestClient) -> None:
    r = client.get("/api/reports/__nope__/config")
    assert r.status_code == 404
```

## DB 测试范式

```python
import tempfile
import pytest
from sqlalchemy import create_engine
from app.db import Base

@pytest.fixture
def db_engine():
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as f:
        url = f"sqlite:///{f.name}"
    engine = create_engine(url, future=True)
    Base.metadata.create_all(engine)
    yield engine
    engine.dispose()
```

## 反模式

- 一个测试断言 10 件事 → 拆。
- 测试有顺序依赖 → 用 fixture 重建状态。
- mock 整个 `app.services.metric_query` 来测路由 → 测错层，应直接测 service 单元。
- 用 `time.sleep` 等异步任务完成 → 用 `pytest-asyncio` 的 async fixture。
- 测试名 `test_a`, `test_b` → 看不出意图。
