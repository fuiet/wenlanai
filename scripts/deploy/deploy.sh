#!/bin/bash
# ============================================
# 文澜智作 - 一键部署脚本
# ============================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

APP_NAME="wenlan"
APP_DIR="/var/www/wenlan"
LOG_DIR="/var/log/wenlan"

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 进入应用目录
cd $APP_DIR

log_info "拉取最新代码..."
git pull origin main

log_info "安装依赖..."
pnpm install

log_info "构建项目..."
pnpm build

log_info "重启应用..."
pm2 delete $APP_NAME 2>/dev/null || true
pm2 start npm --name $APP_NAME -- start

log_info "保存 PM2 配置..."
pm2 save

log_info "检查应用状态..."
pm2 list

log_info "检查日志..."
pm2 logs $APP_NAME --lines 20 --nostream

echo ""
echo "========================================"
echo -e "${GREEN}部署完成！${NC}"
echo "========================================"
echo "访问地址: http://$(curl -s ifconfig.me)"
echo ""
echo "常用命令:"
echo "  pm2 status        - 查看状态"
echo "  pm2 logs wenlan   - 查看日志"
echo "  pm2 restart wenlan - 重启"
echo "========================================"
