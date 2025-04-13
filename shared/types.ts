// Shared type definitions for the application

// Chart data types
export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

export interface ChartDataset {
  label?: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  borderWidth?: number;
  fill?: boolean;
  tension?: number;
  pointBackgroundColor?: string | string[];
  pointRadius?: number;
  pointHoverRadius?: number;
}

// Dashboard types
export interface DashboardStats {
  openTasks: number;
  openTasksTrend: number;
  campaignGaps: number;
  campaignGapsTrend: number;
  renewalAlerts: number;
  renewalAlertsTrend: number;
  redZoneCount: number;
  redZoneCountTrend: number;
}

export interface ActivityItem {
  id: string;
  user: {
    id: string;
    name: string;
    avatar: string;
  };
  action: string;
  target: {
    type: 'customer' | 'task' | 'playbook' | 'event' | 'other';
    name: string;
  };
  time: string;
  category: 'Onboarding' | 'Meeting' | 'Red Zone' | 'Campaign' | 'Task' | 'Other';
}

export interface UpcomingTask {
  id: string;
  title: string;
  dueDate: string;
  customer: {
    id: string;
    name: string;
  };
}

// Customer types
export interface CustomerListItem {
  id: number;
  name: string;
  industry: string;
  status: string;
  arr: number;
  mrr: number;
  assignedTo: {
    id: string;
    name: string;
    avatar: string;
  };
  inRedZone: boolean;
  redZoneReasons?: string[];
}

// Task Management types
export interface TaskListItem {
  id: number;
  title: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'blocked';
  dueDate: string;
  customer: {
    id: number;
    name: string;
  };
  assignedTo: {
    id: string;
    name: string;
    avatar: string;
  };
  recurrence: 'none' | 'daily' | 'weekly' | 'bi_weekly' | 'monthly' | 'quarterly';
}

// Playbook types
export interface PlaybookListItem {
  id: number;
  name: string;
  description: string;
  triggerType: string;
  taskCount: number;
  isActive: boolean;
  createdBy: {
    id: string;
    name: string;
  };
}

// Red Zone types
export interface RedZoneReason {
  id: string;
  label: string;
  description: string;
}

// MySQL Configuration types
export interface MySQLConnectionParams {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

export interface FieldMapping {
  mysqlField: string;
  platformField: string;
  mysqlTable: string;
  transformationType?: string;
}
