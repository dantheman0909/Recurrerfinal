/**
 * Database API for the Recurrer platform
 * This module provides simplified functions for database operations
 */

const dbManager = require('./persistent-db');

// Users
async function getUsers() {
  return dbManager.executeQuery(async (db) => {
    return db.execute('SELECT * FROM users');
  });
}

async function getUserById(id) {
  return dbManager.executeQuery(async (db) => {
    const [user] = await db.execute(
      'SELECT * FROM users WHERE id = $1 LIMIT 1',
      [id]
    );
    return user;
  });
}

async function getUserByUsername(username) {
  return dbManager.executeQuery(async (db) => {
    const [user] = await db.execute(
      'SELECT * FROM users WHERE username = $1 LIMIT 1',
      [username]
    );
    return user;
  });
}

async function createUser(userData) {
  return dbManager.executeQuery(async (db) => {
    const [user] = await db.execute(
      'INSERT INTO users (username, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING *',
      [userData.username, userData.email, userData.password_hash, userData.role || 'user']
    );
    return user;
  });
}

// Customers
async function getCustomers() {
  return dbManager.executeQuery(async (db) => {
    return db.execute('SELECT * FROM customers ORDER BY name ASC');
  });
}

async function getCustomerById(id) {
  return dbManager.executeQuery(async (db) => {
    const [customer] = await db.execute(
      'SELECT * FROM customers WHERE id = $1 LIMIT 1',
      [id]
    );
    return customer;
  });
}

async function createCustomer(customerData) {
  return dbManager.executeQuery(async (db) => {
    const [customer] = await db.execute(
      'INSERT INTO customers (name, csm_id, renewal_date, subscription_id, chargebee_id, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [
        customerData.name,
        customerData.csm_id,
        customerData.renewal_date,
        customerData.subscription_id,
        customerData.chargebee_id,
        customerData.status || 'active'
      ]
    );
    return customer;
  });
}

async function updateCustomer(id, customerData) {
  // Build the UPDATE query dynamically based on provided fields
  return dbManager.executeQuery(async (db) => {
    const updates = [];
    const values = [];
    let paramCounter = 1;
    
    // Add each field that exists to the update query
    for (const [key, value] of Object.entries(customerData)) {
      if (value !== undefined && key !== 'id') {
        updates.push(`${key} = $${paramCounter}`);
        values.push(value);
        paramCounter++;
      }
    }
    
    if (updates.length === 0) {
      throw new Error('No fields to update');
    }
    
    values.push(id);
    
    const [customer] = await db.execute(
      `UPDATE customers SET ${updates.join(', ')} WHERE id = $${paramCounter} RETURNING *`,
      values
    );
    
    return customer;
  });
}

// Tasks
async function getTasks(filters = {}) {
  return dbManager.executeQuery(async (db) => {
    let query = 'SELECT * FROM tasks';
    const conditions = [];
    const values = [];
    let paramCounter = 1;
    
    // Add filters
    if (filters.customerId) {
      conditions.push(`customer_id = $${paramCounter}`);
      values.push(filters.customerId);
      paramCounter++;
    }
    
    if (filters.assigneeId) {
      conditions.push(`assignee_id = $${paramCounter}`);
      values.push(filters.assigneeId);
      paramCounter++;
    }
    
    if (filters.status) {
      conditions.push(`status = $${paramCounter}`);
      values.push(filters.status);
      paramCounter++;
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY due_date ASC';
    
    return db.execute(query, values);
  });
}

async function getTaskById(id) {
  return dbManager.executeQuery(async (db) => {
    const [task] = await db.execute(
      'SELECT * FROM tasks WHERE id = $1 LIMIT 1',
      [id]
    );
    return task;
  });
}

async function createTask(taskData) {
  return dbManager.executeQuery(async (db) => {
    const [task] = await db.execute(
      'INSERT INTO tasks (title, description, customer_id, assignee_id, status, due_date, priority) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [
        taskData.title,
        taskData.description,
        taskData.customer_id,
        taskData.assignee_id,
        taskData.status || 'open',
        taskData.due_date,
        taskData.priority || 'medium'
      ]
    );
    return task;
  });
}

async function updateTask(id, taskData) {
  return dbManager.executeQuery(async (db) => {
    const updates = [];
    const values = [];
    let paramCounter = 1;
    
    for (const [key, value] of Object.entries(taskData)) {
      if (value !== undefined && key !== 'id') {
        updates.push(`${key} = $${paramCounter}`);
        values.push(value);
        paramCounter++;
      }
    }
    
    if (updates.length === 0) {
      throw new Error('No fields to update');
    }
    
    values.push(id);
    
    const [task] = await db.execute(
      `UPDATE tasks SET ${updates.join(', ')} WHERE id = $${paramCounter} RETURNING *`,
      values
    );
    
    return task;
  });
}

// Task Comments
async function getTaskComments(taskId) {
  return dbManager.executeQuery(async (db) => {
    return db.execute(
      'SELECT * FROM task_comments WHERE task_id = $1 ORDER BY created_at ASC',
      [taskId]
    );
  });
}

async function createTaskComment(commentData) {
  return dbManager.executeQuery(async (db) => {
    const [comment] = await db.execute(
      'INSERT INTO task_comments (task_id, user_id, comment) VALUES ($1, $2, $3) RETURNING *',
      [commentData.task_id, commentData.user_id, commentData.comment]
    );
    return comment;
  });
}

// Playbooks
async function getPlaybooks() {
  return dbManager.executeQuery(async (db) => {
    return db.execute('SELECT * FROM playbooks ORDER BY name ASC');
  });
}

async function getPlaybookById(id) {
  return dbManager.executeQuery(async (db) => {
    const [playbook] = await db.execute(
      'SELECT * FROM playbooks WHERE id = $1 LIMIT 1',
      [id]
    );
    
    if (!playbook) {
      return null;
    }
    
    // Get playbook tasks
    const tasks = await db.execute(
      'SELECT * FROM playbook_tasks WHERE playbook_id = $1 ORDER BY position ASC',
      [id]
    );
    
    return {
      ...playbook,
      tasks
    };
  });
}

async function createPlaybook(playbookData) {
  return dbManager.executeQuery(async (db) => {
    // Insert the playbook
    const [playbook] = await db.execute(
      'INSERT INTO playbooks (name, description, trigger_type) VALUES ($1, $2, $3) RETURNING *',
      [playbookData.name, playbookData.description, playbookData.trigger_type || 'manual']
    );
    
    // Insert playbook tasks if provided
    if (playbookData.tasks && Array.isArray(playbookData.tasks) && playbookData.tasks.length > 0) {
      for (let i = 0; i < playbookData.tasks.length; i++) {
        const task = playbookData.tasks[i];
        
        await db.execute(
          'INSERT INTO playbook_tasks (playbook_id, title, description, position, days_offset, role, message_template, condition_field, condition_value) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
          [
            playbook.id,
            task.title,
            task.description,
            i + 1, // Position starting from 1
            task.days_offset || 0,
            task.role || 'csm',
            task.message_template || '',
            task.condition_field || null,
            task.condition_value || null
          ]
        );
      }
    }
    
    return getPlaybookById(playbook.id);
  });
}

// Health check
async function testConnection() {
  return dbManager.testConnection();
}

module.exports = {
  getUsers,
  getUserById,
  getUserByUsername,
  createUser,
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  getTaskComments,
  createTaskComment,
  getPlaybooks,
  getPlaybookById,
  createPlaybook,
  testConnection
};