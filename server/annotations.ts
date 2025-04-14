import { Request, Response } from 'express';
import { db } from './db';
import { annotations, users, insertAnnotationSchema } from '@shared/schema';
import { eq, and, asc, desc, isNull } from 'drizzle-orm';
import { z } from 'zod';

/**
 * Get all annotations for a specific entity
 */
export const getAnnotations = async (req: Request, res: Response) => {
  try {
    const { entity_type, entity_id } = req.params;
    
    // Validate query parameters
    if (!entity_type || !entity_id || isNaN(parseInt(entity_id))) {
      return res.status(400).json({ error: 'Invalid entity type or ID' });
    }
    
    // Get top-level annotations (no parent_id)
    const rootAnnotations = await db.select()
      .from(annotations)
      .where(
        and(
          eq(annotations.entity_type, entity_type as any),
          eq(annotations.entity_id, parseInt(entity_id)),
          isNull(annotations.parent_id)
        )
      )
      .orderBy(desc(annotations.created_at));
    
    // For each annotation, get any replies (has parent_id)
    const annotationsWithReplies = await Promise.all(
      rootAnnotations.map(async (annotation) => {
        const replies = await db.select()
          .from(annotations)
          .where(eq(annotations.parent_id, annotation.id))
          .orderBy(asc(annotations.created_at));
          
        // Get user info for each annotation
        const user = await db.select()
          .from(users)
          .where(eq(users.id, annotation.user_id))
          .then(users => users[0]);
          
        return {
          ...annotation,
          user: {
            id: user.id,
            name: user.name,
            avatar_url: user.avatar_url,
            role: user.role
          },
          replies: await Promise.all(
            replies.map(async (reply) => {
              // Get user info for each reply
              const replyUser = await db.select()
                .from(users)
                .where(eq(users.id, reply.user_id))
                .then(users => users[0]);
                
              return {
                ...reply,
                user: {
                  id: replyUser.id,
                  name: replyUser.name,
                  avatar_url: replyUser.avatar_url,
                  role: replyUser.role
                }
              };
            })
          )
        };
      })
    );
    
    res.json(annotationsWithReplies);
  } catch (error) {
    console.error('Error fetching annotations:', error);
    res.status(500).json({ error: 'Failed to get annotations' });
  }
};

/**
 * Create a new annotation
 */
export const createAnnotation = async (req: Request, res: Response) => {
  try {
    const { entity_type, entity_id } = req.params;
    
    // Validate input using zod schema
    const validationResult = insertAnnotationSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: 'Invalid annotation data', 
        details: validationResult.error.format() 
      });
    }
    
    const annotationData = {
      ...validationResult.data,
      entity_type: entity_type as any,
      entity_id: parseInt(entity_id),
    };
    
    // Insert annotation into database
    const [newAnnotation] = await db.insert(annotations)
      .values(annotationData)
      .returning();
      
    // Get user info
    const [user] = await db.select()
      .from(users)
      .where(eq(users.id, newAnnotation.user_id));
      
    const result = {
      ...newAnnotation,
      user: {
        id: user.id,
        name: user.name,
        avatar_url: user.avatar_url,
        role: user.role
      },
      replies: []
    };
    
    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating annotation:', error);
    res.status(500).json({ error: 'Failed to create annotation' });
  }
};

/**
 * Update an annotation
 */
export const updateAnnotation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Only allow updating content and is_resolved fields
    const updateSchema = z.object({
      content: z.string().optional(),
      is_resolved: z.boolean().optional(),
    });
    
    const validationResult = updateSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: 'Invalid update data', 
        details: validationResult.error.format() 
      });
    }
    
    const updateData: Record<string, any> = {
      ...validationResult.data,
      updated_at: new Date()
    };
    
    // If resolving, add resolved_at and resolved_by
    if (updateData.is_resolved) {
      updateData.resolved_at = new Date();
      updateData.resolved_by = req.body.user_id;
    }
    
    // Update annotation in database
    const [updatedAnnotation] = await db.update(annotations)
      .set(updateData)
      .where(eq(annotations.id, parseInt(id)))
      .returning();
      
    if (!updatedAnnotation) {
      return res.status(404).json({ error: 'Annotation not found' });
    }
    
    res.json(updatedAnnotation);
  } catch (error) {
    console.error('Error updating annotation:', error);
    res.status(500).json({ error: 'Failed to update annotation' });
  }
};

/**
 * Delete an annotation
 */
export const deleteAnnotation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Delete replies first
    await db.delete(annotations)
      .where(eq(annotations.parent_id, parseInt(id)));
      
    // Then delete the annotation itself
    const [deletedAnnotation] = await db.delete(annotations)
      .where(eq(annotations.id, parseInt(id)))
      .returning();
      
    if (!deletedAnnotation) {
      return res.status(404).json({ error: 'Annotation not found' });
    }
    
    res.json({ message: 'Annotation deleted successfully' });
  } catch (error) {
    console.error('Error deleting annotation:', error);
    res.status(500).json({ error: 'Failed to delete annotation' });
  }
};

/**
 * Add a reply to an annotation
 */
export const createAnnotationReply = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Validate input using zod schema with required parent_id
    const replySchema = insertAnnotationSchema.extend({
      parent_id: z.number(),
    });
    
    const validationResult = replySchema.safeParse({
      ...req.body,
      parent_id: parseInt(id),
    });
    
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: 'Invalid reply data', 
        details: validationResult.error.format() 
      });
    }
    
    // Verify the parent annotation exists
    const [parentAnnotation] = await db.select()
      .from(annotations)
      .where(eq(annotations.id, parseInt(id)));
      
    if (!parentAnnotation) {
      return res.status(404).json({ error: 'Parent annotation not found' });
    }
    
    // Insert reply annotation
    const [newReply] = await db.insert(annotations)
      .values({
        ...validationResult.data,
        entity_type: parentAnnotation.entity_type,
        entity_id: parentAnnotation.entity_id,
      })
      .returning();
      
    // Get user info
    const [user] = await db.select()
      .from(users)
      .where(eq(users.id, newReply.user_id));
      
    const result = {
      ...newReply,
      user: {
        id: user.id,
        name: user.name,
        avatar_url: user.avatar_url,
        role: user.role
      }
    };
    
    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating annotation reply:', error);
    res.status(500).json({ error: 'Failed to create reply' });
  }
};