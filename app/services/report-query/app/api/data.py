"""报表 data 端点。

GET  /api/reports/{report_type}/data        —— 简单读 fixtures（dev / 默认筛选）
POST /api/reports/{report_type}/data        —— 带筛选 / 分页 / 排序 / 同比环比
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from app.envelope import ok
from app.schemas import QueryRequest
from app.services.repo import get_report_data

router = APIRouter(prefix="/reports", tags=["report-data"])


@router.get("/{report_type}/data")
def read_report_data(report_type: str) -> dict[str, object]:
    """无入参拉默认数据。生产建议永远用 POST 携带筛选。"""
    data = get_report_data(report_type)
    if data is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"report data not found: {report_type}",
        )
    return ok(data)


@router.post("/{report_type}/data")
def query_report_data(report_type: str, req: QueryRequest) -> dict[str, object]:
    """带筛选查询。阶段一仍读 fixtures（忽略 req），阶段二接 services.metric_query。"""
    _ = req  # 阶段一占位，避免 lint 警告；真接数据库后会用到
    data = get_report_data(report_type)
    if data is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"report data not found: {report_type}",
        )
    return ok(data)
