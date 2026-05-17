"""APScheduler 调度器。

**重要**：APScheduler 不支持多进程；生产启动必须 `uvicorn --workers 1`，
否则每个 worker 都会跑一遍 job，写入倍增。
"""

from __future__ import annotations

import logging

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

from app.settings import get_settings

log = logging.getLogger(__name__)
_scheduler: BackgroundScheduler | None = None


def _do_ingest() -> None:
    """占位：从外部数据源拉数据写 facts 表。"""
    log.info("ingest tick (placeholder)")


def _do_preagg() -> None:
    """占位：把 facts 长表预聚合到 daily snapshot。"""
    log.info("preagg tick (placeholder)")


def start_scheduler() -> BackgroundScheduler:
    """启动调度器，仅一次。重复调用返回已存在的实例。"""
    global _scheduler
    if _scheduler is not None:
        return _scheduler

    settings = get_settings()
    sched = BackgroundScheduler(timezone="Asia/Shanghai")
    sched.add_job(
        _do_ingest, CronTrigger.from_crontab(settings.ingest_cron),
        id="ingest", replace_existing=True,
    )
    sched.add_job(
        _do_preagg, CronTrigger.from_crontab(settings.preagg_cron),
        id="preagg", replace_existing=True,
    )
    sched.start()
    log.info("scheduler started: ingest=%s, preagg=%s", settings.ingest_cron, settings.preagg_cron)
    _scheduler = sched
    return sched


def stop_scheduler() -> None:
    global _scheduler
    if _scheduler is not None:
        _scheduler.shutdown(wait=False)
        _scheduler = None
