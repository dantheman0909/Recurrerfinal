import { db } from "./db";
import {
  users,
  customers,
  tasks,
  taskComments,
  playbooks,
  playbookTasks,
  redZoneAlerts,
  customerMetrics
} from "@shared/schema";
import { UserRole, AccountHealth, TaskStatus, AlertSeverity } from "@shared/types";

async function seed() {
  console.log("Starting seed process...");
  
  try {
    // Clear existing data if needed
    await clearExistingData();
    
    // Seed users
    const createdUsers = await seedUsers();
    console.log(`Created ${createdUsers.length} users`);
    
    // Seed customers
    const createdCustomers = await seedCustomers();
    console.log(`Created ${createdCustomers.length} customers`);
    
    // Seed tasks
    const createdTasks = await seedTasks(createdUsers, createdCustomers);
    console.log(`Created ${createdTasks.length} tasks`);
    
    // Seed task comments
    const createdComments = await seedTaskComments(createdTasks, createdUsers);
    console.log(`Created ${createdComments.length} task comments`);
    
    // Seed playbooks
    const createdPlaybooks = await seedPlaybooks(createdUsers[0].id);
    console.log(`Created ${createdPlaybooks.length} playbooks`);
    
    // Seed playbook tasks
    const createdPlaybookTasks = await seedPlaybookTasks(createdPlaybooks);
    console.log(`Created ${createdPlaybookTasks.length} playbook tasks`);
    
    // Seed red zone alerts
    const createdAlerts = await seedRedZoneAlerts(createdCustomers);
    console.log(`Created ${createdAlerts.length} red zone alerts`);
    
    // Seed customer metrics
    const createdMetrics = await seedCustomerMetrics(createdCustomers);
    console.log(`Created ${createdMetrics.length} customer metrics`);
    
    console.log("Seed process completed successfully");
  } catch (error) {
    console.error("Error during seed process:", error);
  }
}

async function clearExistingData() {
  // Delete in reverse order of dependencies
  await db.delete(customerMetrics);
  await db.delete(redZoneAlerts);
  await db.delete(playbookTasks);
  await db.delete(playbooks);
  await db.delete(taskComments);
  await db.delete(tasks);
  await db.delete(customers);
  await db.delete(users);
  
  console.log("Cleared existing data");
}

async function seedUsers() {
  const userData = [
    {
      email: "sarah.johnson@recurrer.io",
      name: "Sarah Johnson",
      role: "team_lead" as UserRole,
      avatar_url: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
      created_at: new Date("2023-01-01")
    },
    {
      email: "alex.wong@recurrer.io",
      name: "Alex Wong",
      role: "csm" as UserRole,
      avatar_url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
      created_at: new Date("2023-01-15")
    },
    {
      email: "morgan.stanley@recurrer.io",
      name: "Morgan Stanley",
      role: "csm" as UserRole,
      avatar_url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80",
      created_at: new Date("2023-02-01")
    }
  ];
  
  return await db.insert(users).values(userData).returning();
}

async function seedCustomers() {
  const customerData = [
    {
      name: "Acme Technologies",
      industry: "Technology",
      contact_name: "John Doe",
      contact_email: "john@acmetech.com",
      contact_phone: "(555) 123-4567",
      onboarded_at: new Date("2023-01-15"),
      renewal_date: new Date("2024-01-15"),
      mrr: 5000,
      arr: 60000,
      health_status: "red_zone" as AccountHealth,
      created_at: new Date("2023-01-10")
    },
    {
      name: "Global Foods Chain",
      industry: "Retail",
      contact_name: "Jane Smith",
      contact_email: "jane@globalfoods.com",
      contact_phone: "(555) 987-6543",
      onboarded_at: new Date("2022-11-10"),
      renewal_date: new Date("2023-11-10"),
      mrr: 8000,
      arr: 96000,
      health_status: "red_zone" as AccountHealth,
      created_at: new Date("2022-11-05")
    },
    {
      name: "Tech Solutions Inc",
      industry: "Software",
      contact_name: "Mike Johnson",
      contact_email: "mike@techsolutions.com",
      contact_phone: "(555) 456-7890",
      onboarded_at: new Date("2023-01-03"),
      renewal_date: new Date("2024-01-03"),
      mrr: 3500,
      arr: 42000,
      health_status: "at_risk" as AccountHealth,
      created_at: new Date("2022-12-20")
    }
  ];
  
  return await db.insert(customers).values(customerData).returning();
}

async function seedTasks(createdUsers: any[], createdCustomers: any[]) {
  const taskData = [
    {
      title: "Review onboarding progress for Acme Corp",
      description: "Check if all onboarding steps have been completed",
      status: "in_progress" as TaskStatus,
      due_date: new Date("2023-01-23"),
      customer_id: createdCustomers[0].id,
      assigned_to: createdUsers[0].id,
      recurring: false,
      created_at: new Date("2023-01-15"),
      created_by: createdUsers[0].id
    },
    {
      title: "Schedule quarterly review with Tech Solutions",
      description: "Set up a meeting to review Q1 performance",
      status: "pending" as TaskStatus,
      due_date: new Date("2023-01-30"),
      customer_id: createdCustomers[2].id,
      assigned_to: createdUsers[1].id,
      recurring: true,
      recurrence_pattern: "quarterly",
      created_at: new Date("2023-01-10"),
      created_by: createdUsers[0].id
    },
    {
      title: "Setup loyalty campaign for Global Foods",
      description: "Configure and launch the new loyalty program",
      status: "overdue" as TaskStatus,
      due_date: new Date("2023-01-15"),
      customer_id: createdCustomers[1].id,
      assigned_to: createdUsers[2].id,
      recurring: false,
      created_at: new Date("2023-01-01"),
      created_by: createdUsers[0].id
    }
  ];
  
  return await db.insert(tasks).values(taskData).returning();
}

async function seedTaskComments(createdTasks: any[], createdUsers: any[]) {
  const commentData = [
    {
      task_id: createdTasks[0].id,
      user_id: createdUsers[0].id,
      comment: "Onboarding is progressing well, but we need to follow up on the data migration.",
      created_at: new Date("2023-01-16")
    },
    {
      task_id: createdTasks[1].id,
      user_id: createdUsers[1].id,
      comment: "Customer wants to discuss adding more licenses in the review.",
      created_at: new Date("2023-01-12")
    },
    {
      task_id: createdTasks[2].id,
      user_id: createdUsers[2].id,
      comment: "Delayed due to customer's IT availability. Will reschedule for next week.",
      created_at: new Date("2023-01-14")
    }
  ];
  
  return await db.insert(taskComments).values(commentData).returning();
}

async function seedPlaybooks(userId: number) {
  const playbookData = [
    {
      name: "Standard Onboarding",
      description: "Standard onboarding process for new customers",
      trigger_type: "time_after_onboarding",
      trigger_config: { days: 0 },
      created_by: userId,
      created_at: new Date("2022-12-01")
    },
    {
      name: "Renewal Preparation",
      description: "Steps to prepare for customer renewal",
      trigger_type: "days_before_renewal",
      trigger_config: { days: 60 },
      created_by: userId,
      created_at: new Date("2022-12-15")
    },
    {
      name: "At Risk Recovery",
      description: "Process to recover customers showing signs of churn",
      trigger_type: "account_health_change",
      trigger_config: { healthStatus: "at_risk" },
      created_by: userId,
      created_at: new Date("2023-01-05")
    }
  ];
  
  return await db.insert(playbooks).values(playbookData).returning();
}

async function seedPlaybookTasks(createdPlaybooks: any[]) {
  const playbookTasksData = [
    // Standard Onboarding playbook tasks
    {
      playbook_id: createdPlaybooks[0].id,
      title: "Setup welcome call",
      description: "Schedule and conduct welcome call with the customer",
      due_days: 3,
      order: 1
    },
    {
      playbook_id: createdPlaybooks[0].id,
      title: "Configure customer account",
      description: "Set up customer account with initial settings",
      due_days: 5,
      order: 2
    },
    {
      playbook_id: createdPlaybooks[0].id,
      title: "Conduct training session",
      description: "Train customer team on platform usage",
      due_days: 10,
      order: 3
    },
    // Renewal Preparation playbook tasks
    {
      playbook_id: createdPlaybooks[1].id,
      title: "Send renewal notification",
      description: "Notify customer about upcoming renewal",
      due_days: 60,
      order: 1
    },
    {
      playbook_id: createdPlaybooks[1].id,
      title: "Schedule renewal call",
      description: "Discuss renewal options and pricing",
      due_days: 45,
      order: 2
    },
    // At Risk Recovery playbook tasks
    {
      playbook_id: createdPlaybooks[2].id,
      title: "Conduct health assessment call",
      description: "Identify issues and pain points",
      due_days: 2,
      order: 1
    },
    {
      playbook_id: createdPlaybooks[2].id,
      title: "Create recovery plan",
      description: "Develop action plan to address issues",
      due_days: 5,
      order: 2
    }
  ];
  
  return await db.insert(playbookTasks).values(playbookTasksData).returning();
}

async function seedRedZoneAlerts(createdCustomers: any[]) {
  const alertData = [
    {
      customer_id: createdCustomers[0].id,
      reason: "No campaigns sent in 90+ days",
      severity: "critical" as AlertSeverity,
      created_at: new Date("2023-01-05"),
      resolved_at: null
    },
    {
      customer_id: createdCustomers[1].id,
      reason: "No QR/loyalty setup completed",
      severity: "high_risk" as AlertSeverity,
      created_at: new Date("2023-01-08"),
      resolved_at: null
    },
    {
      customer_id: createdCustomers[2].id,
      reason: "Delayed onboarding (27 days)",
      severity: "attention_needed" as AlertSeverity,
      created_at: new Date("2023-01-10"),
      resolved_at: null
    }
  ];
  
  return await db.insert(redZoneAlerts).values(alertData).returning();
}

async function seedCustomerMetrics(createdCustomers: any[]) {
  const metricsData = [
    // Metrics for first customer
    {
      customer_id: createdCustomers[0].id,
      metric_type: "nps_score",
      metric_value: 7,
      recorded_at: new Date("2023-01-01")
    },
    {
      customer_id: createdCustomers[0].id,
      metric_type: "data_tagging",
      metric_value: 45,
      metric_percent: 45,
      recorded_at: new Date("2023-01-05")
    },
    // Metrics for second customer
    {
      customer_id: createdCustomers[1].id,
      metric_type: "nps_score",
      metric_value: 8,
      recorded_at: new Date("2022-12-15")
    },
    {
      customer_id: createdCustomers[1].id,
      metric_type: "data_tagging",
      metric_value: 72,
      metric_percent: 72,
      recorded_at: new Date("2023-01-10")
    },
    // Metrics for third customer
    {
      customer_id: createdCustomers[2].id,
      metric_type: "nps_score",
      metric_value: 6,
      recorded_at: new Date("2023-01-20")
    },
    {
      customer_id: createdCustomers[2].id,
      metric_type: "data_tagging",
      metric_value: 38,
      metric_percent: 38,
      recorded_at: new Date("2023-01-25")
    }
  ];
  
  return await db.insert(customerMetrics).values(metricsData).returning();
}

// Run the seed script immediately since this is an ES module
seed()
  .then(() => {
    console.log("Seed completed successfully");
    // We don't need to explicitly exit in ES modules
  })
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  });

export { seed };