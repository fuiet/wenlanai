# 微信第三方平台授权事件接收服务

用于接收微信第三方平台的授权事件推送，特别是 `component_verify_ticket`。

---

## 功能特性

- ✅ 接收 `component_verify_ticket` 票据
- ✅ 处理授权/取消授权事件
- ✅ 严格遵循微信官方加解密算法
- ✅ 支持URL验证
- ✅ 自动保存票据到本地文件

---

## 快速开始

### 1. 安装依赖

```bash
cd scripts/wechat-server
pip install -r requirements.txt
```

### 2. 配置环境变量

```bash
export WX_COMPONENT_APPID="wx1234567890abcdef"
export WX_COMPONENT_APPSECRET="abcdef1234567890abcdef1234567890"
export WX_COMPONENT_TOKEN="YourToken123456"
export WX_COMPONENT_AES_KEY="abcdef1234567890abcdef1234567890abcdef1234567"
```

### 3. 运行服务

```bash
python app.py
```

### 4. 测试健康检查

```bash
curl http://localhost:5000/health
```

---

## 配置说明

| 环境变量 | 说明 | 示例 |
|---------|------|------|
| `WX_COMPONENT_APPID` | 第三方平台 AppID | `wx1234567890abcdef` |
| `WX_COMPONENT_APPSECRET` | 第三方平台 AppSecret（预留） | `abcdef123456...` |
| `WX_COMPONENT_TOKEN` | 消息校验 Token | `YourToken123456` |
| `WX_COMPONENT_AES_KEY` | 消息加解密 Key（43位） | `abcdef123456...` |

---

## 微信开放平台配置

### 1. 获取配置信息

登录微信开放平台 → 管理中心 → 第三方平台 → 基本配置

复制以下信息：
- 第三方平台 AppID
- 第三方平台 AppSecret
- 消息校验 Token（自己填）
- 消息加解密 Key（自己填，点击随机获取）

### 2. 配置授权事件接收URL

在第三方平台配置页面填入：
```
授权事件接收URL: http://你的服务器IP:5000/wechat/open/authorize
```

### 3. 开启IP白名单

将服务器IP添加到白名单：
```bash
# 查看服务器IP
curl ifconfig.me
# 输出: 1.2.3.4
```

把 `1.2.3.4` 添加到微信开放平台的白名单中。

---

## 部署到服务器

### 方式1：直接运行（开发测试）

```bash
python app.py
```

### 方式2：使用 gunicorn（生产环境）

```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

### 方式3：使用 systemd 守护进程

创建服务文件 `/etc/systemd/system/wechat-server.service`:

```ini
[Unit]
Description=WeChat Open Platform Event Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/path/to/wechat-server
Environment="WX_COMPONENT_APPID=your_appid"
Environment="WX_COMPONENT_TOKEN=your_token"
Environment="WX_COMPONENT_AES_KEY=your_aes_key"
ExecStart=/usr/bin/python3 /path/to/wechat-server/app.py
Restart=always

[Install]
WantedBy=multi-user.target
```

启动服务：
```bash
systemctl enable wechat-server
systemctl start wechat-server
```

---

## 内网穿透（可选）

如果服务器没有公网IP或无法暴露5000端口，需要使用内网穿透：

### 使用 ngrok

```bash
ngrok http 5000
```

会得到一个公网地址如 `https://xxxx.ngrok.io`

### 使用 cpolar

```bash
cpolar http 5000
```

---

## 验证部署

### 1. 检查服务是否运行

```bash
curl http://localhost:5000/health
```

### 2. 手动触发微信验证

在微信开放平台点击"保存"按钮，微信会发送GET请求到你的URL。

查看服务器日志，应该看到类似输出：
```
[INFO] 收到微信服务器验证请求
[INFO] URL验证成功
```

### 3. 查看票据

微信每隔一段时间会推送 `component_verify_ticket`：

```bash
cat component_ticket.txt
```

---

## 日志输出示例

```
============================================================
微信第三方平台授权事件接收服务
============================================================
[OK] AppID: wx1234567890abcdef
[OK] Token: 已配置
[OK] AES Key: abcdef1234...

启动服务...
监听地址: 0.0.0.0:5000
============================================================

[INFO] 收到微信服务器验证请求
  msg_signature: abc123...
  timestamp: 1234567890
  nonce: random123
[INFO] URL验证成功

[INFO] 收到微信事件推送
[INFO] 事件类型: component_verify_ticket
[重要] ComponentVerifyTicket: ticket@abcdef...
[INFO] 票据已保存
```

---

## 故障排查

### 1. 签名验证失败

检查：
- Token 是否配置正确
- URL 参数是否完整

### 2. 解密失败

检查：
- AES Key 是否正确（43位，Base64编码）
- AppID 是否匹配

### 3. 无法接收消息

检查：
- 服务器防火墙是否开放5000端口
- 是否配置了内网穿透
- 微信开放平台的URL是否正确

### 4. 票据为空

这是正常的，微信会定时推送票据。如果没有收到：
- 检查服务器日志
- 确认URL验证通过

---

## 与主应用集成

这个服务是独立的，专门用于接收微信事件。

如果需要：
- 同时运行主应用（Next.js）和微信事件服务
- 使用 Nginx 分配不同路径

### Nginx 配置示例

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 微信事件接收（必须走HTTP）
    location /wechat/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
    }

    # 主应用
    location / {
        proxy_pass http://127.0.0.1:3000;
    }
}
```

---

## License

MIT
