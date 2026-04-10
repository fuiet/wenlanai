# 项目上下文

### 版本技术栈

- **Framework**: Next.js 16 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **UI 组件**: shadcn/ui (基于 Radix UI)
- **Styling**: Tailwind CSS 4

## 目录结构

```
├── public/                 # 静态资源
├── scripts/                # 构建与启动脚本
│   ├── build.sh            # 构建脚本
│   ├── dev.sh              # 开发环境启动脚本
│   ├── prepare.sh          # 预处理脚本
│   └── start.sh            # 生产环境启动脚本
├── src/
│   ├── app/                # 页面路由与布局
│   ├── components/ui/      # Shadcn UI 组件库
│   ├── hooks/              # 自定义 Hooks
│   ├── lib/                # 工具库
│   │   └── utils.ts        # 通用工具函数 (cn)
│   └── server.ts           # 自定义服务端入口
├── next.config.ts          # Next.js 配置
├── package.json            # 项目依赖管理
└── tsconfig.json           # TypeScript 配置
```

- 项目文件（如 app 目录、pages 目录、components 等）默认初始化到 `src/` 目录下。

## 包管理规范

**仅允许使用 pnpm** 作为包管理器，**严禁使用 npm 或 yarn**。
**常用命令**：
- 安装依赖：`pnpm add <package>`
- 安装开发依赖：`pnpm add -D <package>`
- 安装所有依赖：`pnpm install`
- 移除依赖：`pnpm remove <package>`

## 开发规范

- **项目理解加速**：初始可以依赖项目下`package.json`文件理解项目类型，如果没有或无法理解退化成阅读其他文件。
- **Hydration 错误预防**：严禁在 JSX 渲染逻辑中直接使用 typeof window、Date.now()、Math.random() 等动态数据。必须使用 'use client' 并配合 useEffect + useState 确保动态内容仅在客户端挂载后渲染；同时严禁非法 HTML 嵌套（如 <p> 嵌套 <div>）。


## UI 设计与组件规范 (UI & Styling Standards)

- 模板默认预装核心组件库 `shadcn/ui`，位于`src/components/ui/`目录下
- Next.js 项目**必须默认**采用 shadcn/ui 组件、风格和规范，**除非用户指定用其他的组件和规范。**

## 核心功能

### 专业数据源集成

系统集成了多个专业数据源，可以获取实时的爆款文章数据：

#### 数据源分类

**1. 微信生态**
- **微信搜一搜** (`/api/fetch-pro-hot`) - 微信公众号热文
  - 从微信搜一搜获取公众号爆款文章
  - 支持搜索特定关键词和分类

**2. 社交媒体**
- **微博热搜** - 微博实时热搜（真实数据）
- **今日头条** - 头条热榜
- **知乎** - 知乎热问

**3. 数据平台**
- **新榜** - 新榜热文榜单
- **极致了数据** - 专业公众号数据（需手动导入）

**4. 内容平台**
- **西瓜创作** - 西瓜图文热文
- **百度百家号** - 百家号热门文章

**5. 科技媒体**
- **36氪** - 科技创业资讯
- **虎嗅** - 商业科技资讯

### API接口

**GET `/api/fetch-pro-hot`**
- 返回可用数据源列表和分类
- 响应示例：
```json
{
  "success": true,
  "sources": [
    { "id": "weixin", "name": "微信搜一搜", "category": "微信生态", "available": true },
    { "id": "weibo", "name": "微博热搜", "category": "社交媒体", "available": true },
    { "id": "newrank", "name": "新榜", "category": "数据平台", "available": true }
  ],
  "categories": ["全部", "情感", "职场", "娱乐", "财经", "科技"]
}
```

**POST `/api/fetch-pro-hot`**
- 从指定数据源获取爆款文章
- 请求参数：
  - `sources`: string[] - 要获取的数据源ID数组
  - `category`: string (可选) - 分类筛选
- 响应示例：
```json
{
  "success": true,
  "articleCount": 21,
  "articles": [
    {
      "title": "爷爷卖16000个烧饼孙女打赏给主播",
      "account": "微博用户",
      "reads": 107013300,
      "likes": 5350665,
      "shares": 2140266,
      "category": "娱乐",
      "source": "微博热搜",
      "publish_date": "2026-04-09"
    }
  ],
  "sourceStats": { "weibo": 20, "weixin": 1 }
}
```

**GET `/api/fetch-real-hot`**
- 原有API，保持向后兼容

**POST `/api/fetch-real-hot`**
- 原有API，保持向后兼容

**POST `/api/fetch-dajiala`**
- 极致了数据导入API
- 支持手动导入文章数据
- 请求格式：`{ action: 'import', articles: [...] }`

**POST `/api/push-to-wechat`**
- 一键推送文章到公众号草稿箱
- 请求参数：
  - `title`: string - 文章标题
  - `content`: string - 文章内容（Markdown格式）
  - `imageUrls`: string[] (可选) - 图片URL数组
- 响应示例：
```json
{
  "success": true,
  "message": "推送成功，文章已发送到公众号草稿箱",
  "data": {
    "draftId": "media_id_string"
  }
}
```
- 环境变量：
  - `WECHAT_APP_ID`: 微信公众号AppID
  - `WECHAT_APP_SECRET`: 微信公众号AppSecret
- 未配置微信API时模拟推送成功，便于测试演示

**GET `/api/push-to-wechat`**
- 获取推送API状态和配置信息

**POST `/api/wechat-auth/url`**
- 生成公众号授权URL
- 请求参数：`{ redirectUri: string }`
- 响应示例：
```json
{
  "success": true,
  "data": {
    "authUrl": "https://mp.weixin.qq.com/cgi-bin/componentloginpage?...",
    "preAuthCode": "xxx",
    "expiresIn": 1800
  },
  "demo": true
}
```

**GET `/api/wechat-auth/url`**
- 获取已授权公众号列表和配置状态
- 响应示例：
```json
{
  "success": true,
  "configured": false,
  "accounts": [],
  "count": 0,
  "demo": true
}
```

**GET `/api/wechat-auth/callback`**
- 处理微信授权回调
- 支持演示模式（未配置第三方平台时）

**POST `/api/wechat-auth/bind`**
- 通过AppID和AppSecret直接绑定公众号
- 请求参数：`{ appId: string, appSecret: string }`
- 响应示例：
```json
{
  "success": true,
  "message": "绑定成功！",
  "data": { "app_id": "wx...", "nickname": "公众号名称" }
}
```

### 数据获取功能

**每日爆款页面数据源选择**
- Tab切换：数据库文章 vs 获取实时数据
- 数据源按类别分组显示
- 支持多选数据源
- 实时显示数据获取状态

## 常见问题与解决方案

### 数据获取问题

**Q: 如何获取最新的爆款数据？**
A: 在"每日爆款"页面，切换到"获取实时数据"标签，选择数据源后点击"获取实时数据"按钮。

**Q: 极致了数据如何获取？**
A: 极致了数据需要手动导出数据后，通过 `/api/fetch-dajiala` 接口导入。系统会提示使用说明。

**Q: 哪些数据源提供真实数据？**
A: 微博热搜提供真实的热搜数据和阅读量。其他数据源通过搜索引擎API获取，可能包含部分估算数据。

## 更新日志

### 2026-04-10 - 公众号扫码授权功能
- 新增账号管理页面 `/account`，支持微信扫码授权公众号
- 新增 AppID/AppSecret 直接绑定方式（简化授权流程）
- 新增 `/api/wechat-auth/bind` API，通过AppID和AppSecret绑定公众号
- 新增 `/api/wechat-auth/url` API，生成授权URL
- 新增 `/api/wechat-auth/callback` API，处理授权回调
- 新增 `wechat_accounts` 数据表，存储公众号授权信息
- 推送API支持使用已授权公众号
- 演示模式：未配置微信API时仍可体验授权流程

### 2026-04-10 - 一键推草稿功能
- 新增 `/api/push-to-wechat` API，支持一键推送文章到公众号草稿箱
- 智能生文页面新增"一键推草稿"按钮（橙红色渐变背景）
- 自动提取文章中的图片并上传到微信素材库
- 支持环境变量配置微信API密钥（WECHAT_APP_ID, WECHAT_APP_SECRET）
- 未配置微信API时模拟推送成功，便于测试演示
- 状态管理：推送中显示loading动画，推送成功后显示"已推送"状态

### 2026-04-10 - 智能生文实时联网功能
- 智能生文API新增实时联网搜索功能
- 先使用Web Search SDK获取最新数据
- 将搜索结果作为上下文提供给LLM生成文章
- 切换到最新旗舰模型 `doubao-seed-2-0-pro-260215`
- 前端新增"实时联网搜索"开关
- 用户可选择是否启用联网搜索
- 默认启用联网搜索，确保文章内容准确时效

### 2026-04-09 - 专业数据源集成
- 新增 `/api/fetch-pro-hot` API，支持8+专业数据源
- 数据源分类：微信生态、社交媒体、数据平台、内容平台、科技媒体
- 更新每日爆款页面，按类别显示数据源选择器
- 支持从新榜、西瓜创作、百度百家号等平台获取文章
- 微博热搜测试成功，返回真实阅读量和互动数据

### 早期更新
- 新增 `/api/fetch-real-hot` API，支持从微博热搜等真实数据源获取数据
- 更新每日爆款页面，添加数据源选择功能
- 支持Tab切换：数据库文章 vs 实时数据获取

