"""数据摄入端点 —— 给上游推数据 / 上传 CSV 用。

POST /api/metrics/ingest      —— JSON 推送（单条 / 批量）
POST /api/metrics/ingest/csv  —— CSV 文件上传
"""

from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, File, UploadFile
from pydantic import BaseModel, Field

from app.framework.envelope import ok
from app.framework.security import require_admin

router = APIRouter(prefix="/metrics", tags=["ingest"], dependencies=[Depends(require_admin)])


class IngestRow(BaseModel):
    metric_code: str
    period_date: str  # YYYY-MM-DD
    domain_code: str | None = None
    project_code: str | None = None
    value: float
    source: str = "manual"
    version_no: int = 1
    extra: dict[str, Any] = Field(default_factory=dict)


class IngestRequest(BaseModel):
    rows: list[IngestRow]


@router.post("/ingest")
def ingest_rows(req: IngestRequest) -> dict[str, object]:
    """JSON 推送。阶段一只回执行计划摘要，不真写库。"""
    return ok({
        "accepted": len(req.rows),
        "rejected": 0,
        "preview": [r.model_dump() for r in req.rows[:3]],
    })


@router.post("/ingest/csv")
async def ingest_csv(file: Annotated[UploadFile, File()]) -> dict[str, object]:
    """CSV 上传。阶段一只统计行数，不真写库。"""
    content = await file.read()
    lines = content.decode("utf-8-sig", errors="replace").splitlines()
    rows = max(0, len(lines) - 1)  # 减表头
    return ok({"filename": file.filename, "rows": rows})
