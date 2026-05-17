"""健康检查 + 调度器状态。"""

from __future__ import annotations

from fastapi import APIRouter

from app.envelope import ok

router = APIRouter(tags=["meta"])


@router.get("/healthz")
def healthz() -> dict[str, object]:
    return ok({"status": "ok"})


@router.get("/scheduler/jobs")
def list_jobs() -> dict[str, object]:
    """列出当前调度器中的 job（不暴露内部状态，仅 id + next_run）。"""
    from app.scheduler import _scheduler

    if _scheduler is None:
        return ok({"running": False, "jobs": []})
    jobs = [
        {"id": j.id, "next_run_time": j.next_run_time.isoformat() if j.next_run_time else None}
        for j in _scheduler.get_jobs()
    ]
    return ok({"running": True, "jobs": jobs})
