"""把仓库源码打包 + scp 到 ubuntu@192.168.0.132 + 远端 docker compose build & up.

为什么走 Python：Windows OpenSSH 没有 sshpass / 非交互密码喂入。我们已用
setup-ssh-key.py 配好免密了，理论上 ssh / scp 直接走 key auth 即可，但
Python 这里统一编排（异常处理、日志、幂等检查）。
"""

from __future__ import annotations

import secrets
import subprocess
import sys
import tarfile
from pathlib import Path

HOST = "192.168.0.132"
USER = "ubuntu"
REMOTE_DIR = "/home/ubuntu/ops-dashboard"
TARBALL = Path(__file__).resolve().parent / "_build" / "source.tar.gz"
ENV_FILE = Path(__file__).resolve().parent / "_build" / ".env"
REPO_ROOT = Path(__file__).resolve().parent.parent.parent

# 端口分配（服务器上 3000/8001/8002/3306 都被占了）
WEB_PORT = "80"
QUERY_PORT = "18001"
GEN_PORT = "18002"
MYSQL_PORT = "33307"  # mysql 主要供内部用, 这个仅供调试

EXCLUDE_DIRS = {
    "node_modules",
    ".nuxt",
    ".output",
    ".venv",
    "__pycache__",
    ".git",
    ".ruff_cache",
    ".mypy_cache",
    ".pytest_cache",
    "verify-screenshots",
    "dist",
    ".cache",
    ".nitro",
    "_build",
    ".playwright-mcp",
}
EXCLUDE_FILES_GLOB = {"*.log", "*.db", "*.db-journal"}


def step(name: str) -> None:
    print(f"\n========== {name} ==========")


def make_env_file() -> str:
    """生成服务器 .env。ADMIN_TOKEN 随机, MYSQL 密码用偏强默认.

    幂等：已存在则保留 ADMIN_TOKEN 重写其他字段（避免每次部署 token 变了）。
    """
    ENV_FILE.parent.mkdir(parents=True, exist_ok=True)
    token = secrets.token_hex(32)
    if ENV_FILE.exists():
        for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
            if line.startswith("ADMIN_TOKEN="):
                token = line.split("=", 1)[1].strip()
                break
    mysql_pwd = "Report_Prod_2026_" + secrets.token_hex(4)
    if ENV_FILE.exists():
        for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
            if line.startswith("MYSQL_PASSWORD="):
                mysql_pwd = line.split("=", 1)[1].strip()
                break
    root_pwd = "Root_Prod_2026_" + secrets.token_hex(4)
    if ENV_FILE.exists():
        for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
            if line.startswith("MYSQL_ROOT_PASSWORD="):
                root_pwd = line.split("=", 1)[1].strip()
                break

    content = f"""# 由 scripts/deploy/deploy.py 生成 —— 服务器部署用 .env
# 端口避开服务器已占用：3000(Grafana) / 8001 / 8002 / 3306

SERVER_HOST={HOST}

# 容器端口（host 上对外）
WEB_PORT={WEB_PORT}
QUERY_PORT={QUERY_PORT}
GEN_PORT={GEN_PORT}
MYSQL_PORT={MYSQL_PORT}

# MySQL 凭据
MYSQL_ROOT_PASSWORD={root_pwd}
MYSQL_DATABASE=report
MYSQL_USER=report_user
MYSQL_PASSWORD={mysql_pwd}

# admin 鉴权 token
ADMIN_TOKEN={token}

# 镜像 tag
TAG=latest

# 国内镜像源（Dockerfile build args 读取）
PIP_INDEX_URL=https://pypi.tuna.tsinghua.edu.cn/simple
APT_MIRROR=mirrors.aliyun.com
NPM_REGISTRY=https://registry.npmmirror.com

# 前端打包默认走 api 模式（部署版直接连 nginx 反代）
NUXT_PUBLIC_DATA_SOURCE_MODE=api
NUXT_PUBLIC_API_BASE=/api
NUXT_PUBLIC_MOCK_BASE=/mock
"""
    ENV_FILE.write_text(content, encoding="utf-8")
    print(f"  ENV 写入 {ENV_FILE} (ADMIN_TOKEN={token[:8]}...)")
    return token


def should_exclude(path: str) -> bool:
    parts = Path(path).parts
    for part in parts:
        if part in EXCLUDE_DIRS:
            return True
    name = parts[-1] if parts else ""
    for glob in EXCLUDE_FILES_GLOB:
        if Path(name).match(glob):
            return True
    return False


def make_tarball() -> int:
    TARBALL.parent.mkdir(parents=True, exist_ok=True)
    if TARBALL.exists():
        TARBALL.unlink()

    file_count = 0

    def tar_filter(info: tarfile.TarInfo) -> tarfile.TarInfo | None:
        nonlocal file_count
        if should_exclude(info.name):
            return None
        file_count += 1
        return info

    with tarfile.open(TARBALL, "w:gz", compresslevel=6) as tar:
        for entry in sorted(REPO_ROOT.iterdir()):
            if entry.name in EXCLUDE_DIRS:
                continue
            tar.add(entry, arcname=entry.name, filter=tar_filter)

    size_mb = TARBALL.stat().st_size / (1024 * 1024)
    print(f"  打包完成: {TARBALL} ({file_count} 个文件, {size_mb:.1f} MB)")
    return file_count


def run(cmd: list[str], *, check: bool = True) -> subprocess.CompletedProcess[str]:
    print(f"  $ {' '.join(cmd)}")
    proc = subprocess.run(cmd, capture_output=True, text=True, check=False)
    if proc.stdout.strip():
        for line in proc.stdout.rstrip().splitlines():
            print(f"    | {line}")
    if proc.stderr.strip():
        for line in proc.stderr.rstrip().splitlines():
            print(f"    ! {line}")
    if check and proc.returncode != 0:
        print(f"  FAIL (rc={proc.returncode})", file=sys.stderr)
        sys.exit(proc.returncode)
    return proc


def scp_to_server(local: Path, remote: str) -> None:
    run(["scp", "-o", "BatchMode=yes", str(local), f"{USER}@{HOST}:{remote}"])


def ssh_exec(script: str, *, check: bool = True) -> subprocess.CompletedProcess[str]:
    # ssh 把所有 remote-command 参数用空格 join 后扔给登陆 shell，所以脚本必须当成一整串发过去
    return run(["ssh", "-o", "BatchMode=yes", f"{USER}@{HOST}", script], check=check)


def main() -> int:
    step("生成 .env")
    make_env_file()

    step("打包源码")
    make_tarball()

    step("准备远端目录")
    ssh_exec(f"mkdir -p {REMOTE_DIR}/_incoming && rm -f {REMOTE_DIR}/_incoming/source.tar.gz {REMOTE_DIR}/_incoming/.env")

    step("scp 源码 + .env")
    scp_to_server(TARBALL, f"{REMOTE_DIR}/_incoming/source.tar.gz")
    scp_to_server(ENV_FILE, f"{REMOTE_DIR}/_incoming/.env")

    step("解压 + 覆盖")
    ssh_exec(
        f"set -eux; cd {REMOTE_DIR}; "
        f"tar -xzf _incoming/source.tar.gz; "
        f"mv -f _incoming/.env .env; "
        f"chmod 600 .env; "
        f"ls -la"
    )

    step("docker compose build")
    ssh_exec(
        f"cd {REMOTE_DIR} && docker compose build 2>&1 | tail -80",
        check=False,
    )

    step("docker compose up -d")
    ssh_exec(f"cd {REMOTE_DIR} && docker compose up -d")

    step("等容器健康")
    ssh_exec(f"cd {REMOTE_DIR} && sleep 5 && docker compose ps")

    step("seed 初始化")
    ssh_exec(
        f"cd {REMOTE_DIR} && "
        # MySQL 启动慢, 等到 healthy 再 seed
        f"for i in 1 2 3 4 5 6 7 8 9 10; do "
        f"  if docker compose ps mysql | grep -q healthy; then break; fi; "
        f"  echo waiting mysql... $i; sleep 6; "
        f"done; "
        f"docker compose exec -T report-generation python -m app.seed --reset || true"
    )

    step("健康检查")
    ssh_exec(
        f"curl -s http://localhost:{WEB_PORT}/healthz || echo NGINX_FAIL; "
        f"echo; curl -s http://localhost:{QUERY_PORT}/api/healthz || echo QUERY_FAIL; "
        f"echo; curl -s http://localhost:{GEN_PORT}/api/healthz || echo GEN_FAIL"
    )

    print("\n[DONE] 部署完成。访问 http://192.168.0.132 看前端。")
    print(f"        report-query  http://192.168.0.132:{QUERY_PORT}/api/healthz")
    print(f"        report-gen    http://192.168.0.132:{GEN_PORT}/api/healthz")
    return 0


if __name__ == "__main__":
    sys.exit(main())
