import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  CheckSquare, 
  Clock, 
  AlertTriangle, 
  MessageSquare 
} from "lucide-react";
import { StatsCard } from "@/components/dashboard/stats-card";
import { MonthlyMetricsChart } from "@/components/dashboard/monthly-metrics-chart";
import { HealthDistributionChart } from "@/components/dashboard/health-distribution-chart";
import { TaskList } from "@/components/dashboard/task-list";
import { RedZoneList } from "@/components/dashboard/red-zone-list";
import { Button } from "@/components/ui/button";
import { MetricTimeframe } from "@shared/types";

export default function Dashboard() {
  const [timeframe, setTimeframe] = useState<MetricTimeframe>("monthly");
  
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: [`/api/dashboard?timeframe=${timeframe}`],
  });
  
  const { data: tasks } = useQuery({
    queryKey: ['/api/tasks'],
  });
  
  const { data: redZoneAlerts } = useQuery({
    queryKey: ['/api/red-zone'],
  });
  
  const { data: users } = useQuery({
    queryKey: ['/api/users'],
  });
  
  const { data: customers } = useQuery({
    queryKey: ['/api/customers'],
  });
  
  // Format users and customers data for lookups
  const userMap = users?.reduce((acc, user) => {
    acc[user.id] = user;
    return acc;
  }, {}) || {};
  
  const customerMap = customers?.reduce((acc, customer) => {
    acc[customer.id] = customer;
    return acc;
  }, {}) || {};
  
  const handleTimeframeChange = (newTimeframe: MetricTimeframe) => {
    setTimeframe(newTimeframe);
  };
  
  if (isLoading) {
    return <div className="flex justify-center items-center h-full p-8">Loading dashboard data...</div>;
  }
  
  return (
    <>
      <div className="bg-white shadow">
        <div className="px-4 sm:px-6 lg:max-w-7xl lg:mx-auto lg:px-8">
          <div className="py-6 md:flex md:items-center md:justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
              <p className="mt-1 text-sm text-gray-500">
                Overview of your customer success metrics and tasks
              </p>
            </div>
            <div className="mt-4 flex md:mt-0 md:ml-4">
              <div className="inline-flex shadow-sm rounded-md">
                <Button
                  variant="outline"
                  className={timeframe === "weekly" ? "bg-teal-50 text-teal-700" : ""}
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
                  className={timeframe === "yearly" ? "bg-teal-50 text-teal-700" : ""}
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
            value={dashboardData?.openTasks}
            icon={<CheckSquare className="h-6 w-6 text-teal-600" />}
            changePercent={dashboardData?.openTasksChange}
            footerLink="/tasks"
            footerText="View all tasks"
            iconBgColor="bg-teal-100"
          />
          
          <StatsCard
            title="Campaign Gaps"
            value={dashboardData?.campaignGaps}
            icon={<MessageSquare className="h-6 w-6 text-indigo-600" />}
            changePercent={dashboardData?.campaignGapsChange}
            footerLink="/reports?filter=campaigns"
            footerText="View all gaps"
            iconBgColor="bg-indigo-100"
          />
          
          <StatsCard
            title="Renewal Alerts"
            value={dashboardData?.renewalAlerts}
            icon={<Clock className="h-6 w-6 text-yellow-600" />}
            changePercent={dashboardData?.renewalAlertsChange}
            footerLink="/reports?filter=renewals"
            footerText="View all renewals"
            iconBgColor="bg-yellow-100"
          />
          
          <StatsCard
            title="Red Zone Count"
            value={dashboardData?.redZoneCount}
            icon={<AlertTriangle className="h-6 w-6 text-red-600" />}
            changePercent={dashboardData?.redZoneCountChange}
            footerLink="/red-zone"
            footerText="View red zone accounts"
            iconBgColor="bg-red-100"
          />
        </div>
      </div>

      {/* Chart Section */}
      <div className="mt-8 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <MonthlyMetricsChart data={dashboardData?.monthlyMetrics} />
          <HealthDistributionChart data={dashboardData?.healthDistribution} />
        </div>
      </div>

      {/* Tasks and Red Zone Section */}
      <div className="mt-8 px-4 sm:px-6 lg:px-8 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <TaskList tasks={tasks?.slice(0, 3) || []} users={userMap} />
        <RedZoneList alerts={redZoneAlerts?.slice(0, 3) || []} customers={customerMap} />
      </div>
    </>
  );
}
