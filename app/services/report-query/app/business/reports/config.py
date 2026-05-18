"""报表 config 端点。

GET /api/reports/{report_type}/config
返回 ReportConfig（meta + filters + kpi + primary_view + drilldowns），
后端 Pydantic 作为协议 source of truth；运行时 ``response_model`` 强制校验，
任何漂移会直接 500 报错给开发者，避免静默接出脏数据。
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from app.business.reports.repo import get_report_config
from app.framework.envelope import Envelope, ok
from app.framework.schemas import ReportConfig

router = APIRouter(prefix="/reports", tags=["report-config"])


@router.get(
    "/{report_type}/config",
    response_model=Envelope[ReportConfig],
    response_model_by_alias=True,
    response_model_exclude_none=True,
)
def read_report_config(report_type: str) -> dict[str, object]:
    """加载并返回报表配置。

    阶段一：从 fixtures（apps/web/public/mock/reports/<type>/config.json）读取，
    保证零 DB 启动即可工作。
    阶段二：替换为 services.config_assembler.assemble(report_type, db_session)。
    """
    cfg = get_report_config(report_type)
    if cfg is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"报表配置不存在: {report_type}",
        )
    return ok(cfg)
