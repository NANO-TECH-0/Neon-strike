import { sql } from "drizzle-orm";
import { pgTable, serial, text, integer, timestamp, uuid, uniqueIndex, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  provider: text("provider").notNull(),
  providerUserId: text("provider_user_id").notNull(),
  passwordHash: text("password_hash"),
  displayName: text("display_name").notNull(),
  email: text("email"),
  avatarUrl: text("avatar_url"),
  countryCode: text("country_code"),
  countryName: text("country_name"),
  regionCode: text("region_code"),
  regionName: text("region_name"),
  cityName: text("city_name"),
  progression: jsonb("progression").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("users_provider_identity_idx").on(table.provider, table.providerUserId),
]);

export const scores = pgTable("scores", {
  id: serial("id").primaryKey(),
  playerName: text("player_name").notNull(),
  score: integer("score").notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  countryCode: text("country_code"),
  regionCode: text("region_code"),
  cityName: text("city_name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertScoreSchema = createInsertSchema(scores).omit({
  id: true,
  createdAt: true,
  userId: true,
  countryCode: true,
  regionCode: true,
  cityName: true,
});

export type InsertScore = z.infer<typeof insertScoreSchema>;
export type Score = typeof scores.$inferSelect;
export type User = typeof users.$inferSelect;
