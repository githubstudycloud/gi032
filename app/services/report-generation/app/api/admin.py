"""管理端点 —— 指标定义 CRUD / 预聚合手动刷新 / 版本失效标记。

所有路由都过 require_admin 鉴权。
"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.envelope import ok
from app.security import require_admin

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_admin)])


class MetricDef(BaseModel):
    code: str
    name: str
    category: str = "business"
    data_source: str = ""
    status: str = "active"
    owner: str = ""
    formula: str | None = None  # 例 'ai_req_count/req_count*100'
    unit: str | None = None
    description: str = ""


class MetricDefListReq(BaseModel):
    page: int = 1
    page_size: int = 20
    keyword: str = ""
    category: str = ""
    status: str = ""


_DEMO_METRICS = [
    MetricDef(
        code="ai-user-count", name="AI 用户数",
        category="user", owner="张三", status="active",
    ),
    MetricDef(
        code="ai-requirements", name="AI 需求数",
        category="business", owner="李四", status="active",
    ),
    MetricDef(
        code="ai-cases-generated", name="AI 生成用例数",
        category="capability", owner="赵六", status="active",
    ),
]


@router.post("/metrics/list")
def list_metrics(req: MetricDefListReq) -> dict[str, object]:
    """阶段一：返回内存中的示例指标。阶段二接 DB。"""
    items = [m.model_dump() for m in _DEMO_METRICS]
    return ok({"items": items, "total": len(items), "page": req.page, "page_size": req.page_size})


@router.post("/metrics/upsert")
def upsert_metric(m: MetricDef) -> dict[str, object]:
    """新建或更新指标定义。阶段一仅 echo。"""
    return ok({"code": m.code, "saved": True})


class MetricDeleteReq(BaseModel):
    code: str


@router.post("/metrics/delete")
def delete_metric(req: MetricDeleteReq) -> dict[str, object]:
    return ok({"code": req.code, "deleted": True})


class PreaggRefreshReq(BaseModel):
    date_from: str | None = None
    date_to: str | None = None
    report_types: list[str] = Field(default_factory=list)


@router.post("/preagg/refresh")
def refresh_preagg(req: PreaggRefreshReq) -> dict[str, object]:
    """手动触发预聚合刷新。"""
    return ok({"queued": True, "scope": req.model_dump()})
