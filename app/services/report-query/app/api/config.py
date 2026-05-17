"""报表 config 端点。

GET /api/reports/{report_type}/config
返回 ReportConfig（meta + filters + kpi + primary_view + drilldowns），
跟前端 V2 协议一一对应。
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from app.envelope import ok
from app.services.fixtures import load_report_config

router = APIRouter(prefix="/reports", tags=["report-config"])


@router.get("/{report_type}/config")
def get_report_config(report_type: str) -> dict[str, object]:
    """加载并返回报表配置。

    阶段一：从 fixtures（apps/web/public/mock/reports/<type>/config.json）读取，
    保证零 DB 启动即可工作。
    阶段二：替换为 services.config_assembler.assemble(report_type, db_session)。
    """
    cfg = load_report_config(report_type)
    if cfg is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"report config not found: {report_type}",
        )
    return ok(cfg)
