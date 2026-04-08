import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, integer, jsonb, index } from "drizzle-orm/pg-core";

/**
 * 爆款文章表
 * 存储每日获取的爆款文章数据
 */
export const hotArticles = pgTable(
  "hot_articles",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    title: varchar("title", { length: 500 }).notNull(),
    account: varchar("account", { length: 100 }).notNull(),
    reads: integer("reads").notNull().default(0),
    likes: integer("likes").notNull().default(0),
    shares: integer("shares").notNull().default(0),
    category: varchar("category", { length: 50 }).notNull(),
    source: varchar("source", { length: 100 }),
    snippet: text("snippet"),
    url: text("url"),
    publish_date: varchar("publish_date", { length: 20 }), // 文章发布日期
    fetch_date: timestamp("fetch_date", { withTimezone: true }).notNull().defaultNow(), // 获取时间
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("hot_articles_category_idx").on(table.category),
    index("hot_articles_fetch_date_idx").on(table.fetch_date),
    index("hot_articles_reads_idx").on(table.reads),
    index("hot_articles_publish_date_idx").on(table.publish_date),
  ]
);

/**
 * 定时任务配置表
 * 存储定时自动获取爆款文章的配置
 */
export const scheduledTasks = pgTable(
  "scheduled_tasks",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    task_name: varchar("task_name", { length: 100 }).notNull(),
    task_type: varchar("task_type", { length: 50 }).notNull(), // hot_articles, etc.
    categories: jsonb("categories"), // 要获取的分类列表，如 ["情感", "职场"]
    schedule_time: varchar("schedule_time", { length: 10 }).notNull(), // HH:mm 格式
    is_active: boolean("is_active").notNull().default(true),
    last_run: timestamp("last_run", { withTimezone: true }),
    next_run: timestamp("next_run", { withTimezone: true }),
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("scheduled_tasks_is_active_idx").on(table.is_active),
    index("scheduled_tasks_next_run_idx").on(table.next_run),
  ]
);

/**
 * 用户偏好表
 * 存储用户的搜索偏好和推送设置
 */
export const userPreferences = pgTable(
  "user_preferences",
  {
    id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
    user_id: varchar("user_id", { length: 36 }), // 用户ID（可选，用于多用户场景）
    preferred_categories: jsonb("preferred_categories"), // 偏好的分类列表，如 ["情感", "职场"]
    custom_keywords: jsonb("custom_keywords"), // 自定义关键词列表
    notification_enabled: boolean("notification_enabled").notNull().default(true),
    notification_time: varchar("notification_time", { length: 10 }), // 通知时间 HH:mm
    min_reads: integer("min_reads").notNull().default(10000), // 最小阅读量
    search_strategy: varchar("search_strategy", { length: 50 }), // 搜索策略：default, aggressive, conservative
    created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("user_preferences_user_id_idx").on(table.user_id),
  ]
);

// 类型导出
export type HotArticle = typeof hotArticles.$inferSelect;
export type ScheduledTask = typeof scheduledTasks.$inferSelect;
export type UserPreference = typeof userPreferences.$inferSelect;
