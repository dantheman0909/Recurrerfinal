import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CheckSquare,
  Clock,
  AlertTriangle,
  MessageSquare,
  TrendingUp,
} from "lucide-react";
import { StatsCard } from "@/components/dashboard/stats-card";
import { MonthlyMetricsChart } from "@/components/dashboard/monthly-metrics-chart";
import { HealthDistributionChart } from "@/components/dashboard/health-distribution-chart";
import { TaskList } from "@/components/dashboard/task-list";
import { RedZoneList } from "@/components/dashboard/red-zone-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { HelpTooltip } from "@/components/ui/help-tooltip";
import { MetricTimeframe } from "@shared/types";
import { formatCurrency } from "@/lib/utils";

// Define types for our dashboard data
interface DashboardData {
  openTasks: number;
  openTasksChange: number;
  campaignGaps: number;
  campaignGapsChange: number;
  renewalAlerts: number;
  renewalAlertsChange: number;
  redZoneCount: number;
  redZoneCountChange: number;
  mrrTotal: number;
  mrrChange: number;
  arrTotal: number;
  arrChange: number;
  revenuePerCustomer: number;
  growthRate: number;
  monthlyMetrics: {
    months: string[];
    values: number[];
  };
  healthDistribution: {
    healthy: number;
    atRisk: number;
    redZone: number;
  };
}

interface User {
  id: number;
  name: string;
  role: string;
  [key: string]: any;
}

interface Customer {
  id: number;
  name: string;
  [key: string]: any;
}

interface Task {
  id: number;
  title: string;
  due_date: string;
  status: string;
  assignee_id: number;
  customer_id: number;
  [key: string]: any;
}

interface RedZoneAlert {
  id: number;
  customer_id: number;
  reason: string;
  severity: string;
  created_at: string;
  [key: string]: any;
}

interface UserMap {
  [id: number]: User;
}

interface CustomerMap {
  [id: number]: Customer;
}

// Function to get greeting based on time of day
const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
};

export default function Dashboard() {
  const [timeframe, setTimeframe] = useState<MetricTimeframe>("monthly");
  const [greeting] = useState<string>(getGreeting());

  const { data: dashboardData, isLoading } = useQuery<DashboardData>({
    queryKey: [`/api/dashboard?timeframe=${timeframe}`],
  });

  const { data: tasks } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const { data: redZoneAlerts } = useQuery<RedZoneAlert[]>({
    queryKey: ["/api/red-zone"],
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: customers } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  // Format users and customers data for lookups
  const userMap: UserMap =
    users?.reduce<UserMap>((acc: UserMap, user: User) => {
      acc[user.id] = user;
      return acc;
    }, {}) || {};

  const customerMap: CustomerMap =
    customers?.reduce<CustomerMap>((acc: CustomerMap, customer: Customer) => {
      acc[customer.id] = customer;
      return acc;
    }, {}) || {};

  const handleTimeframeChange = (newTimeframe: MetricTimeframe) => {
    setTimeframe(newTimeframe);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full p-8">
        Loading dashboard data...
      </div>
    );
  }

  return (
    <>
      <div className="bg-white shadow">
        <div className="px-4 sm:px-6 lg:max-w-7xl lg:mx-auto lg:px-8">
          <div className="py-6 md:flex md:items-center md:justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center mb-1">
                <h1 className="text-2xl font-semibold text-gray-900">
                  {greeting},{" "}
                  {users && users.length > 0
                    ? users[0].name.split(" ")[0]
                    : "User"}{" "}
                  <span className="ml-1 animate-bounce inline-block">👋</span>
                </h1>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Overview of your customer success metrics and tasks
              </p>
            </div>
            <div className="mt-4 flex md:mt-0 md:ml-4">
              <div className="inline-flex shadow-sm rounded-md">
                <Button
                  variant="outline"
                  className={
                    timeframe === "weekly" ? "bg-teal-50 text-teal-700" : ""
                  }
                  onClick={() => handleTimeframeChange("weekly")}
                >
                  Weekly
                </Button>
                <Button
                  variant="outline"
                  className={`rounded-none ${timeframe === "monthly" ? "bg-teal-50 text-teal-700" : ""}`}
                  onClick={() => handleTimeframeChange("monthly")}
                >
                  Monthly
                </Button>
                <Button
                  variant="outline"
                  className={`rounded-none ${timeframe === "quarterly" ? "bg-teal-50 text-teal-700" : ""}`}
                  onClick={() => handleTimeframeChange("quarterly")}
                >
                  Quarterly
                </Button>
                <Button
                  variant="outline"
                  className={
                    timeframe === "yearly" ? "bg-teal-50 text-teal-700" : ""
                  }
                  onClick={() => handleTimeframeChange("yearly")}
                >
                  Yearly
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="mt-8 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Open Tasks"
            value={dashboardData?.openTasks || 0}
            icon={<CheckSquare className="h-6 w-6 text-teal-600" />}
            changePercent={dashboardData?.openTasksChange}
            footerLink="/tasks"
            footerText="View all tasks"
            iconBgColor="bg-teal-100"
            helpText={
              <div className="space-y-1">
                <div className="font-semibold text-gray-800">Open Tasks</div>
                <div>Tasks pending or in progress across all customers.</div>
              </div>
            }
          />

          <StatsCard
            title="Campaign Gaps"
            value={dashboardData?.campaignGaps || 0}
            icon={<MessageSquare className="h-6 w-6 text-indigo-600" />}
            changePercent={dashboardData?.campaignGapsChange}
            footerLink="/reports?filter=campaigns"
            footerText="View all gaps"
            iconBgColor="bg-indigo-100"
            helpText={
              <div className="space-y-1">
                <div className="font-semibold text-gray-800">Campaign Gaps</div>
                <div>Customers without campaigns in the last 30 days.</div>
              </div>
            }
          />

          <StatsCard
            title="Renewal Alerts"
            value={dashboardData?.renewalAlerts || 0}
            icon={<Clock className="h-6 w-6 text-yellow-600" />}
            changePercent={dashboardData?.renewalAlertsChange}
            footerLink="/reports?filter=renewals"
            footerText="View all renewals"
            iconBgColor="bg-yellow-100"
            helpText={
              <div className="space-y-1">
                <div className="font-semibold text-gray-800">Renewal Alerts</div>
                <div>
                  Subscriptions due for renewal in the next 60 days that require
                  attention.
                </div>
              </div>
            }
          />

          <StatsCard
            title="Red Zone Count"
            value={dashboardData?.redZoneCount || 0}
            icon={<AlertTriangle className="h-6 w-6 text-red-600" />}
            changePercent={dashboardData?.redZoneCountChange}
            footerLink="/red-zone"
            footerText="View red zone accounts"
            iconBgColor="bg-red-100"
            helpText={
              <div className="space-y-1">
                <div className="font-semibold text-gray-800">Red Zone Count</div>
                <div>High-risk customers requiring immediate intervention.</div>
              </div>
            }
          />
        </div>
      </div>

      {/* Revenue Overview */}
      <div className="mt-8 px-4 sm:px-6 lg:px-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-teal-600" />
                Revenue Overview ({timeframe})
              </h3>
              <div className="text-sm text-gray-500">
                {timeframe === "weekly"
                  ? "Last 7 days"
                  : timeframe === "monthly"
                    ? "Last 30 days"
                    : timeframe === "quarterly"
                      ? "Last 90 days"
                      : "Last 12 months"}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <div className="text-sm text-gray-500 flex items-center justify-center gap-1">
                  Total MRR
                  <HelpTooltip
                    content={
                      <div className="space-y-1">
                        <div className="font-semibold text-gray-800">
                          Monthly Recurring Revenue
                        </div>
                        <div>
                          Total revenue generated each month from all active
                          subscriptions.
                        </div>
                      </div>
                    }
                  />
                </div>
                <p className="text-2xl font-semibold">
                  {formatCurrency(dashboardData?.mrrTotal || 0)}
                </p>
                <div className="mt-1 flex items-center justify-center text-sm">
                  <span
                    className={
                      (dashboardData?.mrrChange || 0) >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    }
                  >
                    {(dashboardData?.mrrChange || 0) >= 0 ? "+" : ""}
                    {dashboardData?.mrrChange || 0}%
                  </span>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <div className="text-sm text-gray-500 flex items-center justify-center gap-1">
                  Total ARR
                  <HelpTooltip
                    content={
                      <div className="space-y-1">
                        <div className="font-semibold text-gray-800">
                          Annual Recurring Revenue
                        </div>
                        <div>
                          Total revenue expected over the next 12 months (MRR ×
                          12).
                        </div>
                      </div>
                    }
                  />
                </div>
                <p className="text-2xl font-semibold">
                  {formatCurrency(dashboardData?.arrTotal || 0)}
                </p>
                <div className="mt-1 flex items-center justify-center text-sm">
                  <span
                    className={
                      (dashboardData?.arrChange || 0) >= 0
                        ? "text-green-600"
                        : "text-red-600"
                    }
                  >
                    {(dashboardData?.arrChange || 0) >= 0 ? "+" : ""}
                    {dashboardData?.arrChange || 0}%
                  </span>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <div className="text-sm text-gray-500 flex items-center justify-center gap-1">
                  Avg. Revenue Per Customer
                  <HelpTooltip
                    content={
                      <div className="space-y-1">
                        <div className="font-semibold text-gray-800">
                          Average Revenue Per Customer
                        </div>
                        <div>
                          Monthly revenue per customer (MRR ÷ active customers).
                        </div>
                      </div>
                    }
                  />
                </div>
                <p className="text-2xl font-semibold">
                  {formatCurrency(dashboardData?.revenuePerCustomer || 0)}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <div className="text-sm text-gray-500 flex items-center justify-center gap-1">
                  Growth Rate
                  <HelpTooltip
                    content={
                      <div className="space-y-1">
                        <div className="font-semibold text-gray-800">
                          Growth Rate
                        </div>
                        <div>
                          Percentage increase in MRR compared to previous
                          period.
                        </div>
                      </div>
                    }
                  />
                </div>
                <p className="text-2xl font-semibold">
                  {dashboardData?.growthRate || 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart Section */}
      <div className="mt-8 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {dashboardData?.monthlyMetrics && (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900 flex items-center gap-1">
                    Monthly Key Metrics
                    <HelpTooltip
                      content={
                        <div className="space-y-1">
                          <div className="font-semibold text-gray-800">
                            Monthly Key Metrics
                          </div>
                          <div>
                            Trends of important business metrics over time,
                            showing month-by-month performance.
                          </div>
                        </div>
                      }
                    />
                  </h3>
                </div>
                <MonthlyMetricsChart
                  data={dashboardData.monthlyMetrics}
                  timeframe={timeframe}
                />
              </CardContent>
            </Card>
          )}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 flex items-center gap-1">
                  Customer Health Distribution
                  <HelpTooltip
                    content={
                      <div className="space-y-1">
                        <div className="font-semibold text-gray-800">
                          Customer Health Distribution
                        </div>
                        <div>
                          Breakdown of customer health across different market
                          segments.
                        </div>
                      </div>
                    }
                  />
                </h3>
              </div>
              <HealthDistributionChart
                data={[
                  {
                    segment: "Enterprise",
                    excellent: 48,
                    good: 32,
                    average: 10,
                    at_risk: 6,
                    critical: 4,
                  },
                  {
                    segment: "Mid-Market",
                    excellent: 35,
                    good: 40,
                    average: 15,
                    at_risk: 7,
                    critical: 3,
                  },
                  {
                    segment: "Small Business",
                    excellent: 28,
                    good: 35,
                    average: 22,
                    at_risk: 10,
                    critical: 5,
                  },
                ]}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tasks and Red Zone Section */}
      <div className="mt-8 px-4 sm:px-6 lg:px-8 grid grid-cols-1 gap-5 lg:grid-cols-2">
        {tasks && (
          <TaskList tasks={tasks.slice(0, 3) || []} users={userMap as any} />
        )}
        {redZoneAlerts && (
          <RedZoneList
            alerts={redZoneAlerts.slice(0, 3) || []}
            customers={customerMap as any}
          />
        )}
      </div>
    </>
  );
}
