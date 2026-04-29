# 文澜智作 - 腾讯云服务器部署指南

## 目录

1. [服务器购买](#1-服务器购买)
2. [环境安装](#2-环境安装)
3. [上传代码](#3-上传代码)
4. [配置 Nginx](#4-配置-nginx)
5. [配置域名](#5-配置域名)
6. [配置 SSL 证书](#6-配置-ssl-证书)
7. [后续维护](#7-后续维护)
8. [微信配置](#8-微信配置)

---

## 1. 服务器购买

### 推荐配置

| 配置项 | 推荐 |
|--------|------|
|地域|靠近你的用户群体（推荐上海/北京）|
|CPU|2核|
|内存|2GB|
|带宽|5Mbps|
|系统|Ubuntu 22.04 LTS|
|公网IP|记下这个IP，稍后配置白名单|

### 购买后记下

- 服务器公网 IP（如：`123.45.67.89`）
- 登录密码或 SSH 密钥

---

## 2. 环境安装

### 方式一：一键安装（推荐）

用 root 用户 SSH 登录服务器后，执行：

```bash
# 下载安装脚本（需要先将脚本上传到服务器）
chmod +x server-setup.sh
./server-setup.sh
```

### 方式二：手动安装

```bash
# 1. 更新系统
apt update && apt upgrade -y

# 2. 安装 Git
apt install -y git

# 3. 安装 Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# 4. 安装 pnpm
npm install -g pnpm

# 5. 安装 PM2
npm install -g pm2

# 6. 安装 Nginx
apt install -y nginx
systemctl start nginx
systemctl enable nginx

# 7. 配置防火墙
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
```

---

## 3. 上传代码

### 方法一：使用 Git

```bash
cd /var/www/wenlan

# 如果需要，克隆你的代码仓库
git clone https://your-repo-url.git .

# 或者上传代码后手动 git init 和添加远程仓库
```

### 方法二：使用 SCP 上传

在本地电脑上执行：

```bash
# 打包项目
cd /path/to/your/project
tar -czvf wenlan.tar.gz --exclude='node_modules' --exclude='.git' --exclude='.next' .

# 上传到服务器
scp wenlan.tar.gz root@你的服务器IP:/var/www/wenlan/

# 在服务器解压
cd /var/www/wenlan
tar -xzvf wenlan.tar.gz
```

### 安装依赖并构建

```bash
cd /var/www/wenlan
pnpm install
pnpm build
```

### 启动应用

```bash
pm2 start npm --name "wenlan" -- start
pm2 save
pm2 startup
```

---

## 4. 配置 Nginx

### 创建 Nginx 配置文件

```bash
nano /etc/nginx/sites-available/wenlan
```

复制以下内容（修改 `YOUR_DOMAIN` 为你的域名）：

```nginx
server {
    listen 80;
    server_name YOUR_DOMAIN;  # 修改为你的域名或IP

    client_max_body_size 100M;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 启用配置

```bash
# 创建软链接
ln -sf /etc/nginx/sites-available/wenlan /etc/nginx/sites-enabled/

# 测试配置
nginx -t

# 重载 Nginx
systemctl reload nginx
```

---

## 5. 配置域名

### 在域名服务商添加 DNS 解析

| 记录类型 | 主机记录 | 记录值 |
|----------|----------|--------|
|A|@|你的服务器IP|
|A|www|你的服务器IP|

### 等待生效

DNS 解析生效通常需要几分钟到几小时。

---

## 6. 配置 SSL 证书

### 使用 Certbot 免费证书

```bash
# 安装 Certbot
apt install -y certbot python3-certbot-nginx

# 申请证书（将 YOUR_EMAIL 和 YOUR_DOMAIN 替换为实际值）
certbot --nginx -d YOUR_DOMAIN --agree-tos -m YOUR_EMAIL -n

# 自动续期测试
certbot renew --dry-run
```

### 手动续期（证书有效期90天）

```bash
certbot renew
```

---

## 7. 后续维护

### 常用命令

```bash
# 查看状态
pm2 status

# 查看日志
pm2 logs wenlan

# 重启应用
pm2 restart wenlan

# 重新部署
cd /var/www/wenlan
git pull
pnpm install
pnpm build
pm2 restart wenlan

# 查看 Nginx 状态
systemctl status nginx

# 重载 Nginx
systemctl reload nginx
```

### 设置定时备份（可选）

```bash
# 编辑 crontab
crontab -e

# 添加备份任务（每天凌晨3点执行）
0 3 * * * cd /var/www/wenlan && git add . && git commit -m "Auto backup" && git push
```

---

## 8. 微信配置

### 添加 IP 白名单

1. 登录 [微信开放平台](https://open.weixin.qq.com)
2. 进入「管理中心」→「第三方平台」
3. 点击你的第三方平台
4. 进入「基本配置」
5. 找到「白名单IP地址」
6. 添加你的**服务器公网IP**

### 获取服务器 IP

```bash
curl ifconfig.me
```

---

## 快速检查清单

- [ ] 服务器已购买并获取公网 IP
- [ ] 环境已安装（Node.js、pnpm、PM2、Nginx）
- [ ] 代码已上传到 /var/www/wenlan
- [ ] 项目已构建（pnpm build）
- [ ] 应用已启动（pm2 start）
- [ ] Nginx 已配置并启用
- [ ] 域名已解析
- [ ] SSL 证书已配置
- [ ] 服务器 IP 已添加到微信白名单

---

## 常见问题

### Q: 访问网站显示 502 Bad Gateway

```bash
# 检查 PM2 状态
pm2 status

# 检查应用是否运行在 5000 端口
lsof -i:5000

# 重启应用
pm2 restart wenlan
```

### Q: SSL 证书申请失败

```bash
# 检查域名是否已解析
ping YOUR_DOMAIN

# 检查 Nginx 是否正常运行
systemctl status nginx

# 查看证书申请日志
certbot certificates
```

### Q: 微信 API 调用失败

1. 确认服务器 IP 已添加到白名单
2. 确认第三方平台配置正确
3. 检查应用日志：`pm2 logs wenlan`

---

## 技术支持

如有问题，请检查：

1. `pm2 logs wenlan` - 应用日志
2. `/var/log/nginx/error.log` - Nginx 错误日志
3. 微信开放平台后台 - 查看授权状态
