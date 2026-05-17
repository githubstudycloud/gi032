"""V2 协议的 Pydantic 模型。

跟前端 `app/types/report-config.ts` 一对一镜像 —— 任何字段改动两边同步改。
"""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class StrictModel(BaseModel):
    """所有 schema 默认严格 —— 多余字段直接报错，避免悄悄静默错配。"""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


# —— meta / toolbar / filter / kpi / primary_view / drilldown —————————

class ReportMeta(StrictModel):
    report_type: str
    name: str
    subtitle: str | None = None
    description: str | None = None
    version: str = "v2"


class ToolbarSpec(StrictModel):
    refresh: bool = True
    paging: bool = True
    compare: bool = False
    columns: bool = False
    export: bool = False


class FilterSource(StrictModel):
    endpoint: str
    method: Literal["GET", "POST"] = "GET"


FilterKind = Literal[
    "date_range", "date_single", "flat_dropdown", "search_dropdown",
    "multi_select", "text", "number_range", "tag", "checkbox_group",
    "radio_group", "cascade", "tree_select",
]


class FilterSpec(StrictModel):
    code: str
    label: str
    kind: FilterKind
    required: bool = False
    placeholder: str | None = None
    default: Any | None = None
    source: FilterSource | None = None


class Threshold(StrictModel):
    good: float | None = None
    warn: float | None = None
    danger: float | None = None
    direction: Literal["higher_better", "lower_better"] = "higher_better"


class KpiItemDef(StrictModel):
    key: str
    label: str
    unit: str | None = None
    data_type: Literal["int", "decimal", "percent", "string"] = "decimal"
    description: str | None = None
    threshold: Threshold | None = None
    detail_ref: str | None = None
    detail: dict[str, Any] | None = None  # 内联图表配置（前端 MetricDetail）


class KpiGroupDef(StrictModel):
    key: str
    label: str
    items: list[KpiItemDef]


class KpiSpec(StrictModel):
    enabled: bool = True
    title: str = "核心指标"
    footnote: str = ""
    data_endpoint: str | None = None
    groups: list[KpiGroupDef]


class HeaderNode(StrictModel):
    """递归多级表头节点。叶子节点是 column 定义。"""

    key: str
    label: str
    sortable: bool = False
    filterable: bool = False
    width: int | None = None
    align: Literal["left", "center", "right"] | None = None
    format: str | None = None  # 'int' | 'decimal:2' | 'percent:1' 等
    drilldown_ref: str | None = None
    children: list[HeaderNode] = Field(default_factory=list)


HeaderNode.model_rebuild()


class TabDef(StrictModel):
    key: str
    label: str
    header_tree: list[HeaderNode]


class PrimaryViewPaging(StrictModel):
    default_mode: Literal["server", "client", "none"] = "client"
    default_page_size: int = 20
    page_size_options: list[int] = Field(default_factory=lambda: [10, 20, 50, 100])


class PrimaryView(StrictModel):
    enabled: bool = True
    title: str | None = None
    endpoint: str | None = None
    paging: PrimaryViewPaging | None = None
    tabs: list[TabDef]


class DrilldownDef(StrictModel):
    title: str
    endpoint: str
    method: Literal["GET", "POST"] = "POST"
    header_tree_endpoint: str | None = None  # 列也可动态来自后端
    param_mapping: dict[str, str] = Field(default_factory=dict)


class ReportConfig(StrictModel):
    meta: ReportMeta
    toolbar: ToolbarSpec = Field(default_factory=ToolbarSpec)
    filters: list[FilterSpec] = Field(default_factory=list)
    kpi: KpiSpec | None = None
    primary_view: PrimaryView
    drilldowns: dict[str, DrilldownDef] = Field(default_factory=dict)


# —— data 端响应（与 config 配对） —————————————————

class KpiItemValue(StrictModel):
    key: str
    value: str | float | int | None = None
    mom: str | None = None
    trend: Literal["up", "down", "flat"] = "flat"


class KpiGroupData(StrictModel):
    key: str
    items: list[KpiItemValue]


class KpiData(StrictModel):
    groups: list[KpiGroupData]


class TabData(StrictModel):
    items: list[dict[str, Any]]
    page: int = 1
    page_size: int = 20
    total: int = 0


class ReportData(StrictModel):
    kpi: KpiData | None = None
    tabs: dict[str, TabData]


# —— 入参 ——————————————————————————

class QueryRequest(StrictModel):
    """通用 data 查询入参。"""

    filters: dict[str, Any] = Field(default_factory=dict)
    page: int = 1
    page_size: int = 20
    sort: list[dict[str, str]] = Field(default_factory=list)
    compare: Literal["none", "prev_period", "prev_year", "prev_month"] = "none"
