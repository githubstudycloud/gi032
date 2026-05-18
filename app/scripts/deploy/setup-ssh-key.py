"""把本地 ~/.ssh/id_ed25519.pub 下发到 ubuntu@192.168.0.132 实现免密。

用 paramiko 一次性 password 登陆，把公钥 append 到 ~/.ssh/authorized_keys
（去重）。之后所有 ssh / scp 走 key auth。
"""

from __future__ import annotations

import sys
from pathlib import Path

import paramiko

HOST = "192.168.0.132"
USER = "ubuntu"
PASS = "123456789"
PUB_KEY = Path.home() / ".ssh" / "id_ed25519.pub"


def main() -> int:
    if not PUB_KEY.exists():
        print(f"[FAIL] 公钥不存在: {PUB_KEY}", file=sys.stderr)
        return 1
    pub = PUB_KEY.read_text(encoding="utf-8").strip()
    print(f"[INFO] 公钥: {pub[:32]}...")

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(HOST, username=USER, password=PASS, timeout=15, look_for_keys=False, allow_agent=False)
    except Exception as exc:
        print(f"[FAIL] SSH 连接失败: {exc}", file=sys.stderr)
        return 2

    cmds = [
        "mkdir -p ~/.ssh && chmod 700 ~/.ssh",
        "touch ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys",
        # grep -F -x: 整行匹配; 不存在才追加, 实现幂等
        f"grep -F -x -q {paramiko_quote(pub)} ~/.ssh/authorized_keys || echo {paramiko_quote(pub)} >> ~/.ssh/authorized_keys",
        "wc -l ~/.ssh/authorized_keys",
        "uname -a",
        "whoami",
    ]
    for cmd in cmds:
        stdin, stdout, stderr = client.exec_command(cmd)
        rc = stdout.channel.recv_exit_status()
        out = stdout.read().decode("utf-8", errors="replace").strip()
        err = stderr.read().decode("utf-8", errors="replace").strip()
        tag = "OK" if rc == 0 else "FAIL"
        cmd_short = cmd if len(cmd) < 80 else cmd[:77] + "..."
        print(f"[{tag}] $ {cmd_short}")
        if out:
            print(f"    OUT: {out}")
        if err:
            print(f"    ERR: {err}")
        if rc != 0:
            client.close()
            return 3

    client.close()
    print("[DONE] SSH key 下发完成, 之后用 'ssh ubuntu@192.168.0.132' 应该免密")
    return 0


def paramiko_quote(s: str) -> str:
    """Quote a string for shell single-quoting."""
    return "'" + s.replace("'", "'\\''") + "'"


if __name__ == "__main__":
    sys.exit(main())
