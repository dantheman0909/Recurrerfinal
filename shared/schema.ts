import { pgTable, text, serial, integer, boolean, timestamp, jsonb, foreignKey, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Enums
export const userRoleEnum = pgEnum('user_role', ['admin', 'team_lead', 'csm']);
export const taskStatusEnum = pgEnum('task_status', ['pending', 'in_progress', 'completed', 'overdue']);
export const accountHealthEnum = pgEnum('account_health', ['healthy', 'at_risk', 'red_zone']);
export const alertSeverityEnum = pgEnum('alert_severity', ['critical', 'high_risk', 'attention_needed']);
export const playbookTriggerEnum = pgEnum('playbook_trigger', ['manual', 'new_customer', 'usage_drop', 'renewal_approaching', 'custom_event']);
export const dueDateTypeEnum = pgEnum('due_date_type', ['fixed', 'relative']);
export const recurrenceTypeEnum = pgEnum('recurrence_type', ['none', 'daily', 'weekly', 'monthly', 'bi-weekly']);
export const accountTypeEnum = pgEnum('account_type', ['starter', 'growth', 'key']);
export const integrationStatusEnum = pgEnum('integration_status', ['active', 'pending', 'error']);
export const notificationTypeEnum = pgEnum('notification_type', ['task_assigned', 'task_due_soon', 'task_overdue', 'red_zone_alert', 'customer_renewal', 'system_notification', 'achievement_earned', 'email_received', 'calendar_event']);
export const achievementTypeEnum = pgEnum('achievement_type', ['tasks_completed', 'customer_health_improved', 'feedback_collected', 'playbooks_executed', 'red_zone_resolved', 'login_streak']);
export const oauthProviderEnum = pgEnum('oauth_provider', ['google']);
export const oauthScopeEnum = pgEnum('oauth_scope', ['email', 'profile', 'gmail', 'calendar']);

// Permission Types
export const permissionIdEnum = pgEnum('permission_id', [
  'view_customers', 'edit_customers', 'delete_customers', 'assign_customers',
  'view_tasks', 'manage_tasks', 'view_reports', 'manage_users',
  'manage_settings', 'manage_integrations'
]);

// Users & Profiles
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  avatar_url: text("avatar_url"),
  role: userRoleEnum("role").notNull().default('csm'),
  team_lead_id: integer("team_lead_id").references(() => users.id), // ID of the team lead for CSMs
  created_at: timestamp("created_at").defaultNow(),
});

// Customers
export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  recurrer_id: text("recurrer_id").unique(), // UUID for consistent identification
  name: text("name").notNull(),
  industry: text("industry"),
  logo_url: text("logo_url"),
  contact_name: text("contact_name"),
  contact_email: text("contact_email"),
  contact_phone: text("contact_phone"),
  onboarded_at: timestamp("onboarded_at"),
  renewal_date: timestamp("renewal_date"),
  mrr: integer("mrr"),
  arr: integer("arr"),
  currency_code: text("currency_code").default('INR'),
  health_status: accountHealthEnum("health_status").default('healthy'),
  created_at: timestamp("created_at").defaultNow(),
  assigned_csm: integer("assigned_csm").references(() => users.id),
  csm_name: text("csm_name"),
  // External IDs
  chargebee_customer_id: text("chargebee_customer_id"),
  chargebee_subscription_id: text("chargebee_subscription_id"),
  mysql_company_id: text("mysql_company_id"),
  // MySQL company fields
  active_stores: integer("active_stores"),
  growth_subscription_count: integer("growth_subscription_count"),
  loyalty_active_store_count: integer("loyalty_active_store_count"),
  loyalty_inactive_store_count: integer("loyalty_inactive_store_count"),
  loyalty_active_channels: text("loyalty_active_channels"),
  loyalty_channel_credits: integer("loyalty_channel_credits"),
  negative_feedback_alert_inactive: integer("negative_feedback_alert_inactive"),
  less_than_300_bills: integer("less_than_300_bills"),
  active_auto_campaigns_count: integer("active_auto_campaigns_count"),
  unique_customers_captured: integer("unique_customers_captured"),
  revenue_1_year: integer("revenue_1_year"),
  customers_with_min_one_visit: integer("customers_with_min_one_visit"),
  customers_with_min_two_visit: integer("customers_with_min_two_visit"),
  customers_without_min_visits: integer("customers_without_min_visits"),
  percentage_of_inactive_customers: integer("percentage_of_inactive_customers"),
  negative_feedbacks_count: integer("negative_feedbacks_count"),
  campaigns_sent_last_90_days: integer("campaigns_sent_last_90_days"),
  bills_received_last_30_days: integer("bills_received_last_30_days"),
  customers_acquired_last_30_days: integer("customers_acquired_last_30_days"),
  loyalty_type: text("loyalty_type"),
  loyalty_reward: text("loyalty_reward"),
  updated_from_mysql_at: timestamp("updated_from_mysql_at"),
  updated_from_chargebee_at: timestamp("updated_from_chargebee_at"),
  subscription_status: text("subscription_status"),
  plan_id: text("plan_id"),
});

// Tasks
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  status: taskStatusEnum("status").default('pending'),
  due_date: timestamp("due_date"),
  customer_id: integer("customer_id").references(() => customers.id),
  assigned_to: integer("assigned_to").references(() => users.id),
  recurring: boolean("recurring").default(false),
  recurrence_pattern: text("recurrence_pattern"),
  playbook_id: integer("playbook_id").references(() => playbooks.id),
  created_at: timestamp("created_at").defaultNow(),
  created_by: integer("created_by").references(() => users.id),
});

// Task Comments
export const taskComments = pgTable("task_comments", {
  id: serial("id").primaryKey(),
  task_id: integer("task_id").notNull().references(() => tasks.id),
  user_id: integer("user_id").notNull().references(() => users.id),
  comment: text("comment").notNull(),
  created_at: timestamp("created_at").defaultNow(),
});

// Playbooks
export const playbooks = pgTable("playbooks", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  trigger_type: playbookTriggerEnum("trigger_type").notNull().default('manual'),
  target_segments: text("target_segments").array(), // Array of account types ['starter', 'growth', 'key']
  filters: jsonb("filters"), // For POD, Location Count, ARR, Plan Type filters
  active: boolean("active").default(true),
  created_by: integer("created_by").references(() => users.id),
  created_at: timestamp("created_at").defaultNow(),
});

// Playbook Tasks
export const playbookTasks = pgTable("playbook_tasks", {
  id: serial("id").primaryKey(),
  playbook_id: integer("playbook_id").notNull().references(() => playbooks.id),
  title: text("title").notNull(),
  description: text("description"),
  due_type: dueDateTypeEnum("due_type").notNull().default('relative'),
  due_offset: integer("due_offset").default(0), // Days from trigger for relative
  fixed_date: timestamp("fixed_date"), // For fixed date tasks
  recurrence: recurrenceTypeEnum("recurrence").default('none'),
  assignment_role: userRoleEnum("assignment_role").default('csm'),
  required_fields: text("required_fields").array(), // ['comment', 'recording_link', 'attachment']
  template_message: text("template_message"),
  order: integer("order").notNull(), // For ordering tasks (uses database column "order")
  created_at: timestamp("created_at").defaultNow(),
});

// Playbook Runs
export const playbookRuns = pgTable("playbook_runs", {
  id: serial("id").primaryKey(),
  playbook_id: integer("playbook_id").notNull().references(() => playbooks.id),
  customer_id: integer("customer_id").notNull().references(() => customers.id),
  status: text("status").notNull().default('active'), // active, completed, cancelled
  triggered_by: integer("triggered_by").references(() => users.id),
  trigger_event: text("trigger_event"),
  started_at: timestamp("started_at").defaultNow(),
  completed_at: timestamp("completed_at"),
});

// Red Zone Rules
export const redZoneRules = pgTable("red_zone_rules", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  conditions: jsonb("conditions").notNull(), // JSON structure for conditions with AND/OR logic
  severity: alertSeverityEnum("severity").default('attention_needed'),
  auto_resolve: boolean("auto_resolve").default(false),
  resolution_conditions: jsonb("resolution_conditions"), // Optional conditions for auto-resolution
  enabled: boolean("enabled").default(true),
  created_by: integer("created_by").references(() => users.id),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at"),
  team_lead_approval_required: boolean("team_lead_approval_required").default(false),
  notification_message: text("notification_message"), // Custom message for notifications
});

// Red Zone Resolution Conditions
export const redZoneResolutionCriteria = pgTable("red_zone_resolution_criteria", {
  id: serial("id").primaryKey(),
  rule_id: integer("rule_id").notNull().references(() => redZoneRules.id),
  field_path: text("field_path").notNull(), // Path to the field to check
  operator: text("operator").notNull(), // equals, not_equals, greater_than, etc.
  value: text("value").notNull(), // Value to compare against
  created_at: timestamp("created_at").defaultNow(),
});

// Red Zone Activity Logs
export const redZoneActivityLogs = pgTable("red_zone_activity_logs", {
  id: serial("id").primaryKey(),
  alert_id: integer("alert_id").notNull().references(() => redZoneAlerts.id),
  action: text("action").notNull(), // created, updated, escalated, resolved, etc.
  performed_by: integer("performed_by").references(() => users.id),
  details: jsonb("details"), // Additional details about the action
  created_at: timestamp("created_at").defaultNow(),
});

// Red Zone Alerts (Enhanced)
export const redZoneAlerts = pgTable("red_zone_alerts", {
  id: serial("id").primaryKey(),
  customer_id: integer("customer_id").notNull().references(() => customers.id),
  rule_id: integer("rule_id").references(() => redZoneRules.id), // Optional reference to the rule that triggered this alert
  reason: text("reason").notNull(),
  severity: alertSeverityEnum("severity").default('attention_needed'),
  status: text("status").default('open').notNull(), // open, pending_approval, resolved
  details: jsonb("details"), // Additional details about what triggered the alert
  notes: text("notes"), // CSM notes about the alert
  assigned_to: integer("assigned_to").references(() => users.id),
  escalated_to: integer("escalated_to").references(() => users.id),
  escalated_at: timestamp("escalated_at"),
  resolution_summary: text("resolution_summary"),
  created_at: timestamp("created_at").defaultNow(),
  resolved_at: timestamp("resolved_at"),
  resolved_by: integer("resolved_by").references(() => users.id),
});

// Customer Metrics
export const customerMetrics = pgTable("customer_metrics", {
  id: serial("id").primaryKey(),
  customer_id: integer("customer_id").notNull().references(() => customers.id),
  metric_type: text("metric_type").notNull(),
  metric_value: integer("metric_value"),
  metric_percent: integer("metric_percent"),
  recorded_at: timestamp("recorded_at").defaultNow(),
});

// MySQL Configuration
export const mysqlConfig = pgTable("mysql_config", {
  id: serial("id").primaryKey(),
  host: text("host").notNull(),
  port: integer("port").notNull(),
  username: text("username").notNull(),
  password: text("password").notNull(),
  database: text("database").notNull(),
  status: integrationStatusEnum("status").default('active'),
  last_synced_at: timestamp("last_synced_at"),
  sync_frequency: integer("sync_frequency").default(24), // Sync frequency in hours
  created_by: integer("created_by").references(() => users.id),
  created_at: timestamp("created_at").defaultNow(),
});

// MySQL Field Mappings
export const mysqlFieldMappings = pgTable("mysql_field_mappings", {
  id: serial("id").primaryKey(),
  mysql_table: text("mysql_table").notNull(),
  mysql_field: text("mysql_field").notNull(),
  local_table: text("local_table").notNull(),
  local_field: text("local_field").notNull(),
  field_type: text("field_type").default("text"), // Data type of the field (text, integer, date, etc.)
  is_key_field: boolean("is_key_field").default(false), // Whether this field is used for matching records
  created_by: integer("created_by").references(() => users.id),
  created_at: timestamp("created_at").defaultNow(),
});

// MySQL Saved Queries
export const mysqlSavedQueries = pgTable("mysql_saved_queries", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  query: text("query").notNull(),
  last_run_at: timestamp("last_run_at"),
  is_scheduled: boolean("is_scheduled").default(false),
  schedule_frequency: integer("schedule_frequency").default(0), // Hours between runs, 0 means manual only
  enabled: boolean("enabled").default(true),
  created_by: integer("created_by").references(() => users.id),
  created_at: timestamp("created_at").defaultNow(),
});

// Chargebee Configuration
export const chargebeeConfig = pgTable("chargebee_config", {
  id: serial("id").primaryKey(),
  site: text("site").notNull(),
  apiKey: text("apiKey").notNull(),
  status: integrationStatusEnum("status").default('active'),
  last_synced_at: timestamp("last_synced_at"),
  last_sync_stats: jsonb("last_sync_stats"), // Statistics from last sync (customers, subscriptions, invoices)
  sync_frequency: integer("sync_frequency").default(24), // Sync frequency in hours
  created_by: integer("created_by").references(() => users.id),
  created_at: timestamp("created_at").defaultNow(),
});

// Chargebee Field Mapping
export const chargebeeFieldMappings = pgTable("chargebee_field_mappings", {
  id: serial("id").primaryKey(),
  chargebee_entity: text("chargebee_entity").notNull(), // customer, subscription, invoice
  chargebee_field: text("chargebee_field").notNull(), 
  local_table: text("local_table").notNull(),
  local_field: text("local_field").notNull(),
  is_key_field: boolean("is_key_field").default(false), // Whether this field is used for matching records
  created_by: integer("created_by").references(() => users.id),
  created_at: timestamp("created_at").defaultNow(),
});

// Notifications
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").notNull().references(() => users.id),
  type: notificationTypeEnum("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  link: text("link"), // Optional link to navigate to when notification is clicked
  is_read: boolean("is_read").default(false),
  created_at: timestamp("created_at").defaultNow(),
  related_id: integer("related_id"), // ID of related entity (task, alert, etc.)
  related_type: text("related_type"), // Type of related entity ('task', 'customer', etc.)
});

// User Achievements
export const userAchievements = pgTable("user_achievements", {
  id: serial("id").primaryKey(), 
  user_id: integer("user_id").notNull().references(() => users.id),
  achievement_type: achievementTypeEnum("achievement_type").notNull(),
  achievement_title: text("achievement_title").notNull(),
  achievement_description: text("achievement_description").notNull(),
  badge_icon: text("badge_icon").notNull(), // Icon name or path
  xp_earned: integer("xp_earned").default(0),
  level_unlocked: integer("level_unlocked"),
  earned_at: timestamp("earned_at").defaultNow(),
  is_viewed: boolean("is_viewed").default(false),
});

// Google OAuth Configuration
export const googleOAuthConfig = pgTable("google_oauth_config", {
  id: serial("id").primaryKey(),
  client_id: text("client_id").notNull(),
  client_secret: text("client_secret").notNull(),
  redirect_uri: text("redirect_uri").notNull(),
  scopes: oauthScopeEnum("scopes").array(),
  enabled: boolean("enabled").default(true),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at"),
});

// User OAuth Tokens
export const userOAuthTokens = pgTable("user_oauth_tokens", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").notNull().references(() => users.id),
  provider: oauthProviderEnum("provider").notNull(),
  access_token: text("access_token").notNull(),
  refresh_token: text("refresh_token"),
  token_type: text("token_type").default("Bearer"),
  scopes: oauthScopeEnum("scopes").array(),
  expires_at: timestamp("expires_at"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at"),
});

// Email Messages
export const emailMessages = pgTable("email_messages", {
  id: serial("id").primaryKey(),
  gmail_id: text("gmail_id").unique(), // Gmail's unique message ID
  user_id: integer("user_id").notNull().references(() => users.id), // User who received/sent the email
  customer_id: integer("customer_id").references(() => customers.id), // Related customer, if any
  thread_id: text("thread_id"), // Gmail thread ID for conversation grouping
  from_email: text("from_email").notNull(),
  from_name: text("from_name"),
  to_emails: text("to_emails").array(),
  cc_emails: text("cc_emails").array(),
  subject: text("subject"),
  body_text: text("body_text"),
  body_html: text("body_html"),
  received_at: timestamp("received_at"),
  is_read: boolean("is_read").default(false),
  is_sent: boolean("is_sent").default(false),
  is_archived: boolean("is_archived").default(false),
  labels: text("labels").array(),
  attachments_count: integer("attachments_count").default(0),
  created_at: timestamp("created_at").defaultNow(),
});

// Calendar Events
export const calendarEvents = pgTable("calendar_events", {
  id: serial("id").primaryKey(),
  google_event_id: text("google_event_id").unique(), // Google Calendar's event ID
  user_id: integer("user_id").notNull().references(() => users.id), // User who owns the calendar
  customer_id: integer("customer_id").references(() => customers.id), // Related customer, if any
  title: text("title").notNull(),
  description: text("description"),
  location: text("location"),
  start_time: timestamp("start_time").notNull(),
  end_time: timestamp("end_time").notNull(),
  is_all_day: boolean("is_all_day").default(false),
  attendees: jsonb("attendees"), // Array of {email, name, response_status}
  google_calendar_id: text("google_calendar_id"), // ID of the Google Calendar
  google_meet_link: text("google_meet_link"),
  is_recurring: boolean("is_recurring").default(false),
  recurrence_rule: text("recurrence_rule"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at"),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  teamLead: one(users, { fields: [users.team_lead_id], references: [users.id], relationName: "csm_team_lead" }),
  csmMembers: many(users, { relationName: "csm_team_lead" }),
  assignedTasks: many(tasks, { relationName: "assigned_tasks" }),
  createdTasks: many(tasks, { relationName: "created_tasks" }),
  createdPlaybooks: many(playbooks),
  assignedCustomers: many(customers, { relationName: "assigned_customers" }),
  notifications: many(notifications),
  achievements: many(userAchievements),
  oauthTokens: many(userOAuthTokens),
  emails: many(emailMessages),
  calendarEvents: many(calendarEvents),
}));

export const customersRelations = relations(customers, ({ one, many }) => ({
  assignedCsm: one(users, { fields: [customers.assigned_csm], references: [users.id], relationName: "assigned_customers" }),
  tasks: many(tasks),
  redZoneAlerts: many(redZoneAlerts),
  metrics: many(customerMetrics),
  emails: many(emailMessages),
  calendarEvents: many(calendarEvents),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  customer: one(customers, { fields: [tasks.customer_id], references: [customers.id] }),
  assignedTo: one(users, { fields: [tasks.assigned_to], references: [users.id], relationName: "assigned_tasks" }),
  createdBy: one(users, { fields: [tasks.created_by], references: [users.id], relationName: "created_tasks" }),
  playbook: one(playbooks, { fields: [tasks.playbook_id], references: [playbooks.id] }),
}));

export const playbooksRelations = relations(playbooks, ({ one, many }) => ({
  createdBy: one(users, { fields: [playbooks.created_by], references: [users.id] }),
  tasks: many(playbookTasks),
  runs: many(playbookRuns),
}));

export const playbookTasksRelations = relations(playbookTasks, ({ one }) => ({
  playbook: one(playbooks, { fields: [playbookTasks.playbook_id], references: [playbooks.id] }),
}));

export const playbookRunsRelations = relations(playbookRuns, ({ one }) => ({
  playbook: one(playbooks, { fields: [playbookRuns.playbook_id], references: [playbooks.id] }),
  customer: one(customers, { fields: [playbookRuns.customer_id], references: [customers.id] }),
  triggeredBy: one(users, { fields: [playbookRuns.triggered_by], references: [users.id] }),
}));

export const redZoneRulesRelations = relations(redZoneRules, ({ one, many }) => ({
  createdBy: one(users, { fields: [redZoneRules.created_by], references: [users.id] }),
  resolutionCriteria: many(redZoneResolutionCriteria),
  alerts: many(redZoneAlerts),
}));

export const redZoneResolutionCriteriaRelations = relations(redZoneResolutionCriteria, ({ one }) => ({
  rule: one(redZoneRules, { fields: [redZoneResolutionCriteria.rule_id], references: [redZoneRules.id] }),
}));

export const redZoneAlertsRelations = relations(redZoneAlerts, ({ one, many }) => ({
  customer: one(customers, { fields: [redZoneAlerts.customer_id], references: [customers.id] }),
  rule: one(redZoneRules, { fields: [redZoneAlerts.rule_id], references: [redZoneRules.id] }),
  assignedTo: one(users, { fields: [redZoneAlerts.assigned_to], references: [users.id] }),
  escalatedTo: one(users, { fields: [redZoneAlerts.escalated_to], references: [users.id] }),
  resolvedBy: one(users, { fields: [redZoneAlerts.resolved_by], references: [users.id] }),
  activityLogs: many(redZoneActivityLogs),
}));

export const redZoneActivityLogsRelations = relations(redZoneActivityLogs, ({ one }) => ({
  alert: one(redZoneAlerts, { fields: [redZoneActivityLogs.alert_id], references: [redZoneAlerts.id] }),
  performedBy: one(users, { fields: [redZoneActivityLogs.performed_by], references: [users.id] }),
}));

export const customerMetricsRelations = relations(customerMetrics, ({ one }) => ({
  customer: one(customers, { fields: [customerMetrics.customer_id], references: [customers.id] }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.user_id], references: [users.id] }),
}));

export const userAchievementsRelations = relations(userAchievements, ({ one }) => ({
  user: one(users, { fields: [userAchievements.user_id], references: [users.id] }),
}));

export const userOAuthTokensRelations = relations(userOAuthTokens, ({ one }) => ({
  user: one(users, { fields: [userOAuthTokens.user_id], references: [users.id] }),
}));

export const emailMessagesRelations = relations(emailMessages, ({ one }) => ({
  user: one(users, { fields: [emailMessages.user_id], references: [users.id] }),
  customer: one(customers, { fields: [emailMessages.customer_id], references: [customers.id] }),
}));

export const calendarEventsRelations = relations(calendarEvents, ({ one }) => ({
  user: one(users, { fields: [calendarEvents.user_id], references: [users.id] }),
  customer: one(customers, { fields: [calendarEvents.customer_id], references: [customers.id] }),
}));

// Schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, created_at: true });
export const insertCustomerSchema = createInsertSchema(customers).omit({ id: true, created_at: true });
export const insertTaskSchema = createInsertSchema(tasks).omit({ id: true, created_at: true });
export const insertPlaybookSchema = createInsertSchema(playbooks).omit({ id: true, created_at: true });
export const insertPlaybookTaskSchema = createInsertSchema(playbookTasks).omit({ id: true, created_at: true });
export const insertPlaybookRunSchema = createInsertSchema(playbookRuns).omit({ id: true, started_at: true, completed_at: true });
export const insertRedZoneRuleSchema = createInsertSchema(redZoneRules).omit({ id: true, created_at: true, updated_at: true });
export const insertRedZoneResolutionCriteriaSchema = createInsertSchema(redZoneResolutionCriteria).omit({ id: true, created_at: true });
export const insertRedZoneActivityLogSchema = createInsertSchema(redZoneActivityLogs).omit({ id: true, created_at: true });
export const insertRedZoneAlertSchema = createInsertSchema(redZoneAlerts).omit({ id: true, created_at: true, resolved_at: true, escalated_at: true });
export const insertMySQLConfigSchema = createInsertSchema(mysqlConfig).omit({ id: true, created_at: true });
export const insertMySQLFieldMappingSchema = createInsertSchema(mysqlFieldMappings).omit({ id: true, created_at: true });
export const insertMySQLSavedQuerySchema = createInsertSchema(mysqlSavedQueries).omit({ id: true, created_at: true, last_run_at: true });
export const insertChargebeeConfigSchema = createInsertSchema(chargebeeConfig).omit({ id: true, created_at: true, last_synced_at: true, last_sync_stats: true });
export const insertChargebeeFieldMappingSchema = createInsertSchema(chargebeeFieldMappings).omit({ id: true, created_at: true });
export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, created_at: true });
export const insertUserAchievementSchema = createInsertSchema(userAchievements).omit({ id: true, earned_at: true });
export const insertGoogleOAuthConfigSchema = createInsertSchema(googleOAuthConfig).omit({ id: true, created_at: true, updated_at: true });
export const insertUserOAuthTokenSchema = createInsertSchema(userOAuthTokens).omit({ id: true, created_at: true, updated_at: true });
export const insertEmailMessageSchema = createInsertSchema(emailMessages).omit({ id: true, created_at: true });
export const insertCalendarEventSchema = createInsertSchema(calendarEvents).omit({ id: true, created_at: true, updated_at: true });

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;

export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;

// Permissions table for role-based access control
export const permissions = pgTable("permissions", {
  id: text("id").primaryKey(), // permission unique identifier
  name: text("name").notNull(), // human-readable name 
  description: text("description").notNull(), // details about what this permission grants
  admin_access: boolean("admin_access").notNull().default(true), // whether admin role has this permission
  team_lead_access: boolean("team_lead_access").notNull().default(false), // whether team lead role has this permission
  csm_access: boolean("csm_access").notNull().default(false), // whether csm role has this permission
  created_at: timestamp("created_at").defaultNow(),
});

export const insertPermissionSchema = createInsertSchema(permissions).omit({ created_at: true });
export type Permission = typeof permissions.$inferSelect;
export type InsertPermission = z.infer<typeof insertPermissionSchema>;

export type TaskComment = typeof taskComments.$inferSelect;

export type Playbook = typeof playbooks.$inferSelect;
export type InsertPlaybook = z.infer<typeof insertPlaybookSchema>;

export type PlaybookTask = typeof playbookTasks.$inferSelect;
export type InsertPlaybookTask = z.infer<typeof insertPlaybookTaskSchema>;

export type PlaybookRun = typeof playbookRuns.$inferSelect;
export type InsertPlaybookRun = z.infer<typeof insertPlaybookRunSchema>;

export type RedZoneRule = typeof redZoneRules.$inferSelect;
export type InsertRedZoneRule = z.infer<typeof insertRedZoneRuleSchema>;

export type RedZoneResolutionCriteria = typeof redZoneResolutionCriteria.$inferSelect;
export type InsertRedZoneResolutionCriteria = z.infer<typeof insertRedZoneResolutionCriteriaSchema>;

export type RedZoneActivityLog = typeof redZoneActivityLogs.$inferSelect;
export type InsertRedZoneActivityLog = z.infer<typeof insertRedZoneActivityLogSchema>;

export type RedZoneAlert = typeof redZoneAlerts.$inferSelect;
export type InsertRedZoneAlert = z.infer<typeof insertRedZoneAlertSchema>;

export type CustomerMetric = typeof customerMetrics.$inferSelect;

export type MySQLConfig = typeof mysqlConfig.$inferSelect;
export type MySQLFieldMapping = typeof mysqlFieldMappings.$inferSelect;
export type MySQLSavedQuery = typeof mysqlSavedQueries.$inferSelect;
export type InsertMySQLSavedQuery = z.infer<typeof insertMySQLSavedQuerySchema>;
export type ChargebeeConfig = typeof chargebeeConfig.$inferSelect;
export type InsertChargebeeConfig = z.infer<typeof insertChargebeeConfigSchema>;
export type ChargebeeFieldMapping = typeof chargebeeFieldMappings.$inferSelect;
export type InsertChargebeeFieldMapping = z.infer<typeof insertChargebeeFieldMappingSchema>;

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

export type UserAchievement = typeof userAchievements.$inferSelect;
export type InsertUserAchievement = z.infer<typeof insertUserAchievementSchema>;

export type GoogleOAuthConfig = typeof googleOAuthConfig.$inferSelect;
export type InsertGoogleOAuthConfig = z.infer<typeof insertGoogleOAuthConfigSchema>;

export type UserOAuthToken = typeof userOAuthTokens.$inferSelect;
export type InsertUserOAuthToken = z.infer<typeof insertUserOAuthTokenSchema>;

export type EmailMessage = typeof emailMessages.$inferSelect;
export type InsertEmailMessage = z.infer<typeof insertEmailMessageSchema>;

export type CalendarEvent = typeof calendarEvents.$inferSelect;
export type InsertCalendarEvent = z.infer<typeof insertCalendarEventSchema>;
