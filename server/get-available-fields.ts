import { pool, db } from './db';
import { sql } from 'drizzle-orm';
import { EntityType, FieldMapping, AvailableFields } from '../shared/redzone-types';

/**
 * Get all available fields that can be used in RedZone rules
 * Combines fields from the database schema, MySQL mappings, and Chargebee mappings
 */
export async function getAvailableFields(): Promise<AvailableFields> {
  try {
    const availableFields: AvailableFields = {
      customer: [],
      customer_metrics: [],
      subscription: [],
      invoice: [],
      company: []
    };

    // Get customer fields directly from the schema
    const customerFieldsResult = await db.execute(sql.raw(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'customers'
    `));
    
    const customerFields = customerFieldsResult.rows || [];

    // Map customer fields
    if (customerFields.length > 0) {
      customerFields.forEach((field: any) => {
        const fieldType = mapPostgresTypeToFieldType(field.data_type);
        availableFields.customer.push({
          id: `customer_${field.column_name}`,
          label: formatFieldLabel(field.column_name),
          entityType: 'customer',
          fieldType,
          path: field.column_name
        });
      });
    }

    // Get customer metrics fields
    const metricsFieldsResult = await db.execute(sql.raw(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'customer_metrics'
    `));
    
    const metricsFields = metricsFieldsResult.rows || [];

    // Map metrics fields
    if (metricsFields.length > 0) {
      metricsFields.forEach((field: any) => {
        const fieldType = mapPostgresTypeToFieldType(field.data_type);
        availableFields.customer_metrics.push({
          id: `customer_metrics_${field.column_name}`,
          label: formatFieldLabel(field.column_name),
          entityType: 'customer_metrics',
          fieldType,
          path: field.column_name
        });
      });
    }

    // Get MySQL field mappings
    const mysqlMappingsResult = await db.execute(sql.raw(`
      SELECT mysql_field, local_field, field_type
      FROM mysql_field_mappings
      WHERE local_table = 'customers'
    `));
    
    const mysqlMappings = mysqlMappingsResult.rows || [];

    // Map MySQL fields to company entity
    if (mysqlMappings.length > 0) {
      mysqlMappings.forEach((mapping: any) => {
        const fieldType = mapping.field_type ? mapping.field_type : 'string';
        availableFields.company.push({
          id: `company_${mapping.mysql_field}`,
          label: formatFieldLabel(mapping.mysql_field),
          entityType: 'company',
          fieldType: mapFieldType(fieldType),
          path: mapping.local_field
        });
      });
    }

    // Get Chargebee field mappings
    const chargebeeMappingsResult = await db.execute(sql.raw(`
      SELECT chargebee_entity, chargebee_field, local_field
      FROM chargebee_field_mappings
    `));
    
    const chargebeeMappings = chargebeeMappingsResult.rows || [];

    // Map Chargebee fields to their respective entities
    if (chargebeeMappings.length > 0) {
      chargebeeMappings.forEach((mapping: any) => {
        const entity = mapping.chargebee_entity as EntityType;
        
        if (entity === 'subscription' || entity === 'invoice') {
          availableFields[entity].push({
            id: `${entity}_${mapping.chargebee_field}`,
            label: formatFieldLabel(mapping.chargebee_field),
            entityType: entity,
            fieldType: inferFieldType(mapping.chargebee_field),
            path: mapping.local_field
          });
        }
      });
    }

    return availableFields;
  } catch (error) {
    console.error('Error getting available fields:', error);
    throw error;
  }
}

// Helper functions to format and map field types
function formatFieldLabel(name: string): string {
  return name
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function mapPostgresTypeToFieldType(pgType: string): "string" | "number" | "date" | "boolean" {
  switch (pgType.toLowerCase()) {
    case 'integer':
    case 'decimal':
    case 'numeric':
    case 'real':
    case 'double precision':
      return 'number';
    case 'timestamp':
    case 'timestamp without time zone':
    case 'timestamp with time zone':
    case 'date':
      return 'date';
    case 'boolean':
      return 'boolean';
    default:
      return 'string';
  }
}

function mapFieldType(fieldType: string): "string" | "number" | "date" | "boolean" {
  switch (fieldType.toLowerCase()) {
    case 'integer':
    case 'number':
    case 'numeric':
    case 'float':
    case 'decimal':
      return 'number';
    case 'date':
    case 'datetime':
    case 'timestamp':
      return 'date';
    case 'boolean':
    case 'bool':
      return 'boolean';
    default:
      return 'string';
  }
}

function inferFieldType(fieldName: string): "string" | "number" | "date" | "boolean" {
  // Infer type based on common field name patterns
  if (fieldName.includes('_at') || 
      fieldName.includes('date') || 
      fieldName.endsWith('_date')) {
    return 'date';
  }
  
  if (fieldName.includes('amount') || 
      fieldName.includes('count') || 
      fieldName.includes('total') || 
      fieldName.includes('price') || 
      fieldName.includes('revenue') || 
      fieldName.includes('mrr') || 
      fieldName.includes('arr')) {
    return 'number';
  }
  
  if (fieldName.startsWith('is_') || 
      fieldName.startsWith('has_') || 
      fieldName.includes('enabled') || 
      fieldName.includes('active')) {
    return 'boolean';
  }
  
  return 'string';
}