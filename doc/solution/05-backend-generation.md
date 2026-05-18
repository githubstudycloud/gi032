# 05 — 数据生成服务：多源采集 + 调度增强

> 愿景：「可以根据要查询的数据接入各类组件获取和组合数据配置查询，定时运行，部分数据运行，补采集，手动触发」

## 1. 现状盘点

### report-generation 服务（端口 8002）

**已实现**：
- FastAPI 框架 + APScheduler
- 两个 placeholder job：`_do_ingest` 和 `_do_preagg`（只打日志）
- admin / ingest / meta 三个路由模块
- 安全层：admin token 鉴权
- seed 脚本：从 mock JSON 灌入 DB

**差距**：

| 能力 | 现状 | 目标 |
|---|---|---|
| 数据采集 | placeholder | 真实数据源连接 + 数据拉取 |
| 数据源类型 | 无 | DB / API / CSV / Excel / MQ / 文件 |
| 采集粒度 | 全量 | 全量 + 增量 + 指定时间窗口 |
| 调度管理 | 硬编码两个 job | 动态 job 管理（CRUD） |
| 执行历史 | 无日志 | 执行记录表 + 状态追踪 |
| 失败处理 | 无 | 重试 + 告警 + 降级 |
| 手动触发 | 仅 seed/preagg | 任意 job 可手动触发 |
| 补采集 | 无 | 指定时间范围重新采集 |

## 2. 数据采集架构

### 2.1 采集任务模型

```python
# models.py 新增

class IngestJob(Base):
    """采集任务定义。"""
    __tablename__ = "ingest_job"
    
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(String(500), default="")
    
    # 数据源配置
    source_type: Mapped[str] = mapped_column(String(32))  # db / api / csv / mq
    source_config: Mapped[dict] = mapped_column(JSON)      # 连接参数（加密存储）
    
    # 目标配置
    target_table: Mapped[str] = mapped_column(String(64))  # 写入哪张表
    target_mode: Mapped[str] = mapped_column(String(16))   # append / upsert / replace
    
    # 调度配置
    cron_expr: Mapped[str | None] = mapped_column(String(64))  # cron 表达式，null=仅手动
    enabled: Mapped[bool] = mapped_column(default=True)
    
    # 数据映射
    field_mapping: Mapped[dict] = mapped_column(JSON)  # 源字段 → 目标字段映射
    transform_rules: Mapped[list] = mapped_column(JSON, default=list)  # 转换规则链
    
    # 运行参数
    timeout_seconds: Mapped[int] = mapped_column(default=300)
    retry_count: Mapped[int] = mapped_column(default=3)
    retry_delay_seconds: Mapped[int] = mapped_column(default=60)
    
    created_at: Mapped[datetime] = mapped_column(default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(default=utc_now, onupdate=utc_now)


class IngestExecution(Base):
    """采集执行记录。"""
    __tablename__ = "ingest_execution"
    
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    job_id: Mapped[str] = mapped_column(String(64), ForeignKey("ingest_job.id"))
    
    # 执行状态
    status: Mapped[str] = mapped_column(String(16))  # pending / running / success / failed / cancelled
    trigger: Mapped[str] = mapped_column(String(16))  # cron / manual / backfill
    
    # 执行参数
    params: Mapped[dict] = mapped_column(JSON, default=dict)  # 运行时参数（如时间窗口）
    
    # 结果
    rows_read: Mapped[int] = mapped_column(default=0)
    rows_written: Mapped[int] = mapped_column(default=0)
    rows_skipped: Mapped[int] = mapped_column(default=0)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    started_at: Mapped[datetime | None] = mapped_column(nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(nullable=True)
    created_at: Mapped[datetime] = mapped_column(default=utc_now)
```

### 2.2 数据源连接器

```
┌─ 连接器注册表 ─────────────────────────────────┐
│                                                │
│  DatabaseConnector      ← MySQL / PG / SQLite  │
│  ApiConnector           ← REST API 拉取        │
│  CsvConnector           ← 本地 / 远程 CSV      │
│  ExcelConnector         ← .xlsx 文件            │
│  MessageQueueConnector  ← Kafka / RabbitMQ     │
│  JdbcConnector          ← 通过 JDBC 连任意 DB  │
│                                                │
└────────────────────────────────────────────────┘
```

```python
# connectors/base.py

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, Iterator


class DataConnector(ABC):
    """数据源连接器基类。"""

    @abstractmethod
    def connect(self, config: dict[str, Any]) -> None:
        """建立连接。"""

    @abstractmethod
    def fetch(
        self,
        params: dict[str, Any] | None = None,
    ) -> Iterator[dict[str, Any]]:
        """拉取数据，返回行迭代器。
        
        用迭代器而非列表，支持大数据集流式处理。
        """

    @abstractmethod
    def close(self) -> None:
        """关闭连接。"""

    def test_connection(self, config: dict[str, Any]) -> bool:
        """测试连接是否可用。"""
        try:
            self.connect(config)
            self.close()
            return True
        except Exception:
            return False
```

```python
# connectors/database.py

class DatabaseConnector(DataConnector):
    """数据库连接器 — 支持 MySQL / PostgreSQL / SQLite。"""

    def connect(self, config: dict[str, Any]) -> None:
        # config: { url, query, params }
        self._engine = create_engine(config["url"])
        self._query = config["query"]
        self._params = config.get("params", {})

    def fetch(
        self, params: dict[str, Any] | None = None,
    ) -> Iterator[dict[str, Any]]:
        merged = {**self._params, **(params or {})}
        with self._engine.connect() as conn:
            result = conn.execute(text(self._query), merged)
            for row in result.mappings():
                yield dict(row)

    def close(self) -> None:
        self._engine.dispose()
```

```python
# connectors/api.py

class ApiConnector(DataConnector):
    """REST API 连接器。"""

    def connect(self, config: dict[str, Any]) -> None:
        # config: { base_url, endpoint, method, headers, auth }
        self._config = config
        self._client = httpx.Client(
            base_url=config["base_url"],
            headers=config.get("headers", {}),
            timeout=config.get("timeout", 30),
        )

    def fetch(
        self, params: dict[str, Any] | None = None,
    ) -> Iterator[dict[str, Any]]:
        endpoint = self._config["endpoint"]
        method = self._config.get("method", "GET")
        
        # 支持分页拉取
        page = 1
        while True:
            resp = self._client.request(
                method, endpoint,
                params={**(params or {}), "page": page},
            )
            resp.raise_for_status()
            data = resp.json()
            
            items = data.get("items", data.get("data", data))
            if isinstance(items, list):
                yield from items
            
            # 检查是否还有更多数据
            if not data.get("has_more", False):
                break
            page += 1

    def close(self) -> None:
        self._client.close()
```

```python
# connectors/csv_connector.py

class CsvConnector(DataConnector):
    """CSV 连接器 — 支持本地文件和 URL。"""

    def connect(self, config: dict[str, Any]) -> None:
        # config: { path, url, encoding, delimiter, skip_rows }
        self._config = config

    def fetch(
        self, params: dict[str, Any] | None = None,
    ) -> Iterator[dict[str, Any]]:
        import csv
        import io

        source = self._config.get("path") or self._config.get("url")
        encoding = self._config.get("encoding", "utf-8")
        delimiter = self._config.get("delimiter", ",")
        skip_rows = self._config.get("skip_rows", 0)

        if source.startswith(("http://", "https://")):
            resp = httpx.get(source)
            content = resp.text
        else:
            with open(source, encoding=encoding) as f:
                content = f.read()

        reader = csv.DictReader(
            io.StringIO(content),
            delimiter=delimiter,
        )
        for i, row in enumerate(reader):
            if i < skip_rows:
                continue
            yield dict(row)

    def close(self) -> None:
        pass
```

### 2.3 连接器注册表

```python
# connectors/registry.py

from __future__ import annotations

from app.connectors.base import DataConnector
from app.connectors.database import DatabaseConnector
from app.connectors.api import ApiConnector
from app.connectors.csv_connector import CsvConnector

_registry: dict[str, type[DataConnector]] = {
    "database": DatabaseConnector,
    "db": DatabaseConnector,
    "api": ApiConnector,
    "rest": ApiConnector,
    "csv": CsvConnector,
    "file": CsvConnector,
}

def get_connector(source_type: str) -> DataConnector:
    """根据类型获取连接器实例。"""
    cls = _registry.get(source_type)
    if cls is None:
        raise ValueError(f"Unknown source type: {source_type}")
    return cls()

def register_connector(source_type: str, cls: type[DataConnector]) -> None:
    """注册自定义连接器。"""
    _registry[source_type] = cls
```

## 3. 调度增强

### 3.1 动态 Job 管理

```python
# scheduler.py 重构

class SchedulerManager:
    """增强版调度管理器 — 支持动态 CRUD。"""

    def __init__(self) -> None:
        self._scheduler = BackgroundScheduler(timezone="Asia/Shanghai")
        self._job_store: dict[str, IngestJob] = {}

    def start(self) -> None:
        self._scheduler.start()
        # 从 DB 加载所有 enabled 的 job
        self._load_jobs_from_db()

    def _load_jobs_from_db(self) -> None:
        """启动时从 DB 加载所有 job 定义。"""
        with get_session() as session:
            jobs = session.query(IngestJob).filter(IngestJob.enabled == True).all()
            for job in jobs:
                self._register_job(job)

    def _register_job(self, job: IngestJob) -> None:
        """注册一个采集 job 到调度器。"""
        if job.cron_expr:
            self._scheduler.add_job(
                self._execute_job,
                CronTrigger.from_crontab(job.cron_expr),
                id=job.id,
                args=[job.id],
                replace_existing=True,
            )
        self._job_store[job.id] = job

    def add_job(self, job: IngestJob) -> None:
        """新增 job（保存 DB + 注册调度）。"""
        self._register_job(job)

    def remove_job(self, job_id: str) -> None:
        """移除 job。"""
        if self._scheduler.get_job(job_id):
            self._scheduler.remove_job(job_id)
        self._job_store.pop(job_id, None)

    def trigger_now(self, job_id: str, params: dict | None = None) -> str:
        """手动触发一次执行，返回 execution_id。"""
        return self._execute_job(job_id, trigger="manual", params=params)

    def backfill(
        self, job_id: str,
        date_from: str, date_to: str,
    ) -> str:
        """补采集：指定时间范围重新执行。"""
        return self._execute_job(
            job_id,
            trigger="backfill",
            params={"date_from": date_from, "date_to": date_to},
        )

    def _execute_job(
        self, job_id: str,
        trigger: str = "cron",
        params: dict | None = None,
    ) -> str:
        """执行采集任务的核心逻辑。"""
        job = self._job_store.get(job_id)
        if not job:
            raise ValueError(f"Job not found: {job_id}")

        # 创建执行记录
        execution = IngestExecution(
            job_id=job_id,
            status="running",
            trigger=trigger,
            params=params or {},
            started_at=utc_now(),
        )
        # ... 保存到 DB

        try:
            # 1. 获取连接器
            connector = get_connector(job.source_type)
            connector.connect(job.source_config)

            # 2. 拉取数据
            rows_read = 0
            rows_written = 0
            batch = []
            for row in connector.fetch(params):
                rows_read += 1
                # 3. 应用字段映射
                mapped = self._apply_mapping(row, job.field_mapping)
                # 4. 应用转换规则
                transformed = self._apply_transforms(mapped, job.transform_rules)
                batch.append(transformed)

                # 批量写入（每 1000 条）
                if len(batch) >= 1000:
                    rows_written += self._write_batch(
                        batch, job.target_table, job.target_mode,
                    )
                    batch = []

            # 写入剩余
            if batch:
                rows_written += self._write_batch(
                    batch, job.target_table, job.target_mode,
                )

            connector.close()

            # 更新执行记录
            execution.status = "success"
            execution.rows_read = rows_read
            execution.rows_written = rows_written
            execution.finished_at = utc_now()

        except Exception as e:
            execution.status = "failed"
            execution.error_message = str(e)
            execution.finished_at = utc_now()
            log.exception("Job %s failed", job_id)
            # 重试逻辑
            if execution.params.get("_retry_count", 0) < job.retry_count:
                self._schedule_retry(job, execution)

        return execution.id

    def list_jobs(self) -> list[dict]:
        """列出所有 job 及其状态。"""
        result = []
        for job_id, job in self._job_store.items():
            aps_job = self._scheduler.get_job(job_id)
            result.append({
                "id": job.id,
                "name": job.name,
                "source_type": job.source_type,
                "cron_expr": job.cron_expr,
                "enabled": job.enabled,
                "next_run": str(aps_job.next_run_time) if aps_job else None,
            })
        return result

    def get_executions(
        self, job_id: str, limit: int = 20,
    ) -> list[dict]:
        """查询 job 的执行历史。"""
        # 从 DB 查询 ingest_execution 表
        pass
```

### 3.2 增强 API 端点

```python
# api/scheduler_admin.py（新增）

router = APIRouter(prefix="/scheduler", tags=["scheduler"])

@router.get("/jobs")
async def list_jobs() -> JSONResponse:
    """列出所有采集任务。"""
    return ok(data=scheduler_mgr.list_jobs())

@router.post("/jobs")
async def create_job(
    body: IngestJobCreate,
    _: str = Depends(require_admin),
) -> JSONResponse:
    """创建采集任务。"""
    job = IngestJob(**body.model_dump())
    # 保存 DB + 注册调度
    scheduler_mgr.add_job(job)
    return ok(data={"id": job.id})

@router.put("/jobs/{job_id}")
async def update_job(
    job_id: str,
    body: IngestJobUpdate,
    _: str = Depends(require_admin),
) -> JSONResponse:
    """更新采集任务。"""
    pass

@router.delete("/jobs/{job_id}")
async def delete_job(
    job_id: str,
    _: str = Depends(require_admin),
) -> JSONResponse:
    """删除采集任务。"""
    scheduler_mgr.remove_job(job_id)
    return ok(message="已删除")

@router.post("/jobs/{job_id}/trigger")
async def trigger_job(
    job_id: str,
    body: TriggerParams | None = None,
    _: str = Depends(require_admin),
) -> JSONResponse:
    """手动触发一次执行。"""
    exec_id = scheduler_mgr.trigger_now(job_id, body.params if body else None)
    return ok(data={"execution_id": exec_id})

@router.post("/jobs/{job_id}/backfill")
async def backfill_job(
    job_id: str,
    body: BackfillParams,
    _: str = Depends(require_admin),
) -> JSONResponse:
    """补采集：指定时间范围重新执行。"""
    exec_id = scheduler_mgr.backfill(job_id, body.date_from, body.date_to)
    return ok(data={"execution_id": exec_id})

@router.get("/jobs/{job_id}/executions")
async def list_executions(
    job_id: str,
    limit: int = 20,
) -> JSONResponse:
    """查询执行历史。"""
    return ok(data=scheduler_mgr.get_executions(job_id, limit))
```

### 3.3 部分数据运行

"部分数据运行"的三个场景：

```
场景 1：增量采集（只拉最近变更的数据）
  → 连接器 fetch(params={"since": last_success_timestamp})
  → target_mode = "upsert"（按主键更新或插入）

场景 2：指定维度采集（只拉某个部门/产业的数据）
  → trigger_now(params={"department": "智能终端"})
  → 连接器 fetch 带入参数

场景 3：补采集（指定时间窗口重跑）
  → backfill(date_from="2026-05-01", date_to="2026-05-15")
  → 先清除该窗口旧数据，再重新拉取
```

## 4. 数据转换规则

### 4.1 转换规则链

```python
# transforms/base.py

class TransformRule(ABC):
    """数据转换规则基类。"""

    @abstractmethod
    def apply(self, row: dict[str, Any]) -> dict[str, Any]:
        """对一行数据应用转换。"""


class RenameFields(TransformRule):
    """字段重命名。"""
    def __init__(self, mapping: dict[str, str]) -> None:
        self._mapping = mapping  # old_name → new_name

    def apply(self, row: dict[str, Any]) -> dict[str, Any]:
        return {self._mapping.get(k, k): v for k, v in row.items()}


class TypeCast(TransformRule):
    """类型转换。"""
    def __init__(self, casts: dict[str, str]) -> None:
        self._casts = casts  # field → target_type

    def apply(self, row: dict[str, Any]) -> dict[str, Any]:
        result = dict(row)
        for field, target in self._casts.items():
            if field in result:
                result[field] = self._cast(result[field], target)
        return result


class ComputeField(TransformRule):
    """计算字段（公式）。"""
    def __init__(self, field: str, formula: str) -> None:
        self._field = field
        self._formula = formula  # 简单表达式，如 "ai_count / total_count * 100"

    def apply(self, row: dict[str, Any]) -> dict[str, Any]:
        result = dict(row)
        # 安全表达式求值（只允许数学运算 + 字段引用）
        result[self._field] = safe_eval(self._formula, row)
        return result


class FilterRows(TransformRule):
    """行过滤。"""
    def __init__(self, condition: str) -> None:
        self._condition = condition  # 如 "status == 'active'"

    def apply(self, row: dict[str, Any]) -> dict[str, Any] | None:
        if safe_eval(self._condition, row):
            return row
        return None  # 返回 None 表示丢弃该行
```

### 4.2 配置示例

```jsonc
// ingest_job.transform_rules 字段
[
  {
    "type": "rename_fields",
    "config": {
      "用户ID": "user_id",
      "部门名称": "department",
      "调用次数": "call_count"
    }
  },
  {
    "type": "type_cast",
    "config": {
      "call_count": "int",
      "created_at": "datetime"
    }
  },
  {
    "type": "compute_field",
    "config": {
      "field": "adoption_rate",
      "formula": "ai_count / total_count * 100"
    }
  },
  {
    "type": "filter_rows",
    "config": {
      "condition": "call_count > 0"
    }
  }
]
```

## 5. 预聚合增强

```python
# services/preagg.py

class PreAggregator:
    """预聚合引擎 — 从事实表生成报表快照。"""

    def refresh(
        self,
        report_type: str,
        date_range: tuple[str, str] | None = None,
    ) -> dict[str, int]:
        """重算预聚合。
        
        如果指定 date_range，只重算该范围；否则全量重算。
        """
        # 1. 读取报表配置（确定聚合维度和指标）
        config = self._load_report_config(report_type)
        
        # 2. 按配置中的 KPI 定义，从事实表聚合
        for group in config["kpi"]["groups"]:
            for item in group["items"]:
                agg_result = self._aggregate_metric(
                    item["key"],
                    date_range,
                    item.get("aggregation", "sum"),
                    item.get("formula"),
                )
                self._write_snapshot(report_type, "kpi", item["key"], agg_result)

        # 3. 按配置中的 primary_view tabs，生成表格数据快照
        for tab in config["primary_view"]["tabs"]:
            tab_data = self._aggregate_tab(tab, date_range)
            self._write_snapshot(report_type, "tab", tab["key"], tab_data)

        return {"report_type": report_type, "status": "done"}
```

## 6. 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 新增 | `services/report-generation/app/connectors/base.py` | 连接器基类 |
| 新增 | `services/report-generation/app/connectors/database.py` | 数据库连接器 |
| 新增 | `services/report-generation/app/connectors/api.py` | API 连接器 |
| 新增 | `services/report-generation/app/connectors/csv_connector.py` | CSV 连接器 |
| 新增 | `services/report-generation/app/connectors/registry.py` | 连接器注册表 |
| 新增 | `services/report-generation/app/transforms/base.py` | 转换规则基类 + 内置规则 |
| 新增 | `services/report-generation/app/models.py` | IngestJob + IngestExecution |
| 重构 | `services/report-generation/app/scheduler.py` | SchedulerManager 类 |
| 新增 | `services/report-generation/app/api/scheduler_admin.py` | Job CRUD + 触发 |
| 新增 | `services/report-generation/app/services/preagg.py` | 预聚合引擎 |
