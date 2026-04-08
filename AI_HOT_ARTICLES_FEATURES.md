# 爆款文章智能系统 - 功能说明

## 🚀 新增功能

### 1. 定时自动获取

每天自动刷新爆款文章，无需手动点击。

**功能特性：**
- ✅ 自定义执行时间（如每天 08:00）
- ✅ 支持多分类获取（情感、职场、星座等）
- ✅ 自动保存到数据库
- ✅ 查看执行历史和下次执行时间

**API 接口：**
- `POST /api/scheduled-tasks` - 创建定时任务
- `GET /api/scheduled-tasks` - 获取定时任务列表
- `PUT /api/scheduled-tasks` - 更新定时任务
- `DELETE /api/scheduled-tasks` - 删除定时任务
- `POST /api/scheduled-tasks/execute` - 手动执行定时任务

**使用示例：**
```bash
curl -X POST http://localhost:5000/api/scheduled-tasks \
  -H "Content-Type: application/json" \
  -d '{
    "taskName": "每日爆款获取",
    "taskType": "hot_articles",
    "categories": ["情感", "职场"],
    "scheduleTime": "08:00",
    "isActive": true
  }'
```

---

### 2. 数据保存

将爆款文章保存到数据库，方便后续分析和查询。

**功能特性：**
- ✅ 自动保存搜索结果
- ✅ 支持历史数据查询
- ✅ 按分类、时间筛选
- ✅ 查看文章来源和链接

**API 接口：**
- `POST /api/hot-articles` - 保存爆款文章
- `GET /api/hot-articles` - 获取已保存的文章
- `DELETE /api/hot-articles` - 删除文章

**使用示例：**
```bash
# 保存文章
curl -X POST http://localhost:5000/api/hot-articles \
  -H "Content-Type: application/json" \
  -d '{
    "articles": [
      {
        "title": "文章标题",
        "account": "公众号名称",
        "reads": 100000,
        "likes": 5000,
        "shares": 2000,
        "category": "情感",
        "url": "https://mp.weixin.qq.com/s/xxx"
      }
    ]
  }'

# 查询文章
curl "http://localhost:5000/api/hot-articles?category=情感&limit=10"
```

---

### 3. 智能推送

根据你的兴趣偏好，智能推送相关爆款文章。

**功能特性：**
- ✅ 自定义兴趣分类
- ✅ 设置最小阅读量
- ✅ 搜索策略选择（默认/激进/保守）
- ✅ 自定义关键词过滤

**API 接口：**
- `POST /api/smart-push` - 获取智能推荐文章
- `POST /api/user-preferences` - 保存用户偏好
- `GET /api/user-preferences` - 获取用户偏好

**使用示例：**
```bash
# 保存用户偏好
curl -X POST http://localhost:5000/api/user-preferences \
  -H "Content-Type: application/json" \
  -d '{
    "preferredCategories": ["情感", "职场"],
    "minReads": 10000,
    "searchStrategy": "default",
    "customKeywords": ["涨粉", "爆款"]
  }'

# 获取智能推荐
curl -X POST http://localhost:5000/api/smart-push \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "default"
  }'
```

---

### 4. 自定义搜索

支持自定义搜索关键词和搜索策略。

**功能特性：**
- ✅ 自定义搜索关键词
- ✅ 搜索策略选择：
  - `default` - 默认策略，平衡质量和数量
  - `aggressive` - 激进策略，获取更多文章
  - `conservative` - 保守策略，只推荐高质量文章
- ✅ 支持多个关键词组合

**API 接口：**
- `POST /api/search-hot-articles` - 搜索爆款文章

**使用示例：**
```bash
# 自定义关键词搜索
curl -X POST http://localhost:5000/api/search-hot-articles \
  -H "Content-Type: application/json" \
  -d '{
    "category": "情感",
    "customKeywords": "涨粉 快速 赚钱",
    "searchStrategy": "aggressive",
    "count": 30
  }'

# 使用默认关键词
curl -X POST http://localhost:5000/api/search-hot-articles \
  -H "Content-Type: application/json" \
  -d '{
    "category": "情感",
    "searchStrategy": "conservative"
  }'
```

---

## 📊 数据库表结构

### hot_articles（爆款文章表）
```sql
- id: 主键
- title: 文章标题
- account: 公众号名称
- reads: 阅读量
- likes: 点赞数
- shares: 分享数
- category: 分类
- source: 来源
- snippet: 摘要
- url: 文章链接
- publish_date: 发布日期
- fetch_date: 获取时间
- created_at: 创建时间
```

### scheduled_tasks（定时任务表）
```sql
- id: 主键
- task_name: 任务名称
- task_type: 任务类型
- categories: 分类列表
- schedule_time: 执行时间（HH:mm）
- is_active: 是否激活
- last_run: 最后执行时间
- next_run: 下次执行时间
- created_at: 创建时间
- updated_at: 更新时间
```

### user_preferences（用户偏好表）
```sql
- id: 主键
- user_id: 用户ID
- preferred_categories: 偏好分类
- custom_keywords: 自定义关键词
- notification_enabled: 是否启用通知
- notification_time: 通知时间
- min_reads: 最小阅读量
- search_strategy: 搜索策略
- created_at: 创建时间
- updated_at: 更新时间
```

---

## 🔧 使用流程

### 设置定时自动获取

1. 创建定时任务
2. 设置执行时间（如每天 08:00）
3. 选择要获取的分类
4. 系统自动执行并保存数据

### 设置智能推送

1. 保存用户偏好设置
2. 选择兴趣分类
3. 设置最小阅读量
4. 选择搜索策略
5. 获取智能推荐

### 自定义搜索

1. 输入自定义关键词
2. 选择搜索策略
3. 执行搜索
4. 查看结果

---

## 🎯 搜索策略说明

### Default（默认）
- 平衡质量和数量
- 适合大多数场景
- 获取 20 篇文章

### Aggressive（激进）
- 获取更多文章
- 不限制阅读量
- 获取 50 篇文章

### Conservative（保守）
- 只推荐高质量文章
- 阅读量 > 50000
- 获取 10 篇文章

---

## 📝 注意事项

1. **定时任务**：需要配合外部定时任务服务（如 cron job）才能真正自动执行
2. **数据量限制**：每次搜索最多返回 50 篇文章
3. **搜索关键词**：自定义关键词支持多个，用空格分隔
4. **用户偏好**：默认使用 'default' 用户ID，可自定义

---

## 🔗 相关链接

- 项目地址：https://abc123.dev.coze.site
- API 文档：查看各接口的详细参数说明
- 数据库管理：Supabase 控制台

---

## 📞 技术支持

如有问题，请查看系统日志或联系技术支持团队。
