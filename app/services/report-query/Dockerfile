# report-query 服务镜像（FastAPI 只读，端口 8001）
#
# 构建：docker build -t ops-report-query:dev services/report-query
# 离线构建：先在联网机 docker pull python:3.12-slim ghcr.io/astral-sh/uv:0.5.7，
#   docker save 后传到目标机 docker load。

# ---------- stage 1：依赖解析 ----------
FROM python:3.12-slim AS deps
COPY --from=ghcr.io/astral-sh/uv:0.5.7 /uv /uvx /usr/local/bin/

ENV UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=never \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# 利用 docker layer 缓存：先只拷 lock 和 pyproject，装依赖
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-install-project --no-dev

# ---------- stage 2：运行时 ----------
FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/app/.venv/bin:$PATH"

WORKDIR /app
COPY --from=deps /app/.venv /app/.venv
COPY ./app /app/app

# 容器里 DB 是真后端，不需要 fixture fallback
# fixture 找不到时 repo.py 会返回 None，handler 抛 404，前端走错误处理
EXPOSE 8001
HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8001/api/healthz').read()" || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
