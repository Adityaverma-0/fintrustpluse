import { pgTable, serial, text, numeric, boolean, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull(),
  title: text("title"),
  bio: text("bio"),
  skills: text("skills"),
  hourlyRate: numeric("hourly_rate"),
  category: text("category"),
  avatarUrl: text("avatar_url"),
  country: text("country"),
  trustScore: numeric("trust_score"),
  totalEarned: numeric("total_earned"),
  totalSpent: numeric("total_spent"),
  completionRate: numeric("completion_rate"),
  isVerified: boolean("is_verified").default(false),
  emailVerified: boolean("email_verified").default(false).notNull(),
  isSuspended: boolean("is_suspended").default(false).notNull(),
  emailVerificationOtp: text("email_verification_otp"),
  emailVerificationExpiry: timestamp("email_verification_expiry"),
  resetPasswordOtp: text("reset_password_otp"),
  resetPasswordExpiry: timestamp("reset_password_expiry"),
  withdrawalOtp: text("withdrawal_otp"),
  withdrawalOtpExpiry: timestamp("withdrawal_otp_expiry"),
  otpAttempts: integer("otp_attempts").default(0).notNull(),
  lastOtpSent: timestamp("last_otp_sent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
