import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertUserSchema,
  insertCustomerSchema,
  insertTaskSchema,
  insertTaskCommentSchema,
  insertPlaybookSchema,
  insertPlaybookTaskSchema,
  insertRedZoneAccountSchema,
  insertCalendarEventSchema,
  insertEmailThreadSchema,
  insertIntegrationTokenSchema,
  insertMysqlConfigSchema,
  insertMysqlFieldMappingSchema,
  insertReportMetricSchema,
} from "@shared/schema";
import { z } from "zod";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

export async function registerRoutes(app: Express): Promise<Server> {
  // API middleware for errors
  const handleError = (err: Error, res: Response) => {
    console.error(err);
    if (err instanceof ZodError) {
      return res.status(400).json({
        message: "Validation error",
        errors: fromZodError(err).message,
      });
    }
    res.status(500).json({ message: err.message || "Server error" });
  };

  // Health check route
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // Dashboard routes
  app.get("/api/dashboard/stats", async (_req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (err) {
      handleError(err as Error, res);
    }
  });

  app.get("/api/dashboard/recent-activity", async (_req, res) => {
    try {
      const activity = await storage.getRecentActivity();
      res.json(activity);
    } catch (err) {
      handleError(err as Error, res);
    }
  });

  app.get("/api/dashboard/upcoming-tasks", async (_req, res) => {
    try {
      const tasks = await storage.getUpcomingTasks();
      res.json(tasks);
    } catch (err) {
      handleError(err as Error, res);
    }
  });

  // User routes
  app.get("/api/users/:id", async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (err) {
      handleError(err as Error, res);
    }
  });

  app.post("/api/users", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      res.status(201).json(user);
    } catch (err) {
      handleError(err as Error, res);
    }
  });

  app.patch("/api/users/:id", async (req, res) => {
    try {
      const userData = insertUserSchema.partial().parse(req.body);
      const user = await storage.updateUser(req.params.id, userData);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (err) {
      handleError(err as Error, res);
    }
  });

  // Customer routes
  app.get("/api/customers", async (_req, res) => {
    try {
      const customers = await storage.getCustomers();
      res.json(customers);
    } catch (err) {
      handleError(err as Error, res);
    }
  });

  app.get("/api/customers/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const customer = await storage.getCustomer(id);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      res.json(customer);
    } catch (err) {
      handleError(err as Error, res);
    }
  });

  app.post("/api/customers", async (req, res) => {
    try {
      const customerData = insertCustomerSchema.parse(req.body);
      const customer = await storage.createCustomer(customerData);
      res.status(201).json(customer);
    } catch (err) {
      handleError(err as Error, res);
    }
  });

  app.patch("/api/customers/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const customerData = insertCustomerSchema.partial().parse(req.body);
      const customer = await storage.updateCustomer(id, customerData);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }
      res.json(customer);
    } catch (err) {
      handleError(err as Error, res);
    }
  });

  // Task routes
  app.get("/api/tasks", async (_req, res) => {
    try {
      const tasks = await storage.getTasks();
      res.json(tasks);
    } catch (err) {
      handleError(err as Error, res);
    }
  });

  app.get("/api/tasks/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const task = await storage.getTask(id);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      res.json(task);
    } catch (err) {
      handleError(err as Error, res);
    }
  });

  app.get("/api/tasks/by-user/:userId", async (req, res) => {
    try {
      const tasks = await storage.getTasksByUser(req.params.userId);
      res.json(tasks);
    } catch (err) {
      handleError(err as Error, res);
    }
  });

  app.get("/api/tasks/by-customer/:customerId", async (req, res) => {
    try {
      const customerId = parseInt(req.params.customerId);
      const tasks = await storage.getTasksByCustomer(customerId);
      res.json(tasks);
    } catch (err) {
      handleError(err as Error, res);
    }
  });

  app.post("/api/tasks", async (req, res) => {
    try {
      const taskData = insertTaskSchema.parse(req.body);
      const task = await storage.createTask(taskData);
      res.status(201).json(task);
    } catch (err) {
      handleError(err as Error, res);
    }
  });

  app.patch("/api/tasks/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const taskData = insertTaskSchema.partial().parse(req.body);
      const task = await storage.updateTask(id, taskData);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      res.json(task);
    } catch (err) {
      handleError(err as Error, res);
    }
  });

  // Task Comments
  app.get("/api/task-comments/:taskId", async (req, res) => {
    try {
      const taskId = parseInt(req.params.taskId);
      const comments = await storage.getTaskComments(taskId);
      res.json(comments);
    } catch (err) {
      handleError(err as Error, res);
    }
  });

  app.post("/api/task-comments", async (req, res) => {
    try {
      const commentData = insertTaskCommentSchema.parse(req.body);
      const comment = await storage.createTaskComment(commentData);
      res.status(201).json(comment);
    } catch (err) {
      handleError(err as Error, res);
    }
  });

  // Playbook routes
  app.get("/api/playbooks", async (_req, res) => {
    try {
      const playbooks = await storage.getPlaybooks();
      res.json(playbooks);
    } catch (err) {
      handleError(err as Error, res);
    }
  });

  app.get("/api/playbooks/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const playbook = await storage.getPlaybook(id);
      if (!playbook) {
        return res.status(404).json({ message: "Playbook not found" });
      }
      res.json(playbook);
    } catch (err) {
      handleError(err as Error, res);
    }
  });

  app.post("/api/playbooks", async (req, res) => {
    try {
      const playbookData = insertPlaybookSchema.parse(req.body);
      const playbook = await storage.createPlaybook(playbookData);
      res.status(201).json(playbook);
    } catch (err) {
      handleError(err as Error, res);
    }
  });

  app.patch("/api/playbooks/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const playbookData = insertPlaybookSchema.partial().parse(req.body);
      const playbook = await storage.updatePlaybook(id, playbookData);
      if (!playbook) {
        return res.status(404).json({ message: "Playbook not found" });
      }
      res.json(playbook);
    } catch (err) {
      handleError(err as Error, res);
    }
  });

  // Playbook Task routes
  app.get("/api/playbook-tasks/:playbookId", async (req, res) => {
    try {
      const playbookId = parseInt(req.params.playbookId);
      const tasks = await storage.getPlaybookTasks(playbookId);
      res.json(tasks);
    } catch (err) {
      handleError(err as Error, res);
    }
  });

  app.post("/api/playbook-tasks", async (req, res) => {
    try {
      const taskData = insertPlaybookTaskSchema.parse(req.body);
      const task = await storage.createPlaybookTask(taskData);
      res.status(201).json(task);
    } catch (err) {
      handleError(err as Error, res);
    }
  });

  app.patch("/api/playbook-tasks/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const taskData = insertPlaybookTaskSchema.partial().parse(req.body);
      const task = await storage.updatePlaybookTask(id, taskData);
      if (!task) {
        return res.status(404).json({ message: "Playbook task not found" });
      }
      res.json(task);
    } catch (err) {
      handleError(err as Error, res);
    }
  });

  // Red Zone routes
  app.get("/api/red-zone", async (_req, res) => {
    try {
      const accounts = await storage.getRedZoneAccounts();
      res.json(accounts);
    } catch (err) {
      handleError(err as Error, res);
    }
  });

  app.get("/api/red-zone/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const account = await storage.getRedZoneAccount(id);
      if (!account) {
        return res.status(404).json({ message: "Red zone account not found" });
      }
      res.json(account);
    } catch (err) {
      handleError(err as Error, res);
    }
  });

  app.get("/api/red-zone/by-customer/:customerId", async (req, res) => {
    try {
      const customerId = parseInt(req.params.customerId);
      const account = await storage.getRedZoneByCustomer(customerId);
      if (!account) {
        return res.status(404).json({ message: "Red zone account not found" });
      }
      res.json(account);
    } catch (err) {
      handleError(err as Error, res);
    }
  });

  app.post("/api/red-zone", async (req, res) => {
    try {
      const accountData = insertRedZoneAccountSchema.parse(req.body);
      const account = await storage.createRedZoneAccount(accountData);
      res.status(201).json(account);
    } catch (err) {
      handleError(err as Error, res);
    }
  });

  app.post("/api/red-zone/:id/resolve", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const account = await storage.resolveRedZoneAccount(id);
      if (!account) {
        return res.status(404).json({ message: "Red zone account not found" });
      }
      res.json(account);
    } catch (err) {
      handleError(err as Error, res);
    }
  });

  // Calendar Event routes
  app.get("/api/calendar-events", async (_req, res) => {
    try {
      const events = await storage.getCalendarEvents();
      res.json(events);
    } catch (err) {
      handleError(err as Error, res);
    }
  });

  app.get("/api/calendar-events/by-customer/:customerId", async (req, res) => {
    try {
      const customerId = parseInt(req.params.customerId);
      const events = await storage.getCalendarEventsByCustomer(customerId);
      res.json(events);
    } catch (err) {
      handleError(err as Error, res);
    }
  });

  app.post("/api/calendar-events", async (req, res) => {
    try {
      const eventData = insertCalendarEventSchema.parse(req.body);
      const event = await storage.createCalendarEvent(eventData);
      res.status(201).json(event);
    } catch (err) {
      handleError(err as Error, res);
    }
  });

  // Email Thread routes
  app.get("/api/email-threads/by-customer/:customerId", async (req, res) => {
    try {
      const customerId = parseInt(req.params.customerId);
      const threads = await storage.getEmailThreadsByCustomer(customerId);
      res.json(threads);
    } catch (err) {
      handleError(err as Error, res);
    }
  });

  app.post("/api/email-threads", async (req, res) => {
    try {
      const threadData = insertEmailThreadSchema.parse(req.body);
      const thread = await storage.createEmailThread(threadData);
      res.status(201).json(thread);
    } catch (err) {
      handleError(err as Error, res);
    }
  });

  // Integration Token routes
  app.get("/api/integration-tokens/:userId/:provider", async (req, res) => {
    try {
      const { userId, provider } = req.params;
      const token = await storage.getIntegrationToken(userId, provider);
      if (!token) {
        return res.status(404).json({ message: "Integration token not found" });
      }
      res.json(token);
    } catch (err) {
      handleError(err as Error, res);
    }
  });

  app.post("/api/integration-tokens", async (req, res) => {
    try {
      const tokenData = insertIntegrationTokenSchema.parse(req.body);
      const token = await storage.createIntegrationToken(tokenData);
      res.status(201).json(token);
    } catch (err) {
      handleError(err as Error, res);
    }
  });

  app.patch("/api/integration-tokens/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const tokenData = insertIntegrationTokenSchema.partial().parse(req.body);
      const token = await storage.updateIntegrationToken(id, tokenData);
      if (!token) {
        return res.status(404).json({ message: "Integration token not found" });
      }
      res.json(token);
    } catch (err) {
      handleError(err as Error, res);
    }
  });

  // MySQL Config routes
  app.get("/api/mysql-config", async (_req, res) => {
    try {
      const config = await storage.getMysqlConfig();
      res.json(config || { isActive: false });
    } catch (err) {
      handleError(err as Error, res);
    }
  });

  app.post("/api/mysql-config", async (req, res) => {
    try {
      const configData = insertMysqlConfigSchema.parse(req.body);
      const config = await storage.createMysqlConfig(configData);
      res.status(201).json(config);
    } catch (err) {
      handleError(err as Error, res);
    }
  });

  app.patch("/api/mysql-config/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const configData = insertMysqlConfigSchema.partial().parse(req.body);
      const config = await storage.updateMysqlConfig(id, configData);
      if (!config) {
        return res.status(404).json({ message: "MySQL config not found" });
      }
      res.json(config);
    } catch (err) {
      handleError(err as Error, res);
    }
  });

  // MySQL Field Mapping routes
  app.get("/api/mysql-field-mappings", async (_req, res) => {
    try {
      const mappings = await storage.getMysqlFieldMappings();
      res.json(mappings);
    } catch (err) {
      handleError(err as Error, res);
    }
  });

  app.post("/api/mysql-field-mappings", async (req, res) => {
    try {
      const mappingData = insertMysqlFieldMappingSchema.parse(req.body);
      const mapping = await storage.createMysqlFieldMapping(mappingData);
      res.status(201).json(mapping);
    } catch (err) {
      handleError(err as Error, res);
    }
  });

  app.patch("/api/mysql-field-mappings/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const mappingData = insertMysqlFieldMappingSchema.partial().parse(req.body);
      const mapping = await storage.updateMysqlFieldMapping(id, mappingData);
      if (!mapping) {
        return res.status(404).json({ message: "MySQL field mapping not found" });
      }
      res.json(mapping);
    } catch (err) {
      handleError(err as Error, res);
    }
  });

  // Report Metrics routes
  app.get("/api/report-metrics/:metricName", async (req, res) => {
    try {
      const { metricName } = req.params;
      const { startDate, endDate } = req.query;
      
      let startDateObj, endDateObj;
      if (startDate) {
        startDateObj = new Date(startDate as string);
      }
      if (endDate) {
        endDateObj = new Date(endDate as string);
      }
      
      const metrics = await storage.getReportMetrics(
        metricName,
        startDateObj,
        endDateObj
      );
      res.json(metrics);
    } catch (err) {
      handleError(err as Error, res);
    }
  });

  app.post("/api/report-metrics", async (req, res) => {
    try {
      const metricData = insertReportMetricSchema.parse(req.body);
      const metric = await storage.createReportMetric(metricData);
      res.status(201).json(metric);
    } catch (err) {
      handleError(err as Error, res);
    }
  });

  // Sync and Data Management routes
  app.post("/api/sync", async (_req, res) => {
    try {
      // This would contain logic to sync data from MySQL to Supabase
      // For now, we'll just return a success message
      res.json({ message: "Sync initiated", status: "success" });
    } catch (err) {
      handleError(err as Error, res);
    }
  });

  app.post("/api/admin/mysql-query", async (req, res) => {
    try {
      const querySchema = z.object({
        query: z.string().min(1)
      });
      
      const { query } = querySchema.parse(req.body);
      
      // This would execute the MySQL query in a real implementation
      // For now, return mock data
      res.json({
        columns: ['id', 'name', 'email'],
        rows: [
          [1, 'Test User', 'test@example.com'],
          [2, 'Another User', 'another@example.com']
        ]
      });
    } catch (err) {
      handleError(err as Error, res);
    }
  });

  app.post("/api/admin/import-csv", async (req, res) => {
    try {
      // This would handle CSV import logic
      // For now, just return a success message
      res.json({ 
        message: "CSV import successful", 
        imported: 10, 
        updated: 5 
      });
    } catch (err) {
      handleError(err as Error, res);
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
