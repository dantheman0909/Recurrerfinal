import { Router, Request, Response } from 'express';
import { db } from '../db';
import { users } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';

const router = Router();

/**
 * Get all users with their team lead assignments
 * GET /api/users
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    // Execute SQL directly to get users with their team lead assignments and team lead details
    const allUsers = await db.execute(sql`
      SELECT 
        u.id, 
        u.name, 
        u.email, 
        u.role, 
        u.team_lead_id,
        tl.id AS teamlead_id,
        tl.name AS teamlead_name,
        tl.email AS teamlead_email,
        tl.role AS teamlead_role
      FROM users u
      LEFT JOIN users tl ON u.team_lead_id = tl.id
      ORDER BY 
        CASE 
          WHEN u.role = 'admin' THEN 1
          WHEN u.role = 'team_lead' THEN 2
          ELSE 3
        END,
        u.name
    `);
    
    // Process the result to format team lead information properly
    const processedUsers = allUsers.rows.map((user: any) => {
      const result: any = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        team_lead_id: user.team_lead_id
      };
      
      // If there's a team lead, add team lead information
      if (user.teamlead_id) {
        result.teamLead = {
          id: user.teamlead_id,
          name: user.teamlead_name,
          email: user.teamlead_email,
          role: user.teamlead_role
        };
      }
      
      return result;
    });
    
    return res.json(processedUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    return res.status(500).json({ 
      message: 'Failed to fetch users',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Get a specific user
 * GET /api/users/:id
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id, 10);
    
    if (isNaN(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }
    
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId)
    });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    return res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    return res.status(500).json({ 
      message: 'Failed to fetch user',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Schema for creating a new user
const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email format'),
  role: z.enum(['admin', 'team_lead', 'csm']),
  team_lead_id: z.number().nullable().optional()
});

/**
 * Create a new user
 * POST /api/users
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const validationResult = createUserSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({
        message: 'Invalid user data',
        errors: validationResult.error.format()
      });
    }
    
    const { name, email, role, team_lead_id } = validationResult.data;
    
    // If role is team_lead, ensure team_lead_id is null
    const finalTeamLeadId = role === 'team_lead' ? null : team_lead_id;
    
    // Check if email is already in use
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email)
    });
    
    if (existingUser) {
      return res.status(409).json({ message: 'Email is already in use' });
    }
    
    // Insert the new user
    const result = await db.insert(users).values({
      name,
      email,
      role,
      team_lead_id: finalTeamLeadId
    }).returning();
    
    return res.status(201).json(result[0]);
  } catch (error) {
    console.error('Error creating user:', error);
    return res.status(500).json({ 
      message: 'Failed to create user',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Schema for updating a user
const updateUserSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  email: z.string().email('Invalid email format').optional(),
  password: z.string().optional(), // Optional password for updates
  role: z.enum(['admin', 'team_lead', 'csm']).optional(),
  team_lead_id: z.number().nullable().optional(),
  teamLeadId: z.string().optional() // Frontend might send string ID
});

/**
 * Update a user
 * PUT/PATCH /api/users/:id
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id, 10);
    
    if (isNaN(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }
    
    const validationResult = updateUserSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({
        message: 'Invalid user data',
        errors: validationResult.error.format()
      });
    }
    
    // Check if user exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.id, userId)
    });
    
    if (!existingUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Extract and process fields from validation result
    const { 
      teamLeadId, // From frontend
      password,
      ...otherUpdates 
    } = validationResult.data;
    
    // Process team lead ID (could be string from frontend)
    let team_lead_id = otherUpdates.team_lead_id;
    if (teamLeadId) {
      if (teamLeadId === '') {
        team_lead_id = null;
      } else {
        team_lead_id = parseInt(teamLeadId, 10);
        if (isNaN(team_lead_id)) {
          team_lead_id = null;
        }
      }
    }
    
    // Build final updates object
    const updates: any = {
      ...otherUpdates,
      team_lead_id
    };
    
    // If changing role to team_lead, remove team_lead_id
    if (updates.role === 'team_lead') {
      updates.team_lead_id = null;
    }
    
    // If email is being updated, check if it's already in use
    if (updates.email && updates.email !== existingUser.email) {
      const emailInUse = await db.query.users.findFirst({
        where: eq(users.email, updates.email)
      });
      
      if (emailInUse) {
        return res.status(409).json({ message: 'Email is already in use' });
      }
    }
    
    // If password is provided, hash it
    if (password && password.trim() !== '') {
      const bcrypt = require('bcrypt');
      const saltRounds = 10;
      updates.password = await bcrypt.hash(password, saltRounds);
    } else {
      // Remove password from updates if it's empty
      delete updates.password;
    }
    
    // Clean up the updates object by removing undefined/null values
    Object.keys(updates).forEach(key => {
      if (updates[key] === undefined) {
        delete updates[key];
      }
    });
    
    // Update the user
    const result = await db.update(users)
      .set(updates)
      .where(eq(users.id, userId))
      .returning();
    
    return res.json(result[0]);
  } catch (error) {
    console.error('Error updating user:', error);
    return res.status(500).json({ 
      message: 'Failed to update user',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Delete a user
 * DELETE /api/users/:id
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id, 10);
    
    if (isNaN(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }
    
    // Check if user exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.id, userId)
    });
    
    if (!existingUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if this user is a team lead with assigned CSMs
    if (existingUser.role === 'team_lead') {
      const assignedCsms = await db.query.users.findMany({
        where: eq(users.team_lead_id, userId)
      });
      
      if (assignedCsms.length > 0) {
        return res.status(409).json({ 
          message: 'Cannot delete team lead with assigned CSMs. Please reassign CSMs first.' 
        });
      }
    }
    
    // Delete the user
    await db.delete(users).where(eq(users.id, userId));
    
    return res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return res.status(500).json({ 
      message: 'Failed to delete user',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Get all team leads
 * GET /api/users/team-leads
 */
router.get('/team-leads', async (req: Request, res: Response) => {
  try {
    // Get all users with the role 'team_lead'
    const teamLeads = await db.query.users.findMany({
      where: eq(users.role, 'team_lead')
    });
    
    return res.json(teamLeads);
  } catch (error) {
    console.error('Error fetching team leads:', error);
    return res.status(500).json({ 
      message: 'Failed to fetch team leads',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Get CSMs assigned to a team lead
 * GET /api/users/team/:teamLeadId/members
 */
router.get('/team/:teamLeadId/members', async (req: Request, res: Response) => {
  try {
    const { teamLeadId } = req.params;
    const teamLeadIdNum = parseInt(teamLeadId, 10);
    
    if (isNaN(teamLeadIdNum)) {
      return res.status(400).json({ message: 'Invalid team lead ID' });
    }
    
    // Check if team lead exists and has the correct role
    const teamLead = await db.query.users.findFirst({
      where: eq(users.id, teamLeadIdNum)
    });
    
    if (!teamLead || teamLead.role !== 'team_lead') {
      return res.status(404).json({ message: 'Team lead not found' });
    }
    
    // Get all CSMs assigned to this team lead
    const teamMembers = await db.query.users.findMany({
      where: eq(users.team_lead_id, teamLeadIdNum)
    });
    
    return res.json(teamMembers);
  } catch (error) {
    console.error('Error fetching team members:', error);
    return res.status(500).json({ 
      message: 'Failed to fetch team members',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Assign multiple CSMs to a team lead
 * POST /api/users/team/:teamLeadId/assign
 */
router.post('/team/:teamLeadId/assign', async (req: Request, res: Response) => {
  try {
    const { teamLeadId } = req.params;
    const teamLeadIdNum = parseInt(teamLeadId, 10);
    
    if (isNaN(teamLeadIdNum)) {
      return res.status(400).json({ message: 'Invalid team lead ID' });
    }
    
    // Validate request body - expect an array of CSM IDs
    const schema = z.object({
      csmIds: z.array(z.number()).min(1, 'At least one CSM ID is required')
    });
    
    const validationResult = schema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({
        message: 'Invalid request data',
        errors: validationResult.error.format()
      });
    }
    
    const { csmIds } = validationResult.data;
    
    // Check if team lead exists and has the correct role
    const teamLead = await db.query.users.findFirst({
      where: eq(users.id, teamLeadIdNum)
    });
    
    if (!teamLead || teamLead.role !== 'team_lead') {
      return res.status(404).json({ message: 'Team lead not found' });
    }
    
    // Update all specified CSMs to be assigned to this team lead
    for (const csmId of csmIds) {
      const csm = await db.query.users.findFirst({
        where: eq(users.id, csmId)
      });
      
      if (csm && csm.role === 'csm') {
        await db.update(users)
          .set({ team_lead_id: teamLeadIdNum })
          .where(eq(users.id, csmId));
      }
    }
    
    // Return updated list of team members
    const updatedTeamMembers = await db.query.users.findMany({
      where: eq(users.team_lead_id, teamLeadIdNum)
    });
    
    return res.json({
      message: 'CSMs assigned successfully',
      teamMembers: updatedTeamMembers
    });
  } catch (error) {
    console.error('Error assigning CSMs to team lead:', error);
    return res.status(500).json({ 
      message: 'Failed to assign CSMs to team lead',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * Reset a user's password
 * POST /api/users/:id/reset-password
 */
router.post('/:id/reset-password', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id, 10);
    
    if (isNaN(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }
    
    // Validate request body
    const schema = z.object({
      password: z.string().min(6, 'Password must be at least 6 characters')
    });
    
    const validationResult = schema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({
        message: 'Invalid password',
        errors: validationResult.error.format()
      });
    }
    
    // Check if user exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.id, userId)
    });
    
    if (!existingUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Hash the new password
    const bcrypt = require('bcrypt');
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(validationResult.data.password, saltRounds);
    
    // Update the user's password
    await db.update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, userId));
    
    return res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Error resetting password:', error);
    return res.status(500).json({ 
      message: 'Failed to reset password',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;