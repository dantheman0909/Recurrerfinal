import { DashboardStats, CustomerHealthDistribution, MonthlyMetrics } from '@shared/types';
import { 
  Customer, 
  Task, 
  RedZoneAlert, 
  User, 
  Playbook, 
  PlaybookTask,
  CustomerMetric
} from '@shared/schema';

// Mock dashboard stats
export const mockDashboardStats: DashboardStats = {
  openTasks: 36,
  openTasksChange: 12,
  campaignGaps: 14,
  campaignGapsChange: -5,
  renewalAlerts: 8,
  renewalAlertsChange: 4,
  redZoneCount: 12,
  redZoneCountChange: -8
};

// Mock health distribution data
export const mockHealthDistribution: CustomerHealthDistribution = {
  healthy: 65,
  atRisk: 23,
  redZone: 12
};

// Mock monthly metrics data
export const mockMonthlyMetrics: MonthlyMetrics = {
  months: ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'],
  values: [40, 28, 48, 56, 36, 52]
};

// Mock users
export const mockUsers: User[] = [
  {
    id: 1,
    email: 'sarah.johnson@recurrer.io',
    name: 'Sarah Johnson',
    role: 'team_lead',
    avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    created_at: new Date('2023-01-01')
  },
  {
    id: 2,
    email: 'alex.wong@recurrer.io',
    name: 'Alex Wong',
    role: 'csm',
    avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    created_at: new Date('2023-01-15')
  },
  {
    id: 3,
    email: 'morgan.stanley@recurrer.io',
    name: 'Morgan Stanley',
    role: 'csm',
    avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    created_at: new Date('2023-02-01')
  }
];

// Mock customers
export const mockCustomers: Customer[] = [
  {
    id: 1,
    name: 'Acme Technologies',
    industry: 'Technology',
    logo_url: '',
    contact_name: 'John Doe',
    contact_email: 'john@acmetech.com',
    contact_phone: '(555) 123-4567',
    onboarded_at: new Date('2023-01-15'),
    renewal_date: new Date('2024-01-15'),
    mrr: 5000,
    arr: 60000,
    health_status: 'red_zone',
    created_at: new Date('2023-01-10')
  },
  {
    id: 2,
    name: 'Global Foods Chain',
    industry: 'Retail',
    logo_url: '',
    contact_name: 'Jane Smith',
    contact_email: 'jane@globalfoods.com',
    contact_phone: '(555) 987-6543',
    onboarded_at: new Date('2022-11-10'),
    renewal_date: new Date('2023-11-10'),
    mrr: 8000,
    arr: 96000,
    health_status: 'red_zone',
    created_at: new Date('2022-11-05')
  },
  {
    id: 3,
    name: 'Tech Solutions Inc',
    industry: 'Software',
    logo_url: '',
    contact_name: 'Mike Johnson',
    contact_email: 'mike@techsolutions.com',
    contact_phone: '(555) 456-7890',
    onboarded_at: new Date('2023-01-03'),
    renewal_date: new Date('2024-01-03'),
    mrr: 3500,
    arr: 42000,
    health_status: 'at_risk',
    created_at: new Date('2022-12-20')
  }
];

// Mock tasks
export const mockTasks: Task[] = [
  {
    id: 1,
    title: 'Review onboarding progress for Acme Corp',
    description: 'Check if all onboarding steps have been completed',
    status: 'in_progress',
    due_date: new Date('2023-01-23'),
    customer_id: 1,
    assigned_to: 1,
    recurring: false,
    created_at: new Date('2023-01-15'),
    created_by: 1
  },
  {
    id: 2,
    title: 'Schedule quarterly review with XYZ Tech',
    description: 'Set up a meeting to review Q1 performance',
    status: 'pending',
    due_date: new Date('2023-01-30'),
    customer_id: 3,
    assigned_to: 2,
    recurring: true,
    recurrence_pattern: 'quarterly',
    created_at: new Date('2023-01-10'),
    created_by: 1
  },
  {
    id: 3,
    title: 'Setup loyalty campaign for Global Foods',
    description: 'Configure and launch the new loyalty program',
    status: 'overdue',
    due_date: new Date('2023-01-15'),
    customer_id: 2,
    assigned_to: 3,
    recurring: false,
    created_at: new Date('2023-01-01'),
    created_by: 1
  }
];

// Mock red zone alerts
export const mockRedZoneAlerts: RedZoneAlert[] = [
  {
    id: 1,
    customer_id: 1,
    reason: 'No campaigns sent in 90+ days',
    severity: 'critical',
    created_at: new Date('2023-01-05'),
    resolved_at: null
  },
  {
    id: 2,
    customer_id: 2,
    reason: 'No QR/loyalty setup completed',
    severity: 'high_risk',
    created_at: new Date('2023-01-08'),
    resolved_at: null
  },
  {
    id: 3,
    customer_id: 3,
    reason: 'Delayed onboarding (27 days)',
    severity: 'attention_needed',
    created_at: new Date('2023-01-10'),
    resolved_at: null
  }
];

// Mock playbooks
export const mockPlaybooks: Playbook[] = [
  {
    id: 1,
    name: 'Standard Onboarding',
    description: 'Standard onboarding process for new customers',
    trigger_type: 'time_after_onboarding',
    trigger_config: { days: 0 },
    created_by: 1,
    created_at: new Date('2022-12-01')
  },
  {
    id: 2,
    name: 'Renewal Preparation',
    description: 'Steps to prepare for customer renewal',
    trigger_type: 'days_before_renewal',
    trigger_config: { days: 60 },
    created_by: 1,
    created_at: new Date('2022-12-15')
  },
  {
    id: 3,
    name: 'At Risk Recovery',
    description: 'Process to recover customers showing signs of churn',
    trigger_type: 'account_health_change',
    trigger_config: { healthStatus: 'at_risk' },
    created_by: 1,
    created_at: new Date('2023-01-05')
  }
];

// Mock playbook tasks
export const mockPlaybookTasks: { [key: number]: PlaybookTask[] } = {
  1: [
    {
      id: 1,
      playbook_id: 1,
      title: 'Setup welcome call',
      description: 'Schedule and conduct welcome call with the customer',
      due_days: 3,
      order: 1
    },
    {
      id: 2,
      playbook_id: 1,
      title: 'Configure customer account',
      description: 'Set up customer account with initial settings',
      due_days: 5,
      order: 2
    },
    {
      id: 3,
      playbook_id: 1,
      title: 'Conduct training session',
      description: 'Train customer team on platform usage',
      due_days: 10,
      order: 3
    }
  ],
  2: [
    {
      id: 4,
      playbook_id: 2,
      title: 'Send renewal notification',
      description: 'Notify customer about upcoming renewal',
      due_days: 60,
      order: 1
    },
    {
      id: 5,
      playbook_id: 2,
      title: 'Schedule renewal call',
      description: 'Discuss renewal options and pricing',
      due_days: 45,
      order: 2
    }
  ],
  3: [
    {
      id: 6,
      playbook_id: 3,
      title: 'Conduct health assessment call',
      description: 'Identify issues and pain points',
      due_days: 2,
      order: 1
    },
    {
      id: 7,
      playbook_id: 3,
      title: 'Create recovery plan',
      description: 'Develop action plan to address issues',
      due_days: 5,
      order: 2
    }
  ]
};

// Mock customer metrics
export const mockCustomerMetrics: { [key: number]: CustomerMetric[] } = {
  1: [
    {
      id: 1,
      customer_id: 1,
      metric_type: 'nps_score',
      metric_value: 7,
      recorded_at: new Date('2023-01-01')
    },
    {
      id: 2,
      customer_id: 1,
      metric_type: 'data_tagging',
      metric_value: 45,
      metric_percent: 45,
      recorded_at: new Date('2023-01-05')
    }
  ],
  2: [
    {
      id: 3,
      customer_id: 2,
      metric_type: 'nps_score',
      metric_value: 8,
      recorded_at: new Date('2022-12-15')
    },
    {
      id: 4,
      customer_id: 2,
      metric_type: 'data_tagging',
      metric_value: 72,
      metric_percent: 72,
      recorded_at: new Date('2023-01-10')
    }
  ],
  3: [
    {
      id: 5,
      customer_id: 3,
      metric_type: 'nps_score',
      metric_value: 6,
      recorded_at: new Date('2023-01-20')
    },
    {
      id: 6,
      customer_id: 3,
      metric_type: 'data_tagging',
      metric_value: 38,
      metric_percent: 38,
      recorded_at: new Date('2023-01-25')
    }
  ]
};

// Helper function to get mock data based on URL pattern
export function getMockData(url: string) {
  // Handle dashboard data
  if (url.startsWith('/api/dashboard')) {
    return {
      ...mockDashboardStats,
      healthDistribution: mockHealthDistribution,
      monthlyMetrics: mockMonthlyMetrics
    };
  }
  
  // Handle users
  if (url === '/api/users') {
    return mockUsers;
  }
  
  // Handle single user
  if (url.match(/\/api\/users\/\d+/)) {
    const id = parseInt(url.split('/').pop() || '0');
    return mockUsers.find(user => user.id === id);
  }
  
  // Handle customers
  if (url === '/api/customers') {
    return mockCustomers;
  }
  
  // Handle single customer
  if (url.match(/\/api\/customers\/\d+$/)) {
    const id = parseInt(url.split('/').pop() || '0');
    return mockCustomers.find(customer => customer.id === id);
  }
  
  // Handle customer metrics
  if (url.match(/\/api\/customers\/\d+\/metrics/)) {
    const customerId = parseInt(url.split('/')[3]);
    return mockCustomerMetrics[customerId] || [];
  }
  
  // Handle tasks
  if (url.startsWith('/api/tasks')) {
    const params = new URLSearchParams(url.split('?')[1] || '');
    const customerId = params.get('customerId');
    const assigneeId = params.get('assigneeId');
    
    if (customerId) {
      return mockTasks.filter(task => task.customer_id === parseInt(customerId));
    }
    
    if (assigneeId) {
      return mockTasks.filter(task => task.assigned_to === parseInt(assigneeId));
    }
    
    return mockTasks;
  }
  
  // Handle single task
  if (url.match(/\/api\/tasks\/\d+$/)) {
    const id = parseInt(url.split('/').pop() || '0');
    return mockTasks.find(task => task.id === id);
  }
  
  // Handle red zone alerts
  if (url.startsWith('/api/red-zone')) {
    const params = new URLSearchParams(url.split('?')[1] || '');
    const customerId = params.get('customerId');
    
    if (customerId) {
      return mockRedZoneAlerts.filter(alert => alert.customer_id === parseInt(customerId));
    }
    
    return mockRedZoneAlerts;
  }
  
  // Handle playbooks
  if (url === '/api/playbooks') {
    return mockPlaybooks;
  }
  
  // Handle single playbook
  if (url.match(/\/api\/playbooks\/\d+$/)) {
    const id = parseInt(url.split('/').pop() || '0');
    return mockPlaybooks.find(playbook => playbook.id === id);
  }
  
  // Handle playbook tasks
  if (url.match(/\/api\/playbooks\/\d+\/tasks/)) {
    const playbookId = parseInt(url.split('/')[3]);
    return mockPlaybookTasks[playbookId] || [];
  }
  
  // Handle MySQL config
  if (url === '/api/admin/mysql-config') {
    return {};
  }
  
  // Handle MySQL field mappings
  if (url === '/api/admin/mysql-field-mappings') {
    return [];
  }
  
  // Default fallback
  return null;
}

// Mock API request function for testing
export async function mockRequest(
  method: string,
  url: string,
  data?: unknown,
): Promise<any> {
  console.log(`Mock ${method} request to ${url}`, data);
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Handle different methods
  switch (method.toUpperCase()) {
    case 'GET':
      return getMockData(url);
    
    case 'POST':
      if (url.includes('/mysql-query')) {
        return [
          { id: 1, customer_name: 'Acme Corp', revenue: 50000 },
          { id: 2, customer_name: 'Global Foods', revenue: 80000 },
          { id: 3, customer_name: 'Tech Solutions', revenue: 35000 }
        ];
      }
      
      if (url.includes('/tasks')) {
        const newTask = {
          id: mockTasks.length + 1,
          ...data,
          created_at: new Date()
        };
        mockTasks.push(newTask as Task);
        return newTask;
      }
      
      return { success: true, data };
    
    case 'PATCH':
    case 'PUT':
      return { success: true, updated: true, data };
    
    case 'DELETE':
      return { success: true, deleted: true };
    
    default:
      throw new Error(`Unsupported method: ${method}`);
  }
}
