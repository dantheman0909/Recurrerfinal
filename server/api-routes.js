/**
 * API routes for the Recurrer reliable server
 * These routes handle API endpoints without TypeScript
 */

const express = require('express');
const router = express.Router();
const dbApi = require('./db-api');

// User authentication check middleware
function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// User API routes
router.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    const { db } = await dbManager.getDatabaseConnection();
    
    // For now, just perform a simple check and simulate login
    // This should be replaced with proper authentication
    const [user] = await db.execute(
      'SELECT * FROM users WHERE username = $1 LIMIT 1',
      [username]
    );
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    
    // In a real implementation, you would check the password hash here
    
    // Set the user in the session
    req.session.userId = user.id;
    req.session.username = user.username;
    
    // Return user info
    res.json({
      id: user.id,
      username: user.username,
      email: user.email
    });
    
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error', message: err.message });
  }
});

router.post('/api/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to logout', message: err.message });
    }
    res.json({ success: true });
  });
});

router.get('/api/users/me', requireAuth, async (req, res) => {
  try {
    const { db } = await dbManager.getDatabaseConnection();
    
    const [user] = await db.execute(
      'SELECT id, username, email, role FROM users WHERE id = $1',
      [req.session.userId]
    );
    
    if (!user) {
      req.session.destroy();
      return res.status(401).json({ error: 'User not found' });
    }
    
    res.json(user);
    
  } catch (err) {
    console.error('Get current user error:', err);
    res.status(500).json({ error: 'Internal server error', message: err.message });
  }
});

// Customer API routes
router.get('/api/customers', requireAuth, async (req, res) => {
  try {
    const { db } = await dbManager.getDatabaseConnection();
    
    const customers = await db.execute(
      'SELECT * FROM customers ORDER BY name ASC'
    );
    
    res.json(customers);
    
  } catch (err) {
    console.error('Get customers error:', err);
    res.status(500).json({ error: 'Internal server error', message: err.message });
  }
});

router.get('/api/customers/:id', requireAuth, async (req, res) => {
  try {
    const customerId = parseInt(req.params.id);
    
    if (isNaN(customerId)) {
      return res.status(400).json({ error: 'Invalid customer ID' });
    }
    
    const { db } = await dbManager.getDatabaseConnection();
    
    const [customer] = await db.execute(
      'SELECT * FROM customers WHERE id = $1',
      [customerId]
    );
    
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    res.json(customer);
    
  } catch (err) {
    console.error('Get customer error:', err);
    res.status(500).json({ error: 'Internal server error', message: err.message });
  }
});

// Task API routes
router.get('/api/tasks', requireAuth, async (req, res) => {
  try {
    const { db } = await dbManager.getDatabaseConnection();
    
    const tasks = await db.execute(
      'SELECT * FROM tasks ORDER BY due_date ASC'
    );
    
    res.json(tasks);
    
  } catch (err) {
    console.error('Get tasks error:', err);
    res.status(500).json({ error: 'Internal server error', message: err.message });
  }
});

router.get('/api/tasks/:id', requireAuth, async (req, res) => {
  try {
    const taskId = parseInt(req.params.id);
    
    if (isNaN(taskId)) {
      return res.status(400).json({ error: 'Invalid task ID' });
    }
    
    const { db } = await dbManager.getDatabaseConnection();
    
    const [task] = await db.execute(
      'SELECT * FROM tasks WHERE id = $1',
      [taskId]
    );
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    res.json(task);
    
  } catch (err) {
    console.error('Get task error:', err);
    res.status(500).json({ error: 'Internal server error', message: err.message });
  }
});

// Playbook API routes
router.get('/api/playbooks', requireAuth, async (req, res) => {
  try {
    const { db } = await dbManager.getDatabaseConnection();
    
    const playbooks = await db.execute(
      'SELECT * FROM playbooks ORDER BY name ASC'
    );
    
    res.json(playbooks);
    
  } catch (err) {
    console.error('Get playbooks error:', err);
    res.status(500).json({ error: 'Internal server error', message: err.message });
  }
});

router.get('/api/playbooks/:id', requireAuth, async (req, res) => {
  try {
    const playbookId = parseInt(req.params.id);
    
    if (isNaN(playbookId)) {
      return res.status(400).json({ error: 'Invalid playbook ID' });
    }
    
    const { db } = await dbManager.getDatabaseConnection();
    
    const [playbook] = await db.execute(
      'SELECT * FROM playbooks WHERE id = $1',
      [playbookId]
    );
    
    if (!playbook) {
      return res.status(404).json({ error: 'Playbook not found' });
    }
    
    // Get playbook tasks
    const playbookTasks = await db.execute(
      'SELECT * FROM playbook_tasks WHERE playbook_id = $1 ORDER BY position ASC',
      [playbookId]
    );
    
    // Combine the playbook and tasks
    const result = {
      ...playbook,
      tasks: playbookTasks
    };
    
    res.json(result);
    
  } catch (err) {
    console.error('Get playbook error:', err);
    res.status(500).json({ error: 'Internal server error', message: err.message });
  }
});

// Red zone alerts API routes
router.get('/api/red-zone-alerts', requireAuth, async (req, res) => {
  try {
    const { db } = await dbManager.getDatabaseConnection();
    
    const alerts = await db.execute(
      'SELECT * FROM red_zone_alerts WHERE resolved = false ORDER BY created_at DESC'
    );
    
    res.json(alerts);
    
  } catch (err) {
    console.error('Get red zone alerts error:', err);
    res.status(500).json({ error: 'Internal server error', message: err.message });
  }
});

// Add more routes as needed...

module.exports = router;