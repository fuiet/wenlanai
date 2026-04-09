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

### 真实数据源集成

系统集成了多个真实数据源，可以获取实时的爆款文章数据：

1. **微博热搜** (`/api/fetch-real-hot`)
   - 从微博热搜API获取真实数据
   - 包含标题、阅读量、点赞数、分享数等真实数据
   - 支持多数据源并行获取

2. **数据源选择功能**
   - 每日爆款页面支持Tab切换
   - "数据库文章"：显示已保存的历史数据
   - "获取实时数据"：从真实数据源获取最新数据
   - 支持选择多个数据源（搜狗微信、知乎、微博热搜等）

### 数据获取API

**GET `/api/fetch-real-hot`**
- 返回可用数据源列表
- 响应示例：
```json
{
  "success": true,
  "sources": [
    { "id": "weibo", "name": "微博热搜", "available": true },
    { "id": "sogou", "name": "搜狗微信", "available": true }
  ]
}
```

**POST `/api/fetch-real-hot`**
- 从指定数据源获取爆款文章
- 请求参数：
  - `sources`: string[] - 要获取的数据源ID数组
  - `category`: string (可选) - 分类筛选
- 响应示例：
```json
{
  "success": true,
  "articleCount": 20,
  "articles": [
    {
      "title": "男子被保时捷车主当交警面威胁",
      "account": "微博用户",
      "reads": 106618900,
      "likes": 533094,
      "shares": 213237,
      "category": "娱乐",
      "source": "微博热搜",
      "publish_date": "2026-04-09"
    }
  ]
}
```

## 常见问题与解决方案

### 数据获取问题

**Q: 为什么爆款文章数据不是真实的？**
A: 之前的实现使用搜索引擎API，部分数据（如阅读量、点赞数）可能是随机生成的。已集成微博热搜等真实数据源，可以获取真实的热搜数据。

**Q: 如何获取最新的爆款数据？**
A: 在"每日爆款"页面，切换到"获取实时数据"标签，选择数据源后点击"获取实时数据"按钮。

## 更新日志

### 2026-04-09 - 真实数据源集成
- 新增 `/api/fetch-real-hot` API，支持从微博热搜等真实数据源获取数据
- 更新每日爆款页面，添加数据源选择功能
- 支持Tab切换：数据库文章 vs 实时数据获取
- 微博热搜API测试成功，返回真实阅读量和互动数据


