# 前端镜像 —— 多阶段：Node 构建 → Nginx 静态服务
#
# 构建：docker build -t ops-web:dev apps/web
# 生产用 pnpm generate 输出静态产物到 .output/public，nginx 直接挂
#
# 构建参数（默认走公网镜像，内网构建用 --build-arg 覆盖）：
#   NPM_REGISTRY  默认 https://registry.npmmirror.com（淘宝）
#                 内网示例：http://nexus.intra.corp/repository/npm-group/
#   APK_MIRROR    默认 mirrors.tuna.tsinghua.edu.cn（清华，仅替换 host）
#                 内网示例：mirrors.intra.corp（HTTPS） 或 nexus.intra.corp/repository/alpine
#   APK_MIRROR_SCHEME  默认 https，内网无证书可改 http
#   NUXT_PUBLIC_DATA_SOURCE_MODE api | json
#   NUXT_PUBLIC_API_BASE
#   NUXT_PUBLIC_MOCK_BASE
#
# 内网一把梭示例：
#   docker build apps/web \
#     --build-arg NPM_REGISTRY=http://nexus.intra.corp/repository/npm-group/ \
#     --build-arg APK_MIRROR=nexus.intra.corp/repository/alpine \
#     --build-arg APK_MIRROR_SCHEME=http \
#     -t ops-web:dev

# ---------- stage 1：Node 构建 ----------
FROM node:20-alpine AS build

ARG NPM_REGISTRY=https://registry.npmmirror.com
ARG APK_MIRROR=mirrors.tuna.tsinghua.edu.cn
ARG APK_MIRROR_SCHEME=https

# NODE_TLS_REJECT_UNAUTHORIZED=0 / NPM_CONFIG_STRICT_SSL=false：
#   全内网部署关闭 TLS 校验（内部 CA / 自签证书 Node 默认不信任）。
#   只在 build stage 生效；stage 2 nginx:alpine 不带 Node，运行镜像不受影响。
#   想"干净修"请改用 COPY 内网 CA + NODE_EXTRA_CA_CERTS。
ENV NPM_CONFIG_REGISTRY=${NPM_REGISTRY} \
    NODE_TLS_REJECT_UNAUTHORIZED=0 \
    NPM_CONFIG_STRICT_SSL=false

# alpine apk 换源（host + scheme 都可覆盖，方便内网无 HTTPS 的私服）
RUN set -eux; \
    sed -i "s|https\?://dl-cdn.alpinelinux.org|${APK_MIRROR_SCHEME}://${APK_MIRROR}|g" /etc/apk/repositories || true

# 直接用 npm 装 pnpm（绕开 corepack）—— corepack 的 tarball 路径解析
# 跟 nexus npm proxy 兼容性差，常报 "pnpm@X.X.X not have a valid tarball"。
# npm install 走标准协议，nexus 都认。
RUN npm install -g pnpm@9.12.0 --registry="${NPM_REGISTRY}"

# pnpm 自身运行时再读 ~/.npmrc，写一次保险
RUN pnpm config set registry "${NPM_REGISTRY}"

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

# 同样换源（ARG 需要在每个 stage 重新声明）
ARG APK_MIRROR=mirrors.tuna.tsinghua.edu.cn
ARG APK_MIRROR_SCHEME=https
RUN set -eux; \
    sed -i "s|https\?://dl-cdn.alpinelinux.org|${APK_MIRROR_SCHEME}://${APK_MIRROR}|g" /etc/apk/repositories || true

COPY --from=build /app/.output/public /usr/share/nginx/html
COPY ./infra/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
HEALTHCHECK --interval=15s --timeout=3s --retries=3 \
  CMD wget -q --spider http://127.0.0.1/healthz || exit 1
