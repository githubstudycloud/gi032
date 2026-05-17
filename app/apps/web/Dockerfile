# 前端镜像 —— 多阶段：Node 构建 → Nginx 静态服务
#
# 构建：docker build -t ops-web:dev apps/web
# 生产用 pnpm generate 输出静态产物到 .output/public，nginx 直接挂

# ---------- stage 1：Node 构建 ----------
FROM node:20-alpine AS build
ENV PNPM_HOME=/pnpm \
    PATH="/pnpm:$PATH"

RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

WORKDIR /app

# 利用缓存：先 lock + package，再 install
COPY package.json pnpm-lock.yaml ./
COPY .nvmrc ./
RUN pnpm install --frozen-lockfile

COPY . .

# 数据源模式 baked into bundle（SSG 后无法改）。
#   api  → 走真后端（默认，部署版）
#   json → 读 /mock/*.json（调试 / 离线 demo）
ARG NUXT_PUBLIC_DATA_SOURCE_MODE=api
ARG NUXT_PUBLIC_API_BASE=/api
ARG NUXT_PUBLIC_MOCK_BASE=/mock
ENV NUXT_PUBLIC_DATA_SOURCE_MODE=${NUXT_PUBLIC_DATA_SOURCE_MODE} \
    NUXT_PUBLIC_API_BASE=${NUXT_PUBLIC_API_BASE} \
    NUXT_PUBLIC_MOCK_BASE=${NUXT_PUBLIC_MOCK_BASE}

# generate = SSG 静态站；输出在 .output/public
RUN pnpm generate

# ---------- stage 2：Nginx 静态服务 ----------
FROM nginx:alpine
COPY --from=build /app/.output/public /usr/share/nginx/html
COPY ./infra/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
HEALTHCHECK --interval=15s --timeout=3s --retries=3 \
  CMD wget -q --spider http://127.0.0.1/healthz || exit 1
