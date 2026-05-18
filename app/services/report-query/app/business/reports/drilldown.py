"""钻取端点 —— config.drilldowns[ref].endpoint 指向这里。

入参：row + cell + filter（前端从被点 tab/row/column 拼出来）
出参：明细列表 + 动态 header_tree（可选）
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.framework.envelope import ok

router = APIRouter(prefix="/reports", tags=["report-drilldown"])


class DrilldownRequest(BaseModel):
    row: dict[str, Any] = Field(default_factory=dict)
    cell: dict[str, Any] | None = None
    filter: dict[str, Any] = Field(default_factory=dict)
    page: int = 1
    page_size: int = 50


@router.post("/{report_type}/drilldown/{ref}")
def drilldown(report_type: str, ref: str, req: DrilldownRequest) -> dict[str, object]:
    """钻取查询。

    阶段一：返回占位明细 + 一个示例 header_tree，让前端 UI 流程能跑通。
    阶段二：按 ref 查具体明细表（ai_metric_detail / 业务明细表），用 req.filter + row 拼 WHERE。
    """
    items = [
        {"id": f"{ref}-row-{i}", "metric": f"sample-{i}", "value": i * 100, "owner": "张三"}
        for i in range(1, req.page_size + 1)
    ]
    return ok({
        "items": items,
        "page": req.page,
        "page_size": req.page_size,
        "total": len(items),
        "context": {"report_type": report_type, "ref": ref, "row": req.row},
    })
