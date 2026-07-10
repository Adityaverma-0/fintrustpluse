import { pgTable, serial, text, numeric, integer, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { jobsTable } from "./jobs";
import { escrowAccountsTable } from "./escrow_accounts";

export const fraudLogsTable = pgTable("fraud_logs", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // duplicate_email, duplicate_mobile, duplicate_pan, duplicate_aadhaar, failed_logins, suspicious_ip, suspicious_fingerprint, etc.
  targetType: text("target_type").notNull(), // user, job, review, transaction, etc.
  targetId: integer("target_id").notNull(),
  details: text("details"),
  severity: text("severity").default("medium").notNull(), // low, medium, high
  status: text("status").default("flagged").notNull(), // flagged, investigating, resolved, dismissed
  actionTaken: text("action_taken"), // suspend, ban, freeze_wallet, freeze_escrow, none
  ipAddress: text("ip_address"),
  fingerprint: text("fingerprint"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const commissionConfigurationsTable = pgTable("commission_configurations", {
  id: serial("id").primaryKey(),
  platformCommissionRate: numeric("platform_commission_rate").default("10.00").notNull(),
  categoryCommissionRate: jsonb("category_commission_rate").default({}).notNull(),
  clientFee: numeric("client_fee").default("2.00").notNull(),
  freelancerFee: numeric("freelancer_fee").default("3.00").notNull(),
  gstRate: numeric("gst_rate").default("18.00").notNull(),
  taxesRate: numeric("taxes_rate").default("2.00").notNull(),
  withdrawalCharges: numeric("withdrawal_charges").default("1.00").notNull(),
  internationalCharges: numeric("international_charges").default("5.00").notNull(),
  referralBonus: numeric("referral_bonus").default("50.00").notNull(),
  dynamicRules: jsonb("dynamic_rules").default([]).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const referralsTable = pgTable("referrals", {
  id: serial("id").primaryKey(),
  referrerId: integer("referrer_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  refereeId: integer("referee_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  referralCode: text("referral_code").notNull(),
  status: text("status").default("pending").notNull(), // pending, active, completed, rejected
  rewardAmount: numeric("reward_amount").default("0.00").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  approvedAt: timestamp("approved_at"),
  rejectedAt: timestamp("rejected_at"),
});

export const referralCodesTable = pgTable("referral_codes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id, { onDelete: "cascade" }).notNull(),
  code: text("code").unique().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const couponsTable = pgTable("coupons", {
  id: serial("id").primaryKey(),
  code: text("code").unique().notNull(),
  discountType: text("discount_type").notNull(), // percent, fixed
  discountValue: numeric("discount_value").notNull(),
  expiryDate: timestamp("expiry_date").notNull(),
  usageLimit: integer("usage_limit").default(100).notNull(),
  categoryRestriction: text("category_restriction"),
  minProjectValue: numeric("min_project_value").default("0.00").notNull(),
  maxDiscount: numeric("max_discount").default("100000.00").notNull(),
  status: text("status").default("active").notNull(), // active, inactive
  usageCount: integer("usage_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const featuredJobsTable = pgTable("featured_jobs", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").references(() => jobsTable.id, { onDelete: "cascade" }).notNull(),
  isPinned: boolean("is_pinned").default(false).notNull(),
  isTrending: boolean("is_trending").default(false).notNull(),
  isUrgent: boolean("is_urgent").default(false).notNull(),
  isSponsored: boolean("is_sponsored").default(false).notNull(),
  promotionSchedule: jsonb("promotion_schedule").default({}).notNull(),
  expiryDate: timestamp("expiry_date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const escrowControlLogsTable = pgTable("escrow_control_logs", {
  id: serial("id").primaryKey(),
  escrowId: integer("escrow_id").references(() => escrowAccountsTable.id, { onDelete: "cascade" }).notNull(),
  action: text("action").notNull(), // freeze, release, partial_release, refund, split, override
  amount: numeric("amount").notNull(),
  reason: text("reason").notNull(),
  adminId: integer("admin_id").references(() => usersTable.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const aiModerationLogsTable = pgTable("ai_moderation_logs", {
  id: serial("id").primaryKey(),
  entityType: text("entity_type").notNull(), // job, proposal, review, message
  entityId: integer("entity_id").notNull(),
  textContent: text("text_content").notNull(),
  spamScore: numeric("spam_score").default("0.00").notNull(),
  confidence: numeric("confidence").default("1.00").notNull(),
  flaggedWords: text("flagged_words"),
  status: text("status").default("flagged").notNull(), // flagged, approved, rejected, deleted
  adminAction: text("admin_action"), // none, warned_user, banned_user, deleted_content
  adminId: integer("admin_id").references(() => usersTable.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const announcementsTable = pgTable("announcements", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // homepage_banner, dashboard_banner, maintenance_banner, popup, emergency_push, email_broadcast
  title: text("title").notNull(),
  content: text("content").notNull(),
  targetGroup: text("target_group").default("all").notNull(), // all, clients, freelancers
  publishDate: timestamp("publish_date").defaultNow().notNull(),
  expiryDate: timestamp("expiry_date"),
  status: text("status").default("active").notNull(), // draft, active, scheduled, archived
  scheduledJobs: jsonb("scheduled_jobs").default({}).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const adminNotesTable = pgTable("admin_notes", {
  id: serial("id").primaryKey(),
  entityType: text("entity_type").notNull(), // user, dispute, escrow, project, kyc
  entityId: integer("entity_id").notNull(),
  noteText: text("note_text").notNull(),
  adminId: integer("admin_id").references(() => usersTable.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const adminRolesTable = pgTable("admin_roles", {
  id: serial("id").primaryKey(),
  roleName: text("role_name").unique().notNull(), // Super Admin, Finance Admin, Support Admin, etc.
  permissions: jsonb("permissions").default({}).notNull(), // { "fraud": "write", "escrow": "write", ... }
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const systemHealthLogsTable = pgTable("system_health_logs", {
  id: serial("id").primaryKey(),
  componentName: text("component_name").notNull(), // db, smtp, razorpay, ws, redis, worker
  status: text("status").notNull(), // healthy, warning, critical
  details: text("details"),
  responseTimeMs: integer("response_time_ms"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const webhookLogsTable = pgTable("webhook_logs", {
  id: serial("id").primaryKey(),
  provider: text("provider").notNull(), // razorpay, smtp, otp
  eventType: text("event_type").notNull(),
  payload: jsonb("payload").default({}).notNull(),
  response: jsonb("response").default({}).notNull(),
  status: text("status").notNull(), // success, failure
  retryCount: integer("retry_count").default(0).notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const backupsTable = pgTable("backups", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // manual, scheduled, db, storage, settings
  filename: text("filename").notNull(),
  sizeBytes: numeric("size_bytes").notNull(),
  status: text("status").notNull(), // pending, running, completed, failed
  downloadUrl: text("download_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const featureFlagsTable = pgTable("feature_flags", {
  id: serial("id").primaryKey(),
  flagKey: text("flag_key").unique().notNull(), // escrow, wallet, ai, chat, coupons, referrals, featured_jobs
  flagName: text("flag_name").notNull(),
  isEnabled: boolean("is_enabled").default(true).notNull(),
  description: text("description"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const adminAuditLogsTable = pgTable("admin_audit_logs", {
  id: serial("id").primaryKey(),
  adminId: integer("admin_id").references(() => usersTable.id).notNull(),
  action: text("action").notNull(), // create, update, delete, toggle, override
  targetType: text("target_type").notNull(), // user, coupon, job, settings, escrow
  targetId: integer("target_id").notNull(),
  oldValue: jsonb("old_value"),
  newValue: jsonb("new_value"),
  reason: text("reason"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
