import { z } from "zod";

// Logic operators for conditions
export const logicOperatorEnum = z.enum(["AND", "OR"]);
export type LogicOperator = z.infer<typeof logicOperatorEnum>;

// Operators for field comparisons
export const fieldOperatorEnum = z.enum([
  "equals", 
  "not_equals", 
  "greater_than", 
  "less_than", 
  "contains", 
  "starts_with", 
  "ends_with",
  "is_empty",
  "is_not_empty",
  "in_range"
]);
export type FieldOperator = z.infer<typeof fieldOperatorEnum>;

// Types of entities for field sources
export const entityTypeEnum = z.enum([
  "customer", 
  "customer_metrics", 
  "subscription", 
  "invoice",
  "company"  // From MySQL data
]);
export type EntityType = z.infer<typeof entityTypeEnum>;

// Single condition schema
export const conditionSchema = z.object({
  field: z.string().min(1, "Field is required"),
  operator: fieldOperatorEnum,
  value: z.string(),
  entityType: entityTypeEnum.optional(), // Which entity type this field belongs to
  fieldType: z.enum(["string", "number", "date", "boolean"]).optional(),
});
export type Condition = z.infer<typeof conditionSchema>;

// Condition group schema
export const conditionGroupSchema = z.object({
  logicOperator: logicOperatorEnum.default("AND"),
  conditions: z.array(conditionSchema).min(1, "At least one condition is required")
});
export type ConditionGroup = z.infer<typeof conditionGroupSchema>;

// Full conditions schema with nested groups
export const conditionsSchema = z.object({
  logicOperator: logicOperatorEnum.default("AND"),
  groups: z.array(conditionGroupSchema).min(1, "At least one condition group is required")
});
export type Conditions = z.infer<typeof conditionsSchema>;

// RedZone rule form schema
export const redZoneRuleFormSchema = z.object({
  name: z.string().min(3, { message: "Rule name must be at least 3 characters" }),
  description: z.string().optional(),
  severity: z.enum(["critical", "high_risk", "attention_needed"]),
  conditions: conditionsSchema,
  auto_resolve: z.boolean().default(false),
  resolution_conditions: z.array(
    z.object({
      field_path: z.string(),
      operator: z.string(),
      value: z.string(),
    })
  ).optional(),
  team_lead_approval_required: z.boolean().default(false),
  notification_message: z.string().optional(),
  enabled: z.boolean().default(true),
});
export type RedZoneRuleForm = z.infer<typeof redZoneRuleFormSchema>;

// Field mapping type for UI display
export interface FieldMapping {
  id: string;
  label: string;
  entityType: EntityType;
  fieldType: "string" | "number" | "date" | "boolean";
  path: string; // The actual field path used in the condition
}

// Available fields categorized by entity
export interface AvailableFields {
  customer: FieldMapping[];
  customer_metrics: FieldMapping[];
  subscription: FieldMapping[];
  invoice: FieldMapping[];
  company: FieldMapping[];
}