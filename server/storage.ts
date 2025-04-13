import {
  users,
  customers,
  tasks,
  taskComments,
  playbooks,
  playbookTasks,
  redZoneAccounts,
  calendarEvents,
  emailThreads,
  integrationTokens,
  mysqlConfig,
  mysqlFieldMappings,
  reportMetrics,
  type User,
  type InsertUser,
  type Customer,
  type InsertCustomer,
  type Task,
  type InsertTask,
  type TaskComment,
  type InsertTaskComment,
  type Playbook,
  type InsertPlaybook,
  type PlaybookTask,
  type InsertPlaybookTask,
  type RedZoneAccount,
  type InsertRedZoneAccount,
  type CalendarEvent,
  type InsertCalendarEvent,
  type EmailThread,
  type InsertEmailThread,
  type IntegrationToken,
  type InsertIntegrationToken,
  type MysqlConfig,
  type InsertMysqlConfig,
  type MysqlFieldMapping,
  type InsertMysqlFieldMapping,
  type ReportMetric,
  type InsertReportMetric,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, desc, like, isNull } from "drizzle-orm";

// Storage interface for the application
export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<User>): Promise<User | undefined>;
  
  // Customer methods
  getCustomers(): Promise<Customer[]>;
  getCustomer(id: number): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: number, data: Partial<Customer>): Promise<Customer | undefined>;
  
  // Task methods
  getTasks(): Promise<Task[]>;
  getTask(id: number): Promise<Task | undefined>;
  getTasksByUser(userId: string): Promise<Task[]>;
  getTasksByCustomer(customerId: number): Promise<Task[]>;
  getUpcomingTasks(limit?: number): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, data: Partial<Task>): Promise<Task | undefined>;
  
  // Task Comments
  getTaskComments(taskId: number): Promise<TaskComment[]>;
  createTaskComment(comment: InsertTaskComment): Promise<TaskComment>;
  
  // Playbook methods
  getPlaybooks(): Promise<Playbook[]>;
  getPlaybook(id: number): Promise<Playbook | undefined>;
  createPlaybook(playbook: InsertPlaybook): Promise<Playbook>;
  updatePlaybook(id: number, data: Partial<Playbook>): Promise<Playbook | undefined>;
  
  // PlaybookTask methods
  getPlaybookTasks(playbookId: number): Promise<PlaybookTask[]>;
  createPlaybookTask(task: InsertPlaybookTask): Promise<PlaybookTask>;
  updatePlaybookTask(id: number, data: Partial<PlaybookTask>): Promise<PlaybookTask | undefined>;
  
  // Red Zone methods
  getRedZoneAccounts(): Promise<RedZoneAccount[]>;
  getRedZoneAccount(id: number): Promise<RedZoneAccount | undefined>;
  getRedZoneByCustomer(customerId: number): Promise<RedZoneAccount | undefined>;
  createRedZoneAccount(redZone: InsertRedZoneAccount): Promise<RedZoneAccount>;
  resolveRedZoneAccount(id: number): Promise<RedZoneAccount | undefined>;
  
  // Calendar Event methods
  getCalendarEvents(): Promise<CalendarEvent[]>;
  getCalendarEventsByCustomer(customerId: number): Promise<CalendarEvent[]>;
  createCalendarEvent(event: InsertCalendarEvent): Promise<CalendarEvent>;
  
  // Email Thread methods
  getEmailThreadsByCustomer(customerId: number): Promise<EmailThread[]>;
  createEmailThread(thread: InsertEmailThread): Promise<EmailThread>;
  
  // Integration Token methods
  getIntegrationToken(userId: string, provider: string): Promise<IntegrationToken | undefined>;
  createIntegrationToken(token: InsertIntegrationToken): Promise<IntegrationToken>;
  updateIntegrationToken(id: number, data: Partial<IntegrationToken>): Promise<IntegrationToken | undefined>;
  
  // MySQL Config methods
  getMysqlConfig(): Promise<MysqlConfig | undefined>;
  createMysqlConfig(config: InsertMysqlConfig): Promise<MysqlConfig>;
  updateMysqlConfig(id: number, data: Partial<MysqlConfig>): Promise<MysqlConfig | undefined>;
  
  // MySQL Field Mappings
  getMysqlFieldMappings(): Promise<MysqlFieldMapping[]>;
  createMysqlFieldMapping(mapping: InsertMysqlFieldMapping): Promise<MysqlFieldMapping>;
  updateMysqlFieldMapping(id: number, data: Partial<MysqlFieldMapping>): Promise<MysqlFieldMapping | undefined>;
  
  // Report Metrics
  getReportMetrics(metricName: string, startDate?: Date, endDate?: Date): Promise<ReportMetric[]>;
  createReportMetric(metric: InsertReportMetric): Promise<ReportMetric>;
  
  // Dashboard methods
  getDashboardStats(): Promise<{
    openTasks: number;
    campaignGaps: number;
    renewalAlerts: number;
    redZoneCount: number;
  }>;
  getRecentActivity(limit?: number): Promise<any[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private customers: Map<number, Customer>;
  private tasks: Map<number, Task>;
  private taskComments: Map<number, TaskComment>;
  private playbooks: Map<number, Playbook>;
  private playbookTasks: Map<number, PlaybookTask>;
  private redZoneAccounts: Map<number, RedZoneAccount>;
  private calendarEvents: Map<number, CalendarEvent>;
  private emailThreads: Map<number, EmailThread>;
  private integrationTokens: Map<number, IntegrationToken>;
  private mysqlConfigs: Map<number, MysqlConfig>;
  private mysqlFieldMappings: Map<number, MysqlFieldMapping>;
  private reportMetrics: Map<number, ReportMetric>;
  
  // Counters for generating IDs
  private customerIdCounter: number;
  private taskIdCounter: number;
  private taskCommentIdCounter: number;
  private playbookIdCounter: number;
  private playbookTaskIdCounter: number;
  private redZoneIdCounter: number;
  private calendarEventIdCounter: number;
  private emailThreadIdCounter: number;
  private integrationTokenIdCounter: number;
  private mysqlConfigIdCounter: number;
  private mysqlFieldMappingIdCounter: number;
  private reportMetricIdCounter: number;

  constructor() {
    this.users = new Map();
    this.customers = new Map();
    this.tasks = new Map();
    this.taskComments = new Map();
    this.playbooks = new Map();
    this.playbookTasks = new Map();
    this.redZoneAccounts = new Map();
    this.calendarEvents = new Map();
    this.emailThreads = new Map();
    this.integrationTokens = new Map();
    this.mysqlConfigs = new Map();
    this.mysqlFieldMappings = new Map();
    this.reportMetrics = new Map();
    
    this.customerIdCounter = 1;
    this.taskIdCounter = 1;
    this.taskCommentIdCounter = 1;
    this.playbookIdCounter = 1;
    this.playbookTaskIdCounter = 1;
    this.redZoneIdCounter = 1;
    this.calendarEventIdCounter = 1;
    this.emailThreadIdCounter = 1;
    this.integrationTokenIdCounter = 1;
    this.mysqlConfigIdCounter = 1;
    this.mysqlFieldMappingIdCounter = 1;
    this.reportMetricIdCounter = 1;
    
    // Initialize with mock data
    this.initializeMockData();
  }

  // Initialize mock data for use when no database is connected
  private initializeMockData() {
    // Create mock users
    const users = [
      {
        id: "user-1",
        email: "admin@recurrer.com",
        fullName: "Alex Morgan",
        avatarUrl: null,
        role: "admin",
        createdAt: new Date(),
      },
      {
        id: "user-2",
        email: "lead@recurrer.com",
        fullName: "Sara Johnson",
        avatarUrl: null,
        role: "team_lead",
        createdAt: new Date(),
      },
      {
        id: "user-3",
        email: "csm@recurrer.com",
        fullName: "Michael Chen",
        avatarUrl: null,
        role: "csm",
        createdAt: new Date(),
      },
    ] as User[];

    users.forEach(user => this.users.set(user.id, user));

    // Create mock customers
    const customers = [
      {
        id: this.customerIdCounter++,
        name: "Acme Corp",
        industry: "Technology",
        website: "https://acme.example.com",
        status: "active",
        arr: 120000,
        mrr: 10000,
        onboardingStartDate: new Date("2023-01-15"),
        onboardingCompletionDate: new Date("2023-02-10"),
        renewalDate: new Date("2024-01-15"),
        campaignStats: {
          sent: 24,
          opened: 18,
          clicked: 12,
          lastSentDate: "2023-06-20",
        },
        lastReviewMeeting: new Date("2023-06-01"),
        npsScore: 8,
        dataTaggingPercentage: 85,
        addOnRevenue: 2500,
        createdAt: new Date("2023-01-15"),
        updatedAt: new Date("2023-06-22"),
        assignedToUserId: "user-3",
        externalIds: { "chargebee": "cust_acme123" },
        inRedZone: false,
      },
      {
        id: this.customerIdCounter++,
        name: "TechStart Inc",
        industry: "Software",
        website: "https://techstart.example.com",
        status: "active",
        arr: 95000,
        mrr: 7916.67,
        onboardingStartDate: new Date("2023-03-10"),
        onboardingCompletionDate: new Date("2023-04-05"),
        renewalDate: new Date("2024-03-10"),
        campaignStats: {
          sent: 12,
          opened: 9,
          clicked: 6,
          lastSentDate: "2023-06-10",
        },
        lastReviewMeeting: new Date("2023-05-15"),
        npsScore: 9,
        dataTaggingPercentage: 92,
        addOnRevenue: 1800,
        createdAt: new Date("2023-03-10"),
        updatedAt: new Date("2023-06-12"),
        assignedToUserId: "user-3",
        externalIds: { "chargebee": "cust_tech456" },
        inRedZone: false,
      },
      {
        id: this.customerIdCounter++,
        name: "GlobalTech",
        industry: "Technology",
        website: "https://globaltech.example.com",
        status: "active",
        arr: 200000,
        mrr: 16666.67,
        onboardingStartDate: new Date("2022-11-20"),
        onboardingCompletionDate: new Date("2022-12-15"),
        renewalDate: new Date("2023-11-20"),
        campaignStats: {
          sent: 36,
          opened: 24,
          clicked: 15,
          lastSentDate: "2023-02-20", // No campaigns in last 60+ days
        },
        lastReviewMeeting: null, // No review meetings
        npsScore: 4, // Low NPS
        dataTaggingPercentage: 40, // Low data tagging
        addOnRevenue: 5000,
        createdAt: new Date("2022-11-20"),
        updatedAt: new Date("2023-06-21"),
        assignedToUserId: "user-2",
        externalIds: { "chargebee": "cust_glob789" },
        inRedZone: true,
      },
      {
        id: this.customerIdCounter++,
        name: "SmartSolutions Inc",
        industry: "Consulting",
        website: "https://smartsolutions.example.com",
        status: "active",
        arr: 150000,
        mrr: 12500,
        onboardingStartDate: new Date("2023-02-01"),
        onboardingCompletionDate: new Date("2023-02-25"),
        renewalDate: new Date("2024-02-01"),
        campaignStats: {
          sent: 18,
          opened: 15,
          clicked: 10,
          lastSentDate: "2023-06-15",
        },
        lastReviewMeeting: new Date("2023-05-20"),
        npsScore: 8,
        dataTaggingPercentage: 88,
        addOnRevenue: 3200,
        createdAt: new Date("2023-02-01"),
        updatedAt: new Date("2023-06-16"),
        assignedToUserId: "user-2",
        externalIds: { "chargebee": "cust_smart101" },
        inRedZone: false,
      },
    ] as Customer[];

    customers.forEach(customer => this.customers.set(customer.id, customer));

    // Create mock tasks
    const tasks = [
      {
        id: this.taskIdCounter++,
        title: "Schedule quarterly review",
        description: "Set up the quarterly business review meeting",
        status: "not_started",
        dueDate: new Date("2023-07-15"),
        relativeDueDays: null,
        recurrence: "quarterly",
        assignedToUserId: "user-3",
        customerId: 1, // Acme Corp
        playbookId: null,
        createdAt: new Date("2023-06-20"),
        updatedAt: new Date("2023-06-20"),
        createdByUserId: "user-2",
      },
      {
        id: this.taskIdCounter++,
        title: "Send monthly campaign",
        description: "Prepare and send the monthly newsletter campaign",
        status: "not_started",
        dueDate: new Date("2023-07-10"),
        relativeDueDays: null,
        recurrence: "monthly",
        assignedToUserId: "user-3",
        customerId: 2, // TechStart Inc
        playbookId: 1,
        createdAt: new Date("2023-06-22"),
        updatedAt: new Date("2023-06-22"),
        createdByUserId: "user-2",
      },
      {
        id: this.taskIdCounter++,
        title: "Check QR setup status",
        description: "Verify that QR codes are properly set up and working",
        status: "not_started",
        dueDate: new Date("2023-07-12"),
        relativeDueDays: null,
        recurrence: "none",
        assignedToUserId: "user-2",
        customerId: 4, // SmartSolutions Inc
        playbookId: null,
        createdAt: new Date("2023-06-21"),
        updatedAt: new Date("2023-06-21"),
        createdByUserId: "user-1",
      },
      {
        id: this.taskIdCounter++,
        title: "Update data tagging documentation",
        description: "Review and update the data tagging documentation",
        status: "in_progress",
        dueDate: new Date("2023-07-14"),
        relativeDueDays: null,
        recurrence: "none",
        assignedToUserId: "user-2",
        customerId: 3, // GlobalTech
        playbookId: null,
        createdAt: new Date("2023-06-18"),
        updatedAt: new Date("2023-06-21"),
        createdByUserId: "user-1",
      },
    ] as Task[];

    tasks.forEach(task => this.tasks.set(task.id, task));

    // Create mock playbooks
    const playbooks = [
      {
        id: this.playbookIdCounter++,
        name: "Onboarding Process",
        description: "Standard onboarding workflow for new customers",
        triggerConfig: {
          triggerType: "time",
          conditions: {
            startAfter: "signup",
          },
        },
        isActive: true,
        createdAt: new Date("2023-01-01"),
        updatedAt: new Date("2023-04-15"),
        createdByUserId: "user-1",
      },
      {
        id: this.playbookIdCounter++,
        name: "Quarterly Business Review",
        description: "Tasks for preparing and conducting QBRs",
        triggerConfig: {
          triggerType: "renewal",
          conditions: {
            daysBeforeRenewal: 90,
          },
        },
        isActive: true,
        createdAt: new Date("2023-02-10"),
        updatedAt: new Date("2023-05-20"),
        createdByUserId: "user-1",
      },
      {
        id: this.playbookIdCounter++,
        name: "Health Check",
        description: "Regular health check workflow",
        triggerConfig: {
          triggerType: "time",
          conditions: {
            recurEvery: "month",
          },
        },
        isActive: true,
        createdAt: new Date("2023-03-05"),
        updatedAt: new Date("2023-05-25"),
        createdByUserId: "user-2",
      },
    ] as Playbook[];

    playbooks.forEach(playbook => this.playbooks.set(playbook.id, playbook));

    // Create mock playbook tasks
    const playbookTasks = [
      {
        id: this.playbookTaskIdCounter++,
        playbookId: 1,
        title: "Welcome Email",
        description: "Send welcome email to new customer",
        relativeDueDays: 1,
        recurrence: "none",
        sortOrder: 1,
      },
      {
        id: this.playbookTaskIdCounter++,
        playbookId: 1,
        title: "Initial Setup Call",
        description: "Schedule and conduct initial setup call",
        relativeDueDays: 3,
        recurrence: "none",
        sortOrder: 2,
      },
      {
        id: this.playbookTaskIdCounter++,
        playbookId: 1,
        title: "Configure Account Settings",
        description: "Help customer configure their account settings",
        relativeDueDays: 5,
        recurrence: "none",
        sortOrder: 3,
      },
      {
        id: this.playbookTaskIdCounter++,
        playbookId: 2,
        title: "Prepare QBR Document",
        description: "Gather metrics and create QBR document",
        relativeDueDays: 10,
        recurrence: "none",
        sortOrder: 1,
      },
      {
        id: this.playbookTaskIdCounter++,
        playbookId: 2,
        title: "Schedule QBR Meeting",
        description: "Coordinate with customer for QBR meeting time",
        relativeDueDays: 7,
        recurrence: "none",
        sortOrder: 2,
      },
    ] as PlaybookTask[];

    playbookTasks.forEach(task => this.playbookTasks.set(task.id, task));

    // Create mock red zone accounts
    const redZoneAccounts = [
      {
        id: this.redZoneIdCounter++,
        customerId: 3, // GlobalTech
        reasons: [
          "no_campaign_60_days",
          "no_review_meetings",
          "low_nps",
          "low_data_tagging",
        ],
        createdAt: new Date("2023-06-01"),
        resolvedAt: null,
      },
    ] as RedZoneAccount[];

    redZoneAccounts.forEach(account => this.redZoneAccounts.set(account.id, account));
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    for (const user of this.users.values()) {
      if (user.email === email) {
        return user;
      }
    }
    return undefined;
  }

  async createUser(user: InsertUser): Promise<User> {
    const id = `user-${Date.now()}`;
    const newUser = { ...user, id, createdAt: new Date() } as User;
    this.users.set(id, newUser);
    return newUser;
  }

  async updateUser(id: string, data: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...data };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Customer methods
  async getCustomers(): Promise<Customer[]> {
    return Array.from(this.customers.values());
  }

  async getCustomer(id: number): Promise<Customer | undefined> {
    return this.customers.get(id);
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const id = this.customerIdCounter++;
    const now = new Date();
    const newCustomer = { 
      ...customer, 
      id, 
      createdAt: now, 
      updatedAt: now 
    } as Customer;
    
    this.customers.set(id, newCustomer);
    return newCustomer;
  }

  async updateCustomer(id: number, data: Partial<Customer>): Promise<Customer | undefined> {
    const customer = this.customers.get(id);
    if (!customer) return undefined;
    
    const updatedCustomer = { 
      ...customer, 
      ...data, 
      updatedAt: new Date() 
    };
    
    this.customers.set(id, updatedCustomer);
    return updatedCustomer;
  }

  // Task methods
  async getTasks(): Promise<Task[]> {
    return Array.from(this.tasks.values());
  }

  async getTask(id: number): Promise<Task | undefined> {
    return this.tasks.get(id);
  }

  async getTasksByUser(userId: string): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter(
      task => task.assignedToUserId === userId
    );
  }

  async getTasksByCustomer(customerId: number): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter(
      task => task.customerId === customerId
    );
  }

  async getUpcomingTasks(limit = 5): Promise<Task[]> {
    return Array.from(this.tasks.values())
      .filter(task => task.status !== "completed")
      .sort((a, b) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.getTime() - b.dueDate.getTime();
      })
      .slice(0, limit);
  }

  async createTask(task: InsertTask): Promise<Task> {
    const id = this.taskIdCounter++;
    const now = new Date();
    const newTask = { 
      ...task, 
      id, 
      createdAt: now, 
      updatedAt: now 
    } as Task;
    
    this.tasks.set(id, newTask);
    return newTask;
  }

  async updateTask(id: number, data: Partial<Task>): Promise<Task | undefined> {
    const task = this.tasks.get(id);
    if (!task) return undefined;
    
    const updatedTask = { 
      ...task, 
      ...data, 
      updatedAt: new Date() 
    };
    
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }

  // Task Comments
  async getTaskComments(taskId: number): Promise<TaskComment[]> {
    return Array.from(this.taskComments.values())
      .filter(comment => comment.taskId === taskId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async createTaskComment(comment: InsertTaskComment): Promise<TaskComment> {
    const id = this.taskCommentIdCounter++;
    const newComment = { 
      ...comment, 
      id, 
      createdAt: new Date() 
    } as TaskComment;
    
    this.taskComments.set(id, newComment);
    return newComment;
  }

  // Playbook methods
  async getPlaybooks(): Promise<Playbook[]> {
    return Array.from(this.playbooks.values());
  }

  async getPlaybook(id: number): Promise<Playbook | undefined> {
    return this.playbooks.get(id);
  }

  async createPlaybook(playbook: InsertPlaybook): Promise<Playbook> {
    const id = this.playbookIdCounter++;
    const now = new Date();
    const newPlaybook = { 
      ...playbook, 
      id, 
      createdAt: now, 
      updatedAt: now 
    } as Playbook;
    
    this.playbooks.set(id, newPlaybook);
    return newPlaybook;
  }

  async updatePlaybook(id: number, data: Partial<Playbook>): Promise<Playbook | undefined> {
    const playbook = this.playbooks.get(id);
    if (!playbook) return undefined;
    
    const updatedPlaybook = { 
      ...playbook, 
      ...data, 
      updatedAt: new Date() 
    };
    
    this.playbooks.set(id, updatedPlaybook);
    return updatedPlaybook;
  }

  // PlaybookTask methods
  async getPlaybookTasks(playbookId: number): Promise<PlaybookTask[]> {
    return Array.from(this.playbookTasks.values())
      .filter(task => task.playbookId === playbookId)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async createPlaybookTask(task: InsertPlaybookTask): Promise<PlaybookTask> {
    const id = this.playbookTaskIdCounter++;
    const newTask = { ...task, id } as PlaybookTask;
    
    this.playbookTasks.set(id, newTask);
    return newTask;
  }

  async updatePlaybookTask(id: number, data: Partial<PlaybookTask>): Promise<PlaybookTask | undefined> {
    const task = this.playbookTasks.get(id);
    if (!task) return undefined;
    
    const updatedTask = { ...task, ...data };
    this.playbookTasks.set(id, updatedTask);
    return updatedTask;
  }

  // Red Zone methods
  async getRedZoneAccounts(): Promise<RedZoneAccount[]> {
    return Array.from(this.redZoneAccounts.values())
      .filter(account => !account.resolvedAt);
  }

  async getRedZoneAccount(id: number): Promise<RedZoneAccount | undefined> {
    return this.redZoneAccounts.get(id);
  }

  async getRedZoneByCustomer(customerId: number): Promise<RedZoneAccount | undefined> {
    for (const account of this.redZoneAccounts.values()) {
      if (account.customerId === customerId && !account.resolvedAt) {
        return account;
      }
    }
    return undefined;
  }

  async createRedZoneAccount(redZone: InsertRedZoneAccount): Promise<RedZoneAccount> {
    const id = this.redZoneIdCounter++;
    const newRedZone = { 
      ...redZone, 
      id, 
      createdAt: new Date(), 
      resolvedAt: null 
    } as RedZoneAccount;
    
    this.redZoneAccounts.set(id, newRedZone);
    return newRedZone;
  }

  async resolveRedZoneAccount(id: number): Promise<RedZoneAccount | undefined> {
    const redZone = this.redZoneAccounts.get(id);
    if (!redZone) return undefined;
    
    const resolvedRedZone = { 
      ...redZone, 
      resolvedAt: new Date() 
    };
    
    this.redZoneAccounts.set(id, resolvedRedZone);
    return resolvedRedZone;
  }

  // Calendar Event methods
  async getCalendarEvents(): Promise<CalendarEvent[]> {
    return Array.from(this.calendarEvents.values());
  }

  async getCalendarEventsByCustomer(customerId: number): Promise<CalendarEvent[]> {
    return Array.from(this.calendarEvents.values())
      .filter(event => event.customerId === customerId);
  }

  async createCalendarEvent(event: InsertCalendarEvent): Promise<CalendarEvent> {
    const id = this.calendarEventIdCounter++;
    const newEvent = { ...event, id } as CalendarEvent;
    
    this.calendarEvents.set(id, newEvent);
    return newEvent;
  }

  // Email Thread methods
  async getEmailThreadsByCustomer(customerId: number): Promise<EmailThread[]> {
    return Array.from(this.emailThreads.values())
      .filter(thread => thread.customerId === customerId);
  }

  async createEmailThread(thread: InsertEmailThread): Promise<EmailThread> {
    const id = this.emailThreadIdCounter++;
    const newThread = { ...thread, id } as EmailThread;
    
    this.emailThreads.set(id, newThread);
    return newThread;
  }

  // Integration Token methods
  async getIntegrationToken(userId: string, provider: string): Promise<IntegrationToken | undefined> {
    for (const token of this.integrationTokens.values()) {
      if (token.userId === userId && token.provider === provider) {
        return token;
      }
    }
    return undefined;
  }

  async createIntegrationToken(token: InsertIntegrationToken): Promise<IntegrationToken> {
    const id = this.integrationTokenIdCounter++;
    const now = new Date();
    const newToken = { 
      ...token, 
      id, 
      createdAt: now, 
      updatedAt: now 
    } as IntegrationToken;
    
    this.integrationTokens.set(id, newToken);
    return newToken;
  }

  async updateIntegrationToken(id: number, data: Partial<IntegrationToken>): Promise<IntegrationToken | undefined> {
    const token = this.integrationTokens.get(id);
    if (!token) return undefined;
    
    const updatedToken = { 
      ...token, 
      ...data, 
      updatedAt: new Date() 
    };
    
    this.integrationTokens.set(id, updatedToken);
    return updatedToken;
  }

  // MySQL Config methods
  async getMysqlConfig(): Promise<MysqlConfig | undefined> {
    for (const config of this.mysqlConfigs.values()) {
      if (config.isActive) {
        return config;
      }
    }
    return undefined;
  }

  async createMysqlConfig(config: InsertMysqlConfig): Promise<MysqlConfig> {
    const id = this.mysqlConfigIdCounter++;
    const now = new Date();
    const newConfig = { 
      ...config, 
      id, 
      createdAt: now, 
      updatedAt: now,
      lastSyncAt: null
    } as MysqlConfig;
    
    this.mysqlConfigs.set(id, newConfig);
    return newConfig;
  }

  async updateMysqlConfig(id: number, data: Partial<MysqlConfig>): Promise<MysqlConfig | undefined> {
    const config = this.mysqlConfigs.get(id);
    if (!config) return undefined;
    
    const updatedConfig = { 
      ...config, 
      ...data, 
      updatedAt: new Date() 
    };
    
    this.mysqlConfigs.set(id, updatedConfig);
    return updatedConfig;
  }

  // MySQL Field Mappings
  async getMysqlFieldMappings(): Promise<MysqlFieldMapping[]> {
    return Array.from(this.mysqlFieldMappings.values())
      .filter(mapping => mapping.isActive);
  }

  async createMysqlFieldMapping(mapping: InsertMysqlFieldMapping): Promise<MysqlFieldMapping> {
    const id = this.mysqlFieldMappingIdCounter++;
    const newMapping = { ...mapping, id } as MysqlFieldMapping;
    
    this.mysqlFieldMappings.set(id, newMapping);
    return newMapping;
  }

  async updateMysqlFieldMapping(id: number, data: Partial<MysqlFieldMapping>): Promise<MysqlFieldMapping | undefined> {
    const mapping = this.mysqlFieldMappings.get(id);
    if (!mapping) return undefined;
    
    const updatedMapping = { ...mapping, ...data };
    this.mysqlFieldMappings.set(id, updatedMapping);
    return updatedMapping;
  }

  // Report Metrics
  async getReportMetrics(metricName: string, startDate?: Date, endDate?: Date): Promise<ReportMetric[]> {
    return Array.from(this.reportMetrics.values())
      .filter(metric => {
        if (metric.metricName !== metricName) return false;
        if (startDate && metric.metricDate < startDate) return false;
        if (endDate && metric.metricDate > endDate) return false;
        return true;
      });
  }

  async createReportMetric(metric: InsertReportMetric): Promise<ReportMetric> {
    const id = this.reportMetricIdCounter++;
    const newMetric = { 
      ...metric, 
      id, 
      createdAt: new Date() 
    } as ReportMetric;
    
    this.reportMetrics.set(id, newMetric);
    return newMetric;
  }

  // Dashboard methods
  async getDashboardStats(): Promise<{
    openTasks: number;
    campaignGaps: number;
    renewalAlerts: number;
    redZoneCount: number;
  }> {
    const openTasks = Array.from(this.tasks.values())
      .filter(task => task.status !== "completed").length;
    
    const now = new Date();
    const sixtyDaysAgo = new Date(now);
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    
    const campaignGaps = Array.from(this.customers.values())
      .filter(customer => {
        if (!customer.campaignStats?.lastSentDate) return true;
        const lastSent = new Date(customer.campaignStats.lastSentDate);
        return lastSent < sixtyDaysAgo;
      }).length;
    
    const thirtyDaysFromNow = new Date(now);
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    const renewalAlerts = Array.from(this.customers.values())
      .filter(customer => {
        if (!customer.renewalDate) return false;
        return customer.renewalDate <= thirtyDaysFromNow;
      }).length;
    
    const redZoneCount = Array.from(this.customers.values())
      .filter(customer => customer.inRedZone).length;
    
    return {
      openTasks,
      campaignGaps,
      renewalAlerts,
      redZoneCount,
    };
  }

  async getRecentActivity(limit = 5): Promise<any[]> {
    // This is a simplified version since we don't have a dedicated activity log
    // In a real app, we'd have an activity log table
    const activities = [
      {
        id: "act-1",
        userId: "user-2",
        action: "completed onboarding for",
        targetType: "customer",
        targetId: 1,
        targetName: "Acme Corp",
        timestamp: new Date("2023-07-09T12:00:00Z"),
        category: "Onboarding",
      },
      {
        id: "act-2",
        userId: "user-3",
        action: "scheduled a review meeting with",
        targetType: "customer",
        targetId: 2,
        targetName: "TechStart Inc",
        timestamp: new Date("2023-07-09T11:00:00Z"),
        category: "Meeting",
      },
      {
        id: "act-3",
        userId: "user-2",
        action: "marked",
        targetType: "customer",
        targetId: 3,
        targetName: "GlobalTech",
        timestamp: new Date("2023-07-09T09:00:00Z"),
        category: "Red Zone",
      },
      {
        id: "act-4",
        userId: "user-1",
        action: "sent a campaign to",
        targetType: "customer",
        targetId: 4,
        targetName: "SmartSolutions Inc",
        timestamp: new Date("2023-07-09T07:00:00Z"),
        category: "Campaign",
      },
    ];
    
    return activities
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit)
      .map(activity => {
        const user = this.users.get(activity.userId);
        return {
          ...activity,
          user: {
            id: user?.id || "",
            name: user?.fullName || "Unknown User",
            avatar: user?.avatarUrl || "",
          },
        };
      });
  }
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async updateUser(id: string, data: Partial<User>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();
    return updatedUser || undefined;
  }

  async getCustomers(): Promise<Customer[]> {
    return await db.select().from(customers);
  }

  async getCustomer(id: number): Promise<Customer | undefined> {
    const [customer] = await db
      .select()
      .from(customers)
      .where(eq(customers.id, id));
    return customer || undefined;
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const [newCustomer] = await db
      .insert(customers)
      .values(customer)
      .returning();
    return newCustomer;
  }

  async updateCustomer(
    id: number,
    data: Partial<Customer>
  ): Promise<Customer | undefined> {
    const [updatedCustomer] = await db
      .update(customers)
      .set(data)
      .where(eq(customers.id, id))
      .returning();
    return updatedCustomer || undefined;
  }

  async getTasks(): Promise<Task[]> {
    return await db.select().from(tasks);
  }

  async getTask(id: number): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task || undefined;
  }

  async getTasksByUser(userId: string): Promise<Task[]> {
    return await db
      .select()
      .from(tasks)
      .where(eq(tasks.assignedToUserId, userId));
  }

  async getTasksByCustomer(customerId: number): Promise<Task[]> {
    return await db
      .select()
      .from(tasks)
      .where(eq(tasks.customerId, customerId));
  }

  async getUpcomingTasks(limit = 5): Promise<Task[]> {
    return await db
      .select()
      .from(tasks)
      .where(
        and(
          gte(tasks.dueDate, new Date()),
          eq(tasks.status, "not_started")
        )
      )
      .orderBy(tasks.dueDate)
      .limit(limit);
  }

  async createTask(task: InsertTask): Promise<Task> {
    const [newTask] = await db.insert(tasks).values(task).returning();
    return newTask;
  }

  async updateTask(
    id: number,
    data: Partial<Task>
  ): Promise<Task | undefined> {
    const [updatedTask] = await db
      .update(tasks)
      .set(data)
      .where(eq(tasks.id, id))
      .returning();
    return updatedTask || undefined;
  }

  async getTaskComments(taskId: number): Promise<TaskComment[]> {
    return await db
      .select()
      .from(taskComments)
      .where(eq(taskComments.taskId, taskId))
      .orderBy(taskComments.createdAt);
  }

  async createTaskComment(comment: InsertTaskComment): Promise<TaskComment> {
    const [newComment] = await db
      .insert(taskComments)
      .values(comment)
      .returning();
    return newComment;
  }

  async getPlaybooks(): Promise<Playbook[]> {
    return await db.select().from(playbooks);
  }

  async getPlaybook(id: number): Promise<Playbook | undefined> {
    const [playbook] = await db
      .select()
      .from(playbooks)
      .where(eq(playbooks.id, id));
    return playbook || undefined;
  }

  async createPlaybook(playbook: InsertPlaybook): Promise<Playbook> {
    const [newPlaybook] = await db
      .insert(playbooks)
      .values(playbook)
      .returning();
    return newPlaybook;
  }

  async updatePlaybook(
    id: number,
    data: Partial<Playbook>
  ): Promise<Playbook | undefined> {
    const [updatedPlaybook] = await db
      .update(playbooks)
      .set(data)
      .where(eq(playbooks.id, id))
      .returning();
    return updatedPlaybook || undefined;
  }

  async getPlaybookTasks(playbookId: number): Promise<PlaybookTask[]> {
    return await db
      .select()
      .from(playbookTasks)
      .where(eq(playbookTasks.playbookId, playbookId))
      .orderBy(playbookTasks.sortOrder);
  }

  async createPlaybookTask(task: InsertPlaybookTask): Promise<PlaybookTask> {
    const [newTask] = await db
      .insert(playbookTasks)
      .values(task)
      .returning();
    return newTask;
  }

  async updatePlaybookTask(
    id: number,
    data: Partial<PlaybookTask>
  ): Promise<PlaybookTask | undefined> {
    const [updatedTask] = await db
      .update(playbookTasks)
      .set(data)
      .where(eq(playbookTasks.id, id))
      .returning();
    return updatedTask || undefined;
  }

  async getRedZoneAccounts(): Promise<RedZoneAccount[]> {
    return await db
      .select()
      .from(redZoneAccounts)
      .where(isNull(redZoneAccounts.resolvedAt));
  }

  async getRedZoneAccount(id: number): Promise<RedZoneAccount | undefined> {
    const [account] = await db
      .select()
      .from(redZoneAccounts)
      .where(eq(redZoneAccounts.id, id));
    return account || undefined;
  }

  async getRedZoneByCustomer(customerId: number): Promise<RedZoneAccount | undefined> {
    const [account] = await db
      .select()
      .from(redZoneAccounts)
      .where(
        and(
          eq(redZoneAccounts.customerId, customerId),
          isNull(redZoneAccounts.resolvedAt)
        )
      );
    return account || undefined;
  }

  async createRedZoneAccount(redZone: InsertRedZoneAccount): Promise<RedZoneAccount> {
    const [newAccount] = await db
      .insert(redZoneAccounts)
      .values(redZone)
      .returning();
    return newAccount;
  }

  async resolveRedZoneAccount(id: number): Promise<RedZoneAccount | undefined> {
    const [resolvedAccount] = await db
      .update(redZoneAccounts)
      .set({ resolvedAt: new Date() })
      .where(eq(redZoneAccounts.id, id))
      .returning();
    return resolvedAccount || undefined;
  }

  async getCalendarEvents(): Promise<CalendarEvent[]> {
    return await db.select().from(calendarEvents);
  }

  async getCalendarEventsByCustomer(customerId: number): Promise<CalendarEvent[]> {
    return await db
      .select()
      .from(calendarEvents)
      .where(eq(calendarEvents.customerId, customerId));
  }

  async createCalendarEvent(event: InsertCalendarEvent): Promise<CalendarEvent> {
    const [newEvent] = await db
      .insert(calendarEvents)
      .values(event)
      .returning();
    return newEvent;
  }

  async getEmailThreadsByCustomer(customerId: number): Promise<EmailThread[]> {
    return await db
      .select()
      .from(emailThreads)
      .where(eq(emailThreads.customerId, customerId));
  }

  async createEmailThread(thread: InsertEmailThread): Promise<EmailThread> {
    const [newThread] = await db
      .insert(emailThreads)
      .values(thread)
      .returning();
    return newThread;
  }

  async getIntegrationToken(userId: string, provider: string): Promise<IntegrationToken | undefined> {
    const [token] = await db
      .select()
      .from(integrationTokens)
      .where(
        and(
          eq(integrationTokens.userId, userId),
          eq(integrationTokens.provider, provider)
        )
      );
    return token || undefined;
  }

  async createIntegrationToken(token: InsertIntegrationToken): Promise<IntegrationToken> {
    const [newToken] = await db
      .insert(integrationTokens)
      .values(token)
      .returning();
    return newToken;
  }

  async updateIntegrationToken(
    id: number,
    data: Partial<IntegrationToken>
  ): Promise<IntegrationToken | undefined> {
    const [updatedToken] = await db
      .update(integrationTokens)
      .set(data)
      .where(eq(integrationTokens.id, id))
      .returning();
    return updatedToken || undefined;
  }

  async getMysqlConfig(): Promise<MysqlConfig | undefined> {
    const [config] = await db
      .select()
      .from(mysqlConfig)
      .where(eq(mysqlConfig.isActive, true));
    return config || undefined;
  }

  async createMysqlConfig(config: InsertMysqlConfig): Promise<MysqlConfig> {
    const [newConfig] = await db
      .insert(mysqlConfig)
      .values(config)
      .returning();
    return newConfig;
  }

  async updateMysqlConfig(
    id: number,
    data: Partial<MysqlConfig>
  ): Promise<MysqlConfig | undefined> {
    const [updatedConfig] = await db
      .update(mysqlConfig)
      .set(data)
      .where(eq(mysqlConfig.id, id))
      .returning();
    return updatedConfig || undefined;
  }

  async getMysqlFieldMappings(): Promise<MysqlFieldMapping[]> {
    return await db
      .select()
      .from(mysqlFieldMappings)
      .where(eq(mysqlFieldMappings.isActive, true));
  }

  async createMysqlFieldMapping(mapping: InsertMysqlFieldMapping): Promise<MysqlFieldMapping> {
    const [newMapping] = await db
      .insert(mysqlFieldMappings)
      .values(mapping)
      .returning();
    return newMapping;
  }

  async updateMysqlFieldMapping(
    id: number,
    data: Partial<MysqlFieldMapping>
  ): Promise<MysqlFieldMapping | undefined> {
    const [updatedMapping] = await db
      .update(mysqlFieldMappings)
      .set(data)
      .where(eq(mysqlFieldMappings.id, id))
      .returning();
    return updatedMapping || undefined;
  }

  async getReportMetrics(
    metricName: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<ReportMetric[]> {
    let query = db
      .select()
      .from(reportMetrics)
      .where(eq(reportMetrics.metricName, metricName));

    if (startDate) {
      query = query.where(gte(reportMetrics.metricDate, startDate));
    }

    if (endDate) {
      query = query.where(gte(reportMetrics.metricDate, endDate));
    }

    return await query;
  }

  async createReportMetric(metric: InsertReportMetric): Promise<ReportMetric> {
    const [newMetric] = await db
      .insert(reportMetrics)
      .values(metric)
      .returning();
    return newMetric;
  }

  async getDashboardStats(): Promise<{
    openTasks: number;
    campaignGaps: number;
    renewalAlerts: number;
    redZoneCount: number;
  }> {
    // This would use more optimized queries in a real implementation
    const [openTasksResult] = await db
      .select({ count: db.fn.count() })
      .from(tasks)
      .where(eq(tasks.status, "not_started"));
    
    const openTasks = Number(openTasksResult?.count || 0);
    
    // Get customers with no campaigns in last 60 days
    // This is simplified - would use JSON operators in production
    const allCustomers = await db.select().from(customers);
    const now = new Date();
    const sixtyDaysAgo = new Date(now);
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    
    const campaignGaps = allCustomers.filter(customer => {
      if (!customer.campaignStats?.lastSentDate) return true;
      const lastSent = new Date(customer.campaignStats.lastSentDate);
      return lastSent < sixtyDaysAgo;
    }).length;
    
    // Renewal alerts - customers renewing in next 30 days
    const thirtyDaysFromNow = new Date(now);
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    const renewalAlerts = allCustomers.filter(customer => {
      if (!customer.renewalDate) return false;
      return customer.renewalDate <= thirtyDaysFromNow;
    }).length;
    
    // Red zone count
    const [redZoneResult] = await db
      .select({ count: db.fn.count() })
      .from(redZoneAccounts)
      .where(isNull(redZoneAccounts.resolvedAt));
    
    const redZoneCount = Number(redZoneResult?.count || 0);
    
    return {
      openTasks,
      campaignGaps,
      renewalAlerts,
      redZoneCount,
    };
  }

  async getRecentActivity(limit = 5): Promise<any[]> {
    // In a real app, this would query an activity log table
    // This is a simplified mock implementation
    const recentTasks = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        createdAt: tasks.createdAt,
        customerId: tasks.customerId,
        createdByUserId: tasks.createdByUserId,
      })
      .from(tasks)
      .orderBy(desc(tasks.createdAt))
      .limit(limit);
    
    // Fetch related data
    const userIds = recentTasks.map(task => task.createdByUserId);
    const customerIds = recentTasks.map(task => task.customerId);
    
    const taskUsers = userIds.length > 0
      ? await db
          .select()
          .from(users)
          .where(eq(users.id, userIds[0]))
      : [];
    
    const taskCustomers = customerIds.length > 0
      ? await db
          .select()
          .from(customers)
          .where(eq(customers.id, customerIds[0]))
      : [];
    
    // Map to activity format
    return recentTasks.map(task => {
      const user = taskUsers.find(u => u.id === task.createdByUserId);
      const customer = taskCustomers.find(c => c.id === task.customerId);
      
      return {
        id: `task-${task.id}`,
        user: {
          id: user?.id || "",
          name: user?.fullName || "Unknown User",
          avatar: user?.avatarUrl || "",
        },
        action: "created task for",
        target: {
          type: "customer",
          name: customer?.name || "Unknown Customer",
        },
        time: task.createdAt.toISOString(),
        category: "Task",
      };
    });
  }
}

export const storage = process.env.DATABASE_URL 
  ? new DatabaseStorage() 
  : new MemStorage();
