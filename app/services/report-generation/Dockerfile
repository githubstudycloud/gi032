# report-generation 服务镜像（FastAPI 写 + APScheduler，端口 8002）
#
# 启动时 --workers 1 强制单进程（APScheduler 不支持多进程）。

FROM python:3.12-slim AS deps
COPY --from=ghcr.io/astral-sh/uv:0.5.7 /uv /uvx /usr/local/bin/

ENV UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=never \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-install-project --no-dev

FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/app/.venv/bin:$PATH"

WORKDIR /app
COPY --from=deps /app/.venv /app/.venv
COPY ./app /app/app

# seed 命令需要读 apps/web/public/mock/，部署时通过 volume 挂载或先在宿主跑 seed
# 容器只跑 generate / ingest 两条主线，seed 是初始化一次性动作
EXPOSE 8002
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8002/api/healthz').read()" || exit 1

# 必须 --workers 1：APScheduler 多 worker 会让 ingest/preagg 重复执行
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8002", "--workers", "1"]
