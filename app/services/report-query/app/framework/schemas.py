"""V2 协议的 Pydantic 模型 —— **后端为协议源 (source of truth)**。

与前端 `apps/web/app/types/report-config.ts` 一一对应；任何字段改动以本文件为准，
前端 Zod schema (`apps/web/app/types/report-schemas.ts`) 应随之同步。

约定：
- 字段名沿用前端 v2 协议（含 ``goodColor``/``badColor``/``cellType`` 三个 camelCase 字段，
  通过 ``Field(alias=...)`` 映射）。
- ``StrictModel`` 默认 ``extra="forbid"``，悄悄多塞字段会直接 422，避免协议漂移再次发生。
- ``populate_by_name=True`` 允许 alias 与 field name 双形输入；序列化时 FastAPI
  路由用 ``response_model_by_alias=True`` 输出 camelCase。
"""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class StrictModel(BaseModel):
    """所有 schema 默认严格 —— 多余字段直接报错，避免悄悄静默错配。"""

    model_config = ConfigDict(
        extra="forbid",
        str_strip_whitespace=True,
        populate_by_name=True,
    )


# —— meta ——————————————————————————

class ReportMeta(StrictModel):
    report_type: str
    name: str
    subtitle: str | None = None
    show_subtitle: bool | None = None
    description: str | None = None
    version: int
    user_pref_endpoint: str | None = None
    style_scope: str | None = None  # 关联前端 [data-report-scope=<key>] 局部样式覆盖


# —— toolbar ——————————————————————————

class ToolbarSpec(StrictModel):
    show_refresh: bool | None = None
    show_paging_mode: bool | None = None
    show_compare: bool | None = None
    show_column_customizer: bool | None = None
    show_export: bool | None = None


# —— filters ——————————————————————————

FilterKind = Literal[
    "date_single", "date_range",
    "flat_dropdown", "hierarchy_dropdown", "search_dropdown",
    "multi_select", "multi_search",
    "text", "number_range", "boolean",
    "enum_radio", "enum_chips",
]


class FilterSortSpec(StrictModel):
    field: str
    dir: Literal["asc", "desc"]


class FilterPaging(StrictModel):
    enabled: bool
    page_size: int


class FilterSource(StrictModel):
    endpoint: str
    method: Literal["GET", "POST"] | None = None
    paging: FilterPaging | None = None
    sortable_by: list[str] | None = None
    default_sort: list[FilterSortSpec] | None = None
    supports_favorite: bool | None = None
    supports_filter: bool | None = None
    params_in: list[str] | None = None
    max_levels: int | None = None
    select_at_any_depth: bool | None = None
    max_picks: int | None = None
    min_chars: int | None = None
    debounce_ms: int | None = None


class FilterOption(StrictModel):
    value: str
    label: str


class FilterSpec(StrictModel):
    code: str
    label: str
    kind: FilterKind
    required: bool | None = None
    default: Any = None
    param: dict[str, str]
    depends_on: list[str] | None = None
    source: FilterSource | None = None
    options: list[FilterOption] | None = None
    placeholder: str | None = None
    min: float | None = None
    max: float | None = None
    step: float | None = None
    unit: str | None = None
    multi: bool | None = None


# —— threshold（视觉化阈值：min/max + 颜色 token） ——————————————

class Threshold(StrictModel):
    min: float | None = None
    max: float | None = None
    good_color: str | None = Field(default=None, alias="goodColor")
    bad_color: str | None = Field(default=None, alias="badColor")


# —— table column（N 级递归表头；叶子节点为 column 定义） ——————————

class TableColumn(StrictModel):
    key: str
    label: str
    rowspan: Literal[1, 2] | None = None
    width: str | None = None
    children: list[TableColumn] | None = None
    align: Literal["left", "center", "right"] | None = None
    sortable: bool | None = None
    filterable: bool | None = None
    highlight: bool | None = None
    threshold: Threshold | None = None
    cell_type: Literal["value", "action"] | None = Field(default=None, alias="cellType")


TableColumn.model_rebuild()


# —— kpi ——————————————————————————

class KpiItemDef(StrictModel):
    key: str
    label: str
    unit: str | None = None
    data_type: Literal["int", "decimal", "percent", "string"] | None = None
    description: str | None = None
    threshold: Threshold | None = None
    detail_ref: str | None = None
    detail: dict[str, Any] | None = None  # 内联图表（前端 MetricDetail，结构不在协议内强校验）


class KpiGroupDef(StrictModel):
    key: str
    label: str
    items: list[KpiItemDef]


class KpiSpec(StrictModel):
    enabled: bool
    title: str | None = None
    data_endpoint: str | None = None
    layout_mode_default: Literal["grouped", "flat"] | None = None
    footnote: str | None = None
    groups: list[KpiGroupDef]


# —— primary view ——————————————————————————

class PagingSpec(StrictModel):
    enabled: bool | None = None
    default_mode: Literal["server", "client", "none"] | None = None
    default_page_size: int | None = None


class HeaderModule(StrictModel):
    """表头按模块分类（v2.1 新增）。详见前端 ``HeaderModule`` TS interface。

    协议层 ``PrimaryViewTab`` 同时保留 ``header_tree``；两者择一，优先 ``header_modules``。
    """

    key: str
    label: str
    description: str | None = None
    columns: list[TableColumn]
    default_visible: bool | None = None
    collapsible: bool | None = None
    style_scope: str | None = None


class PrimaryViewTab(StrictModel):
    key: str
    label: str
    data_endpoint: str | None = None
    header_tree_endpoint: str | None = None
    header_tree: list[TableColumn] | None = None
    header_modules: list[HeaderModule] | None = None


class RowDimOption(StrictModel):
    code: str
    label: str
    row_count_hint: int | None = None


class RowFavoriteSpec(StrictModel):
    enabled: bool
    toggle_endpoint: str | None = None
    sort_on_top: bool | None = None


class PrimaryView(StrictModel):
    enabled: bool
    title: str | None = None
    endpoint: str | None = None
    method: Literal["GET", "POST"] | None = None
    paging: PagingSpec | None = None
    row_dim_options: list[RowDimOption] | None = None
    row_dim_default: str | None = None
    row_favorite: RowFavoriteSpec | None = None
    tabs: list[PrimaryViewTab]


# —— drilldowns ——————————————————————————

class DrilldownDef(StrictModel):
    title: str
    endpoint: str
    method: Literal["GET", "POST"] | None = None
    param_mapping: dict[str, str]
    paging: PagingSpec | None = None
    header_tree_endpoint: str | None = None
    header_tree: list[TableColumn] | None = None


# —— full config ——————————————————————————

class ReportConfig(StrictModel):
    meta: ReportMeta
    toolbar: ToolbarSpec | None = None
    filters: list[FilterSpec] = Field(default_factory=list)
    kpi: KpiSpec | None = None
    primary_view: PrimaryView | None = None
    drilldowns: dict[str, DrilldownDef] | None = None


# —— data 端响应（与 config 配对） —————————————————

class KpiItemValue(StrictModel):
    key: str
    value: str | float | int | None = None
    mom: str | None = None
    trend: Literal["up", "down", "flat"] | None = None


class KpiGroupData(StrictModel):
    key: str
    items: list[KpiItemValue]


class KpiData(StrictModel):
    groups: list[KpiGroupData]


class TabData(StrictModel):
    items: list[dict[str, Any]]  # row 项的字段是用户自定义的，不在协议层校验
    page: int | None = None
    page_size: int | None = None
    total: int | None = None
    has_more: bool | None = None
    extras: dict[str, Any] | None = None


class DrilldownData(StrictModel):
    default: TabData


class ReportData(StrictModel):
    kpi: KpiData | None = None
    tabs: dict[str, TabData]
    drilldowns: dict[str, DrilldownData] | None = None


# —— 入参 ——————————————————————————

class SortSpec(StrictModel):
    field: str
    dir: Literal["asc", "desc"]


class QueryRequest(StrictModel):
    """通用 data 查询入参。"""

    filters: dict[str, Any] = Field(default_factory=dict)
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=200)
    sort: list[SortSpec] = Field(default_factory=list)
    compare: Literal["none", "prev_period", "prev_year", "prev_month"] = "none"
