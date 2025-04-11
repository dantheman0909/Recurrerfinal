import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { MetricTimeframe } from "@shared/types";
import { 
  insertUserSchema,
  insertCustomerSchema,
  insertTaskSchema,
  insertPlaybookSchema,
  insertRedZoneAlertSchema
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // API Routes - All prefixed with /api
  
  // Dashboard
  app.get('/api/dashboard', async (req, res) => {
    const timeframe = (req.query.timeframe as MetricTimeframe) || 'monthly';
    const stats = await storage.getDashboardStats(timeframe);
    res.json(stats);
  });
  
  // Users
  app.get('/api/users/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    const user = await storage.getUser(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  });
  
  app.post('/api/users', async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      res.status(201).json(user);
    } catch (error) {
      res.status(400).json({ message: 'Invalid user data', error });
    }
  });
  
  app.patch('/api/users/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    try {
      const userData = z.object({
        name: z.string().optional(),
        email: z.string().email().optional(),
        role: z.enum(['admin', 'team_lead', 'csm']).optional(),
        avatar_url: z.string().optional()
      }).parse(req.body);
      
      const user = await storage.updateUser(id, userData);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      res.json(user);
    } catch (error) {
      res.status(400).json({ message: 'Invalid user data', error });
    }
  });
  
  // Customers
  app.get('/api/customers', async (req, res) => {
    const customers = await storage.getCustomers();
    res.json(customers);
  });
  
  app.get('/api/customers/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    const customer = await storage.getCustomer(id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }
    res.json(customer);
  });
  
  app.post('/api/customers', async (req, res) => {
    try {
      const customerData = insertCustomerSchema.parse(req.body);
      const customer = await storage.createCustomer(customerData);
      res.status(201).json(customer);
    } catch (error) {
      res.status(400).json({ message: 'Invalid customer data', error });
    }
  });
  
  app.patch('/api/customers/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    try {
      const customerData = insertCustomerSchema.partial().parse(req.body);
      const customer = await storage.updateCustomer(id, customerData);
      if (!customer) {
        return res.status(404).json({ message: 'Customer not found' });
      }
      res.json(customer);
    } catch (error) {
      res.status(400).json({ message: 'Invalid customer data', error });
    }
  });
  
  // Tasks
  app.get('/api/tasks', async (req, res) => {
    const customerId = req.query.customerId ? parseInt(req.query.customerId as string) : undefined;
    const assigneeId = req.query.assigneeId ? parseInt(req.query.assigneeId as string) : undefined;
    
    let tasks;
    if (customerId) {
      tasks = await storage.getTasksByCustomer(customerId);
    } else if (assigneeId) {
      tasks = await storage.getTasksByAssignee(assigneeId);
    } else {
      tasks = await storage.getTasks();
    }
    
    res.json(tasks);
  });
  
  app.get('/api/tasks/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    const task = await storage.getTask(id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    res.json(task);
  });
  
  app.post('/api/tasks', async (req, res) => {
    try {
      const taskData = insertTaskSchema.parse(req.body);
      const task = await storage.createTask(taskData);
      res.status(201).json(task);
    } catch (error) {
      res.status(400).json({ message: 'Invalid task data', error });
    }
  });
  
  app.patch('/api/tasks/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    try {
      const taskData = insertTaskSchema.partial().parse(req.body);
      const task = await storage.updateTask(id, taskData);
      if (!task) {
        return res.status(404).json({ message: 'Task not found' });
      }
      res.json(task);
    } catch (error) {
      res.status(400).json({ message: 'Invalid task data', error });
    }
  });
  
  // Task Comments
  app.get('/api/tasks/:taskId/comments', async (req, res) => {
    const taskId = parseInt(req.params.taskId);
    const comments = await storage.getTaskComments(taskId);
    res.json(comments);
  });
  
  app.post('/api/tasks/:taskId/comments', async (req, res) => {
    const taskId = parseInt(req.params.taskId);
    const { userId, comment } = req.body;
    
    if (!userId || !comment) {
      return res.status(400).json({ message: 'User ID and comment are required' });
    }
    
    try {
      const newComment = await storage.createTaskComment(taskId, userId, comment);
      res.status(201).json(newComment);
    } catch (error) {
      res.status(400).json({ message: 'Error creating comment', error });
    }
  });
  
  // Playbooks
  app.get('/api/playbooks', async (req, res) => {
    const playbooks = await storage.getPlaybooks();
    res.json(playbooks);
  });
  
  app.get('/api/playbooks/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    const playbook = await storage.getPlaybook(id);
    if (!playbook) {
      return res.status(404).json({ message: 'Playbook not found' });
    }
    res.json(playbook);
  });
  
  app.post('/api/playbooks', async (req, res) => {
    try {
      const playbookData = insertPlaybookSchema.parse(req.body);
      const playbook = await storage.createPlaybook(playbookData);
      res.status(201).json(playbook);
    } catch (error) {
      res.status(400).json({ message: 'Invalid playbook data', error });
    }
  });
  
  app.patch('/api/playbooks/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    try {
      const playbookData = insertPlaybookSchema.partial().parse(req.body);
      const playbook = await storage.updatePlaybook(id, playbookData);
      if (!playbook) {
        return res.status(404).json({ message: 'Playbook not found' });
      }
      res.json(playbook);
    } catch (error) {
      res.status(400).json({ message: 'Invalid playbook data', error });
    }
  });
  
  // Playbook Tasks
  app.get('/api/playbooks/:playbookId/tasks', async (req, res) => {
    const playbookId = parseInt(req.params.playbookId);
    const tasks = await storage.getPlaybookTasks(playbookId);
    res.json(tasks);
  });
  
  app.post('/api/playbooks/:playbookId/tasks', async (req, res) => {
    const playbookId = parseInt(req.params.playbookId);
    try {
      const taskSchema = z.object({
        title: z.string(),
        description: z.string().optional(),
        due_days: z.number().optional(),
        due_date: z.string().optional(),
        recurring: z.boolean().optional(),
        recurrence_pattern: z.string().optional(),
        order: z.number()
      });
      
      const taskData = taskSchema.parse(req.body);
      const task = await storage.createPlaybookTask(playbookId, taskData);
      res.status(201).json(task);
    } catch (error) {
      res.status(400).json({ message: 'Invalid playbook task data', error });
    }
  });
  
  // Red Zone Alerts
  app.get('/api/red-zone', async (req, res) => {
    const customerId = req.query.customerId ? parseInt(req.query.customerId as string) : undefined;
    
    let alerts;
    if (customerId) {
      alerts = await storage.getRedZoneAlertsByCustomer(customerId);
    } else {
      alerts = await storage.getRedZoneAlerts();
    }
    
    res.json(alerts);
  });
  
  app.post('/api/red-zone', async (req, res) => {
    try {
      const alertData = insertRedZoneAlertSchema.parse(req.body);
      const alert = await storage.createRedZoneAlert(alertData);
      res.status(201).json(alert);
    } catch (error) {
      res.status(400).json({ message: 'Invalid alert data', error });
    }
  });
  
  app.post('/api/red-zone/:id/resolve', async (req, res) => {
    const id = parseInt(req.params.id);
    const alert = await storage.resolveRedZoneAlert(id);
    if (!alert) {
      return res.status(404).json({ message: 'Alert not found' });
    }
    res.json(alert);
  });
  
  // Customer Metrics
  app.get('/api/customers/:customerId/metrics', async (req, res) => {
    const customerId = parseInt(req.params.customerId);
    const metrics = await storage.getCustomerMetrics(customerId);
    res.json(metrics);
  });
  
  app.post('/api/customers/:customerId/metrics', async (req, res) => {
    const customerId = parseInt(req.params.customerId);
    const { metricType, value, percent } = req.body;
    
    if (!metricType || value === undefined) {
      return res.status(400).json({ message: 'Metric type and value are required' });
    }
    
    try {
      const metric = await storage.createCustomerMetric(customerId, metricType, value, percent);
      res.status(201).json(metric);
    } catch (error) {
      res.status(400).json({ message: 'Error creating metric', error });
    }
  });
  
  // MySQL Config
  app.get('/api/admin/mysql-config', async (req, res) => {
    const config = await storage.getMySQLConfig();
    res.json(config || {});
  });
  
  app.post('/api/admin/mysql-config', async (req, res) => {
    try {
      const configSchema = z.object({
        host: z.string(),
        port: z.number(),
        username: z.string(),
        password: z.string(),
        database: z.string(),
        created_by: z.number()
      });
      
      const configData = configSchema.parse(req.body);
      const config = await storage.createMySQLConfig(configData);
      res.status(201).json(config);
    } catch (error) {
      res.status(400).json({ message: 'Invalid MySQL config data', error });
    }
  });
  
  // MySQL Field Mappings
  app.get('/api/admin/mysql-field-mappings', async (req, res) => {
    const mappings = await storage.getMySQLFieldMappings();
    res.json(mappings);
  });
  
  app.post('/api/admin/mysql-field-mappings', async (req, res) => {
    try {
      const mappingSchema = z.object({
        mysql_table: z.string(),
        mysql_field: z.string(),
        local_table: z.string(),
        local_field: z.string(),
        created_by: z.number()
      });
      
      const mappingData = mappingSchema.parse(req.body);
      const mapping = await storage.createMySQLFieldMapping(mappingData);
      res.status(201).json(mapping);
    } catch (error) {
      res.status(400).json({ message: 'Invalid field mapping data', error });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
