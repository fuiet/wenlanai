#!/bin/bash
# ============================================
# 腾讯云服务器环境安装脚本
# 适用于 Ubuntu 22.04 / 20.04
# ============================================

set -e

echo "========================================"
echo "文澜智作 - 服务器环境安装脚本"
echo "========================================"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查是否为 root 用户
if [ "$EUID" -ne 0 ]; then
    log_error "请使用 root 用户运行此脚本，或使用 sudo"
    exit 1
fi

log_info "开始更新系统..."
apt update && apt upgrade -y

# ============================================
# 1. 安装 Git
# ============================================
log_info "安装 Git..."
apt install -y git

# ============================================
# 2. 安装 Node.js 20
# ============================================
log_info "安装 Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# 验证 Node.js 安装
node_version=$(node -v)
npm_version=$(npm -v)
log_info "Node.js 版本: $node_version"
log_info "npm 版本: $npm_version"

# ============================================
# 3. 安装 pnpm
# ============================================
log_info "安装 pnpm..."
npm install -g pnpm
pnpm_version=$(pnpm -v)
log_info "pnpm 版本: $pnpm_version"

# ============================================
# 4. 安装 PM2
# ============================================
log_info "安装 PM2..."
npm install -g pm2

# 开启 PM2 自启动
pm2 startup
pm2 install pm2-logrotate

# ============================================
# 5. 安装 Nginx
# ============================================
log_info "安装 Nginx..."
apt install -y nginx

# 启动并启用 Nginx
systemctl start nginx
systemctl enable nginx

# ============================================
# 6. 安装 Certbot (SSL证书)
# ============================================
log_info "安装 Certbot..."
apt install -y certbot python3-certbot-nginx

# ============================================
# 7. 配置防火墙
# ============================================
log_info "配置防火墙..."
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable

# ============================================
# 8. 创建应用目录
# ============================================
log_info "创建应用目录..."
mkdir -p /var/www/wenlan
mkdir -p /var/log/wenlan

# 设置目录权限
chown -R $USER:$USER /var/www/wenlan

# ============================================
# 9. 获取服务器IP
# ============================================
server_ip=$(curl -s ifconfig.me)
log_info "服务器 IP: $server_ip"
log_warn "请将此 IP 添加到微信第三方平台白名单！"

# ============================================
# 完成
# ============================================
echo ""
echo "========================================"
echo -e "${GREEN}环境安装完成！${NC}"
echo "========================================"
echo ""
echo "下一步操作："
echo "1. 将服务器 IP ($server_ip) 添加到微信第三方平台白名单"
echo "2. 上传项目代码到 /var/www/wenlan"
echo "3. 配置 Nginx"
echo "4. 运行: cd /var/www/wenlan && pnpm install && pnpm build && pm2 start npm --name 'wenlan' -- start"
echo ""
echo "详细教程请查看: deploy/README.md"
echo "========================================"
