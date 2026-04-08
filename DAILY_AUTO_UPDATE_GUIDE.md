# 每日自动更新配置说明

## 功能说明

系统已实现每日6点自动搜索西瓜、搜狗、百度、微信等平台的爆款文章数据，并更新前一天的爆款文章数据。

## API接口

### 1. 触发每日自动更新

**接口地址**: `POST /api/daily-auto-update`

**请求方式**: POST

**响应示例**:
```json
{
  "success": true,
  "message": "成功更新 2025-01-15 的爆款文章数据",
  "data": {
    "date": "2025-01-15",
    "totalArticles": 640,
    "platformStats": {
      "西瓜": 160,
      "搜狗": 160,
      "百度": 160,
      "微信": 160
    },
    "categories": [
      "情感",
      "职场",
      "星座",
      "汽车",
      "民生",
      "成长",
      "娱乐",
      "财经"
    ]
  }
}
```

### 2. 获取更新状态

**接口地址**: `GET /api/daily-auto-update`

**请求方式**: GET

**响应示例**:
```json
{
  "success": true,
  "data": {
    "lastUpdateDate": "2025-01-15",
    "today": "2025-01-16",
    "yesterday": "2025-01-15"
  }
}
```

## 设置定时任务

### 方法一：使用 Cron Job (推荐)

#### Linux/Mac 系统

在终端执行 `crontab -e`，添加以下内容：

```bash
# 每天6点自动更新爆款文章数据
0 6 * * * curl -X POST http://localhost:5000/api/daily-auto-update >> /tmp/daily-update.log 2>&1
```

保存后，系统会自动每天6点执行此任务。

#### 生产环境

如果您的应用部署在服务器上，将 `localhost:5000` 替换为您的实际域名：

```bash
0 6 * * * curl -X POST https://your-domain.com/api/daily-auto-update >> /tmp/daily-update.log 2>&1
```

### 方法二：使用 GitHub Actions

如果您的项目使用 GitHub Actions 部署，可以在 `.github/workflows/daily-update.yml` 中添加：

```yaml
name: Daily Hot Articles Update

on:
  schedule:
    - cron: '0 6 * * *'  # 每天6点执行
  workflow_dispatch:      # 支持手动触发

jobs:
  update-hot-articles:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Daily Update
        run: |
          curl -X POST ${{ secrets.API_URL }}/api/daily-auto-update
```

### 方法三：使用 Node.js 定时任务 (可选)

如果您想在应用内部实现定时任务，可以使用 `node-cron` 包：

```bash
pnpm add node-cron
pnpm add -D @types/node-cron
```

然后在 `src/server.ts` 或适当的位置添加：

```typescript
import cron from 'node-cron';

// 每天6点执行
cron.schedule('0 6 * * *', async () => {
  console.log('开始执行每日自动更新任务...');

  try {
    const response = await fetch('http://localhost:5000/api/daily-auto-update', {
      method: 'POST',
    });

    const result = await response.json();
    console.log('每日自动更新完成:', result);
  } catch (error) {
    console.error('每日自动更新失败:', error);
  }
});

console.log('定时任务已设置，每天6点执行');
```

## 数据更新流程

1. **获取前一天日期**: 系统自动获取昨天的日期 (如 2025-01-15)
2. **搜索各平台**: 依次搜索西瓜、搜狗、百度、微信平台
3. **分类搜索**: 每个平台搜索8个分类（情感、职场、星座、汽车、民生、成长、娱乐、财经）
4. **保存数据**: 
   - 先删除前一天已存在的旧数据
   - 插入新获取的爆款文章数据
5. **返回统计**: 返回更新的文章总数和各平台的统计信息

## 手动触发更新

除了定时任务，您也可以随时手动触发更新：

```bash
curl -X POST http://localhost:5000/api/daily-auto-update
```

或在前端页面添加一个按钮，调用此接口进行手动更新。

## 查看更新日志

定时任务的日志会输出到控制台和数据库，您可以通过以下方式查看：

1. **控制台日志**: 查看应用运行日志
2. **数据库日志**: 查询 `hot_articles` 表，按 `publish_date` 排序查看最新数据
3. **系统日志**: 如果使用 cron job，查看 `/tmp/daily-update.log`

## 注意事项

1. 确保应用服务在定时任务执行时是运行状态
2. 搜索功能依赖 `coze-coding-dev-sdk`，确保配置正确
3. 数据库需要正确配置，确保有写权限
4. 建议在低峰期（如凌晨6点）执行，避免影响正常访问
5. 如果更新失败，检查日志并根据错误信息排查

## 配置检查清单

- [ ] Supabase 数据库已配置
- [ ] `hot_articles` 表已创建
- [ ] API 密钥已配置
- [ ] 定时任务已设置 (cron/node-cron/GitHub Actions)
- [ ] 手动测试更新接口正常工作
- [ ] 日志记录正常
