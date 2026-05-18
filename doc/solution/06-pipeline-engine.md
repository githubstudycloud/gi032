# 06 — 通用数据流引擎（Pipeline Engine）

> 愿景：「构建一些通用组件让可以很容易自动配置数据生成流」

## 1. 问题定义

当前数据生成是"一个 job 干一件事"的模式。但真实场景中，数据生成往往是多步骤的流水线：

```
场景：生成"产业落地进展"报表
  Step 1: 从 Jira API 拉取需求数据
  Step 2: 从 AI 平台 DB 拉取用户活跃数据
  Step 3: 从测试管理平台 API 拉取用例数据
  Step 4: 合并三个数据源（按部门/产业 JOIN）
  Step 5: 计算衍生指标（覆盖率 = AI需求数/总需求数）
  Step 6: 按配置的 KPI 定义聚合
  Step 7: 写入预聚合表
  Step 8: 通知查询服务刷新缓存
```

**需要一个 Pipeline 引擎**来编排这些步骤，让用户通过配置而非代码来定义数据生成流。

## 2. Pipeline 核心概念

```
Pipeline（流水线）
  ├── Step 1: Source（数据源节点）
  │     输出 → DataFrame A
  ├── Step 2: Source（数据源节点）
  │     输出 → DataFrame B
  ├── Step 3: Transform（转换节点）
  │     输入 ← DataFrame A
  │     输出 → DataFrame A'（清洗后）
  ├── Step 4: Join（合并节点）
  │     输入 ← DataFrame A' + DataFrame B
  │     输出 → DataFrame C
  ├── Step 5: Compute（计算节点）
  │     输入 ← DataFrame C
  │     输出 → DataFrame C'（加衍生列）
  ├── Step 6: Aggregate（聚合节点）
  │     输入 ← DataFrame C'
  │     输出 → DataFrame D（预聚合）
  ├── Step 7: Sink（输出节点）
  │     输入 ← DataFrame D
  │     写入 → DB 表
  └── Step 8: Notify（通知节点）
        触发 → 缓存刷新
```

### 2.1 节点类型

| 类别 | 节点类型 | 说明 |
|---|---|---|
| **Source** | `db_query` | 从数据库查询 |
| | `api_fetch` | 从 REST API 拉取 |
| | `csv_read` | 读取 CSV 文件 |
| | `excel_read` | 读取 Excel 文件 |
| | `mq_consume` | 从消息队列消费 |
| | `inline_data` | 内联静态数据 |
| **Transform** | `field_rename` | 字段重命名 |
| | `field_cast` | 类型转换 |
| | `field_compute` | 计算新字段 |
| | `row_filter` | 行过滤 |
| | `row_deduplicate` | 去重 |
| | `column_select` | 列选择（投影） |
| | `column_drop` | 列删除 |
| | `string_replace` | 字符串替换 |
| | `date_parse` | 日期解析 |
| **Merge** | `join` | 两个数据集 JOIN |
| | `union` | 两个数据集合并（纵向） |
| | `lookup` | 维表关联（类似 VLOOKUP） |
| **Aggregate** | `group_by` | 分组聚合 |
| | `window` | 窗口函数（排名/累计） |
| | `pivot` | 行转列 |
| | `unpivot` | 列转行 |
| **Sink** | `db_write` | 写入数据库表 |
| | `snapshot_write` | 写入 report_snapshot（JSON 快照） |
| | `csv_export` | 导出 CSV |
| | `api_push` | 推送到外部 API |
| **Control** | `notify` | 发送通知（缓存刷新/告警） |
| | `condition` | 条件分支 |
| | `loop` | 循环执行（参数化） |

## 3. Pipeline 定义语言（JSON/YAML）

### 3.1 Pipeline 配置结构

```jsonc
// pipeline_definitions/industry-report.json
{
  "id": "industry-report-pipeline",
  "name": "产业落地进展报表生成",
  "version": 1,
  "description": "从多个数据源汇聚产业维度的 AI 测试运营数据",
  
  // 调度
  "schedule": {
    "cron": "0 2 * * *",          // 每天凌晨 2 点
    "timezone": "Asia/Shanghai",
    "enabled": true
  },
  
  // 全局参数（可被手动触发/补采集覆盖）
  "params": {
    "date_from": { "type": "date", "default": "${yesterday}" },
    "date_to": { "type": "date", "default": "${today}" },
    "department": { "type": "string", "default": null }
  },
  
  // 步骤（DAG 编排）
  "steps": [
    {
      "id": "jira_data",
      "type": "source.api_fetch",
      "config": {
        "base_url": "https://jira.internal.com",
        "endpoint": "/rest/api/2/search",
        "method": "POST",
        "headers": { "Authorization": "Bearer ${env.JIRA_TOKEN}" },
        "body": {
          "jql": "project = AITEST AND created >= '${params.date_from}'",
          "maxResults": 1000
        },
        "data_path": "issues",
        "pagination": { "type": "offset", "param": "startAt", "size_param": "maxResults" }
      },
      "output": "jira_issues"
    },
    {
      "id": "ai_platform_users",
      "type": "source.db_query",
      "config": {
        "connection": "${env.AI_PLATFORM_DB_URL}",
        "query": "SELECT user_id, department, COUNT(*) as call_count FROM ai_calls WHERE call_date BETWEEN :date_from AND :date_to GROUP BY user_id, department",
        "params": {
          "date_from": "${params.date_from}",
          "date_to": "${params.date_to}"
        }
      },
      "output": "ai_users"
    },
    {
      "id": "clean_jira",
      "type": "transform.field_rename",
      "depends_on": ["jira_data"],
      "config": {
        "mapping": {
          "fields.summary": "requirement_title",
          "fields.assignee.displayName": "owner",
          "fields.customfield_10001": "department",
          "fields.status.name": "status"
        }
      },
      "input": "jira_issues",
      "output": "jira_clean"
    },
    {
      "id": "merge_data",
      "type": "merge.join",
      "depends_on": ["clean_jira", "ai_platform_users"],
      "config": {
        "left": "jira_clean",
        "right": "ai_users",
        "on": { "left": "department", "right": "department" },
        "how": "left"
      },
      "output": "merged"
    },
    {
      "id": "compute_metrics",
      "type": "transform.field_compute",
      "depends_on": ["merge_data"],
      "config": {
        "computations": [
          {
            "field": "design_coverage_rate",
            "formula": "ai_requirement_count / total_requirement_count * 100",
            "default": 0
          },
          {
            "field": "adoption_rate",
            "formula": "active_ai_users / total_users * 100",
            "default": 0
          }
        ]
      },
      "input": "merged",
      "output": "with_metrics"
    },
    {
      "id": "aggregate_by_industry",
      "type": "aggregate.group_by",
      "depends_on": ["compute_metrics"],
      "config": {
        "group_fields": ["industry_code", "industry_name"],
        "aggregations": [
          { "field": "call_count", "func": "sum", "alias": "total_calls" },
          { "field": "active_ai_users", "func": "count_distinct", "alias": "ai_user_count" },
          { "field": "design_coverage_rate", "func": "avg", "alias": "avg_coverage" }
        ]
      },
      "input": "with_metrics",
      "output": "industry_agg"
    },
    {
      "id": "write_snapshot",
      "type": "sink.snapshot_write",
      "depends_on": ["aggregate_by_industry"],
      "config": {
        "report_type": "industry",
        "kind": "data",
        "snapshot_date": "${params.date_to}"
      },
      "input": "industry_agg"
    },
    {
      "id": "refresh_cache",
      "type": "control.notify",
      "depends_on": ["write_snapshot"],
      "config": {
        "type": "http",
        "url": "http://report-query:8001/api/cache/invalidate",
        "method": "POST",
        "body": { "report_type": "industry" }
      }
    }
  ]
}
```

### 3.2 DAG 执行引擎

```
                ┌───────────────┐
                │  jira_data    │  ← 并行执行
                └───────┬───────┘
                        │
                ┌───────▼───────┐     ┌──────────────────┐
                │  clean_jira   │     │ ai_platform_users │  ← 并行执行
                └───────┬───────┘     └────────┬─────────┘
                        │                      │
                        └──────────┬───────────┘
                                   │
                           ┌───────▼───────┐
                           │  merge_data   │
                           └───────┬───────┘
                                   │
                           ┌───────▼──────────┐
                           │ compute_metrics  │
                           └───────┬──────────┘
                                   │
                           ┌───────▼──────────────┐
                           │ aggregate_by_industry │
                           └───────┬──────────────┘
                                   │
                           ┌───────▼──────────┐
                           │ write_snapshot   │
                           └───────┬──────────┘
                                   │
                           ┌───────▼──────────┐
                           │ refresh_cache    │
                           └──────────────────┘
```

## 4. Pipeline Engine 实现

### 4.1 核心引擎

```python
# pipeline/engine.py

from __future__ import annotations

import logging
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any

log = logging.getLogger(__name__)


class DataFrame:
    """简单的内存数据帧（行列表）。
    
    不引入 pandas —— 保持最小依赖。
    大数据场景可替换为 polars 或流式迭代器。
    """

    def __init__(self, rows: list[dict[str, Any]] | None = None) -> None:
        self.rows = rows or []

    @property
    def count(self) -> int:
        return len(self.rows)

    def columns(self) -> list[str]:
        return list(self.rows[0].keys()) if self.rows else []


class PipelineContext:
    """执行上下文 — 持有所有中间数据帧和参数。"""

    def __init__(self, params: dict[str, Any]) -> None:
        self.params = params
        self.dataframes: dict[str, DataFrame] = {}
        self.step_results: dict[str, dict[str, Any]] = {}

    def set_df(self, name: str, df: DataFrame) -> None:
        self.dataframes[name] = df

    def get_df(self, name: str) -> DataFrame:
        if name not in self.dataframes:
            raise KeyError(f"DataFrame '{name}' not found in context")
        return self.dataframes[name]

    def resolve_param(self, value: str) -> Any:
        """解析 ${params.xxx} / ${env.xxx} / ${yesterday} 等占位符。"""
        if not isinstance(value, str) or "${" not in value:
            return value
        # ... 模板替换逻辑
        return resolved


class PipelineEngine:
    """DAG 流水线执行引擎。"""

    def __init__(self, definition: dict[str, Any]) -> None:
        self._def = definition
        self._steps = {s["id"]: s for s in definition["steps"]}
        self._dag = self._build_dag()

    def _build_dag(self) -> dict[str, list[str]]:
        """构建 DAG（步骤 ID → 依赖列表）。"""
        dag: dict[str, list[str]] = {}
        for step in self._def["steps"]:
            dag[step["id"]] = step.get("depends_on", [])
        return dag

    def _topological_layers(self) -> list[list[str]]:
        """拓扑排序，返回分层列表（同层可并行）。"""
        in_degree: dict[str, int] = defaultdict(int)
        for node, deps in self._dag.items():
            in_degree.setdefault(node, 0)
            for dep in deps:
                in_degree[node] += 1

        layers: list[list[str]] = []
        remaining = dict(in_degree)

        while remaining:
            # 入度为 0 的节点组成一层
            layer = [n for n, d in remaining.items() if d == 0]
            if not layer:
                raise ValueError("Pipeline has circular dependency")
            layers.append(layer)
            for n in layer:
                del remaining[n]
                # 减少后续节点入度
                for node, deps in self._dag.items():
                    if node in remaining and n in deps:
                        remaining[node] -= 1

        return layers

    def execute(
        self,
        params: dict[str, Any] | None = None,
        max_workers: int = 4,
    ) -> PipelineContext:
        """执行流水线。"""
        merged_params = {**self._def.get("params", {}), **(params or {})}
        ctx = PipelineContext(merged_params)

        layers = self._topological_layers()
        log.info(
            "Pipeline %s: %d layers, %d steps",
            self._def["id"], len(layers), len(self._steps),
        )

        for layer_idx, layer in enumerate(layers):
            log.info("Executing layer %d: %s", layer_idx, layer)

            if len(layer) == 1:
                # 单步骤，直接执行
                self._execute_step(layer[0], ctx)
            else:
                # 多步骤，并行执行
                with ThreadPoolExecutor(max_workers=max_workers) as executor:
                    futures = {
                        executor.submit(self._execute_step, step_id, ctx): step_id
                        for step_id in layer
                    }
                    for future in as_completed(futures):
                        step_id = futures[future]
                        try:
                            future.result()
                        except Exception:
                            log.exception("Step %s failed", step_id)
                            raise

        return ctx

    def _execute_step(self, step_id: str, ctx: PipelineContext) -> None:
        """执行单个步骤。"""
        step = self._steps[step_id]
        step_type = step["type"]
        config = step.get("config", {})

        # 解析配置中的参数占位符
        resolved_config = self._resolve_config(config, ctx)

        # 获取节点处理器
        handler = get_step_handler(step_type)

        # 获取输入数据帧（如果有）
        input_df = None
        if "input" in step:
            input_df = ctx.get_df(step["input"])

        # 执行
        log.info("Step %s (%s): start", step_id, step_type)
        result_df = handler.execute(resolved_config, input_df, ctx)

        # 保存输出
        if "output" in step and result_df is not None:
            ctx.set_df(step["output"], result_df)

        log.info(
            "Step %s (%s): done, rows=%d",
            step_id, step_type, result_df.count if result_df else 0,
        )
```

### 4.2 步骤处理器注册

```python
# pipeline/handlers/registry.py

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any

from app.pipeline.engine import DataFrame, PipelineContext


class StepHandler(ABC):
    """步骤处理器基类。"""

    @abstractmethod
    def execute(
        self,
        config: dict[str, Any],
        input_df: DataFrame | None,
        ctx: PipelineContext,
    ) -> DataFrame | None:
        """执行步骤，返回输出 DataFrame（可选）。"""


_handlers: dict[str, type[StepHandler]] = {}


def register_handler(step_type: str, handler_cls: type[StepHandler]) -> None:
    _handlers[step_type] = handler_cls


def get_step_handler(step_type: str) -> StepHandler:
    cls = _handlers.get(step_type)
    if cls is None:
        raise ValueError(f"Unknown step type: {step_type}")
    return cls()
```

```python
# pipeline/handlers/source.py

class DbQueryHandler(StepHandler):
    def execute(self, config, input_df, ctx):
        connector = DatabaseConnector()
        connector.connect({"url": config["connection"], "query": config["query"]})
        rows = list(connector.fetch(config.get("params")))
        connector.close()
        return DataFrame(rows)

register_handler("source.db_query", DbQueryHandler)


class ApiFetchHandler(StepHandler):
    def execute(self, config, input_df, ctx):
        connector = ApiConnector()
        connector.connect(config)
        rows = list(connector.fetch())
        connector.close()
        return DataFrame(rows)

register_handler("source.api_fetch", ApiFetchHandler)
```

```python
# pipeline/handlers/transform.py

class FieldRenameHandler(StepHandler):
    def execute(self, config, input_df, ctx):
        mapping = config["mapping"]
        new_rows = []
        for row in input_df.rows:
            new_row = {}
            for key, value in row.items():
                new_key = mapping.get(key, key)
                new_row[new_key] = value
            new_rows.append(new_row)
        return DataFrame(new_rows)

register_handler("transform.field_rename", FieldRenameHandler)
```

```python
# pipeline/handlers/merge.py

class JoinHandler(StepHandler):
    def execute(self, config, input_df, ctx):
        left_df = ctx.get_df(config["left"])
        right_df = ctx.get_df(config["right"])
        left_key = config["on"]["left"]
        right_key = config["on"]["right"]
        how = config.get("how", "inner")

        # 构建 right 侧索引
        right_index = {}
        for row in right_df.rows:
            key = row.get(right_key)
            right_index.setdefault(key, []).append(row)

        result = []
        for left_row in left_df.rows:
            key = left_row.get(left_key)
            matches = right_index.get(key, [])
            if matches:
                for right_row in matches:
                    merged = {**left_row, **right_row}
                    result.append(merged)
            elif how in ("left", "outer"):
                result.append(dict(left_row))

        return DataFrame(result)

register_handler("merge.join", JoinHandler)
```

## 5. Pipeline 管理 API

```python
# api/pipeline.py

router = APIRouter(prefix="/pipelines", tags=["pipeline"])

@router.get("/")
async def list_pipelines() -> JSONResponse:
    """列出所有 Pipeline 定义。"""
    pass

@router.post("/")
async def create_pipeline(body: PipelineCreate) -> JSONResponse:
    """创建 Pipeline（保存定义到 DB）。"""
    pass

@router.get("/{pipeline_id}")
async def get_pipeline(pipeline_id: str) -> JSONResponse:
    """获取 Pipeline 详情。"""
    pass

@router.put("/{pipeline_id}")
async def update_pipeline(pipeline_id: str, body: PipelineUpdate) -> JSONResponse:
    """更新 Pipeline 定义。"""
    pass

@router.post("/{pipeline_id}/run")
async def run_pipeline(
    pipeline_id: str,
    body: PipelineRunParams | None = None,
) -> JSONResponse:
    """手动触发 Pipeline 执行。"""
    pass

@router.post("/{pipeline_id}/backfill")
async def backfill_pipeline(
    pipeline_id: str,
    body: BackfillParams,
) -> JSONResponse:
    """补采集：按日期逐天执行。"""
    pass

@router.get("/{pipeline_id}/runs")
async def list_runs(pipeline_id: str, limit: int = 20) -> JSONResponse:
    """查询 Pipeline 执行历史。"""
    pass

@router.get("/{pipeline_id}/runs/{run_id}")
async def get_run_detail(pipeline_id: str, run_id: str) -> JSONResponse:
    """查询单次执行详情（含每个 step 的状态和数据量）。"""
    pass

@router.post("/{pipeline_id}/validate")
async def validate_pipeline(body: PipelineCreate) -> JSONResponse:
    """验证 Pipeline 定义（DAG 合法性、连接器可用性）。"""
    pass

@router.post("/{pipeline_id}/preview")
async def preview_pipeline(
    pipeline_id: str,
    step_id: str,
    limit: int = 10,
) -> JSONResponse:
    """预览某个 step 的输出（执行到该步骤，取前 N 行）。"""
    pass
```

## 6. Pipeline 可视化编辑器（远期前端）

```
┌─ Pipeline 编辑器 ──────────────────────────────────────────┐
│                                                            │
│  ┌─ 节点面板 ─┐  ┌─ DAG 画布 ─────────────────────────┐   │
│  │ Source     │  │                                     │   │
│  │  DB 查询   │  │  [Jira API] ──┐                    │   │
│  │  API 拉取  │  │               ├──► [合并] ──► [计算]│   │
│  │  CSV 读取  │  │  [AI 平台DB]──┘       │            │   │
│  │           │  │                    ┌──▼──┐          │   │
│  │ Transform │  │                    │聚合  │          │   │
│  │  重命名   │  │                    └──┬──┘          │   │
│  │  类型转换  │  │                       │             │   │
│  │  计算字段  │  │                    ┌──▼──┐          │   │
│  │           │  │                    │写入DB│          │   │
│  │ Merge     │  │                    └─────┘          │   │
│  │  JOIN     │  │                                     │   │
│  │  UNION    │  └─────────────────────────────────────┘   │
│  │           │                                            │
│  │ Sink      │  ┌─ 属性面板 ──────────────────────────┐   │
│  │  写 DB    │  │ 选中节点：[合并]                     │   │
│  │  导出 CSV │  │ 类型：merge.join                     │   │
│  │           │  │ 左表：jira_clean                     │   │
│  └───────────┘  │ 右表：ai_users                      │   │
│                 │ JOIN 键：department                   │   │
│                 │ 方式：[LEFT ▼]                       │   │
│                 └─────────────────────────────────────┘   │
│                                                            │
│  [验证 DAG]  [预览数据]  [保存]  [立即运行]                │
└────────────────────────────────────────────────────────────┘
```

实现技术：
- DAG 可视化：`vue-flow`（Vue 3 的 React Flow 对应物）
- 节点拖拽：原生 drag-and-drop
- 属性面板：动态表单（根据节点类型渲染不同 form）

## 7. 与现有系统的集成

### 7.1 Pipeline → 报表的连接

```
Pipeline 最后一步通常是 sink.snapshot_write：
  → 写入 report_snapshot 表
  → report_type = "industry", kind = "data"
  → 查询服务（report-query）读到的就是最新快照

或者 sink.db_write：
  → 写入 report_fact_* 预聚合表
  → 查询服务的 QueryEngine 直接查
```

### 7.2 Python + Java 混合 Pipeline（远期）

```
用什么控制业务流的进程？
  
  选项 A：纯 Python（当前方案）
    - APScheduler 调度 → PipelineEngine 执行
    - 简单、一体化、运维成本低
    - 适合中小规模

  选项 B：Python 编排 + Java 执行
    - Python 作为 Pipeline 编排器（定义 DAG、调度、监控）
    - 某些计算密集型 step 调用 Java 微服务执行
    - Java 暴露 gRPC / REST 接口：POST /execute-step { step_config, input_data }
    - 适合大数据量、需要 JVM 生态（Spark/Flink）

  选项 C：独立编排引擎
    - Apache Airflow / Prefect / Temporal
    - Python/Java worker 都注册为执行器
    - 适合企业级、多团队协作

  推荐：先 A，后 B（按需），不急着上 C
```

## 8. 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 新增 | `services/report-generation/app/pipeline/engine.py` | DAG 执行引擎 |
| 新增 | `services/report-generation/app/pipeline/handlers/registry.py` | 处理器注册表 |
| 新增 | `services/report-generation/app/pipeline/handlers/source.py` | Source 处理器 |
| 新增 | `services/report-generation/app/pipeline/handlers/transform.py` | Transform 处理器 |
| 新增 | `services/report-generation/app/pipeline/handlers/merge.py` | Merge 处理器 |
| 新增 | `services/report-generation/app/pipeline/handlers/aggregate.py` | Aggregate 处理器 |
| 新增 | `services/report-generation/app/pipeline/handlers/sink.py` | Sink 处理器 |
| 新增 | `services/report-generation/app/pipeline/handlers/control.py` | Control 处理器 |
| 新增 | `services/report-generation/app/api/pipeline.py` | Pipeline CRUD API |
| 新增 | `services/report-generation/app/models.py` | PipelineDefinition + PipelineRun |
| 远期 | `apps/web/app/components/pipeline/PipelineEditor.vue` | 可视化编辑器 |
| 远期 | `apps/web/app/pages/ai-test/system/pipelines.vue` | Pipeline 管理页 |
