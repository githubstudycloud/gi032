# 04 — 后端查询服务：Python 增强 + Java 复刻

> 愿景：「查询部分（先python，可以再实现一套java）」「用于配套前端的一切配置和查询」

## 1. 现状盘点

### Python 查询服务（report-query, 端口 8001）

**已实现**：
- FastAPI 框架 + SQLAlchemy 2.0 ORM
- 5 个路由模块：meta / chrome / config / data / drilldown
- DB-first + fixture fallback 策略
- 统一 envelope 响应格式
- Pydantic v2 strict schemas

**接口清单**：

| 端点 | 状态 | 说明 |
|---|---|---|
| `GET /api/meta` | 已实现 | 服务健康 |
| `GET /api/chrome` | 已实现 | 品牌信息（fixture） |
| `GET /api/reports/{type}/config` | 已实现 | 报表配置（DB → fixture） |
| `GET /api/reports/{type}/data` | 已实现 | 默认数据（DB → fixture） |
| `POST /api/drilldowns/{ref}` | 已实现 | 钻取明细（fixture） |
| `GET /api/nav` | 缺失 | 导航树 |
| `GET /api/fonts` | 缺失 | 字体配置 |
| `GET /api/themes` | 缺失 | 主题配置 |
| `GET /api/dropdowns/{code}` | 缺失 | 通用下拉 |
| `POST /api/reports/{type}/data` | 缺失 | 带筛选的数据查询 |

### 差距分析

| 能力 | 现状 | 目标 |
|---|---|---|
| 静态配置查询 | DB + fixture 双路 | 完善，加缓存 |
| 动态数据查询（筛选/分页/排序） | 无 | SQL 动态拼装 + 参数化 |
| 聚合查询 | 无 | SUM/AVG/COUNT + GROUP BY |
| 对比查询（环比/同比） | 无 | 双时间窗口 JOIN |
| 排名查询 | 无 | RANK / ROW_NUMBER |
| 缓存 | 无 | Redis 或内存缓存 |
| Java 版本 | 无 | Spring Boot 复刻 |

## 2. Python 查询服务增强

### 2.1 动态查询引擎

**核心问题**：前端发送筛选条件，后端需要动态构建 SQL。

```python
# services/query_engine.py（新增）

from __future__ import annotations

from typing import Any
from sqlalchemy import Select, select, func, and_, or_
from sqlalchemy.orm import Session

from app.models import ReportFact


class QueryEngine:
    """通用动态查询构建器。
    
    接收前端传来的 filters / sort / paging / group_by 参数，
    动态构建 SQLAlchemy 查询。
    """

    def __init__(self, session: Session, report_type: str) -> None:
        self._session = session
        self._report_type = report_type
        self._stmt: Select[Any] = select(ReportFact).where(
            ReportFact.report_type == report_type,
        )
        self._count_stmt: Select[Any] | None = None

    def apply_filters(self, filters: dict[str, Any]) -> QueryEngine:
        """应用筛选条件。"""
        conditions = []
        for code, value in filters.items():
            col = getattr(ReportFact, code, None)
            if col is None:
                continue  # 忽略未知字段
            if isinstance(value, dict):
                # 范围筛选：{ "from": "2026-01-01", "to": "2026-01-31" }
                if "from" in value:
                    conditions.append(col >= value["from"])
                if "to" in value:
                    conditions.append(col <= value["to"])
            elif isinstance(value, list):
                # 多选：["A", "B", "C"]
                conditions.append(col.in_(value))
            else:
                # 精确匹配
                conditions.append(col == value)
        if conditions:
            self._stmt = self._stmt.where(and_(*conditions))
        return self

    def apply_sort(
        self, sort: list[dict[str, str]] | None,
    ) -> QueryEngine:
        """应用排序。"""
        if not sort:
            return self
        for s in sort:
            col = getattr(ReportFact, s["field"], None)
            if col is None:
                continue
            direction = s.get("dir", "asc")
            self._stmt = self._stmt.order_by(
                col.desc() if direction == "desc" else col.asc(),
            )
        return self

    def apply_paging(self, page: int = 1, page_size: int = 10) -> QueryEngine:
        """应用分页。"""
        self._count_stmt = select(func.count()).select_from(self._stmt.subquery())
        self._stmt = self._stmt.offset((page - 1) * page_size).limit(page_size)
        return self

    def apply_group_by(
        self, group_fields: list[str], agg_fields: list[dict[str, str]],
    ) -> QueryEngine:
        """应用分组聚合。
        
        agg_fields: [{"field": "value", "func": "sum"}, {"field": "count", "func": "avg"}]
        """
        group_cols = []
        select_cols = []
        for gf in group_fields:
            col = getattr(ReportFact, gf, None)
            if col:
                group_cols.append(col)
                select_cols.append(col)
        for af in agg_fields:
            col = getattr(ReportFact, af["field"], None)
            if col is None:
                continue
            agg_func = {
                "sum": func.sum,
                "avg": func.avg,
                "count": func.count,
                "min": func.min,
                "max": func.max,
            }.get(af["func"], func.sum)
            select_cols.append(agg_func(col).label(f'{af["field"]}_{af["func"]}'))
        
        self._stmt = select(*select_cols).select_from(
            ReportFact,
        ).where(
            ReportFact.report_type == self._report_type,
        ).group_by(*group_cols)
        return self

    def execute(self) -> dict[str, Any]:
        """执行查询，返回标准化结果。"""
        rows = self._session.execute(self._stmt).mappings().all()
        result: dict[str, Any] = {
            "items": [dict(r) for r in rows],
        }
        if self._count_stmt is not None:
            total = self._session.execute(self._count_stmt).scalar() or 0
            result["total"] = total
        return result
```

### 2.2 对比查询（环比/同比）

```python
# services/compare_engine.py（新增）

class CompareEngine:
    """双时间窗口对比查询。"""

    @staticmethod
    def build_compare_query(
        session: Session,
        report_type: str,
        current_window: tuple[str, str],   # (date_from, date_to)
        compare_window: tuple[str, str],   # 环比/同比窗口
        metrics: list[str],                 # 要对比的指标字段
        group_by: list[str],
    ) -> dict[str, Any]:
        """返回 { items: [{ field, current, compare, diff, diff_pct }] }"""
        # 当前窗口聚合
        current_q = QueryEngine(session, report_type) \
            .apply_filters({"date": {"from": current_window[0], "to": current_window[1]}}) \
            .apply_group_by(group_by, [{"field": m, "func": "sum"} for m in metrics])

        # 对比窗口聚合
        compare_q = QueryEngine(session, report_type) \
            .apply_filters({"date": {"from": compare_window[0], "to": compare_window[1]}}) \
            .apply_group_by(group_by, [{"field": m, "func": "sum"} for m in metrics])

        # 合并结果，计算差值和百分比
        # ... JOIN 逻辑
```

### 2.3 缓存层

```python
# services/cache.py（新增）

from __future__ import annotations

import hashlib
import json
import time
from typing import Any

class QueryCache:
    """内存查询缓存，TTL 驱动。
    
    生产环境可替换为 Redis 实现（接口一致）。
    """

    def __init__(self, default_ttl: int = 300) -> None:
        self._store: dict[str, tuple[Any, float]] = {}
        self._default_ttl = default_ttl

    def _make_key(self, report_type: str, params: dict[str, Any]) -> str:
        raw = json.dumps({"type": report_type, **params}, sort_keys=True)
        return hashlib.md5(raw.encode()).hexdigest()

    def get(self, report_type: str, params: dict[str, Any]) -> Any | None:
        key = self._make_key(report_type, params)
        entry = self._store.get(key)
        if entry is None:
            return None
        data, expires_at = entry
        if time.time() > expires_at:
            del self._store[key]
            return None
        return data

    def set(
        self, report_type: str, params: dict[str, Any],
        data: Any, ttl: int | None = None,
    ) -> None:
        key = self._make_key(report_type, params)
        self._store[key] = (data, time.time() + (ttl or self._default_ttl))

    def invalidate(self, report_type: str) -> None:
        """清除指定报表类型的所有缓存。"""
        prefix = report_type
        to_delete = [k for k in self._store if prefix in k]
        for k in to_delete:
            del self._store[k]

query_cache = QueryCache()
```

### 2.4 完善缺失端点

```python
# api/nav.py — 导航树
@router.get("/nav")
async def get_nav(session: Session = Depends(get_session)) -> JSONResponse:
    return ok(data=repo.get_nav(session))

# api/dropdowns.py — 通用下拉
@router.get("/dropdowns/{code}")
async def get_dropdown(
    code: Annotated[str, Path(min_length=1, max_length=64)],
    q: str = "",
    page: int = 1,
    page_size: int = 50,
    session: Session = Depends(get_session),
) -> JSONResponse:
    return ok(data=repo.get_dropdown(session, code, q, page, page_size))

# api/data.py — 带筛选的数据查询（POST）
@router.post("/reports/{report_type}/data")
async def query_report_data(
    report_type: Annotated[str, Path(min_length=1, max_length=64)],
    body: ReportQueryBody,
    session: Session = Depends(get_session),
) -> JSONResponse:
    engine = QueryEngine(session, report_type)
    engine.apply_filters(body.filters)
    engine.apply_sort(body.sort)
    engine.apply_paging(body.page, body.page_size)
    result = engine.execute()
    return ok(data=result)
```

## 3. Java 查询服务复刻方案

### 3.1 技术选型

| 维度 | 选择 | 理由 |
|---|---|---|
| 框架 | Spring Boot 3.3+ | 企业标准，团队熟悉 |
| 语言 | Java 21 (LTS) | Virtual Threads 支持高并发 |
| ORM | MyBatis-Plus 或 JOOQ | 动态 SQL 能力强于 JPA |
| 序列化 | Jackson | Spring 默认 |
| 构建 | Gradle (Kotlin DSL) | 比 Maven 快，DSL 表达力强 |
| 端口 | 8003 | 与 Python 版并存，nginx 按配置路由 |

### 3.2 目录结构

```
services/report-query-java/
├── build.gradle.kts
├── settings.gradle.kts
├── src/main/java/com/gi032/query/
│   ├── Application.java
│   ├── config/
│   │   ├── DataSourceConfig.java
│   │   ├── CorsConfig.java
│   │   └── CacheConfig.java
│   ├── controller/
│   │   ├── MetaController.java
│   │   ├── ReportConfigController.java
│   │   ├── ReportDataController.java
│   │   ├── DrilldownController.java
│   │   ├── NavController.java
│   │   └── DropdownController.java
│   ├── service/
│   │   ├── ReportConfigService.java
│   │   ├── ReportDataService.java
│   │   ├── QueryEngine.java          // 对标 Python query_engine
│   │   ├── CompareEngine.java
│   │   └── FixtureService.java       // JSON fixture fallback
│   ├── mapper/                        // MyBatis-Plus Mapper
│   │   ├── ReportSnapshotMapper.java
│   │   ├── ReportFactMapper.java
│   │   └── DropdownMapper.java
│   ├── model/
│   │   ├── entity/                    // DB 实体
│   │   │   ├── ReportSnapshot.java
│   │   │   ├── ReportFact.java
│   │   │   └── DropdownOption.java
│   │   ├── dto/                       // 请求/响应 DTO
│   │   │   ├── ReportQueryRequest.java
│   │   │   ├── ReportDataResponse.java
│   │   │   └── EnvelopeResponse.java
│   │   └── vo/                        // 视图对象
│   │       └── KpiValueVO.java
│   ├── common/
│   │   ├── Envelope.java              // 对标 Python envelope
│   │   ├── GlobalExceptionHandler.java
│   │   └── Constants.java
│   └── util/
│       └── JsonFixtureLoader.java
├── src/main/resources/
│   ├── application.yml
│   ├── mapper/                        // MyBatis XML
│   │   └── ReportFactMapper.xml
│   └── fixtures/                      // symlink → apps/web/public/mock/
├── src/test/java/com/gi032/query/
│   ├── controller/
│   │   └── ReportDataControllerTest.java
│   └── service/
│       └── QueryEngineTest.java
├── Dockerfile
└── README.md
```

### 3.3 核心接口对照

| Python 端点 | Java 端点 | 备注 |
|---|---|---|
| `GET /api/meta` | `GET /api/meta` | 完全一致 |
| `GET /api/reports/{type}/config` | `GET /api/reports/{type}/config` | 同 DB + fixture 双路 |
| `GET /api/reports/{type}/data` | `GET /api/reports/{type}/data` | 默认数据 |
| `POST /api/reports/{type}/data` | `POST /api/reports/{type}/data` | 动态查询 |
| `POST /api/drilldowns/{ref}` | `POST /api/drilldowns/{ref}` | 钻取 |
| `GET /api/dropdowns/{code}` | `GET /api/dropdowns/{code}` | 通用下拉 |

**关键约束**：Java 版接口 URL / 参数 / 响应格式必须与 Python 版 100% 一致（都走 envelope 协议），前端零改动即可切换。

### 3.4 Envelope 统一

```java
// common/Envelope.java
public record Envelope<T>(
    int code,
    String message,
    String traceId,
    T data
) {
    public static <T> Envelope<T> ok(T data) {
        return new Envelope<>(0, "ok", UUID.randomUUID().toString().replace("-", ""), data);
    }
    
    public static <T> Envelope<T> fail(int code, String message) {
        return new Envelope<>(code, message, UUID.randomUUID().toString().replace("-", ""), null);
    }
}
```

### 3.5 QueryEngine Java 版

```java
// service/QueryEngine.java
public class QueryEngine {
    
    private final SqlSession session;
    private final String reportType;
    private QueryWrapper<ReportFact> wrapper;
    
    public QueryEngine(SqlSession session, String reportType) {
        this.session = session;
        this.reportType = reportType;
        this.wrapper = new QueryWrapper<ReportFact>()
            .eq("report_type", reportType);
    }
    
    public QueryEngine applyFilters(Map<String, Object> filters) {
        filters.forEach((code, value) -> {
            if (value instanceof Map<?, ?> range) {
                if (range.containsKey("from")) wrapper.ge(code, range.get("from"));
                if (range.containsKey("to")) wrapper.le(code, range.get("to"));
            } else if (value instanceof List<?> list) {
                wrapper.in(code, list);
            } else {
                wrapper.eq(code, value);
            }
        });
        return this;
    }
    
    public QueryEngine applySort(List<SortSpec> sorts) {
        if (sorts != null) {
            sorts.forEach(s -> {
                if ("desc".equals(s.dir())) wrapper.orderByDesc(s.field());
                else wrapper.orderByAsc(s.field());
            });
        }
        return this;
    }
    
    public QueryEngine applyPaging(int page, int pageSize) {
        // MyBatis-Plus 自带分页插件
        return this;
    }
    
    public Map<String, Object> execute() {
        // 执行查询并返回标准化结果
        return Map.of("items", results, "total", total);
    }
}
```

### 3.6 并存与切换策略

```
                浏览器
                  │
                  ▼
        ┌──────────────────┐
        │     nginx        │
        │  /api → upstream │
        └──────────────────┘
              │
    ┌─────────┴─────────┐
    ▼                   ▼
  Python 8001       Java 8003        ← 两个查询服务并存
  (当前默认)        (新增)
    │                   │
    └───────┬───────────┘
            ▼
         MySQL
```

nginx 配置切换：

```nginx
# 默认走 Python
upstream report-query {
    server report-query-python:8001;
}

# 要切 Java 时改为：
# upstream report-query {
#     server report-query-java:8003;
# }

# 或者灰度：按 cookie / header 路由
# map $http_x_backend $backend {
#     "java"  report-query-java:8003;
#     default report-query-python:8001;
# }
```

## 4. 契约测试

为确保 Python 和 Java 版本行为一致，引入契约测试：

```
shared/contracts/
├── envelope.md                  # 响应格式协议（已有）
├── report-protocol-v2.md        # 报表协议（已有）
└── api-contract-tests/          # 新增：可执行的契约测试
    ├── test_config_endpoint.py  # 用 httpx 测试任意 base_url 的 /config 端点
    ├── test_data_endpoint.py
    ├── test_drilldown_endpoint.py
    ├── conftest.py              # --base-url 参数化
    └── README.md
```

```python
# shared/contracts/api-contract-tests/conftest.py
import pytest

def pytest_addoption(parser):
    parser.addoption("--base-url", default="http://localhost:8001")

@pytest.fixture
def base_url(request):
    return request.config.getoption("--base-url")
```

```bash
# 测 Python 版
pytest shared/contracts/api-contract-tests/ --base-url http://localhost:8001

# 测 Java 版（同一套测试）
pytest shared/contracts/api-contract-tests/ --base-url http://localhost:8003
```

## 5. 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 新增 | `services/report-query/app/services/query_engine.py` | 动态查询构建器 |
| 新增 | `services/report-query/app/services/compare_engine.py` | 对比查询 |
| 新增 | `services/report-query/app/services/cache.py` | 查询缓存 |
| 新增 | `services/report-query/app/api/nav.py` | 导航树端点 |
| 新增 | `services/report-query/app/api/dropdowns.py` | 通用下拉端点 |
| 修改 | `services/report-query/app/api/data.py` | 增加 POST 带筛选查询 |
| 新增 | `services/report-query-java/` | Java 查询服务完整目录 |
| 新增 | `shared/contracts/api-contract-tests/` | 跨语言契约测试 |
| 修改 | `docker-compose.yml` | 增加 Java 服务容器 |
