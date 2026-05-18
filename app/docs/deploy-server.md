# 部署到 ubuntu@192.168.0.132（离线 Docker）

> 目标：在内网/离线服务器上跑起整套，前端 / 查询 / 生成 / MySQL 各占独立容器。

## 0. 服务器信息

| 项 | 值 |
|---|---|
| IP | `192.168.0.132` |
| 账号 | `ubuntu` |
| 密码 | `123456789` |
| Docker | 需提前装好（`docker compose` v2） |

## 1. 在能联网的机器上准备产物

### 1.1 拉基础镜像 + 保存

```bash
docker pull mysql:5.7
docker pull python:3.12-slim
docker pull node:20-alpine
docker pull nginx:alpine
docker pull ghcr.io/astral-sh/uv:0.5.7

docker save mysql:5.7 python:3.12-slim node:20-alpine nginx:alpine \
            ghcr.io/astral-sh/uv:0.5.7 \
            -o base-images.tar
```

### 1.2 准备前端离线字体（可选，只在需要非"系统"字体时跑）

```bash
cd apps/web
node scripts/vendor-fonts.mjs
# 输出在 apps/web/public/fonts-vendor/
# fonts.json 自动改写为本地路径
```

### 1.3 在本机构建业务镜像 + 导出

```bash
# 仓库根目录
cp .env.example .env
# 改 .env 里 MYSQL_PASSWORD / ADMIN_TOKEN 等

docker compose build
docker save ops-web:latest ops-report-query:latest ops-report-generation:latest \
            -o app-images.tar
```

### 1.4 把以下传到服务器

```text
base-images.tar
app-images.tar
docker-compose.yml
.env
docs/deploy-server.md  (本文档)
```

可以打个 tar：

```bash
tar -czf deploy-bundle.tar.gz base-images.tar app-images.tar docker-compose.yml .env
scp deploy-bundle.tar.gz ubuntu@192.168.0.132:~/
```

## 2. 在 192.168.0.132 部署

SSH 上去：

```bash
ssh ubuntu@192.168.0.132     # 密码：123456789
```

### 2.1 确认 Docker

```bash
docker --version
docker compose version
```

如果没装：

```bash
# Ubuntu 22.04+ 一键
sudo apt-get update
sudo apt-get install -y docker.io docker-compose-plugin
sudo usermod -aG docker $USER
newgrp docker
```

### 2.2 解压 + 加载镜像

```bash
cd ~
tar -xzf deploy-bundle.tar.gz
docker load -i base-images.tar
docker load -i app-images.tar
docker image ls   # 确认 5 个镜像都在
```

### 2.3 启动整套

```bash
mkdir ops-dashboard && cd ops-dashboard
mv ~/docker-compose.yml ~/.env .
docker compose up -d

# 看启动状态
docker compose ps
docker compose logs -f mysql       # MySQL 准备就绪需要 ~30s
```

### 2.4 灌种子数据（首次部署 / 重置时）

```bash
docker compose exec report-generation python -m app.seed --reset
```

输出类似：

```text
INFO --reset: dropping all tables
INFO seed done: {'reports': 10, 'dropdowns': 9, 'metrics': 12}
```

### 2.5 验证

```bash
# 三个端点都返回 envelope
curl -s http://localhost/api/healthz
curl -s http://localhost/api/reports/summary/config | head -c 200
curl -s http://localhost/api/scheduler/jobs

# 浏览器：http://192.168.0.132
```

## 3. 切换前端数据源（json fixture ↔ 真后端）

前端走 Nuxt runtimeConfig，**两种模式都不动代码**：

| 模式 | 设置 | 用途 |
|---|---|---|
| **json**（默认） | `NUXT_PUBLIC_DATA_SOURCE_MODE=json` + `NUXT_PUBLIC_MOCK_BASE=/mock` | 调试 / 离线 demo / 本地开发 |
| **api** | `NUXT_PUBLIC_DATA_SOURCE_MODE=api` + `NUXT_PUBLIC_API_BASE=/api` | 走真后端 |

由于 nginx 已经把 `/api` 反代到查询服务，**部署默认就该是 api 模式**。改 `apps/web/Dockerfile` 的 ENV 或 `docker-compose.yml` 给 `web` 服务加 environment：

```yaml
web:
  environment:
    NUXT_PUBLIC_DATA_SOURCE_MODE: api
    NUXT_PUBLIC_API_BASE: /api
```

改完 `docker compose up -d --build web` 重建。

## 4. 排错速查

| 现象 | 检查 |
|---|---|
| Web 404 | `docker compose logs web`；nginx.conf 是否被 build 进镜像 |
| `/api/*` 502 | `docker compose ps report-query`；网络 `internal` 是否连通 |
| MySQL 拒绝连接 | `docker compose logs mysql`；`.env` 里密码是否一致 |
| Scheduler 重复触发 | 检查 `docker compose ps report-generation`，确认只有 1 个容器 |
| 容器内时间不对 | `TZ=Asia/Shanghai` 已设；如还错检查宿主时钟 |

## 5. 离线限制

- 默认 `system` 字体零外部依赖 ✅
- Noto / LXGW / Playfair 字体需先跑 `vendor-fonts.mjs` 镜像化（1.2 节）
- `首页` 嵌入 `https://www.google.com/` 是示例，在离线环境会显示空白 iframe；改 `nav.json` 里 `embed` 字段或换成内部地址即可

## 6. 重建 / 升级

```bash
# 改完代码后在联网机重建
docker compose build
docker save ops-web:latest ops-report-query:latest ops-report-generation:latest -o app-images.tar
scp app-images.tar ubuntu@192.168.0.132:~/

# 服务器
docker load -i app-images.tar
docker compose up -d
```
