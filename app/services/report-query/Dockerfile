# report-query 服务镜像（FastAPI 只读，端口 8001）
#
# 构建：docker build -t ops-report-query:dev services/report-query
# 离线构建：先在联网机 docker pull python:3.12-slim ghcr.io/astral-sh/uv:0.5.7，
#   docker save 后传到目标机 docker load。
#
# 构建参数（默认走公网镜像，内网构建用 --build-arg 覆盖）：
#   PIP_INDEX_URL     默认 https://pypi.tuna.tsinghua.edu.cn/simple（清华）
#                     内网示例：http://nexus.intra.corp/repository/pypi/simple
#   APT_MIRROR        默认 mirrors.aliyun.com（仅替换 host）
#                     内网示例：mirrors.intra.corp 或 nexus.intra.corp/repository/debian
#   APT_MIRROR_SCHEME 默认 https，内网无证书可改 http
#
# 内网一把梭示例：
#   docker build services/report-query \
#     --build-arg PIP_INDEX_URL=http://nexus.intra.corp/repository/pypi/simple \
#     --build-arg APT_MIRROR=nexus.intra.corp/repository/debian \
#     --build-arg APT_MIRROR_SCHEME=http \
#     -t ops-report-query:dev

# ---------- stage 1：依赖解析 ----------
FROM python:3.12-slim AS deps
COPY --from=ghcr.io/astral-sh/uv:0.5.7 /uv /uvx /usr/local/bin/

ARG PIP_INDEX_URL=https://pypi.tuna.tsinghua.edu.cn/simple
ARG APT_MIRROR=mirrors.aliyun.com
ARG APT_MIRROR_SCHEME=https

ENV UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=never \
    UV_INDEX_URL=${PIP_INDEX_URL} \
    UV_DEFAULT_INDEX=${PIP_INDEX_URL} \
    PIP_INDEX_URL=${PIP_INDEX_URL} \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# 切 apt 源，让 deb 包从国内拉。原 sources.list 在 debian 12 (bookworm) 走的是 deb822
# 格式 /etc/apt/sources.list.d/debian.sources。两种格式都覆盖一下，谁在就改谁。
# scheme + host 都可覆盖，方便内网无 HTTPS 的私服。
RUN set -eux; \
    if [ -f /etc/apt/sources.list ]; then \
        sed -i "s|https\?://deb.debian.org|${APT_MIRROR_SCHEME}://${APT_MIRROR}|g; s|https\?://security.debian.org|${APT_MIRROR_SCHEME}://${APT_MIRROR}|g" /etc/apt/sources.list; \
    fi; \
    if [ -f /etc/apt/sources.list.d/debian.sources ]; then \
        sed -i "s|https\?://deb.debian.org|${APT_MIRROR_SCHEME}://${APT_MIRROR}|g; s|https\?://security.debian.org|${APT_MIRROR_SCHEME}://${APT_MIRROR}|g" /etc/apt/sources.list.d/debian.sources; \
    fi

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
