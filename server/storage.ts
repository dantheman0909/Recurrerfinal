import { 
  users, customers, tasks, taskComments, playbooks, playbookTasks, 
  redZoneAlerts, redZoneRules, redZoneResolutionCriteria, redZoneActivityLogs,
  customerMetrics, mysqlConfig, mysqlFieldMappings, mysqlSavedQueries,
  chargebeeConfig, chargebeeFieldMappings, notifications, userAchievements,
  type User, type Customer, type Task, type TaskComment, type Playbook, 
  type PlaybookTask, type RedZoneAlert, type RedZoneRule, type RedZoneResolutionCriteria, 
  type RedZoneActivityLog, type CustomerMetric, 
  type MySQLConfig, type MySQLFieldMapping, type MySQLSavedQuery,
  type ChargebeeConfig, type ChargebeeFieldMapping, type Notification, type UserAchievement,
  type InsertUser, type InsertCustomer, type InsertTask, type InsertPlaybook,
  type InsertRedZoneAlert, type InsertRedZoneRule, type InsertRedZoneResolutionCriteria,
  type InsertRedZoneActivityLog, type InsertMySQLSavedQuery,
  type InsertChargebeeConfig, type InsertChargebeeFieldMapping,
  type InsertNotification, type InsertUserAchievement
} from "@shared/schema";
import { db } from "./db";
import { eq, and, isNull, desc, asc, gte, lt, count } from "drizzle-orm";
import { AccountHealth, MetricTimeframe } from "@shared/types";
import { generateTimeseriesData } from "./utils/chart-data";

// Define interfaces for achievement system configuration
interface AchievementThresholds {
  tasks_completed: number;
  customer_health_improved: number;
  feedback_collected: number;
  playbooks_executed: number;
  red_zone_resolved: number;
  login_streak: number;
}

interface BadgeConfiguration {
  tasks_completed: { icon: string; color: string };
  customer_health_improved: { icon: string; color: string };
  feedback_collected: { icon: string; color: string };
  playbooks_executed: { icon: string; color: string };
  red_zone_resolved: { icon: string; color: string };
  login_streak: { icon: string; color: string };
}

interface NotificationSettings {
  enableAchievementNotifications: boolean;
  notifyOnLevelUp: boolean;
  showBadgesInProfile: boolean;
  showAchievementsInDashboard: boolean;
}

interface XpConfiguration {
  tasks_completed: number;
  customer_health_improved: number;
  feedback_collected: number;
  playbooks_executed: number;
  red_zone_resolved: number;
  login_streak: number;
}

export interface IStorage {
  // Achievement System Configuration
  getAchievementThresholds(): Promise<AchievementThresholds>;
  saveAchievementThresholds(thresholds: AchievementThresholds): Promise<AchievementThresholds>;
  getBadgeConfiguration(): Promise<BadgeConfiguration>;
  saveBadgeConfiguration(config: BadgeConfiguration): Promise<BadgeConfiguration>;
  getNotificationSettings(): Promise<NotificationSettings>;
  saveNotificationSettings(settings: NotificationSettings): Promise<NotificationSettings>;
  getXpConfiguration(): Promise<XpConfiguration>;
  saveXpConfiguration(config: XpConfiguration): Promise<XpConfiguration>;
  
  // Users
  getUsers(): Promise<User[]>;
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User | undefined>;
  
  // Customers
  getCustomers(): Promise<Customer[]>;
  getCustomer(id: number): Promise<Customer | undefined>;
  getCustomerByRecurrerId(recurrerId: string): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: number, customer: Partial<Customer>): Promise<Customer | undefined>;
  deleteCustomer(id: number): Promise<boolean>;
  getCustomerTableFields(): Promise<string[]>;
  getTableFields(tableName: string): Promise<string[]>;
  
  // Tasks
  getTasks(): Promise<Task[]>;
  getTasksByCustomer(customerId: number): Promise<Task[]>;
  getTasksByAssignee(userId: number): Promise<Task[]>;
  getTask(id: number): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, task: Partial<Task>): Promise<Task | undefined>;
  
  // Task Comments
  getTaskComments(taskId: number): Promise<TaskComment[]>;
  createTaskComment(taskId: number, userId: number, comment: string): Promise<TaskComment>;
  
  // Playbooks
  getPlaybooks(): Promise<Playbook[]>;
  getPlaybook(id: number): Promise<Playbook | undefined>;
  createPlaybook(playbook: InsertPlaybook): Promise<Playbook>;
  updatePlaybook(id: number, playbook: Partial<Playbook>): Promise<Playbook | undefined>;
  
  // Playbook Tasks
  getPlaybookTasks(playbookId: number): Promise<PlaybookTask[]>;
  createPlaybookTask(playbookId: number, task: Omit<PlaybookTask, 'id' | 'playbook_id'>): Promise<PlaybookTask>;
  updatePlaybookTask(id: number, task: Partial<PlaybookTask>): Promise<PlaybookTask | undefined>;
  
  // Red Zone Alerts
  getRedZoneAlerts(): Promise<RedZoneAlert[]>;
  getRedZoneAlertsByCustomer(customerId: number): Promise<RedZoneAlert[]>;
  getRedZoneAlert(id: number): Promise<RedZoneAlert | undefined>;
  createRedZoneAlert(alert: InsertRedZoneAlert): Promise<RedZoneAlert>;
  updateRedZoneAlert(id: number, alert: Partial<RedZoneAlert>): Promise<RedZoneAlert | undefined>;
  resolveRedZoneAlert(id: number): Promise<RedZoneAlert | undefined>;
  escalateRedZoneAlert(id: number, escalatedTo: number): Promise<RedZoneAlert | undefined>;
  
  // Red Zone Rules
  getRedZoneRules(): Promise<RedZoneRule[]>;
  getRedZoneRule(id: number): Promise<RedZoneRule | undefined>;
  createRedZoneRule(rule: InsertRedZoneRule): Promise<RedZoneRule>;
  updateRedZoneRule(id: number, rule: Partial<RedZoneRule>): Promise<RedZoneRule | undefined>;
  deleteRedZoneRule(id: number): Promise<boolean>;
  
  // Red Zone Resolution Criteria
  getRedZoneResolutionCriteria(ruleId: number): Promise<RedZoneResolutionCriteria[]>;
  createRedZoneResolutionCriteria(criteria: InsertRedZoneResolutionCriteria): Promise<RedZoneResolutionCriteria>;
  deleteRedZoneResolutionCriteria(id: number): Promise<boolean>;
  
  // Red Zone Activity Logs
  getRedZoneActivityLogs(alertId: number): Promise<RedZoneActivityLog[]>;
  createRedZoneActivityLog(log: InsertRedZoneActivityLog): Promise<RedZoneActivityLog>;
  
  // Customer Metrics
  getCustomerMetrics(customerId: number): Promise<CustomerMetric[]>;
  createCustomerMetric(customerId: number, metricType: string, value: number, percent?: number): Promise<CustomerMetric>;
  
  // MySQL Configuration
  getMySQLConfig(): Promise<MySQLConfig | undefined>;
  createMySQLConfig(config: Omit<MySQLConfig, 'id' | 'created_at'>): Promise<MySQLConfig>;
  
  // MySQL Field Mappings
  getMySQLFieldMappings(): Promise<MySQLFieldMapping[]>;
  createMySQLFieldMapping(mapping: Omit<MySQLFieldMapping, 'id' | 'created_at'>): Promise<MySQLFieldMapping>;
  updateMySQLFieldMapping(id: number, mapping: Partial<Omit<MySQLFieldMapping, 'id' | 'created_at'>>): Promise<MySQLFieldMapping | undefined>;
  deleteMySQLFieldMapping(id: number): Promise<boolean>;
  
  // MySQL Saved Queries
  getMySQLSavedQueries(): Promise<MySQLSavedQuery[]>;
  getMySQLSavedQuery(id: number): Promise<MySQLSavedQuery | undefined>;
  createMySQLSavedQuery(query: InsertMySQLSavedQuery): Promise<MySQLSavedQuery>;
  updateMySQLSavedQuery(id: number, query: Partial<Omit<MySQLSavedQuery, 'id' | 'created_at'>>): Promise<MySQLSavedQuery | undefined>;
  deleteMySQLSavedQuery(id: number): Promise<boolean>;
  updateMySQLSavedQueryLastRun(id: number): Promise<MySQLSavedQuery | undefined>;
  
  // Chargebee Configuration
  getChargebeeConfig(): Promise<ChargebeeConfig | undefined>;
  createChargebeeConfig(config: Omit<ChargebeeConfig, 'id' | 'created_at' | 'last_synced_at'>): Promise<ChargebeeConfig>;
  
  // Chargebee Field Mappings
  getChargebeeFieldMappings(): Promise<ChargebeeFieldMapping[]>;
  getChargebeeFieldMappingsByEntity(entity: string): Promise<ChargebeeFieldMapping[]>;
  getChargebeeFieldMapping(id: number): Promise<ChargebeeFieldMapping | undefined>;
  createChargebeeFieldMapping(mapping: Omit<ChargebeeFieldMapping, 'id' | 'created_at'>): Promise<ChargebeeFieldMapping>;
  updateChargebeeFieldMapping(id: number, mapping: Partial<Omit<ChargebeeFieldMapping, 'id' | 'created_at'>>): Promise<ChargebeeFieldMapping | undefined>;
  deleteChargebeeFieldMapping(id: number): Promise<boolean>;
  
  // Dashboard
  getDashboardStats(timeframe: MetricTimeframe): Promise<any>;
  
  // Notifications
  getNotifications(userId: number): Promise<Notification[]>;
  getUnreadNotificationsCount(userId: number): Promise<number>;
  getNotification(id: number): Promise<Notification | undefined>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: number): Promise<Notification | undefined>;
  markAllNotificationsAsRead(userId: number): Promise<void>;
  
  // User Achievements
  getUserAchievements(userId: number): Promise<UserAchievement[]>;
  getUnviewedAchievementsCount(userId: number): Promise<number>;
  getUserAchievement(id: number): Promise<UserAchievement | undefined>;
  createUserAchievement(achievement: InsertUserAchievement): Promise<UserAchievement>;
  markAchievementAsViewed(id: number): Promise<UserAchievement | undefined>;
  
  // Achievement System Configuration
  getAchievementThresholds(): Promise<AchievementThresholds>;
  saveAchievementThresholds(thresholds: AchievementThresholds): Promise<AchievementThresholds>;
  getBadgeConfiguration(): Promise<BadgeConfiguration>;
  saveBadgeConfiguration(config: BadgeConfiguration): Promise<BadgeConfiguration>;
  getNotificationSettings(): Promise<NotificationSettings>;
  saveNotificationSettings(settings: NotificationSettings): Promise<NotificationSettings>;
  getXpConfiguration(): Promise<XpConfiguration>;
  saveXpConfiguration(config: XpConfiguration): Promise<XpConfiguration>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private customers: Map<number, Customer>;
  private tasks: Map<number, Task>;
  private taskComments: Map<number, TaskComment>;
  private playbooks: Map<number, Playbook>;
  private playbookTasks: Map<number, PlaybookTask>;
  private redZoneAlerts: Map<number, RedZoneAlert>;
  private redZoneRules: Map<number, RedZoneRule>;
  private redZoneResolutionCriteria: Map<number, RedZoneResolutionCriteria>;
  private redZoneActivityLogs: Map<number, RedZoneActivityLog>;
  private customerMetrics: Map<number, CustomerMetric>;
  private mysqlConfigs: Map<number, MySQLConfig>;
  private mysqlFieldMappings: Map<number, MySQLFieldMapping>;
  private mysqlSavedQueries: Map<number, MySQLSavedQuery>;
  private notifications: Map<number, Notification>;
  private userAchievements: Map<number, UserAchievement>;
  
  private userId: number = 1;
  private customerId: number = 1;
  private taskId: number = 1;
  private commentId: number = 1;
  private playbookId: number = 1;
  private playbookTaskId: number = 1;
  private alertId: number = 1;
  private ruleId: number = 1;
  private resolutionCriteriaId: number = 1;
  private activityLogId: number = 1;
  private metricId: number = 1;
  private configId: number = 1;
  private mappingId: number = 1;
  private savedQueryId: number = 1;
  private notificationId: number = 1;
  private achievementId: number = 1;

  constructor() {
    this.users = new Map();
    this.customers = new Map();
    this.tasks = new Map();
    this.taskComments = new Map();
    this.playbooks = new Map();
    this.playbookTasks = new Map();
    this.redZoneAlerts = new Map();
    this.redZoneRules = new Map();
    this.redZoneResolutionCriteria = new Map();
    this.redZoneActivityLogs = new Map();
    this.customerMetrics = new Map();
    this.mysqlConfigs = new Map();
    this.mysqlFieldMappings = new Map();
    this.mysqlSavedQueries = new Map();
    this.notifications = new Map();
    this.userAchievements = new Map();
    
    // Initialize with mock data
    this.initMockData();
  }

  private initMockData() {
    // Mock Users
    const user1 = this.createUser({
      email: 'sarah.johnson@recurrer.io',
      name: 'Sarah Johnson',
      role: 'team_lead',
      avatar_url: ''
    });
    
    const user2 = this.createUser({
      email: 'alex.wong@recurrer.io',
      name: 'Alex Wong',
      role: 'csm',
      avatar_url: ''
    });
    
    this.createUser({
      email: 'morgan.stanley@recurrer.io',
      name: 'Morgan Stanley',
      role: 'csm',
      avatar_url: ''
    });
    
    // Mock Customers
    const customer1 = this.createCustomer({
      name: 'Acme Technologies',
      industry: 'Technology',
      contact_name: 'John Doe',
      contact_email: 'john@acmetech.com',
      contact_phone: '(555) 123-4567',
      onboarded_at: new Date('2023-01-15'),
      renewal_date: new Date('2024-01-15'),
      mrr: 5000,
      arr: 60000,
      health_status: 'red_zone'
    });
    
    const customer2 = this.createCustomer({
      name: 'Global Foods Chain',
      industry: 'Retail',
      contact_name: 'Jane Smith',
      contact_email: 'jane@globalfoods.com',
      contact_phone: '(555) 987-6543',
      onboarded_at: new Date('2022-11-10'),
      renewal_date: new Date('2023-11-10'),
      mrr: 8000,
      arr: 96000,
      health_status: 'red_zone'
    });
    
    this.createCustomer({
      name: 'Tech Solutions Inc',
      industry: 'Software',
      contact_name: 'Mike Johnson',
      contact_email: 'mike@techsolutions.com',
      contact_phone: '(555) 456-7890',
      onboarded_at: new Date('2023-01-03'),
      renewal_date: new Date('2024-01-03'),
      mrr: 3500,
      arr: 42000,
      health_status: 'at_risk'
    });
    
    // Tasks
    this.createTask({
      title: 'Review onboarding progress for Acme Corp',
      description: 'Check if all onboarding steps have been completed',
      status: 'in_progress',
      due_date: new Date('2023-01-23'),
      customer_id: customer1.id,
      assigned_to: user1.id,
      created_by: user1.id
    });
    
    this.createTask({
      title: 'Schedule quarterly review with XYZ Tech',
      description: 'Set up a meeting to review Q1 performance',
      status: 'pending',
      due_date: new Date('2023-01-30'),
      customer_id: 3,
      assigned_to: user2.id,
      created_by: user1.id
    });
    
    this.createTask({
      title: 'Setup loyalty campaign for Global Foods',
      description: 'Configure and launch the new loyalty program',
      status: 'overdue',
      due_date: new Date('2023-01-15'),
      customer_id: customer2.id,
      assigned_to: 3,
      created_by: user1.id
    });
    
    // Red Zone Alerts
    this.createRedZoneAlert({
      customer_id: customer1.id,
      reason: 'No campaigns sent in 90+ days',
      severity: 'critical'
    });
    
    this.createRedZoneAlert({
      customer_id: customer2.id,
      reason: 'No QR/loyalty setup completed',
      severity: 'high_risk'
    });
    
    this.createRedZoneAlert({
      customer_id: 3,
      reason: 'Delayed onboarding (27 days)',
      severity: 'attention_needed'
    });
    
    // Customer Metrics
    for (let i = 1; i <= 3; i++) {
      this.createCustomerMetric(i, 'onboarding_completion', Math.floor(Math.random() * 100));
      this.createCustomerMetric(i, 'nps_score', Math.floor(Math.random() * 10));
      this.createCustomerMetric(i, 'data_tagging', Math.floor(Math.random() * 100));
    }
  }

  // User Methods
  async getUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }
  
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async createUser(user: InsertUser): Promise<User> {
    const id = this.userId++;
    const timestamp = new Date();
    const newUser = { ...user, id, created_at: timestamp };
    this.users.set(id, newUser);
    return newUser;
  }

  async updateUser(id: number, user: Partial<User>): Promise<User | undefined> {
    const existingUser = this.users.get(id);
    if (!existingUser) return undefined;
    
    const updatedUser = { ...existingUser, ...user };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Customer Methods
  async getCustomers(): Promise<Customer[]> {
    return Array.from(this.customers.values());
  }

  async getCustomer(id: number): Promise<Customer | undefined> {
    return this.customers.get(id);
  }
  
  async getCustomerByRecurrerId(recurrerId: string): Promise<Customer | undefined> {
    return Array.from(this.customers.values()).find(customer => customer.recurrer_id === recurrerId);
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const id = this.customerId++;
    const timestamp = new Date();
    const newCustomer = { ...customer, id, created_at: timestamp };
    this.customers.set(id, newCustomer);
    return newCustomer;
  }

  async updateCustomer(id: number, customer: Partial<Customer>): Promise<Customer | undefined> {
    const existingCustomer = this.customers.get(id);
    if (!existingCustomer) return undefined;
    
    const updatedCustomer = { ...existingCustomer, ...customer };
    this.customers.set(id, updatedCustomer);
    return updatedCustomer;
  }
  
  async deleteCustomer(id: number): Promise<boolean> {
    if (!this.customers.has(id)) return false;
    return this.customers.delete(id);
  }
  
  async getCustomerTableFields(): Promise<string[]> {
    // Return field names from the customers schema
    // This implementation is just for memory storage
    return [
      'id', 'name', 'recurrer_id', 'industry', 'logo_url', 'contact_name', 
      'contact_email', 'contact_phone', 'onboarded_at', 'renewal_date', 
      'mrr', 'arr', 'currency_code', 'health_status', 'created_at', 'assigned_csm',
      'chargebee_customer_id', 'chargebee_subscription_id', 'mysql_company_id',
      'active_stores', 'growth_subscription_count', 'loyalty_active_store_count', 
      'loyalty_inactive_store_count', 'loyalty_active_channels', 'loyalty_channel_credits',
      'negative_feedback_alert_inactive', 'less_than_300_bills', 'active_auto_campaigns_count',
      'unique_customers_captured', 'revenue_1_year', 'customers_with_min_one_visit',
      'customers_with_min_two_visit', 'customers_without_min_visits',
      'percentage_of_inactive_customers', 'negative_feedbacks_count',
      'campaigns_sent_last_90_days', 'bills_received_last_30_days',
      'customers_acquired_last_30_days', 'loyalty_type', 'loyalty_reward',
      'updated_from_mysql_at'
    ];
  }
  
  async getTableFields(tableName: string): Promise<string[]> {
    // Return field names based on the table name
    switch (tableName) {
      case 'customers':
        return this.getCustomerTableFields();
      case 'customer_metrics':
        return [
          'id', 'customer_id', 'metric_type', 'value', 'percent', 'date', 'created_at'
        ];
      case 'tasks':
        return [
          'id', 'title', 'description', 'status', 'customer_id', 'due_date',
          'assigned_to', 'priority', 'created_at', 'created_by'
        ];
      default:
        return [];
    }
  }

  // Task Methods
  async getTasks(): Promise<Task[]> {
    return Array.from(this.tasks.values());
  }

  async getTasksByCustomer(customerId: number): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter(task => task.customer_id === customerId);
  }

  async getTasksByAssignee(userId: number): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter(task => task.assigned_to === userId);
  }

  async getTask(id: number): Promise<Task | undefined> {
    return this.tasks.get(id);
  }

  async createTask(task: InsertTask): Promise<Task> {
    const id = this.taskId++;
    const timestamp = new Date();
    const newTask = { ...task, id, created_at: timestamp };
    this.tasks.set(id, newTask);
    return newTask;
  }

  async updateTask(id: number, task: Partial<Task>): Promise<Task | undefined> {
    const existingTask = this.tasks.get(id);
    if (!existingTask) return undefined;
    
    const updatedTask = { ...existingTask, ...task };
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }

  // Task Comment Methods
  async getTaskComments(taskId: number): Promise<TaskComment[]> {
    return Array.from(this.taskComments.values()).filter(comment => comment.task_id === taskId);
  }

  async createTaskComment(taskId: number, userId: number, comment: string): Promise<TaskComment> {
    const id = this.commentId++;
    const timestamp = new Date();
    const newComment = { id, task_id: taskId, user_id: userId, comment, created_at: timestamp };
    this.taskComments.set(id, newComment);
    return newComment;
  }

  // Playbook Methods
  async getPlaybooks(): Promise<Playbook[]> {
    return Array.from(this.playbooks.values());
  }

  async getPlaybook(id: number): Promise<Playbook | undefined> {
    return this.playbooks.get(id);
  }

  async createPlaybook(playbook: InsertPlaybook): Promise<Playbook> {
    const id = this.playbookId++;
    const timestamp = new Date();
    const newPlaybook = { ...playbook, id, created_at: timestamp };
    this.playbooks.set(id, newPlaybook);
    return newPlaybook;
  }

  async updatePlaybook(id: number, playbook: Partial<Playbook>): Promise<Playbook | undefined> {
    const existingPlaybook = this.playbooks.get(id);
    if (!existingPlaybook) return undefined;
    
    const updatedPlaybook = { ...existingPlaybook, ...playbook };
    this.playbooks.set(id, updatedPlaybook);
    return updatedPlaybook;
  }

  // Playbook Task Methods
  async getPlaybookTasks(playbookId: number): Promise<PlaybookTask[]> {
    return Array.from(this.playbookTasks.values()).filter(task => task.playbook_id === playbookId);
  }

  async createPlaybookTask(playbookId: number, task: Omit<PlaybookTask, 'id' | 'playbook_id'>): Promise<PlaybookTask> {
    const id = this.playbookTaskId++;
    const newTask = { ...task, id, playbook_id: playbookId };
    this.playbookTasks.set(id, newTask);
    return newTask;
  }

  async updatePlaybookTask(id: number, task: Partial<PlaybookTask>): Promise<PlaybookTask | undefined> {
    const existingTask = this.playbookTasks.get(id);
    if (!existingTask) return undefined;
    
    const updatedTask = { ...existingTask, ...task };
    this.playbookTasks.set(id, updatedTask);
    return updatedTask;
  }

  // Red Zone Alert Methods
  async getRedZoneAlerts(): Promise<RedZoneAlert[]> {
    return Array.from(this.redZoneAlerts.values()).filter(alert => !alert.resolved_at);
  }

  async getRedZoneAlertsByCustomer(customerId: number): Promise<RedZoneAlert[]> {
    return Array.from(this.redZoneAlerts.values()).filter(alert => alert.customer_id === customerId && !alert.resolved_at);
  }
  
  async getRedZoneAlert(id: number): Promise<RedZoneAlert | undefined> {
    return this.redZoneAlerts.get(id);
  }

  async createRedZoneAlert(alert: InsertRedZoneAlert): Promise<RedZoneAlert> {
    const id = this.alertId++;
    const timestamp = new Date();
    const newAlert = { 
      ...alert, 
      id, 
      created_at: timestamp, 
      resolved_at: null,
      escalated_at: null,
      escalated_to: null,
      status: alert.status || 'open',
      resolved_by: null
    };
    this.redZoneAlerts.set(id, newAlert);
    return newAlert;
  }
  
  async updateRedZoneAlert(id: number, alert: Partial<RedZoneAlert>): Promise<RedZoneAlert | undefined> {
    const existingAlert = this.redZoneAlerts.get(id);
    if (!existingAlert) return undefined;
    
    const updatedAlert = { ...existingAlert, ...alert };
    this.redZoneAlerts.set(id, updatedAlert);
    return updatedAlert;
  }

  async resolveRedZoneAlert(id: number): Promise<RedZoneAlert | undefined> {
    const existingAlert = this.redZoneAlerts.get(id);
    if (!existingAlert) return undefined;
    
    const resolvedAlert = { ...existingAlert, resolved_at: new Date(), status: 'resolved' };
    this.redZoneAlerts.set(id, resolvedAlert);
    return resolvedAlert;
  }
  
  async escalateRedZoneAlert(id: number, escalatedTo: number): Promise<RedZoneAlert | undefined> {
    const existingAlert = this.redZoneAlerts.get(id);
    if (!existingAlert) return undefined;
    
    const escalatedAlert = { 
      ...existingAlert, 
      escalated_at: new Date(), 
      escalated_to: escalatedTo,
      status: 'escalated'
    };
    this.redZoneAlerts.set(id, escalatedAlert);
    return escalatedAlert;
  }
  
  // Red Zone Rule Methods
  async getRedZoneRules(): Promise<RedZoneRule[]> {
    return Array.from(this.redZoneRules.values());
  }
  
  async getRedZoneRule(id: number): Promise<RedZoneRule | undefined> {
    return this.redZoneRules.get(id);
  }
  
  async createRedZoneRule(rule: InsertRedZoneRule): Promise<RedZoneRule> {
    const id = this.ruleId++;
    const timestamp = new Date();
    const newRule = { 
      ...rule, 
      id, 
      created_at: timestamp, 
      updated_at: timestamp
    };
    this.redZoneRules.set(id, newRule);
    return newRule;
  }
  
  async updateRedZoneRule(id: number, rule: Partial<RedZoneRule>): Promise<RedZoneRule | undefined> {
    const existingRule = this.redZoneRules.get(id);
    if (!existingRule) return undefined;
    
    const updatedRule = { 
      ...existingRule, 
      ...rule, 
      updated_at: new Date() 
    };
    this.redZoneRules.set(id, updatedRule);
    return updatedRule;
  }
  
  async deleteRedZoneRule(id: number): Promise<boolean> {
    const exists = this.redZoneRules.has(id);
    if (exists) {
      this.redZoneRules.delete(id);
    }
    return exists;
  }
  
  // Red Zone Resolution Criteria Methods
  async getRedZoneResolutionCriteria(ruleId: number): Promise<RedZoneResolutionCriteria[]> {
    return Array.from(this.redZoneResolutionCriteria.values())
      .filter(criteria => criteria.rule_id === ruleId);
  }
  
  async createRedZoneResolutionCriteria(criteria: InsertRedZoneResolutionCriteria): Promise<RedZoneResolutionCriteria> {
    const id = this.resolutionCriteriaId++;
    const timestamp = new Date();
    const newCriteria = { 
      ...criteria, 
      id, 
      created_at: timestamp 
    };
    this.redZoneResolutionCriteria.set(id, newCriteria);
    return newCriteria;
  }
  
  async deleteRedZoneResolutionCriteria(id: number): Promise<boolean> {
    const exists = this.redZoneResolutionCriteria.has(id);
    if (exists) {
      this.redZoneResolutionCriteria.delete(id);
    }
    return exists;
  }
  
  // Red Zone Activity Log Methods
  async getRedZoneActivityLogs(alertId: number): Promise<RedZoneActivityLog[]> {
    return Array.from(this.redZoneActivityLogs.values())
      .filter(log => log.alert_id === alertId)
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
  }
  
  async createRedZoneActivityLog(log: InsertRedZoneActivityLog): Promise<RedZoneActivityLog> {
    const id = this.activityLogId++;
    const timestamp = new Date();
    const newLog = { 
      ...log, 
      id, 
      created_at: timestamp 
    };
    this.redZoneActivityLogs.set(id, newLog);
    return newLog;
  }

  // Customer Metric Methods
  async getCustomerMetrics(customerId: number): Promise<CustomerMetric[]> {
    return Array.from(this.customerMetrics.values()).filter(metric => metric.customer_id === customerId);
  }

  async createCustomerMetric(customerId: number, metricType: string, value: number, percent?: number): Promise<CustomerMetric> {
    const id = this.metricId++;
    const timestamp = new Date();
    const newMetric = { 
      id, 
      customer_id: customerId, 
      metric_type: metricType, 
      metric_value: value, 
      metric_percent: percent || null, 
      recorded_at: timestamp 
    };
    this.customerMetrics.set(id, newMetric);
    return newMetric;
  }

  // MySQL Config Methods
  async getMySQLConfig(): Promise<MySQLConfig | undefined> {
    const configs = Array.from(this.mysqlConfigs.values());
    return configs.length > 0 ? configs[0] : undefined;
  }

  async createMySQLConfig(config: Omit<MySQLConfig, 'id' | 'created_at'>): Promise<MySQLConfig> {
    const id = this.configId++;
    const timestamp = new Date();
    const newConfig = { ...config, id, created_at: timestamp };
    this.mysqlConfigs.set(id, newConfig);
    return newConfig;
  }

  // MySQL Field Mapping Methods
  async getMySQLFieldMappings(): Promise<MySQLFieldMapping[]> {
    return Array.from(this.mysqlFieldMappings.values());
  }

  async createMySQLFieldMapping(mapping: Omit<MySQLFieldMapping, 'id' | 'created_at'>): Promise<MySQLFieldMapping> {
    const id = this.mappingId++;
    const timestamp = new Date();
    const newMapping = { ...mapping, id, created_at: timestamp };
    this.mysqlFieldMappings.set(id, newMapping);
    return newMapping;
  }
  
  async updateMySQLFieldMapping(id: number, mapping: Partial<Omit<MySQLFieldMapping, 'id' | 'created_at'>>): Promise<MySQLFieldMapping | undefined> {
    const existingMapping = this.mysqlFieldMappings.get(id);
    if (!existingMapping) return undefined;
    
    const updatedMapping = { ...existingMapping, ...mapping };
    this.mysqlFieldMappings.set(id, updatedMapping);
    return updatedMapping;
  }
  
  async deleteMySQLFieldMapping(id: number): Promise<boolean> {
    const exists = this.mysqlFieldMappings.has(id);
    if (exists) {
      this.mysqlFieldMappings.delete(id);
    }
    return exists;
  }
  
  // Chargebee Config Methods
  private chargebeeConfigs: Map<number, ChargebeeConfig> = new Map();
  private chargebeeConfigId: number = 1;
  
  async getChargebeeConfig(): Promise<ChargebeeConfig | undefined> {
    const configs = Array.from(this.chargebeeConfigs.values());
    return configs.length > 0 ? configs[0] : undefined;
  }

  async createChargebeeConfig(config: Omit<ChargebeeConfig, 'id' | 'created_at' | 'last_synced_at' | 'last_sync_stats'>): Promise<ChargebeeConfig> {
    const id = this.chargebeeConfigId++;
    const timestamp = new Date();
    const newConfig = { 
      ...config, 
      id, 
      created_at: timestamp, 
      last_synced_at: null, 
      last_sync_stats: null,
      status: 'active' 
    };
    this.chargebeeConfigs.set(id, newConfig);
    return newConfig;
  }
  
  // Chargebee Field Mappings Methods
  private chargebeeFieldMappings: Map<number, ChargebeeFieldMapping> = new Map();
  private chargebeeFieldMappingId: number = 1;
  
  async getChargebeeFieldMappings(): Promise<ChargebeeFieldMapping[]> {
    return Array.from(this.chargebeeFieldMappings.values());
  }
  
  async getChargebeeFieldMappingsByEntity(entity: string): Promise<ChargebeeFieldMapping[]> {
    return Array.from(this.chargebeeFieldMappings.values())
      .filter(mapping => mapping.chargebee_entity === entity);
  }
  
  async getChargebeeFieldMapping(id: number): Promise<ChargebeeFieldMapping | undefined> {
    return this.chargebeeFieldMappings.get(id);
  }
  
  async createChargebeeFieldMapping(mapping: Omit<ChargebeeFieldMapping, 'id' | 'created_at'>): Promise<ChargebeeFieldMapping> {
    const id = this.chargebeeFieldMappingId++;
    const timestamp = new Date();
    const newMapping = { ...mapping, id, created_at: timestamp };
    this.chargebeeFieldMappings.set(id, newMapping);
    return newMapping;
  }
  
  async updateChargebeeFieldMapping(id: number, mapping: Partial<Omit<ChargebeeFieldMapping, 'id' | 'created_at'>>): Promise<ChargebeeFieldMapping | undefined> {
    const existingMapping = this.chargebeeFieldMappings.get(id);
    
    if (!existingMapping) {
      return undefined;
    }
    
    const updatedMapping = { ...existingMapping, ...mapping };
    this.chargebeeFieldMappings.set(id, updatedMapping);
    return updatedMapping;
  }
  
  async deleteChargebeeFieldMapping(id: number): Promise<boolean> {
    return this.chargebeeFieldMappings.delete(id);
  }

  // MySQL Saved Queries Methods
  async getMySQLSavedQueries(): Promise<MySQLSavedQuery[]> {
    return Array.from(this.mysqlSavedQueries.values());
  }

  async getMySQLSavedQuery(id: number): Promise<MySQLSavedQuery | undefined> {
    return this.mysqlSavedQueries.get(id);
  }

  async createMySQLSavedQuery(query: InsertMySQLSavedQuery): Promise<MySQLSavedQuery> {
    const id = this.savedQueryId++;
    const timestamp = new Date();
    const newQuery = { ...query, id, created_at: timestamp, last_run_at: null };
    this.mysqlSavedQueries.set(id, newQuery);
    return newQuery;
  }

  async updateMySQLSavedQuery(id: number, query: Partial<Omit<MySQLSavedQuery, 'id' | 'created_at'>>): Promise<MySQLSavedQuery | undefined> {
    const existingQuery = this.mysqlSavedQueries.get(id);
    if (!existingQuery) return undefined;
    
    const updatedQuery = { ...existingQuery, ...query };
    this.mysqlSavedQueries.set(id, updatedQuery);
    return updatedQuery;
  }

  async deleteMySQLSavedQuery(id: number): Promise<boolean> {
    const exists = this.mysqlSavedQueries.has(id);
    if (exists) {
      this.mysqlSavedQueries.delete(id);
    }
    return exists;
  }

  async updateMySQLSavedQueryLastRun(id: number): Promise<MySQLSavedQuery | undefined> {
    const existingQuery = this.mysqlSavedQueries.get(id);
    if (!existingQuery) return undefined;
    
    const updatedQuery = { ...existingQuery, last_run_at: new Date() };
    this.mysqlSavedQueries.set(id, updatedQuery);
    return updatedQuery;
  }

  // Dashboard Stats
  async getDashboardStats(timeframe: MetricTimeframe): Promise<any> {
    // Import chart data utility function
    const { generateTimeseriesData } = require('./utils/chart-data');
    
    // Mock dashboard stats
    return {
      openTasks: 36,
      openTasksChange: 12,
      campaignGaps: 14,
      campaignGapsChange: -5,
      renewalAlerts: 8,
      renewalAlertsChange: 4,
      redZoneCount: 12,
      redZoneCountChange: -8,
      healthDistribution: {
        healthy: 65,
        atRisk: 23,
        redZone: 12
      },
      monthlyMetrics: generateTimeseriesData(timeframe)
    };
  }
  
  // Notifications Methods
  async getNotifications(userId: number): Promise<Notification[]> {
    return Array.from(this.notifications.values())
      .filter(notification => notification.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }
  
  async getUnreadNotificationsCount(userId: number): Promise<number> {
    return Array.from(this.notifications.values())
      .filter(notification => notification.user_id === userId && !notification.is_read)
      .length;
  }
  
  async getNotification(id: number): Promise<Notification | undefined> {
    return this.notifications.get(id);
  }
  
  async createNotification(notification: InsertNotification): Promise<Notification> {
    const id = this.notificationId++;
    const timestamp = new Date();
    const newNotification = { ...notification, id, created_at: timestamp, is_read: false };
    this.notifications.set(id, newNotification);
    return newNotification;
  }
  
  async markNotificationAsRead(id: number): Promise<Notification | undefined> {
    const notification = this.notifications.get(id);
    if (!notification) return undefined;
    
    const updatedNotification = { ...notification, is_read: true };
    this.notifications.set(id, updatedNotification);
    return updatedNotification;
  }
  
  async markAllNotificationsAsRead(userId: number): Promise<void> {
    const userNotifications = Array.from(this.notifications.values())
      .filter(notification => notification.user_id === userId && !notification.is_read);
    
    for (const notification of userNotifications) {
      this.notifications.set(notification.id, { ...notification, is_read: true });
    }
  }
  
  // User Achievements Methods
  async getUserAchievements(userId: number): Promise<UserAchievement[]> {
    return Array.from(this.userAchievements.values())
      .filter(achievement => achievement.user_id === userId)
      .sort((a, b) => new Date(b.earned_at).getTime() - new Date(a.earned_at).getTime());
  }
  
  async getUnviewedAchievementsCount(userId: number): Promise<number> {
    return Array.from(this.userAchievements.values())
      .filter(achievement => achievement.user_id === userId && !achievement.is_viewed)
      .length;
  }
  
  async getUserAchievement(id: number): Promise<UserAchievement | undefined> {
    return this.userAchievements.get(id);
  }
  
  async createUserAchievement(achievement: InsertUserAchievement): Promise<UserAchievement> {
    const id = this.achievementId++;
    const timestamp = new Date();
    const newAchievement = { ...achievement, id, earned_at: timestamp, is_viewed: false };
    this.userAchievements.set(id, newAchievement);
    return newAchievement;
  }
  
  async markAchievementAsViewed(id: number): Promise<UserAchievement | undefined> {
    const achievement = this.userAchievements.get(id);
    if (!achievement) return undefined;
    
    const updatedAchievement = { ...achievement, is_viewed: true };
    this.userAchievements.set(id, updatedAchievement);
    return updatedAchievement;
  }
  
  // Achievement System Configuration Methods
  
  // Default achievement thresholds
  private achievementThresholds: AchievementThresholds = {
    tasks_completed: 10,
    customer_health_improved: 5,
    feedback_collected: 15,
    playbooks_executed: 3,
    red_zone_resolved: 8,
    login_streak: 7
  };
  
  // Default badge configuration
  private badgeConfig: BadgeConfiguration = {
    tasks_completed: { icon: 'check-circle', color: '#4CAF50' },
    customer_health_improved: { icon: 'trending-up', color: '#2196F3' },
    feedback_collected: { icon: 'message-circle', color: '#9C27B0' },
    playbooks_executed: { icon: 'book-open', color: '#FF9800' },
    red_zone_resolved: { icon: 'shield', color: '#F44336' },
    login_streak: { icon: 'zap', color: '#FFC107' }
  };
  
  // Default notification settings
  private notificationSettings: NotificationSettings = {
    enableAchievementNotifications: true,
    notifyOnLevelUp: true,
    showBadgesInProfile: true,
    showAchievementsInDashboard: true,
  };
  
  // Default XP configuration - XP points earned for each achievement type
  private xpConfig: XpConfiguration = {
    tasks_completed: 100,
    customer_health_improved: 200,
    feedback_collected: 150,
    playbooks_executed: 250,
    red_zone_resolved: 300,
    login_streak: 50
  };
  
  async getAchievementThresholds(): Promise<AchievementThresholds> {
    return this.achievementThresholds;
  }
  
  async saveAchievementThresholds(thresholds: AchievementThresholds): Promise<AchievementThresholds> {
    this.achievementThresholds = { ...thresholds };
    return this.achievementThresholds;
  }
  
  async getBadgeConfiguration(): Promise<BadgeConfiguration> {
    return this.badgeConfig;
  }
  
  async saveBadgeConfiguration(config: BadgeConfiguration): Promise<BadgeConfiguration> {
    this.badgeConfig = { ...config };
    return this.badgeConfig;
  }
  
  async getNotificationSettings(): Promise<NotificationSettings> {
    return this.notificationSettings;
  }
  
  async saveNotificationSettings(settings: NotificationSettings): Promise<NotificationSettings> {
    this.notificationSettings = { ...settings };
    return this.notificationSettings;
  }
  
  async getXpConfiguration(): Promise<XpConfiguration> {
    return this.xpConfig;
  }
  
  async saveXpConfiguration(config: XpConfiguration): Promise<XpConfiguration> {
    this.xpConfig = { ...config };
    return this.xpConfig;
  }
}

export class DatabaseStorage implements IStorage {
  // User Methods
  async getUsers(): Promise<User[]> {
    return await db.select().from(users);
  }
  
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async updateUser(id: number, user: Partial<User>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set(user)
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  // Customer Methods
  async getCustomers(): Promise<Customer[]> {
    return await db.select().from(customers);
  }

  async getCustomer(id: number): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    return customer;
  }
  
  async getCustomerByRecurrerId(recurrerId: string): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.recurrer_id, recurrerId));
    return customer;
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const [newCustomer] = await db.insert(customers).values(customer).returning();
    return newCustomer;
  }

  async updateCustomer(id: number, customer: Partial<Customer>): Promise<Customer | undefined> {
    const [updatedCustomer] = await db
      .update(customers)
      .set(customer)
      .where(eq(customers.id, id))
      .returning();
    return updatedCustomer;
  }
  
  async deleteCustomer(id: number): Promise<boolean> {
    const result = await db
      .delete(customers)
      .where(eq(customers.id, id))
      .returning({ id: customers.id });
    return result.length > 0;
  }
  
  async getCustomerTableFields(): Promise<string[]> {
    // Use Drizzle's introspection capabilities to get column names from the customers table
    // This returns all fields from the customers schema
    const columns = Object.keys(customers);
    
    // Filter out any non-string properties (like methods)
    return columns.filter(key => typeof key === 'string' && key !== 'name');
  }
  
  async getTableFields(tableName: string): Promise<string[]> {
    // Return field names based on the table name using Drizzle's schema information
    switch (tableName) {
      case 'customers':
        return this.getCustomerTableFields();
      case 'customer_metrics':
        const metricColumns = Object.keys(customerMetrics);
        return metricColumns.filter(key => typeof key === 'string' && key !== 'name');
      case 'tasks':
        const taskColumns = Object.keys(tasks);
        return taskColumns.filter(key => typeof key === 'string' && key !== 'name');
      default:
        return [];
    }
  }

  // Task Methods
  async getTasks(): Promise<Task[]> {
    return await db.select().from(tasks);
  }

  async getTasksByCustomer(customerId: number): Promise<Task[]> {
    return await db.select().from(tasks).where(eq(tasks.customer_id, customerId));
  }

  async getTasksByAssignee(userId: number): Promise<Task[]> {
    return await db.select().from(tasks).where(eq(tasks.assigned_to, userId));
  }

  async getTask(id: number): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task;
  }

  async createTask(task: InsertTask): Promise<Task> {
    const [newTask] = await db.insert(tasks).values(task).returning();
    return newTask;
  }

  async updateTask(id: number, task: Partial<Task>): Promise<Task | undefined> {
    const [updatedTask] = await db
      .update(tasks)
      .set(task)
      .where(eq(tasks.id, id))
      .returning();
    return updatedTask;
  }

  // Task Comment Methods
  async getTaskComments(taskId: number): Promise<TaskComment[]> {
    return await db
      .select()
      .from(taskComments)
      .where(eq(taskComments.task_id, taskId))
      .orderBy(taskComments.created_at);
  }

  async createTaskComment(taskId: number, userId: number, comment: string): Promise<TaskComment> {
    const [newComment] = await db
      .insert(taskComments)
      .values({
        task_id: taskId,
        user_id: userId,
        comment
      })
      .returning();
    return newComment;
  }

  // Playbook Methods
  async getPlaybooks(): Promise<Playbook[]> {
    // Explicitly select only essential columns to avoid errors with missing columns
    return await db.select({
      id: playbooks.id,
      name: playbooks.name,
      description: playbooks.description,
      trigger_type: playbooks.trigger_type,
      target_segments: playbooks.target_segments,
      filters: playbooks.filters,
      active: playbooks.active,
      created_by: playbooks.created_by,
      created_at: playbooks.created_at
    }).from(playbooks);
  }

  async getPlaybook(id: number): Promise<Playbook | undefined> {
    const [playbook] = await db.select({
      id: playbooks.id,
      name: playbooks.name,
      description: playbooks.description,
      trigger_type: playbooks.trigger_type,
      target_segments: playbooks.target_segments,
      filters: playbooks.filters,
      active: playbooks.active,
      created_by: playbooks.created_by,
      created_at: playbooks.created_at
    })
    .from(playbooks)
    .where(eq(playbooks.id, id));
    
    return playbook;
  }

  async createPlaybook(playbook: InsertPlaybook): Promise<Playbook> {
    const [newPlaybook] = await db.insert(playbooks).values(playbook).returning();
    return newPlaybook;
  }

  async updatePlaybook(id: number, playbook: Partial<Playbook>): Promise<Playbook | undefined> {
    const [updatedPlaybook] = await db
      .update(playbooks)
      .set(playbook)
      .where(eq(playbooks.id, id))
      .returning();
    return updatedPlaybook;
  }

  // Playbook Task Methods
  async getPlaybookTasks(playbookId: number): Promise<PlaybookTask[]> {
    return await db
      .select({
        id: playbookTasks.id,
        playbook_id: playbookTasks.playbook_id,
        title: playbookTasks.title,
        description: playbookTasks.description,
        due_type: playbookTasks.due_type,
        due_offset: playbookTasks.due_offset,
        fixed_date: playbookTasks.fixed_date,
        recurrence: playbookTasks.recurrence,
        assignment_role: playbookTasks.assignment_role,
        required_fields: playbookTasks.required_fields,
        template_message: playbookTasks.template_message,
        order: playbookTasks.order,
        created_at: playbookTasks.created_at
      })
      .from(playbookTasks)
      .where(eq(playbookTasks.playbook_id, playbookId))
      .orderBy(playbookTasks.order);
  }

  async createPlaybookTask(playbookId: number, task: Omit<PlaybookTask, 'id' | 'playbook_id'>): Promise<PlaybookTask> {
    const [newTask] = await db
      .insert(playbookTasks)
      .values({
        ...task,
        playbook_id: playbookId
      })
      .returning();
    return newTask;
  }

  async updatePlaybookTask(id: number, task: Partial<PlaybookTask>): Promise<PlaybookTask | undefined> {
    const [updatedTask] = await db
      .update(playbookTasks)
      .set(task)
      .where(eq(playbookTasks.id, id))
      .returning();
    return updatedTask;
  }

  // RedZone Rules Methods
  async getRedZoneRules(): Promise<RedZoneRule[]> {
    return await db
      .select()
      .from(redZoneRules)
      .orderBy(desc(redZoneRules.created_at));
  }

  async getRedZoneRule(id: number): Promise<RedZoneRule | undefined> {
    const [rule] = await db
      .select()
      .from(redZoneRules)
      .where(eq(redZoneRules.id, id))
      .limit(1);

    return rule;
  }

  async createRedZoneRule(rule: InsertRedZoneRule): Promise<RedZoneRule> {
    const [newRule] = await db
      .insert(redZoneRules)
      .values({
        ...rule,
        updated_at: new Date()
      })
      .returning();

    return newRule;
  }

  async updateRedZoneRule(id: number, data: Partial<InsertRedZoneRule>): Promise<RedZoneRule | undefined> {
    const [updatedRule] = await db
      .update(redZoneRules)
      .set({
        ...data,
        updated_at: new Date()
      })
      .where(eq(redZoneRules.id, id))
      .returning();

    return updatedRule;
  }

  async deleteRedZoneRule(id: number): Promise<boolean> {
    const result = await db
      .delete(redZoneRules)
      .where(eq(redZoneRules.id, id));

    return !!result;
  }

  // RedZone Resolution Criteria Methods
  async getRedZoneResolutionCriteria(ruleId: number): Promise<RedZoneResolutionCriteria[]> {
    return await db
      .select()
      .from(redZoneResolutionCriteria)
      .where(eq(redZoneResolutionCriteria.rule_id, ruleId))
      .orderBy(asc(redZoneResolutionCriteria.id));
  }

  async createRedZoneResolutionCriteria(criteria: InsertRedZoneResolutionCriteria): Promise<RedZoneResolutionCriteria> {
    const [newCriteria] = await db
      .insert(redZoneResolutionCriteria)
      .values(criteria)
      .returning();

    return newCriteria;
  }

  async deleteRedZoneResolutionCriteria(id: number): Promise<boolean> {
    const result = await db
      .delete(redZoneResolutionCriteria)
      .where(eq(redZoneResolutionCriteria.id, id));

    return !!result;
  }

  // Red Zone Alert Methods
  async getRedZoneAlerts(): Promise<RedZoneAlert[]> {
    return await db
      .select()
      .from(redZoneAlerts)
      .where(eq(redZoneAlerts.status, 'open'))
      .orderBy(desc(redZoneAlerts.created_at));
  }

  async getRedZoneAlertsByCustomer(customerId: number): Promise<RedZoneAlert[]> {
    return await db
      .select()
      .from(redZoneAlerts)
      .where(
        and(
          eq(redZoneAlerts.customer_id, customerId),
          eq(redZoneAlerts.status, 'open')
        )
      )
      .orderBy(desc(redZoneAlerts.created_at));
  }
  
  async getRedZoneAlert(id: number): Promise<RedZoneAlert | undefined> {
    const [alert] = await db
      .select()
      .from(redZoneAlerts)
      .where(eq(redZoneAlerts.id, id))
      .limit(1);

    return alert;
  }

  async createRedZoneAlert(alert: InsertRedZoneAlert): Promise<RedZoneAlert> {
    const [newAlert] = await db
      .insert(redZoneAlerts)
      .values({
        ...alert,
        status: alert.status || 'open',
      })
      .returning();

    return newAlert;
  }

  async updateRedZoneAlert(id: number, data: Partial<InsertRedZoneAlert>): Promise<RedZoneAlert | undefined> {
    const [updatedAlert] = await db
      .update(redZoneAlerts)
      .set(data)
      .where(eq(redZoneAlerts.id, id))
      .returning();

    return updatedAlert;
  }

  async resolveRedZoneAlert(id: number, userId?: number, resolutionSummary?: string): Promise<RedZoneAlert | undefined> {
    const now = new Date();
    const updateData: any = { 
      resolved_at: now, 
      status: 'resolved' 
    };
    
    if (userId) {
      updateData.resolved_by = userId;
    }
    
    if (resolutionSummary) {
      updateData.resolution_summary = resolutionSummary;
    }
    
    const [resolvedAlert] = await db
      .update(redZoneAlerts)
      .set(updateData)
      .where(eq(redZoneAlerts.id, id))
      .returning();

    return resolvedAlert;
  }
  
  async escalateRedZoneAlert(id: number, teamLeadId: number): Promise<RedZoneAlert | undefined> {
    const now = new Date();
    const [escalatedAlert] = await db
      .update(redZoneAlerts)
      .set({ 
        escalated_to: teamLeadId, 
        escalated_at: now,
        status: 'pending_approval'
      })
      .where(eq(redZoneAlerts.id, id))
      .returning();

    return escalatedAlert;
  }

  // RedZone Activity Log Methods
  async getRedZoneActivityLogs(alertId: number): Promise<RedZoneActivityLog[]> {
    return await db
      .select()
      .from(redZoneActivityLogs)
      .where(eq(redZoneActivityLogs.alert_id, alertId))
      .orderBy(desc(redZoneActivityLogs.created_at));
  }

  async createRedZoneActivityLog(log: InsertRedZoneActivityLog): Promise<RedZoneActivityLog> {
    const [newLog] = await db
      .insert(redZoneActivityLogs)
      .values(log)
      .returning();

    return newLog;
  }

  // Customer Metric Methods
  async getCustomerMetrics(customerId: number): Promise<CustomerMetric[]> {
    return await db
      .select()
      .from(customerMetrics)
      .where(eq(customerMetrics.customer_id, customerId))
      .orderBy(customerMetrics.recorded_at);
  }

  async createCustomerMetric(customerId: number, metricType: string, value: number, percent?: number): Promise<CustomerMetric> {
    const [newMetric] = await db
      .insert(customerMetrics)
      .values({
        customer_id: customerId,
        metric_type: metricType,
        metric_value: value,
        metric_percent: percent || null
      })
      .returning();
    return newMetric;
  }

  // MySQL Config Methods
  async getMySQLConfig(): Promise<MySQLConfig | undefined> {
    const [config] = await db.select().from(mysqlConfig);
    return config;
  }

  async createMySQLConfig(config: Omit<MySQLConfig, 'id' | 'created_at'>): Promise<MySQLConfig> {
    const [newConfig] = await db.insert(mysqlConfig).values(config).returning();
    return newConfig;
  }

  // MySQL Field Mapping Methods
  async getMySQLFieldMappings(): Promise<MySQLFieldMapping[]> {
    return await db.select().from(mysqlFieldMappings);
  }

  async createMySQLFieldMapping(mapping: Omit<MySQLFieldMapping, 'id' | 'created_at'>): Promise<MySQLFieldMapping> {
    const [newMapping] = await db.insert(mysqlFieldMappings).values(mapping).returning();
    return newMapping;
  }
  
  async updateMySQLFieldMapping(id: number, mapping: Partial<Omit<MySQLFieldMapping, 'id' | 'created_at'>>): Promise<MySQLFieldMapping | undefined> {
    const [updatedMapping] = await db
      .update(mysqlFieldMappings)
      .set(mapping)
      .where(eq(mysqlFieldMappings.id, id))
      .returning();
    return updatedMapping;
  }
  
  async deleteMySQLFieldMapping(id: number): Promise<boolean> {
    const result = await db
      .delete(mysqlFieldMappings)
      .where(eq(mysqlFieldMappings.id, id));
    return !!result;
  }
  
  // MySQL Saved Queries Methods
  async getMySQLSavedQueries(): Promise<MySQLSavedQuery[]> {
    return await db.select().from(mysqlSavedQueries);
  }

  async getMySQLSavedQuery(id: number): Promise<MySQLSavedQuery | undefined> {
    const [query] = await db
      .select()
      .from(mysqlSavedQueries)
      .where(eq(mysqlSavedQueries.id, id));
    return query;
  }

  async createMySQLSavedQuery(query: InsertMySQLSavedQuery): Promise<MySQLSavedQuery> {
    const [newQuery] = await db
      .insert(mysqlSavedQueries)
      .values(query)
      .returning();
    return newQuery;
  }

  async updateMySQLSavedQuery(id: number, query: Partial<Omit<MySQLSavedQuery, 'id' | 'created_at'>>): Promise<MySQLSavedQuery | undefined> {
    const [updatedQuery] = await db
      .update(mysqlSavedQueries)
      .set(query)
      .where(eq(mysqlSavedQueries.id, id))
      .returning();
    return updatedQuery;
  }

  async deleteMySQLSavedQuery(id: number): Promise<boolean> {
    const result = await db
      .delete(mysqlSavedQueries)
      .where(eq(mysqlSavedQueries.id, id));
    return !!result;
  }

  async updateMySQLSavedQueryLastRun(id: number): Promise<MySQLSavedQuery | undefined> {
    const now = new Date();
    const [updatedQuery] = await db
      .update(mysqlSavedQueries)
      .set({ last_run_at: now })
      .where(eq(mysqlSavedQueries.id, id))
      .returning();
    return updatedQuery;
  }
  
  // Chargebee Config Methods
  async getChargebeeConfig(): Promise<ChargebeeConfig | undefined> {
    const [config] = await db.select().from(chargebeeConfig);
    return config;
  }

  async createChargebeeConfig(config: Omit<ChargebeeConfig, 'id' | 'created_at' | 'last_synced_at' | 'last_sync_stats'>): Promise<ChargebeeConfig> {
    const [newConfig] = await db.insert(chargebeeConfig).values(config).returning();
    return newConfig;
  }
  
  // Chargebee Field Mappings
  async getChargebeeFieldMappings(): Promise<ChargebeeFieldMapping[]> {
    return await db.select().from(chargebeeFieldMappings);
  }
  
  async getChargebeeFieldMappingsByEntity(entity: string): Promise<ChargebeeFieldMapping[]> {
    return await db
      .select()
      .from(chargebeeFieldMappings)
      .where(eq(chargebeeFieldMappings.chargebee_entity, entity));
  }
  
  async getChargebeeFieldMapping(id: number): Promise<ChargebeeFieldMapping | undefined> {
    const [mapping] = await db
      .select()
      .from(chargebeeFieldMappings)
      .where(eq(chargebeeFieldMappings.id, id));
    return mapping;
  }
  
  async createChargebeeFieldMapping(mapping: Omit<ChargebeeFieldMapping, 'id' | 'created_at'>): Promise<ChargebeeFieldMapping> {
    const [newMapping] = await db
      .insert(chargebeeFieldMappings)
      .values(mapping)
      .returning();
    return newMapping;
  }
  
  async updateChargebeeFieldMapping(id: number, mapping: Partial<Omit<ChargebeeFieldMapping, 'id' | 'created_at'>>): Promise<ChargebeeFieldMapping | undefined> {
    const [updatedMapping] = await db
      .update(chargebeeFieldMappings)
      .set(mapping)
      .where(eq(chargebeeFieldMappings.id, id))
      .returning();
    return updatedMapping;
  }
  
  async deleteChargebeeFieldMapping(id: number): Promise<boolean> {
    // First check if the record exists
    const exists = await this.getChargebeeFieldMapping(id);
    if (!exists) {
      return false;
    }
    
    // Then delete it
    await db
      .delete(chargebeeFieldMappings)
      .where(eq(chargebeeFieldMappings.id, id));
      
    return true;
  }

  // Dashboard Stats
  async getDashboardStats(timeframe: MetricTimeframe): Promise<any> {
    const now = new Date();
    let startDate = new Date();
    
    switch (timeframe) {
      case 'weekly':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'monthly':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'quarterly':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case 'yearly':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
    }
    
    // Tasks stats
    const openTasks = await db
      .select()
      .from(tasks)
      .where(
        and(
          gte(tasks.due_date, startDate),
          lt(tasks.status, 'completed')
        )
      );
    
    // Red zone count
    const redZoneCount = await db
      .select()
      .from(redZoneAlerts)
      .where(
        and(
          gte(redZoneAlerts.created_at, startDate),
          isNull(redZoneAlerts.resolved_at)
        )
      );
    
    // Health distribution
    const healthyCounts = await db
      .select()
      .from(customers)
      .where(eq(customers.health_status, 'healthy'));
    
    const atRiskCounts = await db
      .select()
      .from(customers)
      .where(eq(customers.health_status, 'at_risk'));
    
    const redZoneCounts = await db
      .select()
      .from(customers)
      .where(eq(customers.health_status, 'red_zone'));
    
    const totalCustomers = healthyCounts.length + atRiskCounts.length + redZoneCounts.length;
    
    // generateTimeseriesData is already imported at the top of the file
    
    // For simplicity, we're mocking some of the data still
    return {
      openTasks: openTasks.length,
      openTasksChange: 12, // mocked
      campaignGaps: 14, // mocked
      campaignGapsChange: -5, // mocked
      renewalAlerts: 8, // mocked
      renewalAlertsChange: 4, // mocked
      redZoneCount: redZoneCount.length,
      redZoneCountChange: -8, // mocked
      healthDistribution: {
        healthy: Math.round((healthyCounts.length / totalCustomers) * 100),
        atRisk: Math.round((atRiskCounts.length / totalCustomers) * 100),
        redZone: Math.round((redZoneCounts.length / totalCustomers) * 100)
      },
      monthlyMetrics: generateTimeseriesData(timeframe)
    };
  }
  
  // Notifications Methods
  async getNotifications(userId: number): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.user_id, userId))
      .orderBy(desc(notifications.created_at));
  }
  
  async getUnreadNotificationsCount(userId: number): Promise<number> {
    const unreadNotifications = await db
      .select({ count: count() })
      .from(notifications)
      .where(
        and(
          eq(notifications.user_id, userId),
          eq(notifications.is_read, false)
        )
      );
    
    return unreadNotifications[0]?.count || 0;
  }
  
  async getNotification(id: number): Promise<Notification | undefined> {
    const [notification] = await db
      .select()
      .from(notifications)
      .where(eq(notifications.id, id));
    
    return notification;
  }
  
  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [newNotification] = await db
      .insert(notifications)
      .values(notification)
      .returning();
    
    return newNotification;
  }
  
  async markNotificationAsRead(id: number): Promise<Notification | undefined> {
    const [updatedNotification] = await db
      .update(notifications)
      .set({ is_read: true })
      .where(eq(notifications.id, id))
      .returning();
    
    return updatedNotification;
  }
  
  async markAllNotificationsAsRead(userId: number): Promise<void> {
    await db
      .update(notifications)
      .set({ is_read: true })
      .where(
        and(
          eq(notifications.user_id, userId),
          eq(notifications.is_read, false)
        )
      );
  }
  
  // User Achievements Methods
  async getUserAchievements(userId: number): Promise<UserAchievement[]> {
    return await db
      .select()
      .from(userAchievements)
      .where(eq(userAchievements.user_id, userId))
      .orderBy(desc(userAchievements.earned_at));
  }
  
  async getUnviewedAchievementsCount(userId: number): Promise<number> {
    const unviewedAchievements = await db
      .select({ count: count() })
      .from(userAchievements)
      .where(
        and(
          eq(userAchievements.user_id, userId),
          eq(userAchievements.is_viewed, false)
        )
      );
    
    return unviewedAchievements[0]?.count || 0;
  }
  
  async getUserAchievement(id: number): Promise<UserAchievement | undefined> {
    const [achievement] = await db
      .select()
      .from(userAchievements)
      .where(eq(userAchievements.id, id));
    
    return achievement;
  }
  
  async createUserAchievement(achievement: InsertUserAchievement): Promise<UserAchievement> {
    const [newAchievement] = await db
      .insert(userAchievements)
      .values(achievement)
      .returning();
    
    return newAchievement;
  }
  
  async markAchievementAsViewed(id: number): Promise<UserAchievement | undefined> {
    const [updatedAchievement] = await db
      .update(userAchievements)
      .set({ is_viewed: true })
      .where(eq(userAchievements.id, id))
      .returning();
    
    return updatedAchievement;
  }
  
  // Achievement System Configuration Methods
  // For the database implementation, we'll use a similar approach to the in-memory storage
  // but store the configurations in the database when a proper schema is created
  
  // Default configurations that will be returned until proper database tables are created
  private defaultThresholds: AchievementThresholds = {
    tasks_completed: 10,
    customer_health_improved: 5,
    feedback_collected: 15,
    playbooks_executed: 3,
    red_zone_resolved: 8,
    login_streak: 7
  };
  
  private defaultBadgeConfig: BadgeConfiguration = {
    tasks_completed: { icon: 'check-circle', color: '#4CAF50' },
    customer_health_improved: { icon: 'trending-up', color: '#2196F3' },
    feedback_collected: { icon: 'message-circle', color: '#9C27B0' },
    playbooks_executed: { icon: 'book-open', color: '#FF9800' },
    red_zone_resolved: { icon: 'shield', color: '#F44336' },
    login_streak: { icon: 'zap', color: '#FFC107' }
  };
  
  private defaultNotificationSettings: NotificationSettings = {
    enableAchievementNotifications: true,
    notifyOnLevelUp: true,
    showBadgesInProfile: true,
    showAchievementsInDashboard: true,
  };
  
  private defaultXpConfig: XpConfiguration = {
    tasks_completed: 100,
    customer_health_improved: 200,
    feedback_collected: 150,
    playbooks_executed: 250,
    red_zone_resolved: 300,
    login_streak: 50
  };
  
  async getAchievementThresholds(): Promise<AchievementThresholds> {
    // Placeholder for database implementation
    // Will be replaced with actual database queries when tables are created
    return this.defaultThresholds;
  }
  
  async saveAchievementThresholds(thresholds: AchievementThresholds): Promise<AchievementThresholds> {
    // Placeholder for database implementation
    // Will be replaced with actual database queries when tables are created
    this.defaultThresholds = { ...thresholds };
    return this.defaultThresholds;
  }
  
  async getBadgeConfiguration(): Promise<BadgeConfiguration> {
    // Placeholder for database implementation
    // Will be replaced with actual database queries when tables are created
    return this.defaultBadgeConfig;
  }
  
  async saveBadgeConfiguration(config: BadgeConfiguration): Promise<BadgeConfiguration> {
    // Placeholder for database implementation
    // Will be replaced with actual database queries when tables are created
    this.defaultBadgeConfig = { ...config };
    return this.defaultBadgeConfig;
  }
  
  async getNotificationSettings(): Promise<NotificationSettings> {
    // Placeholder for database implementation
    // Will be replaced with actual database queries when tables are created
    return this.defaultNotificationSettings;
  }
  
  async saveNotificationSettings(settings: NotificationSettings): Promise<NotificationSettings> {
    // Placeholder for database implementation
    // Will be replaced with actual database queries when tables are created
    this.defaultNotificationSettings = { ...settings };
    return this.defaultNotificationSettings;
  }
  
  async getXpConfiguration(): Promise<XpConfiguration> {
    // Placeholder for database implementation
    // Will be replaced with actual database queries when tables are created
    return this.defaultXpConfig;
  }
  
  async saveXpConfiguration(config: XpConfiguration): Promise<XpConfiguration> {
    // Placeholder for database implementation
    // Will be replaced with actual database queries when tables are created
    this.defaultXpConfig = { ...config };
    return this.defaultXpConfig;
  }
}

// Choose storage implementation based on whether we have a database connection
const useDatabase = process.env.DATABASE_URL !== undefined;
export const storage = useDatabase ? new DatabaseStorage() : new MemStorage();
