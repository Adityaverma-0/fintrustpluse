import { pgTable, integer, text, numeric, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const profilesTable = pgTable("profiles", {
  userId: integer("user_id").primaryKey().references(() => usersTable.id, { onDelete: "cascade" }),
  username: text("username").unique(),
  mobileNumber: text("mobile_number"),
  country: text("country"),
  state: text("state"),
  city: text("city"),
  address: text("address"),
  postalCode: text("postal_code"),
  timeZone: text("time_zone").default("UTC"),
  preferredLanguage: text("preferred_language").default("en"),
  twoFactorEnabled: boolean("two_factor_enabled").default(false).notNull(),
  privacySettings: jsonb("privacy_settings").default({}).notNull(),
  notificationPreferences: jsonb("notification_preferences").default({}).notNull(),
  
  // Freelancer specific fields
  experience: text("experience"),
  education: text("education"),
  certifications: text("certifications"),
  languages: text("languages"),
  minProjectBudget: numeric("min_project_budget"),
  availability: text("availability").default("available"),
  resumeUrl: text("resume_url"),
  githubUrl: text("github_url"),
  linkedinUrl: text("linkedin_url"),
  behanceUrl: text("behance_url"),
  dribbbleUrl: text("dribbble_url"),
  personalWebsite: text("personal_website"),
  portfolioWebsite: text("portfolio_website"),
  
  // Client specific fields
  companyName: text("company_name"),
  companyLogoUrl: text("company_logo_url"),
  industry: text("industry"),
  businessType: text("business_type"),
  gstNumber: text("gst_number"),
  companyWebsite: text("company_website"),
  companyDescription: text("company_description"),
  employeesCount: integer("employees_count"),
  annualProjectBudget: numeric("annual_project_budget"),
  
  // Documents
  panUrl: text("pan_url"),
  aadhaarUrl: text("aadhaar_url"),
  passportUrl: text("passport_url"),
  gstDocUrl: text("gst_doc_url"),
  documentVerificationStatus: text("document_verification_status").default("pending").notNull(),
  
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Profile = typeof profilesTable.$inferSelect;
export type InsertProfile = typeof profilesTable.$inferInsert;
