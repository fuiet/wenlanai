#!/bin/bash

# 宝塔服务器快速部署脚本
# 使用方法: bash deploy.sh

set -e

echo "=========================================="
echo "    Next.js 应用宝塔部署脚本"
echo "=========================================="

# 配置变量
PROJECT_DIR="/www/wwwroot/wenlanai.top"
FLASK_PORT=5001
NEXTJS_PORT=3000

# 1. 检查 Node.js
echo ""
echo "[1/6] 检查 Node.js 环境..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请在宝塔软件商店安装 Node.js 20+"
    exit 1
fi
echo "✅ Node.js 版本: $(node -v)"

# 2. 安装 pnpm
echo ""
echo "[2/6] 检查 pnpm..."
if ! command -v pnpm &> /dev/null; then
    echo "安装 pnpm..."
    npm install -g pnpm
fi
echo "✅ pnpm 版本: $(pnpm -v)"

# 3. 安装依赖
echo ""
echo "[3/6] 安装项目依赖..."
cd $PROJECT_DIR
pnpm install

# 4. 构建项目
echo ""
echo "[4/6] 构建项目..."
pnpm build

# 5. 配置 PM2
echo ""
echo "[5/6] 配置 PM2..."
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'nextjs-app',
    script: 'npm',
    args: 'start',
    cwd: '/www/wwwroot/wenlanai.top',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G'
  }]
}
EOF

# 6. 启动服务
echo ""
echo "[6/6] 启动服务..."
pm2 delete nextjs-app 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save

echo ""
echo "=========================================="
echo "    部署完成！"
echo "=========================================="
echo ""
echo "Next.js 应用已启动在端口 $NEXTJS_PORT"
echo "请确保 Nginx 已配置反向代理"
echo ""
echo "查看日志: pm2 logs nextjs-app"
echo "重启服务: pm2 restart nextjs-app"
echo ""
