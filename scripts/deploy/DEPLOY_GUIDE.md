# 宝塔服务器部署指南

## 1. 环境准备

在宝塔面板安装以下软件：
- Node.js 20+ (通过软件商店安装)
- PM2管理器 (通过软件商店安装)
- Nginx (已安装)

## 2. 上传代码

1. 从 Coze 平台下载项目代码包
2. 上传到宝塔服务器 `/www/wwwroot/wenlanai.top/` 目录
3. 解压代码包

## 3. 安装依赖

```bash
cd /www/wwwroot/wenlanai.top
pnpm install
```

## 4. 配置环境变量

创建 `.env` 文件：
```env
# 数据库连接
PGDATABASE_URL=postgresql://用户名:密码@数据库地址:端口/数据库名
SUPABASE_URL=你的Supabase_URL
SUPABASE_ANON_KEY=你的Supabase_Key

# 微信配置
WECHAT_APP_ID=你的微信AppID
WECHAT_APP_SECRET=你的微信AppSecret
```

## 5. 构建项目

```bash
pnpm build
```

## 6. 启动服务

使用 PM2 启动 Next.js：
```bash
pm2 start npm --name "nextjs-app" -- start
```

## 7. 配置 Nginx

修改宝塔网站的 Nginx 配置：

```nginx
# 微信API代理到Flask后端 (端口 5001)
location /wechat/ {
    proxy_pass http://127.0.0.1:5001/wechat/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

# 推送草稿API代理到Flask后端
location /api/push_draft {
    proxy_pass http://127.0.0.1:5001/api/push_draft;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

# 其他所有请求代理到Next.js应用 (端口 3000)
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

## 8. 服务端口分配

| 服务 | 端口 | 说明 |
|------|------|------|
| Nginx | 80/443 | 对外服务 |
| Next.js | 3000 | 前端 + 业务API |
| Flask | 5001 | 微信API |

## 9. 验证部署

部署完成后测试：
```bash
# 测试首页
curl https://wenlanai.top/

# 测试登录API
curl -X POST -H 'Content-Type: application/json' \
  -d '{"username":"testuser","password":"123456"}' \
  https://wenlanai.top/api/member/login

# 测试微信API
curl https://wenlanai.top/wechat/auth_url
```

## 常见问题

### Q: 502 Bad Gateway
检查服务是否启动：
```bash
pm2 list
pm2 logs nextjs-app
```

### Q: 数据库连接失败
检查 `.env` 文件中的数据库配置是否正确

### Q: 微信授权失败
确保微信第三方平台的授权回调域名配置为 `wenlanai.top`
