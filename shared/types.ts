export type UserRole = 'admin' | 'team_lead' | 'csm';

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'overdue';

export type AccountHealth = 'healthy' | 'at_risk' | 'red_zone';

export type AlertSeverity = 'critical' | 'high_risk' | 'attention_needed';

export type MetricTimeframe = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export type RecurrencePattern = 'daily' | 'weekly' | 'bi-weekly' | 'monthly';

export interface CustomerFinancials {
  mrr: number;
  arr: number;
  changePercent: number;
}

export interface MetricData {
  label: string;
  value: number;
}

export interface ChartData {
  labels: string[];
  values: number[];
}

export interface DashboardStats {
  openTasks: number;
  openTasksChange: number;
  campaignGaps: number;
  campaignGapsChange: number;
  renewalAlerts: number;
  renewalAlertsChange: number;
  redZoneCount: number;
  redZoneCountChange: number;
}

export interface CustomerHealthDistribution {
  healthy: number;
  atRisk: number;
  redZone: number;
}

export interface MonthlyMetrics {
  months: string[];
  values: number[];
}

export interface GoogleAuthConfig {
  clientId: string;
  redirectUri: string;
}

export interface ChargebeeConfig {
  apiKey: string;
  site: string;
}

export interface MySQLConnectionConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

export interface FieldMapping {
  mysqlTable: string;
  mysqlField: string;
  localTable: string;
  localField: string;
}

export type PlaybookTriggerType = 
  | 'manual'
  | 'new_customer' 
  | 'usage_drop' 
  | 'renewal_approaching'
  | 'custom_event';

export interface PlaybookTriggerConfig {
  days?: number;
  healthStatus?: AccountHealth;
}
