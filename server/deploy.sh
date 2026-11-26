#!/usr/bin/env bash
# =============================================================================
#  音辩卫士 · 推理后端一键部署脚本（Alibaba Cloud Linux 3.2104 LTS / CentOS Stream 8 系）
#
#  用法：在服务器上，把本脚本 + server/ 整个目录上传到 /opt/yinbian/ 后，
#        以 root 或 sudo 执行：
#            sudo bash deploy.sh
#
#  脚本会做 5 件事：
#    1. 安装编译工具 + Python 3.11（源码编译，Alibaba Linux 3 仓库无 3.11）
#    2. 创建虚拟环境 /opt/yinbian/venv
#    3. 安装 requirements.txt 依赖（用阿里云镜像加速）
#    4. 配置 systemd 服务（开机自启 + 崩溃自动拉起）
#    5. 开放防火墙 8000 端口
#
#  执行完后验证：
#    curl http://127.0.0.1:8000/api/health
# =============================================================================
set -euo pipefail

APP_DIR="/opt/yinbian"
SERVER_DIR="${APP_DIR}/server"
VENV_DIR="${APP_DIR}/venv"
PY_VER="3.11.9"
PY_PREFIX="/usr/local/python311"
PY_BIN="${PY_PREFIX}/bin/python3.11"
PORT=8000
SERVICE_NAME="yinbian"

log() { echo -e "\n\033[1;32m[部署]\033[0m $*"; }
warn() { echo -e "\033[1;33m[提示]\033[0m $*"; }
die() { echo -e "\033[1;31m[失败]\033[0m $*" >&2; exit 1; }

# 必须以 root 或 sudo 运行（编译安装 Python 需要写 /usr/local）
[ "$(id -u)" -eq 0 ] || die "请用 sudo bash deploy.sh 运行"

log "第 1 步：安装编译工具与系统依赖"
dnf install -y gcc gcc-c++ make openssl-devel bzip2-devel libffi-devel zlib-devel \
  || die "dnf 安装编译依赖失败"

if [ -x "${PY_BIN}" ]; then
  log "检测到已安装 Python 3.11，跳过编译"
else
  log "第 2 步：下载并编译 Python ${PY_VER}（约 5~10 分钟，请耐心等待）"
  cd /opt
  [ -f "Python-${PY_VER}.tgz" ] || wget "https://www.python.org/ftp/python/${PY_VER}/Python-${PY_VER}.tgz"
  tar -xzf "Python-${PY_VER}.tgz"
  cd "Python-${PY_VER}"
  ./configure --enable-optimizations --prefix="${PY_PREFIX}" >/dev/null \
    || die "configure 失败"
  make -j2 >/dev/null || die "make 失败（-j2 适配 2 核，若内存不足可改成 -j1）"
  make altinstall >/dev/null || die "make altinstall 失败"
  cd /opt
fi

log "第 3 步：创建虚拟环境"
mkdir -p "${APP_DIR}"
[ -d "${VENV_DIR}" ] || "${PY_BIN}" -m venv "${VENV_DIR}"

log "第 4 步：安装 Python 依赖（用阿里云镜像加速，torch 约 800MB 需几分钟）"
"${VENV_DIR}/bin/pip" install -r "${SERVER_DIR}/requirements.txt" \
  -i https://mirrors.aliyun.com/pypi/simple/ \
  || die "依赖安装失败"

log "第 5 步：配置 systemd 服务（开机自启 + 崩溃自动拉起）"
cat > "/etc/systemd/system/${SERVICE_NAME}.service" <<EOF
[Unit]
Description=Yinbian Guardian Inference
After=network.target

[Service]
User=root
WorkingDirectory=${SERVER_DIR}
ExecStart=${VENV_DIR}/bin/uvicorn serve:app --host 0.0.0.0 --port ${PORT}
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now "${SERVICE_NAME}"

log "第 6 步：开放防火墙 ${PORT} 端口"
if command -v firewall-cmd >/dev/null 2>&1; then
  firewall-cmd --permanent --add-port=${PORT}/tcp >/dev/null 2>&1 || true
  firewall-cmd --reload >/dev/null 2>&1 || true
  warn "已尝试开放 ${PORT}/tcp（若防火墙未启用则无影响）"
else
  warn "未检测到 firewalld，跳过（阿里云安全组需单独放行 ${PORT}）"
fi

log "全部完成！验证服务状态："
systemctl status "${SERVICE_NAME}" --no-pager || true
echo ""
log "请执行以下命令验证接口："
echo "  curl http://127.0.0.1:8000/api/health"
echo "  预期返回：{\"status\":\"ok\",\"model\":\"ai_music_cnn.pt\",...}"
