# 微信公众号授权配置说明

## 概述

本系统已集成微信公众号授权和批量推送文章功能，用户可以通过配置公众号的AppID和AppSecret，实现文章的批量群发。

## 功能特性

1. **公众号授权**
   - 输入AppID和AppSecret获取access_token
   - 支持微信OAuth2.0授权流程
   - 自动验证授权状态

2. **批量推送文章**
   - 支持多篇文章批量选择
   - 自动上传图文素材
   - 一键群发到公众号
   - 支持查看群发状态

3. **公众号管理**
   - 多公众号管理
   - 分组筛选功能
   - 授权状态监控

## 配置步骤

### 1. 获取公众号AppID和AppSecret

1. 登录[微信公众平台](https://mp.weixin.qq.com/)
2. 进入「设置与开发」→「基本配置」
3. 复制AppID
4. 点击「重置」AppSecret，获取AppSecret（请妥善保存）

### 2. 配置环境变量（可选）

在系统环境变量中配置以下信息（如果需要后端处理）：

```bash
# 微信公众号AppID
WECHAT_APP_ID=your_app_id

# 微信公众号AppSecret
WECHAT_APP_SECRET=your_app_secret
```

### 3. 使用授权功能

1. 访问「公众号管理」页面
2. 点击「授权公众号」按钮
3. 填写AppID和AppSecret
4. 点击「获取access_token」按钮
5. 授权成功后，可以使用批量推送功能

## 使用流程

### 授权公众号

1. 打开「公众号管理」页面
2. 点击右上角「授权公众号」按钮
3. 在弹出的对话框中填写：
   - **AppID**：从微信公众平台获取
   - **AppSecret**：从微信公众平台获取
4. 点击「获取access_token」按钮
5. 系统会自动验证并显示access_token

### 批量推送文章

1. 在「公众号管理」页面，点击「批量推送」按钮
2. 选择要推送的文章（可以多选）
3. 点击「推送 X 篇文章」按钮
4. 系统会自动：
   - 上传图文素材到微信公众号
   - 调用群发API
   - 显示推送结果

## API接口

### 1. 获取access_token

**接口地址**：`POST /api/wechat/get-access-token`

**请求参数**：
```json
{
  "appId": "wx1234567890abcdef",
  "appSecret": "your_app_secret"
}
```

**响应示例**：
```json
{
  "success": true,
  "data": {
    "accessToken": "access_token_value",
    "expiresIn": 7200
  }
}
```

### 2. 批量推送文章

**接口地址**：`POST /api/wechat/batch-send`

**请求参数**：
```json
{
  "accessToken": "access_token_value",
  "articles": [
    {
      "title": "文章标题",
      "author": "作者",
      "digest": "摘要",
      "content": "文章内容",
      "content_source_url": "原文链接"
    }
  ],
  "target": {
    "isToAll": true
  }
}
```

**响应示例**：
```json
{
  "success": true,
  "data": {
    "msgId": "1000000001",
    "msgDataId": "2040000001"
  }
}
```

### 3. 获取群发消息状态

**接口地址**：`GET /api/wechat/batch-send?accessToken=xxx&msgId=xxx`

**响应示例**：
```json
{
  "success": true,
  "data": {
    "msg_id": "1000000001",
    "msg_status": "SEND_SUCCESS"
  }
}
```

## 注意事项

1. **Access Token有效期**
   - access_token有效期为2小时（7200秒）
   - 过期后需要重新获取
   - 生产环境建议使用Redis等缓存机制

2. **群发限制**
   - 订阅号每天可群发1次
   - 服务号每天可群发4次
   - 每次群发最多8篇文章

3. **图文素材要求**
   - 文章内容需要符合微信公众号规范
   - 建议先在微信公众号后台预览效果
   - 注意版权和内容合规性

4. **安全性**
   - AppSecret请妥善保管，不要泄露
   - 建议在后端处理敏感信息
   - 定期更换AppSecret

## 常见问题

### Q1: 获取access_token失败？

**可能原因**：
- AppID或AppSecret填写错误
- 公众号未认证
- IP地址未在白名单中

**解决方法**：
1. 检查AppID和AppSecret是否正确
2. 在微信公众平台配置服务器IP白名单
3. 确认公众号已通过认证

### Q2: 批量推送失败？

**可能原因**：
- access_token过期
- 文章格式不符合要求
- 超过群发次数限制
- 公众号权限不足

**解决方法**：
1. 重新获取access_token
2. 检查文章内容格式
3. 确认当日群发次数是否已用完
4. 检查公众号是否有群发权限

### Q3: 如何取消授权？

**解决方法**：
- 在微信公众平台「设置与开发」→「基本配置」→「授权管理」中取消授权

## 技术支持

如有问题，请联系技术支持团队。
