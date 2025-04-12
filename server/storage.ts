import { 
  users, customers, tasks, taskComments, playbooks, playbookTasks, 
  redZoneAlerts, customerMetrics, mysqlConfig, mysqlFieldMappings,
  type User, type Customer, type Task, type TaskComment, type Playbook, 
  type PlaybookTask, type RedZoneAlert, type CustomerMetric, 
  type MySQLConfig, type MySQLFieldMapping,
  type InsertUser, type InsertCustomer, type InsertTask, type InsertPlaybook,
  type InsertRedZoneAlert
} from "@shared/schema";
import { db } from "./db";
import { eq, and, isNull, desc, gte, lt } from "drizzle-orm";
import { AccountHealth, MetricTimeframe } from "@shared/types";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User | undefined>;
  
  // Customers
  getCustomers(): Promise<Customer[]>;
  getCustomer(id: number): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: number, customer: Partial<Customer>): Promise<Customer | undefined>;
  
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
  createRedZoneAlert(alert: InsertRedZoneAlert): Promise<RedZoneAlert>;
  resolveRedZoneAlert(id: number): Promise<RedZoneAlert | undefined>;
  
  // Customer Metrics
  getCustomerMetrics(customerId: number): Promise<CustomerMetric[]>;
  createCustomerMetric(customerId: number, metricType: string, value: number, percent?: number): Promise<CustomerMetric>;
  
  // MySQL Configuration
  getMySQLConfig(): Promise<MySQLConfig | undefined>;
  createMySQLConfig(config: Omit<MySQLConfig, 'id' | 'created_at'>): Promise<MySQLConfig>;
  
  // MySQL Field Mappings
  getMySQLFieldMappings(): Promise<MySQLFieldMapping[]>;
  createMySQLFieldMapping(mapping: Omit<MySQLFieldMapping, 'id' | 'created_at'>): Promise<MySQLFieldMapping>;
  
  // Dashboard
  getDashboardStats(timeframe: MetricTimeframe): Promise<any>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private customers: Map<number, Customer>;
  private tasks: Map<number, Task>;
  private taskComments: Map<number, TaskComment>;
  private playbooks: Map<number, Playbook>;
  private playbookTasks: Map<number, PlaybookTask>;
  private redZoneAlerts: Map<number, RedZoneAlert>;
  private customerMetrics: Map<number, CustomerMetric>;
  private mysqlConfigs: Map<number, MySQLConfig>;
  private mysqlFieldMappings: Map<number, MySQLFieldMapping>;
  
  private userId: number = 1;
  private customerId: number = 1;
  private taskId: number = 1;
  private commentId: number = 1;
  private playbookId: number = 1;
  private playbookTaskId: number = 1;
  private alertId: number = 1;
  private metricId: number = 1;
  private configId: number = 1;
  private mappingId: number = 1;

  constructor() {
    this.users = new Map();
    this.customers = new Map();
    this.tasks = new Map();
    this.taskComments = new Map();
    this.playbooks = new Map();
    this.playbookTasks = new Map();
    this.redZoneAlerts = new Map();
    this.customerMetrics = new Map();
    this.mysqlConfigs = new Map();
    this.mysqlFieldMappings = new Map();
    
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

  async createRedZoneAlert(alert: InsertRedZoneAlert): Promise<RedZoneAlert> {
    const id = this.alertId++;
    const timestamp = new Date();
    const newAlert = { ...alert, id, created_at: timestamp, resolved_at: null };
    this.redZoneAlerts.set(id, newAlert);
    return newAlert;
  }

  async resolveRedZoneAlert(id: number): Promise<RedZoneAlert | undefined> {
    const existingAlert = this.redZoneAlerts.get(id);
    if (!existingAlert) return undefined;
    
    const resolvedAlert = { ...existingAlert, resolved_at: new Date() };
    this.redZoneAlerts.set(id, resolvedAlert);
    return resolvedAlert;
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

  // Dashboard Stats
  async getDashboardStats(timeframe: MetricTimeframe): Promise<any> {
    // Function to generate appropriate time series data based on timeframe
    const generateTimeseriesData = (timeframe: MetricTimeframe) => {
      switch (timeframe) {
        case 'weekly':
          return {
            months: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            values: [35, 42, 38, 45, 40, 25, 30]
          };
        case 'monthly':
          return {
            months: ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'],
            values: [40, 28, 48, 56, 36, 52]
          };
        case 'quarterly':
          return {
            months: ['Q1', 'Q2', 'Q3', 'Q4'],
            values: [120, 145, 160, 175]
          };
        case 'yearly':
          return {
            months: ['2020', '2021', '2022', '2023', '2024'],
            values: [380, 420, 510, 580, 620]
          };
        default:
          return {
            months: ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'],
            values: [40, 28, 48, 56, 36, 52]
          };
      }
    };
    
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
}

export class DatabaseStorage implements IStorage {
  // User Methods
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
    return await db.select().from(playbooks);
  }

  async getPlaybook(id: number): Promise<Playbook | undefined> {
    const [playbook] = await db.select().from(playbooks).where(eq(playbooks.id, id));
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
      .select()
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

  // Red Zone Alert Methods
  async getRedZoneAlerts(): Promise<RedZoneAlert[]> {
    return await db
      .select()
      .from(redZoneAlerts)
      .where(isNull(redZoneAlerts.resolved_at))
      .orderBy(desc(redZoneAlerts.created_at));
  }

  async getRedZoneAlertsByCustomer(customerId: number): Promise<RedZoneAlert[]> {
    return await db
      .select()
      .from(redZoneAlerts)
      .where(
        and(
          eq(redZoneAlerts.customer_id, customerId),
          isNull(redZoneAlerts.resolved_at)
        )
      )
      .orderBy(desc(redZoneAlerts.created_at));
  }

  async createRedZoneAlert(alert: InsertRedZoneAlert): Promise<RedZoneAlert> {
    const [newAlert] = await db.insert(redZoneAlerts).values(alert).returning();
    return newAlert;
  }

  async resolveRedZoneAlert(id: number): Promise<RedZoneAlert | undefined> {
    const now = new Date();
    const [resolvedAlert] = await db
      .update(redZoneAlerts)
      .set({ resolved_at: now })
      .where(eq(redZoneAlerts.id, id))
      .returning();
    return resolvedAlert;
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
    
    // Function to generate appropriate time series data based on timeframe
    const generateTimeseriesData = (timeframe: MetricTimeframe) => {
      switch (timeframe) {
        case 'weekly':
          return {
            months: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            values: [35, 42, 38, 45, 40, 25, 30]
          };
        case 'monthly':
          return {
            months: ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'],
            values: [40, 28, 48, 56, 36, 52]
          };
        case 'quarterly':
          return {
            months: ['Q1', 'Q2', 'Q3', 'Q4'],
            values: [120, 145, 160, 175]
          };
        case 'yearly':
          return {
            months: ['2020', '2021', '2022', '2023', '2024'],
            values: [380, 420, 510, 580, 620]
          };
        default:
          return {
            months: ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'],
            values: [40, 28, 48, 56, 36, 52]
          };
      }
    };
    
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
}

// Choose storage implementation based on whether we have a database connection
const useDatabase = process.env.DATABASE_URL !== undefined;
export const storage = useDatabase ? new DatabaseStorage() : new MemStorage();
