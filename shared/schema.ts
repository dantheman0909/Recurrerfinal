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

// Red Zone Alerts
export const redZoneAlerts = pgTable("red_zone_alerts", {
  id: serial("id").primaryKey(),
  customer_id: integer("customer_id").notNull().references(() => customers.id),
  reason: text("reason").notNull(),
  severity: alertSeverityEnum("severity").default('attention_needed'),
  created_at: timestamp("created_at").defaultNow(),
  resolved_at: timestamp("resolved_at"),
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
  created_by: integer("created_by").references(() => users.id),
  created_at: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  teamLead: one(users, { fields: [users.team_lead_id], references: [users.id], relationName: "csm_team_lead" }),
  csmMembers: many(users, { relationName: "csm_team_lead" }),
  assignedTasks: many(tasks, { relationName: "assigned_tasks" }),
  createdTasks: many(tasks, { relationName: "created_tasks" }),
  createdPlaybooks: many(playbooks),
  assignedCustomers: many(customers, { relationName: "assigned_customers" }),
}));

export const customersRelations = relations(customers, ({ one, many }) => ({
  assignedCsm: one(users, { fields: [customers.assigned_csm], references: [users.id], relationName: "assigned_customers" }),
  tasks: many(tasks),
  redZoneAlerts: many(redZoneAlerts),
  metrics: many(customerMetrics),
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

export const redZoneAlertsRelations = relations(redZoneAlerts, ({ one }) => ({
  customer: one(customers, { fields: [redZoneAlerts.customer_id], references: [customers.id] }),
}));

export const customerMetricsRelations = relations(customerMetrics, ({ one }) => ({
  customer: one(customers, { fields: [customerMetrics.customer_id], references: [customers.id] }),
}));

// Schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, created_at: true });
export const insertCustomerSchema = createInsertSchema(customers).omit({ id: true, created_at: true });
export const insertTaskSchema = createInsertSchema(tasks).omit({ id: true, created_at: true });
export const insertPlaybookSchema = createInsertSchema(playbooks).omit({ id: true, created_at: true });
export const insertPlaybookTaskSchema = createInsertSchema(playbookTasks).omit({ id: true, created_at: true });
export const insertPlaybookRunSchema = createInsertSchema(playbookRuns).omit({ id: true, started_at: true, completed_at: true });
export const insertRedZoneAlertSchema = createInsertSchema(redZoneAlerts).omit({ id: true, created_at: true, resolved_at: true });

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;

export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;

export type TaskComment = typeof taskComments.$inferSelect;

export type Playbook = typeof playbooks.$inferSelect;
export type InsertPlaybook = z.infer<typeof insertPlaybookSchema>;

export type PlaybookTask = typeof playbookTasks.$inferSelect;
export type InsertPlaybookTask = z.infer<typeof insertPlaybookTaskSchema>;

export type PlaybookRun = typeof playbookRuns.$inferSelect;
export type InsertPlaybookRun = z.infer<typeof insertPlaybookRunSchema>;

export type RedZoneAlert = typeof redZoneAlerts.$inferSelect;
export type InsertRedZoneAlert = z.infer<typeof insertRedZoneAlertSchema>;

export type CustomerMetric = typeof customerMetrics.$inferSelect;

export type MySQLConfig = typeof mysqlConfig.$inferSelect;
export type MySQLFieldMapping = typeof mysqlFieldMappings.$inferSelect;
