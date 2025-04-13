import {
  pgTable,
  text,
  serial,
  integer,
  boolean,
  timestamp,
  pgEnum,
  json,
  date,
  real,
  varchar,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const userRoleEnum = pgEnum("user_role", ["admin", "team_lead", "csm"]);
export const taskStatusEnum = pgEnum("task_status", [
  "not_started",
  "in_progress",
  "completed",
  "blocked",
]);
export const taskRecurrenceEnum = pgEnum("task_recurrence", [
  "none",
  "daily",
  "weekly",
  "bi_weekly",
  "monthly",
  "quarterly",
]);
export const redZoneReasonEnum = pgEnum("red_zone_reason", [
  "delayed_onboarding",
  "no_qr_loyalty_setup",
  "no_campaign_60_days",
  "no_monthly_campaigns",
  "no_review_meetings",
  "low_nps",
  "low_data_tagging",
  "revenue_drop",
]);

// Users and Profiles
export const users = pgTable("users", {
  id: text("id").primaryKey(), // From Supabase Auth
  email: text("email").notNull().unique(),
  fullName: text("full_name"),
  avatarUrl: text("avatar_url"),
  role: userRoleEnum("role").notNull().default("csm"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Customers
export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  industry: text("industry"),
  website: text("website"),
  status: text("status").default("active"),
  arr: real("arr").default(0),
  mrr: real("mrr").default(0),
  onboardingStartDate: date("onboarding_start_date"),
  onboardingCompletionDate: date("onboarding_completion_date"),
  renewalDate: date("renewal_date"),
  campaignStats: json("campaign_stats").$type<{
    sent: number;
    opened: number;
    clicked: number;
    lastSentDate: string;
  }>(),
  lastReviewMeeting: date("last_review_meeting"),
  npsScore: integer("nps_score"),
  dataTaggingPercentage: real("data_tagging_percentage"),
  addOnRevenue: real("add_on_revenue").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  assignedToUserId: text("assigned_to_user_id").references(() => users.id),
  externalIds: json("external_ids").$type<Record<string, string>>(),
  inRedZone: boolean("in_red_zone").default(false),
});

// Tasks
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  status: taskStatusEnum("status").default("not_started"),
  dueDate: date("due_date"),
  relativeDueDays: integer("relative_due_days"), // X days from task creation
  recurrence: taskRecurrenceEnum("recurrence").default("none"),
  assignedToUserId: text("assigned_to_user_id").references(() => users.id),
  customerId: integer("customer_id").references(() => customers.id),
  playbookId: integer("playbook_id").references(() => playbooks.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdByUserId: text("created_by_user_id").references(() => users.id),
});

// Task Comments
export const taskComments = pgTable("task_comments", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id")
    .references(() => tasks.id)
    .notNull(),
  comment: text("comment").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  userId: text("user_id").references(() => users.id),
});

// Playbooks
export const playbooks = pgTable("playbooks", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  triggerConfig: json("trigger_config").$type<{
    triggerType: "time" | "renewal" | "pod_type" | "custom";
    conditions: Record<string, any>;
  }>(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdByUserId: text("created_by_user_id").references(() => users.id),
});

// Playbook Tasks (template tasks)
export const playbookTasks = pgTable("playbook_tasks", {
  id: serial("id").primaryKey(),
  playbookId: integer("playbook_id")
    .references(() => playbooks.id)
    .notNull(),
  title: text("title").notNull(),
  description: text("description"),
  relativeDueDays: integer("relative_due_days"),
  recurrence: taskRecurrenceEnum("recurrence").default("none"),
  sortOrder: integer("sort_order").default(0),
});

// Red Zone Accounts
export const redZoneAccounts = pgTable("red_zone_accounts", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id")
    .references(() => customers.id)
    .notNull()
    .unique(),
  reasons: json("reasons").$type<string[]>(),
  createdAt: timestamp("created_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
});

// Calendar Events
export const calendarEvents = pgTable("calendar_events", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").references(() => customers.id),
  title: text("title").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  location: text("location"),
  notes: text("notes"),
  createdByUserId: text("created_by_user_id").references(() => users.id),
  attendees: json("attendees").$type<string[]>(),
  googleEventId: text("google_event_id"),
});

// Email Threads
export const emailThreads = pgTable("email_threads", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").references(() => customers.id),
  subject: text("subject").notNull(),
  lastMessageDate: timestamp("last_message_date").notNull(),
  snippet: text("snippet"),
  threadId: text("thread_id").unique(),
  labels: json("labels").$type<string[]>(),
});

// Integration Tokens
export const integrationTokens = pgTable("integration_tokens", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .references(() => users.id)
    .notNull(),
  provider: text("provider").notNull(), // google, chargebee, etc.
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  tokenType: text("token_type"),
  expiresAt: timestamp("expires_at"),
  scopes: json("scopes").$type<string[]>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  providerId: text("provider_id"), // user's ID in the provider system
});

// MySQL Config
export const mysqlConfig = pgTable("mysql_config", {
  id: serial("id").primaryKey(),
  host: text("host").notNull(),
  port: integer("port").notNull(),
  username: text("username").notNull(),
  password: text("password").notNull(),
  database: text("database").notNull(),
  isActive: boolean("is_active").default(false),
  lastSyncAt: timestamp("last_sync_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// MySQL Field Mappings
export const mysqlFieldMappings = pgTable("mysql_field_mappings", {
  id: serial("id").primaryKey(),
  mysqlField: text("mysql_field").notNull(),
  platformField: text("platform_field").notNull(),
  mysqlTable: text("mysql_table").notNull(),
  transformationType: text("transformation_type"), // direct, calculated, etc.
  transformationRule: json("transformation_rule"),
  isActive: boolean("is_active").default(true),
});

// Report Metrics
export const reportMetrics = pgTable("report_metrics", {
  id: serial("id").primaryKey(),
  metricName: text("metric_name").notNull(),
  metricValue: real("metric_value"),
  metricDate: date("metric_date").notNull(),
  customerId: integer("customer_id").references(() => customers.id),
  metadata: json("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  customers: many(customers),
  tasks: many(tasks, { relationName: "assignedTasks" }),
  createdTasks: many(tasks, { relationName: "createdTasks" }),
  playbooks: many(playbooks),
  taskComments: many(taskComments),
  integrationTokens: many(integrationTokens),
  calendarEvents: many(calendarEvents),
}));

export const customersRelations = relations(customers, ({ one, many }) => ({
  assignedTo: one(users, {
    fields: [customers.assignedToUserId],
    references: [users.id],
  }),
  tasks: many(tasks),
  redZone: one(redZoneAccounts),
  calendarEvents: many(calendarEvents),
  emailThreads: many(emailThreads),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  assignedTo: one(users, {
    fields: [tasks.assignedToUserId],
    references: [users.id],
    relationName: "assignedTasks",
  }),
  customer: one(customers, {
    fields: [tasks.customerId],
    references: [customers.id],
  }),
  createdBy: one(users, {
    fields: [tasks.createdByUserId],
    references: [users.id],
    relationName: "createdTasks",
  }),
  playbook: one(playbooks, {
    fields: [tasks.playbookId],
    references: [playbooks.id],
  }),
  comments: many(taskComments),
}));

export const taskCommentsRelations = relations(taskComments, ({ one }) => ({
  task: one(tasks, {
    fields: [taskComments.taskId],
    references: [tasks.id],
  }),
  user: one(users, {
    fields: [taskComments.userId],
    references: [users.id],
  }),
}));

export const playbooksRelations = relations(playbooks, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [playbooks.createdByUserId],
    references: [users.id],
  }),
  tasks: many(playbookTasks),
  generatedTasks: many(tasks),
}));

export const playbookTasksRelations = relations(playbookTasks, ({ one }) => ({
  playbook: one(playbooks, {
    fields: [playbookTasks.playbookId],
    references: [playbooks.id],
  }),
}));

export const redZoneAccountsRelations = relations(
  redZoneAccounts,
  ({ one }) => ({
    customer: one(customers, {
      fields: [redZoneAccounts.customerId],
      references: [customers.id],
    }),
  })
);

export const calendarEventsRelations = relations(
  calendarEvents,
  ({ one }) => ({
    customer: one(customers, {
      fields: [calendarEvents.customerId],
      references: [customers.id],
    }),
    createdBy: one(users, {
      fields: [calendarEvents.createdByUserId],
      references: [users.id],
    }),
  })
);

export const emailThreadsRelations = relations(emailThreads, ({ one }) => ({
  customer: one(customers, {
    fields: [emailThreads.customerId],
    references: [customers.id],
  }),
}));

export const integrationTokensRelations = relations(
  integrationTokens,
  ({ one }) => ({
    user: one(users, {
      fields: [integrationTokens.userId],
      references: [users.id],
    }),
  })
);

// Insert Schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTaskCommentSchema = createInsertSchema(taskComments).omit({
  id: true,
  createdAt: true,
});

export const insertPlaybookSchema = createInsertSchema(playbooks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPlaybookTaskSchema = createInsertSchema(playbookTasks).omit({
  id: true,
});

export const insertRedZoneAccountSchema = createInsertSchema(
  redZoneAccounts
).omit({
  id: true,
  createdAt: true,
});

export const insertCalendarEventSchema = createInsertSchema(calendarEvents).omit(
  {
    id: true,
  }
);

export const insertEmailThreadSchema = createInsertSchema(emailThreads).omit({
  id: true,
});

export const insertIntegrationTokenSchema = createInsertSchema(
  integrationTokens
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMysqlConfigSchema = createInsertSchema(mysqlConfig).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastSyncAt: true,
});

export const insertMysqlFieldMappingSchema = createInsertSchema(
  mysqlFieldMappings
).omit({
  id: true,
});

export const insertReportMetricSchema = createInsertSchema(reportMetrics).omit({
  id: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;

export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;

export type TaskComment = typeof taskComments.$inferSelect;
export type InsertTaskComment = z.infer<typeof insertTaskCommentSchema>;

export type Playbook = typeof playbooks.$inferSelect;
export type InsertPlaybook = z.infer<typeof insertPlaybookSchema>;

export type PlaybookTask = typeof playbookTasks.$inferSelect;
export type InsertPlaybookTask = z.infer<typeof insertPlaybookTaskSchema>;

export type RedZoneAccount = typeof redZoneAccounts.$inferSelect;
export type InsertRedZoneAccount = z.infer<typeof insertRedZoneAccountSchema>;

export type CalendarEvent = typeof calendarEvents.$inferSelect;
export type InsertCalendarEvent = z.infer<typeof insertCalendarEventSchema>;

export type EmailThread = typeof emailThreads.$inferSelect;
export type InsertEmailThread = z.infer<typeof insertEmailThreadSchema>;

export type IntegrationToken = typeof integrationTokens.$inferSelect;
export type InsertIntegrationToken = z.infer<typeof insertIntegrationTokenSchema>;

export type MysqlConfig = typeof mysqlConfig.$inferSelect;
export type InsertMysqlConfig = z.infer<typeof insertMysqlConfigSchema>;

export type MysqlFieldMapping = typeof mysqlFieldMappings.$inferSelect;
export type InsertMysqlFieldMapping = z.infer<
  typeof insertMysqlFieldMappingSchema
>;

export type ReportMetric = typeof reportMetrics.$inferSelect;
export type InsertReportMetric = z.infer<typeof insertReportMetricSchema>;
