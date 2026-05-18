# report-generation 服务镜像（FastAPI 写 + APScheduler，端口 8002）
#
# 启动时 --workers 1 强制单进程（APScheduler 不支持多进程）。
#
# 构建参数（默认走公网镜像，内网构建用 --build-arg 覆盖）：
#   PIP_INDEX_URL     默认 https://pypi.tuna.tsinghua.edu.cn/simple（清华）
#                     内网示例：http://nexus.intra.corp/repository/pypi/simple
#   APT_MIRROR        默认 mirrors.aliyun.com（仅替换 host）
#                     内网示例：mirrors.intra.corp 或 nexus.intra.corp/repository/debian
#   APT_MIRROR_SCHEME 默认 https，内网无证书可改 http
#
# 内网一把梭示例：
#   docker build services/report-generation \
#     --build-arg PIP_INDEX_URL=http://nexus.intra.corp/repository/pypi/simple \
#     --build-arg APT_MIRROR=nexus.intra.corp/repository/debian \
#     --build-arg APT_MIRROR_SCHEME=http \
#     -t ops-report-generation:dev

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

# scheme + host 都可覆盖，方便内网无 HTTPS 的私服
RUN set -eux; \
    if [ -f /etc/apt/sources.list ]; then \
        sed -i "s|https\?://deb.debian.org|${APT_MIRROR_SCHEME}://${APT_MIRROR}|g; s|https\?://security.debian.org|${APT_MIRROR_SCHEME}://${APT_MIRROR}|g" /etc/apt/sources.list; \
    fi; \
    if [ -f /etc/apt/sources.list.d/debian.sources ]; then \
        sed -i "s|https\?://deb.debian.org|${APT_MIRROR_SCHEME}://${APT_MIRROR}|g; s|https\?://security.debian.org|${APT_MIRROR_SCHEME}://${APT_MIRROR}|g" /etc/apt/sources.list.d/debian.sources; \
    fi

WORKDIR /app
COPY pyproject.toml uv.lock ./
# 内网 nexus 走 HTTPS + 自签 / 内部 CA，uv 默认不信任 ——
# 从 PIP_INDEX_URL 里抠出 host 传给 --allow-insecure-host，跳过校验。
RUN INSECURE_HOST=$(echo "${PIP_INDEX_URL}" | sed -E 's|^https?://([^/:]+).*|\1|') \
 && uv sync --frozen --no-install-project --no-dev --allow-insecure-host "${INSECURE_HOST}"

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
