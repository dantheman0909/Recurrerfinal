import { pool } from './db';
import { sql } from 'drizzle-orm';
import { db } from './db'; 

/**
 * Updates the RedZone rules schema to support enhanced condition logic:
 * - Adds condition_logic field to specify AND/OR logic
 * - Updates conditions structure to support condition groups
 */
async function updateRedZoneRulesSchema() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Check if condition_logic column exists in red_zone_rules table
    const checkConditionLogicColumn = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'red_zone_rules' AND column_name = 'condition_logic'
      )
    `);
    
    if (!checkConditionLogicColumn.rows[0].exists) {
      console.log('Adding condition_logic column to red_zone_rules table...');
      await client.query(`
        ALTER TABLE red_zone_rules
        ADD COLUMN condition_logic TEXT DEFAULT 'AND'
      `);
      console.log('condition_logic column added successfully');
    } else {
      console.log('condition_logic column already exists');
    }
    
    // Alter the conditions field to specify default structure
    console.log('Updating existing rules to new condition format if needed...');
    const rules = await client.query('SELECT id, conditions FROM red_zone_rules');
    
    for (const rule of rules.rows) {
      let conditions = rule.conditions;
      
      // Check if conditions is already in the new format with groups
      if (!conditions.groups && Array.isArray(conditions)) {
        // Convert old format (array of conditions) to new format with groups
        const updatedConditions = {
          logicOperator: 'AND',
          groups: [
            {
              logicOperator: 'AND',
              conditions: conditions
            }
          ]
        };
        
        await client.query(
          'UPDATE red_zone_rules SET conditions = $1 WHERE id = $2',
          [JSON.stringify(updatedConditions), rule.id]
        );
        
        console.log(`Updated rule ID ${rule.id} to new condition format`);
      }
    }
    
    await client.query('COMMIT');
    console.log('RedZone rules schema update completed successfully!');
    return { success: true };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating RedZone rules schema:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : String(error)
    };
  } finally {
    client.release();
  }
}

// Execute the function if this file is run directly
if (require.main === module) {
  updateRedZoneRulesSchema()
    .then(result => {
      console.log('RedZone rules schema update result:', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch(err => {
      console.error('Unexpected error updating RedZone rules schema:', err);
      process.exit(1);
    });
}

export default updateRedZoneRulesSchema;