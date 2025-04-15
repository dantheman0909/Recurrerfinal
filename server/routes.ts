import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { z } from "zod";
import { MetricTimeframe } from "@shared/types";
import { 
  insertUserSchema,
  insertCustomerSchema,
  insertTaskSchema,
  insertPlaybookSchema,
  insertPlaybookTaskSchema,
  insertRedZoneAlertSchema,
  insertRedZoneRuleSchema,
  insertRedZoneResolutionCriteriaSchema,
  insertMySQLSavedQuerySchema,
  insertNotificationSchema,
  insertUserAchievementSchema,
  tasks,
  customers,
  customerMetrics,
  redZoneAlerts,
  taskComments
} from "@shared/schema";
import { eq } from "drizzle-orm";
import {
  getChargebeeSubscriptions,
  getChargebeeSubscription,
  getChargebeeCustomers,
  getChargebeeCustomer,
  getChargebeeInvoices,
  getChargebeeInvoice,
  getInvoicesForSubscription,
  getMySQLCompanies,
  getMySQLCompany,
  importMySQLDataToCustomer,
  getCustomerExternalData
} from "./external-data";
import { 
  importCSV, 
  exportCustomersCSV, 
  previewCSVImport, 
  downloadSampleCSV,
  upload,
  getLastImportSession
} from "./import";

export async function registerRoutes(app: Express): Promise<Server> {
  // API Routes - All prefixed with /api
  
  // Dashboard
  app.get('/api/dashboard', async (req, res) => {
    const timeframe = (req.query.timeframe as MetricTimeframe) || 'monthly';
    const stats = await storage.getDashboardStats(timeframe);
    res.json(stats);
  });
  
  // Users
  app.get('/api/users', async (req, res) => {
    const users = await storage.getUsers();
    res.json(users);
  });
  
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
  
  // Route to assign CSMs to customers
  app.post('/api/customers/:id/assign-csm', async (req, res) => {
    const id = parseInt(req.params.id);
    const { csmId } = req.body;
    
    if (!csmId || isNaN(parseInt(csmId))) {
      return res.status(400).json({ message: 'Valid CSM ID is required' });
    }
    
    try {
      // Get CSM details
      const csm = await storage.getUser(parseInt(csmId));
      if (!csm) {
        return res.status(404).json({ message: 'CSM not found' });
      }
      
      if (csm.role !== 'csm') {
        return res.status(400).json({ message: 'Selected user is not a CSM' });
      }
      
      // Update customer with assigned CSM
      const updatedCustomer = await storage.updateCustomer(id, { 
        assigned_csm: parseInt(csmId),
        csm_name: csm.name // Store the name for easier display
      });
      
      if (!updatedCustomer) {
        return res.status(404).json({ message: 'Customer not found' });
      }
      
      res.json(updatedCustomer);
    } catch (error) {
      console.error("Error assigning CSM:", error);
      res.status(500).json({ message: 'Error assigning CSM', error: String(error) });
    }
  });

  // Customer CSV Import/Export
  app.post('/api/customers/import/csv', upload.single('file'), importCSV);
  app.post('/api/customers/import/preview', upload.single('file'), previewCSVImport);
  app.get('/api/customers/export/csv', exportCustomersCSV);
  app.get('/api/customers/sample/csv', downloadSampleCSV);
  app.get('/api/customers/import/last-session', getLastImportSession);
  
  // Delete customer
  app.delete('/api/customers/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    try {
      // Get all tasks for this customer to find task comments to delete
      const customerTasks = await storage.getTasksByCustomer(id);
      
      // Delete task comments first (foreign key constraint)
      for (const task of customerTasks) {
        await db.delete(taskComments).where(eq(taskComments.task_id, task.id));
      }
      
      // Then delete related records in other dependent tables
      await db.delete(customerMetrics).where(eq(customerMetrics.customer_id, id));
      await db.delete(redZoneAlerts).where(eq(redZoneAlerts.customer_id, id));
      await db.delete(tasks).where(eq(tasks.customer_id, id));
      
      // Now delete the customer
      const success = await storage.deleteCustomer(id);
      if (!success) {
        return res.status(404).json({ message: 'Customer not found' });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting customer:", error);
      res.status(500).json({ message: 'Error deleting customer', error: String(error) });
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
  
  // Playbook Workflow - Create playbook with tasks in one transaction
  app.post('/api/playbooks/workflow', async (req, res) => {
    try {
      // Define schema for the entire workflow
      const workflowSchema = z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        trigger_type: z.enum(['manual', 'new_customer', 'usage_drop', 'renewal_approaching', 'custom_event']),
        target_segments: z.array(z.enum(['starter', 'growth', 'key'])),
        filters: z.record(z.string().optional()).optional(),
        active: z.boolean().default(true),
        tasks: z.array(z.object({
          title: z.string().min(1),
          description: z.string().optional(),
          due_type: z.enum(['fixed', 'relative']),
          due_offset: z.number().optional(),
          fixed_date: z.date().optional(),
          recurrence: z.enum(['none', 'daily', 'weekly', 'monthly', 'bi-weekly']),
          assignment_role: z.enum(['csm', 'team_lead', 'admin']),
          required_fields: z.array(z.string()).optional(),
          template_message: z.string().optional(),
          order: z.number()
        })).min(1)
      });
      
      // Validate the incoming data
      const workflowData = workflowSchema.parse(req.body);
      
      // Extract playbook data
      const playbookData = {
        name: workflowData.name,
        description: workflowData.description || null,
        trigger_type: workflowData.trigger_type,
        target_segments: workflowData.target_segments,
        filters: workflowData.filters ? JSON.stringify(workflowData.filters) : null,
        active: workflowData.active,
        created_by: 1, // TODO: Get from auth context
      };
      
      // Create the playbook
      const playbook = await storage.createPlaybook(playbookData);
      
      // Create tasks for the playbook
      const createdTasks = [];
      for (const task of workflowData.tasks) {
        // Convert task data to match DB schema
        const playbookTaskData = {
          title: task.title,
          description: task.description || null,
          due_type: task.due_type,
          due_offset: task.due_type === 'relative' ? (task.due_offset || 0) : null,
          fixed_date: task.due_type === 'fixed' && task.fixed_date ? new Date(task.fixed_date) : null,
          recurrence: task.recurrence,
          assignment_role: task.assignment_role,
          required_fields: task.required_fields || [],
          template_message: task.template_message || null,
          order: task.order,
          created_at: new Date()
        };
        
        const createdTask = await storage.createPlaybookTask(playbook.id, playbookTaskData);
        createdTasks.push(createdTask);
      }
      
      // Return the created playbook with its tasks
      res.status(201).json({
        ...playbook,
        tasks: createdTasks
      });
    } catch (error) {
      console.error('Error creating playbook workflow:', error);
      res.status(400).json({ 
        message: 'Invalid playbook workflow data', 
        error: error instanceof Error ? error.message : String(error) 
      });
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
        description: z.string().nullable().optional(),
        due_type: z.enum(['fixed', 'relative']).default('relative'),
        due_offset: z.number().nullable().optional(),
        fixed_date: z.string().nullable().optional(),
        recurrence: z.enum(['none', 'daily', 'weekly', 'monthly', 'bi-weekly']).default('none'),
        assignment_role: z.enum(['csm', 'team_lead', 'admin']).default('csm'),
        required_fields: z.array(z.string()).optional(),
        template_message: z.string().nullable().optional(),
        order: z.number()
      });
      
      // Convert undefined to null for database compatibility
      let taskData = taskSchema.parse(req.body);
      
      // Convert undefined values to null
      if (taskData.description === undefined) taskData.description = null;
      if (taskData.due_offset === undefined) taskData.due_offset = null;
      if (taskData.fixed_date === undefined) taskData.fixed_date = null;
      if (taskData.template_message === undefined) taskData.template_message = null;
      if (taskData.required_fields === undefined) taskData.required_fields = [];
      
      // Add created_at date and handle undefined values
      const fullTaskData = {
        title: taskData.title,
        description: taskData.description || null,
        due_type: taskData.due_type,
        due_offset: taskData.due_offset || null,
        fixed_date: taskData.fixed_date ? new Date(taskData.fixed_date) : null,
        recurrence: taskData.recurrence,
        assignment_role: taskData.assignment_role,
        required_fields: taskData.required_fields || [],
        template_message: taskData.template_message || null,
        order: taskData.order,
        created_at: new Date()
      };
      
      const task = await storage.createPlaybookTask(playbookId, fullTaskData);
      res.status(201).json(task);
    } catch (error) {
      res.status(400).json({ message: 'Invalid playbook task data', error });
    }
  });
  
  // Red Zone Alerts
  // RedZone Alerts Endpoints
  app.get('/api/red-zone/alerts', async (req, res) => {
    const customerId = req.query.customerId ? parseInt(req.query.customerId as string) : undefined;
    
    let alerts;
    if (customerId) {
      alerts = await storage.getRedZoneAlertsByCustomer(customerId);
    } else {
      alerts = await storage.getRedZoneAlerts();
    }
    
    res.json(alerts);
  });
  
  app.get('/api/red-zone/alerts/:id', async (req, res) => {
    const alertId = parseInt(req.params.id);
    const alert = await storage.getRedZoneAlert(alertId);
    
    if (!alert) {
      return res.status(404).json({ message: 'RedZone alert not found' });
    }
    
    res.json(alert);
  });
  
  app.post('/api/red-zone/alerts', async (req, res) => {
    try {
      const alertData = insertRedZoneAlertSchema.parse(req.body);
      const alert = await storage.createRedZoneAlert(alertData);
      res.status(201).json(alert);
    } catch (error) {
      res.status(400).json({ message: 'Invalid alert data', error });
    }
  });
  
  app.put('/api/red-zone/alerts/:id', async (req, res) => {
    try {
      const alertId = parseInt(req.params.id);
      const alertData = req.body;
      const updatedAlert = await storage.updateRedZoneAlert(alertId, alertData);
      
      if (!updatedAlert) {
        return res.status(404).json({ message: 'RedZone alert not found' });
      }
      
      res.json(updatedAlert);
    } catch (error) {
      res.status(400).json({ message: 'Invalid alert data', error });
    }
  });
  
  app.post('/api/red-zone/alerts/:id/resolve', async (req, res) => {
    const alertId = parseInt(req.params.id);
    const { userId, resolutionSummary } = req.body;
    
    const resolvedAlert = await storage.resolveRedZoneAlert(
      alertId, 
      userId ? parseInt(userId) : undefined,
      resolutionSummary
    );
    
    if (!resolvedAlert) {
      return res.status(404).json({ message: 'RedZone alert not found' });
    }
    
    res.json(resolvedAlert);
  });
  
  app.post('/api/red-zone/alerts/:id/escalate', async (req, res) => {
    const alertId = parseInt(req.params.id);
    const { teamLeadId } = req.body;
    
    if (!teamLeadId) {
      return res.status(400).json({ message: 'Team lead ID is required' });
    }
    
    const escalatedAlert = await storage.escalateRedZoneAlert(alertId, parseInt(teamLeadId));
    
    if (!escalatedAlert) {
      return res.status(404).json({ message: 'RedZone alert not found' });
    }
    
    res.json(escalatedAlert);
  });
  
  // RedZone Activity Logs
  app.get('/api/red-zone/activity-logs/:alertId', async (req, res) => {
    const alertId = parseInt(req.params.alertId);
    const logs = await storage.getRedZoneActivityLogs(alertId);
    res.json(logs);
  });
  
  app.post('/api/red-zone/activity-logs', async (req, res) => {
    try {
      const logData = insertRedZoneActivityLogSchema.parse(req.body);
      const log = await storage.createRedZoneActivityLog(logData);
      res.status(201).json(log);
    } catch (error) {
      res.status(400).json({ message: 'Invalid activity log data', error });
    }
  });
  
  // RedZone Rules
  app.get('/api/red-zone/rules', async (req, res) => {
    const rules = await storage.getRedZoneRules();
    res.json(rules);
  });
  
  app.get('/api/red-zone/rules/:id', async (req, res) => {
    const ruleId = parseInt(req.params.id);
    const rule = await storage.getRedZoneRule(ruleId);
    
    if (!rule) {
      return res.status(404).json({ message: 'RedZone rule not found' });
    }
    
    res.json(rule);
  });
  
  app.post('/api/red-zone/rules', async (req, res) => {
    try {
      console.log('Attempting to create RedZone rule with data:', JSON.stringify(req.body));
      
      // Convert stringified JSON fields if they're passed as strings
      const formattedData = {
        ...req.body,
        // Ensure conditions is a proper JSON object
        conditions: typeof req.body.conditions === 'string' 
          ? JSON.parse(req.body.conditions) 
          : req.body.conditions,
        // Ensure resolution_conditions is a proper JSON object or array
        resolution_conditions: req.body.resolution_conditions && typeof req.body.resolution_conditions === 'string'
          ? JSON.parse(req.body.resolution_conditions)
          : req.body.resolution_conditions || []
      };
      
      console.log('Formatted rule data:', JSON.stringify(formattedData));
      const ruleData = insertRedZoneRuleSchema.parse(formattedData);
      console.log('Validated rule data:', JSON.stringify(ruleData));
      
      const rule = await storage.createRedZoneRule(ruleData);
      res.status(201).json(rule);
    } catch (error) {
      console.error('Error creating RedZone rule:', error);
      
      // Provide more detailed error information
      let errorMessage = 'Invalid rule data';
      if (error.errors) {
        errorMessage = `Validation failed: ${error.errors.map(e => e.message).join(', ')}`;
      }
      
      res.status(400).json({ 
        message: errorMessage,
        error: error.errors || error.message || String(error)
      });
    }
  });
  
  app.put('/api/red-zone/rules/:id', async (req, res) => {
    try {
      const ruleId = parseInt(req.params.id);
      console.log('Attempting to update RedZone rule with ID:', ruleId);
      console.log('Rule update data:', JSON.stringify(req.body));
      
      // Convert stringified JSON fields if they're passed as strings
      const formattedData = {
        ...req.body,
        // Ensure conditions is a proper JSON object
        conditions: typeof req.body.conditions === 'string' 
          ? JSON.parse(req.body.conditions) 
          : req.body.conditions,
        // Ensure resolution_conditions is a proper JSON object or array
        resolution_conditions: req.body.resolution_conditions && typeof req.body.resolution_conditions === 'string'
          ? JSON.parse(req.body.resolution_conditions)
          : req.body.resolution_conditions || []
      };
      
      console.log('Formatted update data:', JSON.stringify(formattedData));
      
      const updatedRule = await storage.updateRedZoneRule(ruleId, formattedData);
      
      if (!updatedRule) {
        return res.status(404).json({ message: 'RedZone rule not found' });
      }
      
      res.json(updatedRule);
    } catch (error) {
      console.error('Error updating RedZone rule:', error);
      
      // Provide more detailed error information
      let errorMessage = 'Invalid rule data';
      if (error.errors) {
        errorMessage = `Validation failed: ${error.errors.map(e => e.message).join(', ')}`;
      }
      
      res.status(400).json({ 
        message: errorMessage,
        error: error.errors || error.message || String(error)
      });
    }
  });
  
  app.delete('/api/red-zone/rules/:id', async (req, res) => {
    const ruleId = parseInt(req.params.id);
    const success = await storage.deleteRedZoneRule(ruleId);
    
    if (!success) {
      return res.status(404).json({ message: 'RedZone rule not found or could not be deleted' });
    }
    
    res.status(204).end();
  });
  
  // RedZone Resolution Criteria
  app.get('/api/red-zone/resolution-criteria/:ruleId', async (req, res) => {
    const ruleId = parseInt(req.params.ruleId);
    const criteria = await storage.getRedZoneResolutionCriteria(ruleId);
    res.json(criteria);
  });
  
  app.post('/api/red-zone/resolution-criteria', async (req, res) => {
    try {
      const criteriaData = insertRedZoneResolutionCriteriaSchema.parse(req.body);
      const criteria = await storage.createRedZoneResolutionCriteria(criteriaData);
      res.status(201).json(criteria);
    } catch (error) {
      res.status(400).json({ message: 'Invalid resolution criteria data', error });
    }
  });
  
  app.delete('/api/red-zone/resolution-criteria/:id', async (req, res) => {
    const criteriaId = parseInt(req.params.id);
    const success = await storage.deleteRedZoneResolutionCriteria(criteriaId);
    
    if (!success) {
      return res.status(404).json({ message: 'Resolution criteria not found or could not be deleted' });
    }
    
    res.status(204).end();
  });
  
  // Get available fields for RedZone rules
  app.get('/api/red-zone/available-fields', async (req, res) => {
    try {
      const { getAvailableFields } = await import('./get-available-fields');
      const fields = await getAvailableFields();
      res.json(fields);
    } catch (error) {
      console.error('Error getting available fields:', error);
      res.status(500).json({ 
        message: 'Failed to get available fields', 
        error: error instanceof Error ? error.message : String(error) 
      });
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
    try {
      const config = await storage.getMySQLConfig();
      res.json(config || { 
        host: "", 
        port: 3306, 
        username: "", 
        password: "", 
        database: "" 
      });
    } catch (error) {
      console.error('Error getting MySQL config:', error);
      res.json({ 
        host: "", 
        port: 3306, 
        username: "", 
        password: "", 
        database: "" 
      });
    }
  });
  
  app.post('/api/admin/mysql-config', async (req, res) => {
    try {
      // Create proper schema with all required fields
      const configSchema = z.object({
        host: z.string(),
        port: z.number(),
        username: z.string(),
        password: z.string(),
        database: z.string(),
        status: z.enum(['active', 'pending', 'error']).optional().default('active'),
        sync_frequency: z.number().optional().default(24), // Default sync every 24 hours
        created_by: z.number().optional().default(1)
      });
      
      // Parse the request body
      const configData = configSchema.parse(req.body);
      
      // Add last_synced_at field with null value for new configs
      const configWithLastSynced = {
        ...configData,
        last_synced_at: null
      };
      
      // Create a new config
      // This will replace any existing config due to the table structure
      const config = await storage.createMySQLConfig(configWithLastSynced);
      res.status(201).json(config);
    } catch (error) {
      res.status(400).json({ message: 'Invalid MySQL config data', error });
    }
  });
  
  // Test MySQL connection
  app.post('/api/admin/mysql-config/test', async (req, res) => {
    try {
      const configSchema = z.object({
        host: z.string(),
        port: z.number(),
        username: z.string(),
        password: z.string(),
        database: z.string()
      });
      
      const configData = configSchema.parse(req.body);
      
      // Create a temporary MySQL service to test the connection
      const mysql = await import('mysql2/promise');
      
      try {
        // Create a connection pool with a timeout
        const pool = mysql.createPool({
          host: configData.host,
          port: configData.port,
          user: configData.username,
          password: configData.password,
          database: configData.database,
          waitForConnections: true,
          connectionLimit: 1,
          queueLimit: 0,
          connectTimeout: 5000 // 5 second timeout
        });
        
        // Try to get a connection from the pool
        const conn = await pool.getConnection();
        conn.release(); // Release the connection immediately
        await pool.end(); // Close the pool
        
        res.json({ success: true, message: "Successfully connected to the MySQL database" });
      } catch (dbError) {
        console.error('MySQL connection test failed:', dbError);
        res.status(400).json({ 
          success: false, 
          message: `Failed to connect to MySQL database: ${dbError.message}` 
        });
      }
    } catch (error) {
      console.error('MySQL config validation error:', error);
      res.status(400).json({ 
        success: false, 
        message: "Invalid MySQL configuration data",
        error: error.message 
      });
    }
  });
  
  // Run MySQL Query
  app.post('/api/admin/mysql-query', async (req, res) => {
    try {
      // Validate the query input
      const querySchema = z.object({
        query: z.string().min(1),
        preview: z.boolean().optional().default(true) // Flag to indicate if this is a preview (default: true)
      });
      
      const { query, preview } = querySchema.parse(req.body);
      
      // Get the MySQL connection config
      const config = await storage.getMySQLConfig();
      
      if (!config) {
        return res.status(400).json({ error: 'MySQL configuration not found. Please configure MySQL connection first.' });
      }
      
      // Create a temporary MySQL connection to run the query
      const mysql = await import('mysql2/promise');
      
      try {
        // Create a connection pool with a timeout
        const pool = mysql.createPool({
          host: config.host,
          port: config.port,
          user: config.username,
          password: config.password,
          database: config.database,
          waitForConnections: true,
          connectionLimit: 1,
          queueLimit: 0,
          connectTimeout: 5000 // 5 second timeout
        });
        
        // Execute the query with safety checks
        let safeQuery = query.trim();
        
        // Prevent destructive queries in production
        if (process.env.NODE_ENV === 'production') {
          const lowerQuery = safeQuery.toLowerCase();
          if (
            lowerQuery.includes('drop table') || 
            lowerQuery.includes('drop database') ||
            lowerQuery.includes('truncate table')
          ) {
            await pool.end();
            return res.status(403).json({ 
              error: 'Destructive queries are not allowed in production environment'
            });
          }
        }
        
        // For preview queries, enforce a LIMIT 10 if not already present
        // This only affects UI preview and not actual data synchronization
        if (preview) {
          const lowerQuery = safeQuery.toLowerCase();
          
          // Check if the query already has a LIMIT clause
          if (!lowerQuery.includes('limit')) {
            // For SELECT queries, add LIMIT 10
            if (lowerQuery.trim().startsWith('select')) {
              safeQuery = `${safeQuery} LIMIT 10`;
            }
          }
          
          console.log(`Preview query with limit: ${safeQuery}`);
        } else {
          console.log(`Full data query: ${safeQuery}`);
        }
        
        // Run the query
        const [results] = await pool.query(safeQuery);
        await pool.end();
        
        // For preview queries, only return a maximum of 10 rows
        if (preview) {
          // Take only the first 10 results regardless of what was returned
          const limitedResults = Array.isArray(results) ? results.slice(0, 10) : [];
          
          return res.json({
            results: limitedResults,
            isPreview: true,
            previewLimit: 10,
            totalResults: Array.isArray(results) ? results.length : 0,
            originalQuery: query.trim()
          });
        }
        
        res.json(results || []);
      } catch (dbError) {
        console.error('MySQL query execution failed:', dbError);
        res.status(400).json({ 
          error: `Failed to execute MySQL query: ${dbError.message}` 
        });
      }
    } catch (error) {
      console.error('MySQL query validation error:', error);
      res.status(400).json({ 
        error: "Invalid query format",
        details: error.message 
      });
    }
  });
  
  // MySQL Field Mappings
  app.get('/api/admin/mysql-field-mappings', async (req, res) => {
    try {
      const mappings = await storage.getMySQLFieldMappings();
      res.json(mappings);
    } catch (error) {
      console.error('Error getting MySQL field mappings:', error);
      res.status(500).json({ message: 'Failed to fetch field mappings', error: (error as Error).message });
    }
  });
  
  // MySQL Data Sync
  app.post('/api/admin/mysql-sync', async (req, res) => {
    try {
      const { mysqlSyncService } = await import('./mysql-sync-service');
      const result = await mysqlSyncService.synchronizeData();
      
      // Ensure correct content type and response
      res.setHeader('Content-Type', 'application/json');
      res.json(result);
    } catch (error) {
      console.error('MySQL sync error:', error);
      
      // Ensure correct content type and response
      res.setHeader('Content-Type', 'application/json');
      res.status(500).json({ 
        success: false, 
        message: `Error synchronizing MySQL data: ${error instanceof Error ? error.message : String(error)}` 
      });
    }
  });
  
  // MySQL Scheduler Control
  app.post('/api/admin/mysql-scheduler/:action', async (req, res) => {
    try {
      const { action } = req.params;
      const { mysqlScheduler } = await import('./mysql-scheduler');
      
      let result: { success: boolean; message: string; status?: string };
      
      switch (action) {
        case 'start':
          mysqlScheduler.start();
          result = { success: true, message: 'MySQL scheduler started', status: 'running' };
          break;
        
        case 'stop':
          mysqlScheduler.stop();
          result = { success: true, message: 'MySQL scheduler stopped', status: 'stopped' };
          break;
        
        case 'status':
          const isRunning = mysqlScheduler.isRunning();
          result = { 
            success: true, 
            message: `MySQL scheduler is ${isRunning ? 'running' : 'stopped'}`,
            status: isRunning ? 'running' : 'stopped' 
          };
          break;
        
        default:
          result = { success: false, message: `Unknown action: ${action}`, status: 'unknown' };
      }
      
      res.json(result);
    } catch (error) {
      console.error('MySQL scheduler control error:', error);
      res.status(500).json({ 
        success: false, 
        message: `Error controlling MySQL scheduler: ${error instanceof Error ? error.message : String(error)}`,
        status: 'error'
      });
    }
  });
  
  // Chargebee Scheduler Control
  app.post('/api/admin/chargebee-scheduler/:action', async (req, res) => {
    try {
      const { action } = req.params;
      const { chargebeeScheduler } = await import('./chargebee-scheduler');
      
      let result: { success: boolean; message: string; status?: string };
      
      switch (action) {
        case 'start':
          chargebeeScheduler.start();
          result = { success: true, message: 'Chargebee scheduler started', status: 'running' };
          break;
        
        case 'stop':
          chargebeeScheduler.stop();
          result = { success: true, message: 'Chargebee scheduler stopped', status: 'stopped' };
          break;
        
        case 'status':
          const isRunning = chargebeeScheduler.isRunning();
          result = { 
            success: true, 
            message: `Chargebee scheduler is ${isRunning ? 'running' : 'stopped'}`,
            status: isRunning ? 'running' : 'stopped'
          };
          break;
        
        default:
          result = { success: false, message: `Unknown action: ${action}`, status: 'unknown' };
      }
      
      res.json(result);
    } catch (error) {
      console.error('Chargebee scheduler control error:', error);
      res.status(500).json({ 
        success: false, 
        message: `Error controlling Chargebee scheduler: ${error instanceof Error ? error.message : String(error)}`,
        status: 'error'
      });
    }
  });
  
  // Chargebee Manual Sync
  app.post('/api/admin/chargebee-sync', async (req, res) => {
    try {
      const { chargebeeSyncService } = await import('./chargebee-sync-service');
      
      // Perform manual sync
      console.log('Starting manual Chargebee data synchronization...');
      const result = await chargebeeSyncService.synchronizeData();
      console.log('Manual Chargebee sync result:', result);
      
      // Ensure correct content type and response
      res.setHeader('Content-Type', 'application/json');
      res.json({
        success: result.success,
        message: result.message,
        records: result.records || 0,
        syncStats: result.syncStats || null,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Manual Chargebee sync error:', error);
      
      // Ensure correct content type and response
      res.setHeader('Content-Type', 'application/json');
      res.status(500).json({ 
        success: false, 
        message: `Error during manual Chargebee sync: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  });
  
  app.post('/api/admin/mysql-field-mappings', async (req, res) => {
    try {
      const mappingSchema = z.object({
        mysql_table: z.string(),
        mysql_field: z.string(),
        local_table: z.string(),
        local_field: z.string(),
        field_type: z.string().optional().default('text'),
        is_key_field: z.boolean().optional().default(false),
        created_by: z.number().optional().default(1)
      });
      
      const mappingData = mappingSchema.parse(req.body);
      const mapping = await storage.createMySQLFieldMapping(mappingData);
      res.status(201).json(mapping);
    } catch (error) {
      res.status(400).json({ message: 'Invalid field mapping data', error });
    }
  });
  
  app.put('/api/admin/mysql-field-mappings/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const mappingSchema = z.object({
        mysql_table: z.string(),
        mysql_field: z.string(),
        local_table: z.string(),
        local_field: z.string(),
        field_type: z.string().optional(),
        is_key_field: z.boolean().optional()
      });
      
      const mappingData = mappingSchema.parse(req.body);
      const mapping = await storage.updateMySQLFieldMapping(id, mappingData);
      
      if (!mapping) {
        return res.status(404).json({ message: 'Field mapping not found' });
      }
      
      res.json(mapping);
    } catch (error) {
      res.status(400).json({ message: 'Invalid mapping data', error });
    }
  });
  
  app.delete('/api/admin/mysql-field-mappings/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteMySQLFieldMapping(id);
      
      if (!success) {
        return res.status(404).json({ message: 'Field mapping not found' });
      }
      
      // Include the deleted ID in the response for client-side state updates
      res.json({ success, deletedId: id });
    } catch (error) {
      res.status(500).json({ message: 'Failed to delete field mapping', error });
    }
  });

  // Customer Fields for Field Mapping
  app.get('/api/admin/customer-fields', async (req, res) => {
    try {
      const fields = await storage.getCustomerTableFields();
      res.json(fields);
    } catch (error) {
      console.error('Error fetching customer fields:', error);
      res.status(500).json({ 
        message: 'Failed to fetch customer fields', 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });
  
  // Table-specific fields for filtering dropdowns
  app.get('/api/admin/table-fields/:tableName', async (req, res) => {
    try {
      const { tableName } = req.params;
      let fields = [];
      
      // Validate table name to prevent SQL injection
      const validTables = ['customers', 'customer_metrics', 'tasks'];
      if (!validTables.includes(tableName)) {
        return res.status(400).json({ message: 'Invalid table name' });
      }
      
      // Get fields for the specified table
      if (tableName === 'customers') {
        fields = await storage.getCustomerTableFields();
      } else if (tableName === 'customer_metrics') {
        fields = await storage.getTableFields('customer_metrics');
      } else if (tableName === 'tasks') {
        fields = await storage.getTableFields('tasks');
      }
      
      res.json(fields);
    } catch (error) {
      console.error(`Error getting fields for table: ${error}`);
      res.status(500).json({ 
        message: `Failed to get table fields`, 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });

  // Notifications
  app.get('/api/notifications', async (req, res) => {
    try {
      const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
      
      if (!userId) {
        return res.status(400).json({ message: 'User ID is required' });
      }
      
      const notifications = await storage.getNotifications(userId);
      res.json(notifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({ message: 'Error fetching notifications' });
    }
  });
  
  app.post('/api/notifications', async (req, res) => {
    try {
      const notificationData = insertNotificationSchema.parse(req.body);
      const notification = await storage.createNotification(notificationData);
      res.status(201).json(notification);
    } catch (error) {
      res.status(400).json({ message: 'Invalid notification data', error });
    }
  });
  
  app.patch('/api/notifications/:id/mark-read', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const notification = await storage.markNotificationAsRead(id);
      
      if (!notification) {
        return res.status(404).json({ message: 'Notification not found' });
      }
      
      res.json(notification);
    } catch (error) {
      res.status(500).json({ message: 'Error marking notification as read', error });
    }
  });
  
  app.patch('/api/notifications/mark-all-read', async (req, res) => {
    try {
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ message: 'User ID is required' });
      }
      
      const result = await storage.markAllNotificationsAsRead(userId);
      res.json({ success: true, count: result });
    } catch (error) {
      res.status(500).json({ message: 'Error marking all notifications as read', error });
    }
  });
  
  // User Achievements
  app.get('/api/achievements', async (req, res) => {
    try {
      const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
      
      if (!userId) {
        return res.status(400).json({ message: 'User ID is required' });
      }
      
      const achievements = await storage.getUserAchievements(userId);
      res.json(achievements);
    } catch (error) {
      console.error('Error fetching achievements:', error);
      res.status(500).json({ message: 'Error fetching achievements' });
    }
  });
  
  app.post('/api/achievements', async (req, res) => {
    try {
      const achievementData = insertUserAchievementSchema.parse(req.body);
      const achievement = await storage.createUserAchievement(achievementData);
      res.status(201).json(achievement);
    } catch (error) {
      res.status(400).json({ message: 'Invalid achievement data', error });
    }
  });
  
  app.patch('/api/achievements/:id/mark-viewed', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const achievement = await storage.markAchievementAsViewed(id);
      
      if (!achievement) {
        return res.status(404).json({ message: 'Achievement not found' });
      }
      
      res.json(achievement);
    } catch (error) {
      res.status(500).json({ message: 'Error marking achievement as viewed', error });
    }
  });
  
  app.get('/api/achievements/stats', async (req, res) => {
    try {
      const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
      
      if (!userId) {
        return res.status(400).json({ message: 'User ID is required' });
      }
      
      // Get user achievements
      const achievements = await storage.getUserAchievements(userId);
      
      // Calculate stats
      const totalXp = achievements.reduce((sum, achievement) => sum + (achievement.xp_earned || 0), 0);
      const totalAchievements = achievements.length;
      const achievementsByType = achievements.reduce((acc, achievement) => {
        const type = achievement.achievement_type;
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      // Calculate level based on XP (simple calculation, can be customized)
      const level = Math.floor(totalXp / 1000) + 1;
      
      res.json({
        totalXp,
        totalAchievements,
        level,
        achievementsByType,
        recentAchievements: achievements.slice(0, 5)
      });
    } catch (error) {
      console.error('Error fetching achievement stats:', error);
      res.status(500).json({ message: 'Error fetching achievement stats' });
    }
  });
  
  // System Settings - Achievement Configuration
  app.get('/api/admin/system/achievement-thresholds', async (req, res) => {
    try {
      // Get achievement thresholds from storage
      const thresholds = await storage.getAchievementThresholds();
      res.json(thresholds);
    } catch (error) {
      console.error('Error fetching achievement thresholds:', error);
      res.status(500).json({ message: 'Error fetching achievement thresholds' });
    }
  });
  
  app.post('/api/admin/system/achievement-thresholds', async (req, res) => {
    try {
      // Save achievement thresholds to storage
      const thresholds = req.body;
      const result = await storage.saveAchievementThresholds(thresholds);
      res.json(result);
    } catch (error) {
      console.error('Error saving achievement thresholds:', error);
      res.status(500).json({ message: 'Error saving achievement thresholds' });
    }
  });
  
  app.get('/api/admin/system/badge-config', async (req, res) => {
    try {
      // Get badge configuration from storage
      const badgeConfig = await storage.getBadgeConfiguration();
      res.json(badgeConfig);
    } catch (error) {
      console.error('Error fetching badge configuration:', error);
      res.status(500).json({ message: 'Error fetching badge configuration' });
    }
  });
  
  app.post('/api/admin/system/badge-config', async (req, res) => {
    try {
      // Save badge configuration to storage
      const badgeConfig = req.body;
      const result = await storage.saveBadgeConfiguration(badgeConfig);
      res.json(result);
    } catch (error) {
      console.error('Error saving badge configuration:', error);
      res.status(500).json({ message: 'Error saving badge configuration' });
    }
  });
  
  app.get('/api/admin/system/notification-settings', async (req, res) => {
    try {
      // Get notification settings from storage
      const notificationSettings = await storage.getNotificationSettings();
      res.json(notificationSettings);
    } catch (error) {
      console.error('Error fetching notification settings:', error);
      res.status(500).json({ message: 'Error fetching notification settings' });
    }
  });
  
  app.post('/api/admin/system/notification-settings', async (req, res) => {
    try {
      // Save notification settings to storage
      const notificationSettings = req.body;
      const result = await storage.saveNotificationSettings(notificationSettings);
      res.json(result);
    } catch (error) {
      console.error('Error saving notification settings:', error);
      res.status(500).json({ message: 'Error saving notification settings' });
    }
  });
  
  app.get('/api/admin/system/xp-config', async (req, res) => {
    try {
      // Get XP configuration from storage
      const xpConfig = await storage.getXpConfiguration();
      res.json(xpConfig);
    } catch (error) {
      console.error('Error fetching XP configuration:', error);
      res.status(500).json({ message: 'Error fetching XP configuration' });
    }
  });
  
  app.post('/api/admin/system/xp-config', async (req, res) => {
    try {
      // Save XP configuration to storage
      const xpConfig = req.body;
      const result = await storage.saveXpConfiguration(xpConfig);
      res.json(result);
    } catch (error) {
      console.error('Error saving XP configuration:', error);
      res.status(500).json({ message: 'Error saving XP configuration' });
    }
  });

  // MySQL Saved Queries
  app.get('/api/admin/mysql-saved-queries', async (req, res) => {
    try {
      const queries = await storage.getMySQLSavedQueries();
      res.json(queries);
    } catch (error) {
      console.error('Error getting MySQL saved queries:', error);
      res.status(500).json({ message: 'Failed to fetch saved queries', error: (error as Error).message });
    }
  });

  app.get('/api/admin/mysql-saved-queries/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const query = await storage.getMySQLSavedQuery(id);
      
      if (!query) {
        return res.status(404).json({ message: 'Saved query not found' });
      }
      
      res.json(query);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch saved query', error: (error as Error).message });
    }
  });

  app.post('/api/admin/mysql-saved-queries', async (req, res) => {
    try {
      // Remove any LIMIT statements from the query before saving
      let query = req.body.query || '';
      const limitRegex = /\s+LIMIT\s+\d+(\s*,\s*\d+)?/i;
      query = query.replace(limitRegex, '');
      
      const queryData = insertMySQLSavedQuerySchema.parse({
        ...req.body,
        query: query.trim()
      });
      
      const savedQuery = await storage.createMySQLSavedQuery(queryData);
      res.status(201).json(savedQuery);
    } catch (error) {
      res.status(400).json({ message: 'Invalid saved query data', error });
    }
  });

  app.put('/api/admin/mysql-saved-queries/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const queryData = insertMySQLSavedQuerySchema.partial().parse(req.body);
      const updatedQuery = await storage.updateMySQLSavedQuery(id, queryData);
      
      if (!updatedQuery) {
        return res.status(404).json({ message: 'Saved query not found' });
      }
      
      res.json(updatedQuery);
    } catch (error) {
      res.status(400).json({ message: 'Invalid saved query data', error });
    }
  });

  app.delete('/api/admin/mysql-saved-queries/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteMySQLSavedQuery(id);
      
      if (!success) {
        return res.status(404).json({ message: 'Saved query not found' });
      }
      
      res.json({ success });
    } catch (error) {
      res.status(500).json({ message: 'Failed to delete saved query', error });
    }
  });

  app.post('/api/admin/mysql-saved-queries/:id/run', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const savedQuery = await storage.getMySQLSavedQuery(id);
      
      if (!savedQuery) {
        return res.status(404).json({ message: 'Saved query not found' });
      }
      
      // Import the MySQL service to execute the query
      const { mysqlService } = await import('./mysql-service');
      
      // Execute the saved query
      const result = await mysqlService.executeQuery(savedQuery.query);
      
      // Update the last run timestamp
      await storage.updateMySQLSavedQueryLastRun(id);
      
      // Return the query results
      res.json({
        success: true,
        query: savedQuery,
        results: result.rows,
        fields: result.fields
      });
    } catch (error) {
      console.error('Error executing saved query:', error);
      res.status(500).json({ 
        success: false, 
        message: `Error executing saved query: ${error instanceof Error ? error.message : String(error)}` 
      });
    }
  });
  
  // Chargebee Config
  app.get('/api/admin/chargebee-config', async (req, res) => {
    try {
      const config = await storage.getChargebeeConfig();
      res.json(config || { site: "", apiKey: "" });
    } catch (error) {
      console.error('Error getting Chargebee config:', error);
      res.json({ site: "", apiKey: "" });
    }
  });
  
  app.post('/api/admin/chargebee-config', async (req, res) => {
    try {
      const configSchema = z.object({
        site: z.string(),
        apiKey: z.string(),
        status: z.enum(['active', 'pending', 'error']).optional().default('active'),
        sync_frequency: z.number().optional().default(24), // Default sync every 24 hours
        created_by: z.number().optional().default(1)
      });
      
      const configData = configSchema.parse(req.body);
      
      // Add last_synced_at and last_sync_stats fields with null values for new configs
      const configWithLastSynced = {
        ...configData,
        last_synced_at: null,
        last_sync_stats: null
      };
      
      // Create a new config
      // This will replace any existing config due to the table structure
      const config = await storage.createChargebeeConfig(configWithLastSynced);
      res.status(201).json(config);
    } catch (error) {
      res.status(400).json({ message: 'Invalid Chargebee config data', error });
    }
  });
  
  app.post('/api/admin/chargebee-config/test', async (req, res) => {
    try {
      const configSchema = z.object({
        site: z.string(),
        apiKey: z.string()
      });
      
      const configData = configSchema.parse(req.body);
      
      // Set temporary environment variables for testing
      process.env.CHARGEBEE_SITE = configData.site;
      process.env.CHARGEBEE_API_KEY = configData.apiKey;
      
      // Try to initialize the service with the new credentials
      const { chargebeeService } = await import('./chargebee');
      
      if (!chargebeeService) {
        return res.status(500).json({ success: false, message: 'Failed to initialize Chargebee service' });
      }
      
      // Try a test API call to validate credentials
      await chargebeeService.getSubscriptions(1);
      
      res.json({ success: true, message: 'Connection successful' });
    } catch (error: any) {
      res.status(400).json({ 
        success: false, 
        message: 'Chargebee connection failed', 
        errorMessage: error.message || 'Unknown error' 
      });
    }
  });

  // Chargebee Field Mappings endpoints
  app.get('/api/admin/chargebee-field-mappings', async (req, res) => {
    try {
      const mappings = await storage.getChargebeeFieldMappings();
      res.json(mappings);
    } catch (error) {
      console.error('Error getting Chargebee field mappings:', error);
      res.status(500).json({ message: 'Failed to fetch field mappings' });
    }
  });

  app.post('/api/admin/chargebee-field-mappings', async (req, res) => {
    try {
      const mappingSchema = z.object({
        chargebee_entity: z.string(),
        chargebee_field: z.string(),
        local_table: z.string(),
        local_field: z.string(),
        is_key_field: z.boolean().optional().default(false),
        created_by: z.number().optional().default(1)
      });
      
      const mappingData = mappingSchema.parse(req.body);
      const mapping = await storage.createChargebeeFieldMapping(mappingData);
      res.status(201).json(mapping);
    } catch (error) {
      res.status(400).json({ message: 'Invalid mapping data', error });
    }
  });

  app.put('/api/admin/chargebee-field-mappings/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const mappingSchema = z.object({
        chargebee_entity: z.string(),
        chargebee_field: z.string(),
        local_table: z.string(),
        local_field: z.string(),
        is_key_field: z.boolean().optional()
      });
      
      const mappingData = mappingSchema.parse(req.body);
      const mapping = await storage.updateChargebeeFieldMapping(id, mappingData);
      
      if (!mapping) {
        return res.status(404).json({ message: 'Field mapping not found' });
      }
      
      res.json(mapping);
    } catch (error) {
      res.status(400).json({ message: 'Invalid mapping data', error });
    }
  });

  app.delete('/api/admin/chargebee-field-mappings/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteChargebeeFieldMapping(id);
      
      if (!success) {
        return res.status(404).json({ message: 'Field mapping not found' });
      }
      
      // Include the deleted ID in the response for client-side state updates
      res.json({ success, deletedId: id });
    } catch (error) {
      res.status(500).json({ message: 'Failed to delete field mapping', error });
    }
  });

  // Get available fields for mapping from Chargebee
  app.get('/api/admin/chargebee-available-fields', async (req, res) => {
    try {
      // Define the structure of the different entity types in Chargebee
      const availableFields = {
        customer: [
          { name: 'id', description: 'Customer ID' },
          { name: 'first_name', description: 'First Name' },
          { name: 'last_name', description: 'Last Name' },
          { name: 'email', description: 'Email Address' },
          { name: 'company', description: 'Company Name' },
          { name: 'created_at', description: 'Creation Date' },
          { name: 'updated_at', description: 'Last Updated Date' }
        ],
        subscription: [
          { name: 'id', description: 'Subscription ID' },
          { name: 'customer_id', description: 'Customer ID' },
          { name: 'status', description: 'Status (active, cancelled, etc)' },
          { name: 'plan_id', description: 'Plan ID' },
          { name: 'plan_amount', description: 'Plan Amount' },
          { name: 'currency_code', description: 'Currency Code' },
          { name: 'next_billing_at', description: 'Next Billing Date' },
          { name: 'created_at', description: 'Creation Date' },
          { name: 'started_at', description: 'Start Date' },
          { name: 'updated_at', description: 'Last Updated Date' },
          { name: 'billing_period', description: 'Billing Period' },
          { name: 'billing_period_unit', description: 'Billing Period Unit (month, year)' }
        ],
        invoice: [
          { name: 'id', description: 'Invoice ID' },
          { name: 'subscription_id', description: 'Subscription ID' },
          { name: 'customer_id', description: 'Customer ID' },
          { name: 'amount', description: 'Amount' },
          { name: 'amount_paid', description: 'Amount Paid' },
          { name: 'amount_due', description: 'Amount Due' },
          { name: 'status', description: 'Status' },
          { name: 'date', description: 'Invoice Date' },
          { name: 'due_date', description: 'Due Date' },
          { name: 'paid_at', description: 'Paid Date' },
          { name: 'total', description: 'Total Amount' }
        ]
      };
      
      res.json(availableFields);
    } catch (error) {
      res.status(500).json({ message: 'Failed to get available fields', error });
    }
  });

  // Note: External data routes are now registered directly in server/index.ts

  // Register user management routes - managed separately

  const httpServer = createServer(app);
  return httpServer;
}
