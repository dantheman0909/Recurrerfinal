import { IStorage } from "./storage";
import { db, testDatabaseConnection } from "./db-fixed";
import { 
  users, customers, tasks, taskComments, playbooks, playbookTasks, redZoneAlerts, 
  customerMetrics, mysqlConfig, mysqlFieldMappings, chargebeeConfig,
  type User, type InsertUser, type Customer, type InsertCustomer, 
  type Task, type InsertTask, type TaskComment, type Playbook, 
  type InsertPlaybook, type PlaybookTask, type RedZoneAlert, 
  type InsertRedZoneAlert, type CustomerMetric, type MySQLConfig, 
  type MySQLFieldMapping, type ChargebeeConfig, type InsertChargebeeConfig
} from "@shared/schema";
import { eq } from "drizzle-orm";
import { MetricTimeframe } from "@shared/types";

// Improved Database Storage implementation with additional error handling and logging
export class FixedDatabaseStorage implements IStorage {
  constructor() {
    console.log("Initializing FixedDatabaseStorage...");
    this.init();
  }

  // Initialize and test the database connection
  private async init() {
    try {
      const isConnected = await testDatabaseConnection();
      if (isConnected) {
        console.log("FixedDatabaseStorage initialized successfully");
      } else {
        console.error("Failed to initialize FixedDatabaseStorage - database connection failed");
      }
    } catch (error) {
      console.error("Error initializing FixedDatabaseStorage:", error);
    }
  }

  // Helper function to handle database operations with improved error handling
  private async dbOperation<T>(operation: string, callback: () => Promise<T>): Promise<T> {
    try {
      console.log(`Executing database operation: ${operation}...`);
      const result = await callback();
      console.log(`Database operation ${operation} completed successfully`);
      return result;
    } catch (error) {
      console.error(`Error in database operation ${operation}:`, error);
      throw error;
    }
  }

  // Users
  async getUser(id: number): Promise<User | undefined> {
    return this.dbOperation('getUser', async () => {
      const results = await db.select().from(users).where(eq(users.id, id));
      return results.length > 0 ? results[0] : undefined;
    });
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return this.dbOperation('getUserByEmail', async () => {
      const results = await db.select().from(users).where(eq(users.email, email));
      return results.length > 0 ? results[0] : undefined;
    });
  }

  async createUser(user: InsertUser): Promise<User> {
    return this.dbOperation('createUser', async () => {
      const results = await db.insert(users).values(user).returning();
      if (results.length === 0) {
        throw new Error("Failed to create user: No records returned");
      }
      return results[0];
    });
  }

  async updateUser(id: number, user: Partial<User>): Promise<User | undefined> {
    return this.dbOperation('updateUser', async () => {
      const results = await db.update(users)
        .set(user)
        .where(eq(users.id, id))
        .returning();
      return results.length > 0 ? results[0] : undefined;
    });
  }
  
  // Customers
  async getCustomers(): Promise<Customer[]> {
    return this.dbOperation('getCustomers', async () => {
      return await db.select().from(customers);
    });
  }

  async getCustomer(id: number): Promise<Customer | undefined> {
    return this.dbOperation('getCustomer', async () => {
      const results = await db.select().from(customers).where(eq(customers.id, id));
      return results.length > 0 ? results[0] : undefined;
    });
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    return this.dbOperation('createCustomer', async () => {
      const results = await db.insert(customers).values(customer).returning();
      if (results.length === 0) {
        throw new Error("Failed to create customer: No records returned");
      }
      return results[0];
    });
  }

  async updateCustomer(id: number, customer: Partial<Customer>): Promise<Customer | undefined> {
    return this.dbOperation('updateCustomer', async () => {
      const results = await db.update(customers)
        .set(customer)
        .where(eq(customers.id, id))
        .returning();
      return results.length > 0 ? results[0] : undefined;
    });
  }
  
  // Tasks
  async getTasks(): Promise<Task[]> {
    return this.dbOperation('getTasks', async () => {
      return await db.select().from(tasks);
    });
  }

  async getTasksByCustomer(customerId: number): Promise<Task[]> {
    return this.dbOperation('getTasksByCustomer', async () => {
      return await db.select().from(tasks).where(eq(tasks.customer_id, customerId));
    });
  }

  async getTasksByAssignee(userId: number): Promise<Task[]> {
    return this.dbOperation('getTasksByAssignee', async () => {
      return await db.select().from(tasks).where(eq(tasks.assigned_to, userId));
    });
  }

  async getTask(id: number): Promise<Task | undefined> {
    return this.dbOperation('getTask', async () => {
      const results = await db.select().from(tasks).where(eq(tasks.id, id));
      return results.length > 0 ? results[0] : undefined;
    });
  }

  async createTask(task: InsertTask): Promise<Task> {
    return this.dbOperation('createTask', async () => {
      const results = await db.insert(tasks).values(task).returning();
      if (results.length === 0) {
        throw new Error("Failed to create task: No records returned");
      }
      return results[0];
    });
  }

  async updateTask(id: number, task: Partial<Task>): Promise<Task | undefined> {
    return this.dbOperation('updateTask', async () => {
      const results = await db.update(tasks)
        .set(task)
        .where(eq(tasks.id, id))
        .returning();
      return results.length > 0 ? results[0] : undefined;
    });
  }
  
  // Task Comments
  async getTaskComments(taskId: number): Promise<TaskComment[]> {
    return this.dbOperation('getTaskComments', async () => {
      return await db.select().from(taskComments).where(eq(taskComments.task_id, taskId));
    });
  }

  async createTaskComment(taskId: number, userId: number, comment: string): Promise<TaskComment> {
    return this.dbOperation('createTaskComment', async () => {
      const commentData = {
        task_id: taskId,
        user_id: userId,
        comment: comment,
        created_at: new Date()
      };
      
      const results = await db.insert(taskComments).values(commentData).returning();
      if (results.length === 0) {
        throw new Error("Failed to create task comment: No records returned");
      }
      return results[0];
    });
  }
  
  // Playbooks
  async getPlaybooks(): Promise<Playbook[]> {
    return this.dbOperation('getPlaybooks', async () => {
      return await db.select().from(playbooks);
    });
  }

  async getPlaybook(id: number): Promise<Playbook | undefined> {
    return this.dbOperation('getPlaybook', async () => {
      const results = await db.select().from(playbooks).where(eq(playbooks.id, id));
      return results.length > 0 ? results[0] : undefined;
    });
  }

  async createPlaybook(playbook: InsertPlaybook): Promise<Playbook> {
    return this.dbOperation('createPlaybook', async () => {
      const results = await db.insert(playbooks).values(playbook).returning();
      if (results.length === 0) {
        throw new Error("Failed to create playbook: No records returned");
      }
      return results[0];
    });
  }

  async updatePlaybook(id: number, playbook: Partial<Playbook>): Promise<Playbook | undefined> {
    return this.dbOperation('updatePlaybook', async () => {
      const results = await db.update(playbooks)
        .set(playbook)
        .where(eq(playbooks.id, id))
        .returning();
      return results.length > 0 ? results[0] : undefined;
    });
  }
  
  // Playbook Tasks
  async getPlaybookTasks(playbookId: number): Promise<PlaybookTask[]> {
    return this.dbOperation('getPlaybookTasks', async () => {
      return await db.select().from(playbookTasks).where(eq(playbookTasks.playbook_id, playbookId));
    });
  }

  async createPlaybookTask(playbookId: number, task: Omit<PlaybookTask, 'id' | 'playbook_id'>): Promise<PlaybookTask> {
    return this.dbOperation('createPlaybookTask', async () => {
      const fullTask = {
        playbook_id: playbookId,
        ...task,
      };
      
      const results = await db.insert(playbookTasks).values(fullTask).returning();
      if (results.length === 0) {
        throw new Error("Failed to create playbook task: No records returned");
      }
      return results[0];
    });
  }

  async updatePlaybookTask(id: number, task: Partial<PlaybookTask>): Promise<PlaybookTask | undefined> {
    return this.dbOperation('updatePlaybookTask', async () => {
      const results = await db.update(playbookTasks)
        .set(task)
        .where(eq(playbookTasks.id, id))
        .returning();
      return results.length > 0 ? results[0] : undefined;
    });
  }
  
  // Red Zone Alerts
  async getRedZoneAlerts(): Promise<RedZoneAlert[]> {
    return this.dbOperation('getRedZoneAlerts', async () => {
      return await db.select().from(redZoneAlerts);
    });
  }

  async getRedZoneAlertsByCustomer(customerId: number): Promise<RedZoneAlert[]> {
    return this.dbOperation('getRedZoneAlertsByCustomer', async () => {
      return await db.select().from(redZoneAlerts).where(eq(redZoneAlerts.customer_id, customerId));
    });
  }

  async createRedZoneAlert(alert: InsertRedZoneAlert): Promise<RedZoneAlert> {
    return this.dbOperation('createRedZoneAlert', async () => {
      const results = await db.insert(redZoneAlerts).values(alert).returning();
      if (results.length === 0) {
        throw new Error("Failed to create red zone alert: No records returned");
      }
      return results[0];
    });
  }

  async resolveRedZoneAlert(id: number): Promise<RedZoneAlert | undefined> {
    return this.dbOperation('resolveRedZoneAlert', async () => {
      const now = new Date();
      const results = await db.update(redZoneAlerts)
        .set({ resolved_at: now })
        .where(eq(redZoneAlerts.id, id))
        .returning();
      return results.length > 0 ? results[0] : undefined;
    });
  }
  
  // Customer Metrics
  async getCustomerMetrics(customerId: number): Promise<CustomerMetric[]> {
    return this.dbOperation('getCustomerMetrics', async () => {
      return await db.select().from(customerMetrics).where(eq(customerMetrics.customer_id, customerId));
    });
  }

  async createCustomerMetric(customerId: number, metricType: string, value: number, percent?: number): Promise<CustomerMetric> {
    return this.dbOperation('createCustomerMetric', async () => {
      const metricData = {
        customer_id: customerId,
        metric_type: metricType,
        value: value,
        percent: percent || null,
        created_at: new Date()
      };
      
      const results = await db.insert(customerMetrics).values(metricData).returning();
      if (results.length === 0) {
        throw new Error("Failed to create customer metric: No records returned");
      }
      return results[0];
    });
  }
  
  // MySQL Configuration
  async getMySQLConfig(): Promise<MySQLConfig | undefined> {
    return this.dbOperation('getMySQLConfig', async () => {
      const results = await db.select().from(mysqlConfig);
      return results.length > 0 ? results[0] : undefined;
    });
  }

  async createMySQLConfig(config: Omit<MySQLConfig, 'id' | 'created_at'>): Promise<MySQLConfig> {
    return this.dbOperation('createMySQLConfig', async () => {
      const configData = {
        ...config,
        created_at: new Date()
      };
      
      const results = await db.insert(mysqlConfig).values(configData).returning();
      if (results.length === 0) {
        throw new Error("Failed to create MySQL config: No records returned");
      }
      return results[0];
    });
  }
  
  // MySQL Field Mappings
  async getMySQLFieldMappings(): Promise<MySQLFieldMapping[]> {
    return this.dbOperation('getMySQLFieldMappings', async () => {
      return await db.select().from(mysqlFieldMappings);
    });
  }

  async createMySQLFieldMapping(mapping: Omit<MySQLFieldMapping, 'id' | 'created_at'>): Promise<MySQLFieldMapping> {
    return this.dbOperation('createMySQLFieldMapping', async () => {
      const mappingData = {
        ...mapping,
        created_at: new Date()
      };
      
      const results = await db.insert(mysqlFieldMappings).values(mappingData).returning();
      if (results.length === 0) {
        throw new Error("Failed to create MySQL field mapping: No records returned");
      }
      return results[0];
    });
  }
  
  // Chargebee Configuration
  async getChargebeeConfig(): Promise<ChargebeeConfig | undefined> {
    return this.dbOperation('getChargebeeConfig', async () => {
      const results = await db.select().from(chargebeeConfig);
      return results.length > 0 ? results[0] : undefined;
    });
  }

  async createChargebeeConfig(config: InsertChargebeeConfig): Promise<ChargebeeConfig> {
    return this.dbOperation('createChargebeeConfig', async () => {
      const configData = {
        ...config,
        created_at: new Date()
      };
      
      const results = await db.insert(chargebeeConfig).values(configData).returning();
      if (results.length === 0) {
        throw new Error("Failed to create Chargebee config: No records returned");
      }
      return results[0];
    });
  }
  
  // Dashboard
  async getDashboardStats(timeframe: MetricTimeframe): Promise<any> {
    return this.dbOperation('getDashboardStats', async () => {
      // This is a placeholder implementation until we have real dashboard metrics
      // In a real implementation, this would query from multiple tables and aggregate the data
      const allCustomers = await db.select().from(customers);
      const allTasks = await db.select().from(tasks);
      const allAlerts = await db.select().from(redZoneAlerts);
      
      const now = new Date();
      let dateLimit: Date;
      
      // Map the timeframe values from shared/types.ts
      switch (timeframe) {
        case 'weekly':
          dateLimit = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'monthly':
          dateLimit = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case 'quarterly':
          dateLimit = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case 'yearly':
          dateLimit = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          dateLimit = new Date(0); // Beginning of time
          break;
      }
      
      const filteredTasks = allTasks.filter(task => {
        const createdAt = task.created_at;
        return createdAt && createdAt >= dateLimit;
      });
      
      const filteredAlerts = allAlerts.filter(alert => {
        const createdAt = alert.created_at;
        return createdAt && createdAt >= dateLimit;
      });
      
      return {
        total_customers: allCustomers.length,
        new_customers: allCustomers.filter(c => c.created_at && c.created_at >= dateLimit).length,
        total_tasks: filteredTasks.length,
        completed_tasks: filteredTasks.filter(t => t.status === 'completed').length,
        overdue_tasks: filteredTasks.filter(t => t.status === 'overdue').length,
        red_zone_alerts: filteredAlerts.length,
        resolved_alerts: filteredAlerts.filter(a => a.resolved_at !== null).length,
      };
    });
  }
}