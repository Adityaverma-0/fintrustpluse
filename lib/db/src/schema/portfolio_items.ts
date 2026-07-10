import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const portfolioItemsTable = pgTable("portfolio_items", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  mediaUrl: text("media_url"),
  mediaType: text("media_type"), // "image" | "video" | "pdf" | "zip"
  technologies: text("technologies"),
  liveUrl: text("live_url"),
  sourceUrl: text("source_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type PortfolioItem = typeof portfolioItemsTable.$inferSelect;
export type InsertPortfolioItem = typeof portfolioItemsTable.$inferInsert;
