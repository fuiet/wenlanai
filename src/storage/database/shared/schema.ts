import { pgTable, serial, timestamp, text, integer, varchar, index } from "drizzle-orm/pg-core"

export const healthCheck = pgTable("health_check", {
  id: serial().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const hotArticles = pgTable(
  "hot_articles",
  {
    id: serial("id").primaryKey(),
    title: varchar("title", { length: 500 }).notNull(),
    account: varchar("account", { length: 200 }).notNull(),
    reads: integer("reads").notNull().default(0),
    likes: integer("likes").notNull().default(0),
    shares: integer("shares").notNull().default(0),
    category: varchar("category", { length: 50 }).notNull(),
    source: varchar("source", { length: 50 }).notNull(),
    snippet: text("snippet"),
    url: varchar("url", { length: 1000 }),
    publish_date: varchar("publish_date", { length: 20 }).notNull(),
    fetch_date: timestamp("fetch_date", { withTimezone: true }).defaultNow().notNull(),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("hot_articles_publish_date_idx").on(table.publish_date),
    index("hot_articles_category_idx").on(table.category),
    index("hot_articles_source_idx").on(table.source),
    index("hot_articles_fetch_date_idx").on(table.fetch_date),
  ]
);
