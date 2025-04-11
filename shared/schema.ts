import { pgTable, text, serial, integer, boolean, timestamp, jsonb, foreignKey, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Enums
export const userRoleEnum = pgEnum('user_role', ['admin', 'team_lead', 'csm']);
export const taskStatusEnum = pgEnum('task_status', ['pending', 'in_progress', 'completed', 'overdue']);
export const accountHealthEnum = pgEnum('account_health', ['healthy', 'at_risk', 'red_zone']);
export const alertSeverityEnum = pgEnum('alert_severity', ['critical', 'high_risk', 'attention_needed']);

// Users & Profiles
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  avatar_url: text("avatar_url"),
  role: userRoleEnum("role").notNull().default('csm'),
  created_at: timestamp("created_at").defaultNow(),
});

// Customers
export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
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
  health_status: accountHealthEnum("health_status").default('healthy'),
  created_at: timestamp("created_at").defaultNow(),
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
  trigger_type: text("trigger_type").notNull(),
  trigger_config: jsonb("trigger_config"),
  created_by: integer("created_by").references(() => users.id),
  created_at: timestamp("created_at").defaultNow(),
});

// Playbook Tasks
export const playbookTasks = pgTable("playbook_tasks", {
  id: serial("id").primaryKey(),
  playbook_id: integer("playbook_id").notNull().references(() => playbooks.id),
  title: text("title").notNull(),
  description: text("description"),
  due_days: integer("due_days"),
  due_date: timestamp("due_date"),
  recurring: boolean("recurring").default(false),
  recurrence_pattern: text("recurrence_pattern"),
  order: integer("order").notNull(),
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
export const usersRelations = relations(users, ({ many }) => ({
  assignedTasks: many(tasks, { relationName: "assigned_tasks" }),
  createdTasks: many(tasks, { relationName: "created_tasks" }),
  createdPlaybooks: many(playbooks),
}));

export const customersRelations = relations(customers, ({ many }) => ({
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
}));

export const playbookTasksRelations = relations(playbookTasks, ({ one }) => ({
  playbook: one(playbooks, { fields: [playbookTasks.playbook_id], references: [playbooks.id] }),
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

export type RedZoneAlert = typeof redZoneAlerts.$inferSelect;
export type InsertRedZoneAlert = z.infer<typeof insertRedZoneAlertSchema>;

export type CustomerMetric = typeof customerMetrics.$inferSelect;

export type MySQLConfig = typeof mysqlConfig.$inferSelect;
export type MySQLFieldMapping = typeof mysqlFieldMappings.$inferSelect;
