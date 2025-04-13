import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { StatCard } from "@/components/dashboard/stat-card";
import { ChartCard } from "@/components/dashboard/chart-card";
import { ActivityItem } from "@/components/dashboard/activity-item";
import { TaskItem } from "@/components/dashboard/task-item";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { ChartData } from "@shared/types";

export default function Dashboard() {
  const [timeFrame, setTimeFrame] = useState<"weekly" | "monthly" | "quarterly" | "yearly">("weekly");

  // Fetch dashboard stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
  });

  // Fetch recent activity
  const { data: activities, isLoading: activitiesLoading } = useQuery({
    queryKey: ["/api/dashboard/recent-activity"],
  });

  // Fetch upcoming tasks
  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ["/api/dashboard/upcoming-tasks"],
  });

  const handleCompleteTask = async (taskId: string) => {
    // Implementation for completing a task
    console.log("Completing task:", taskId);
  };

  // Sample chart data
  const onboardingChartData: ChartData = {
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    datasets: [
      {
        label: "Onboarded Customers",
        data: [3, 5, 2, 6, 4, 1, 2],
      }
    ]
  };

  const taskCompletionChartData: ChartData = {
    labels: ["Completed", "In Progress", "Not Started"],
    datasets: [
      {
        data: [65, 25, 10],
      }
    ]
  };

  const healthScoreChartData: ChartData = {
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
    datasets: [
      {
        label: "Average Health Score",
        data: [78, 82, 80, 85, 83, 90],
        tension: 0.3,
        fill: true,
      }
    ]
  };

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        {/* Filter Section */}
        <div className="mb-6 mt-4 flex flex-wrap items-center justify-between">
          <div className="flex space-x-2 mb-4 sm:mb-0">
            <Button 
              variant={timeFrame === "weekly" ? "default" : "outline"} 
              onClick={() => setTimeFrame("weekly")}
            >
              Weekly
            </Button>
            <Button 
              variant={timeFrame === "monthly" ? "default" : "outline"} 
              onClick={() => setTimeFrame("monthly")}
            >
              Monthly
            </Button>
            <Button 
              variant={timeFrame === "quarterly" ? "default" : "outline"} 
              onClick={() => setTimeFrame("quarterly")}
            >
              Quarterly
            </Button>
            <Button 
              variant={timeFrame === "yearly" ? "default" : "outline"} 
              onClick={() => setTimeFrame("yearly")}
            >
              Yearly
            </Button>
          </div>
          <div className="flex flex-wrap">
            <Button variant="outline" className="flex items-center mr-2 mb-2 sm:mb-0">
              <i className="fas fa-filter mr-2"></i> Filter
            </Button>
            <Button variant="outline" className="flex items-center">
              <i className="fas fa-download mr-2"></i> Export
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Open Tasks"
            value={statsLoading ? 0 : stats?.openTasks || 23}
            change={-7}
            icon="tasks"
            linkText="View all tasks"
            linkHref="/tasks"
          />
          <StatCard
            title="Campaign Gaps"
            value={statsLoading ? 0 : stats?.campaignGaps || 4}
            change={2}
            icon="campaigns"
            linkText="View all campaigns"
            linkHref="/customers"
          />
          <StatCard
            title="Renewal Alerts"
            value={statsLoading ? 0 : stats?.renewalAlerts || 12}
            change={10}
            icon="renewals"
            linkText="View all renewals"
            linkHref="/customers"
          />
          <StatCard
            title="Red Zone Count"
            value={statsLoading ? 0 : stats?.redZoneCount || 7}
            change={3}
            icon="redzone"
            linkText="View all red zones"
            linkHref="/red-zone"
          />
        </div>

        {/* Charts Row */}
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <ChartCard 
            title="Customer Onboarding" 
            type="bar" 
            data={onboardingChartData} 
          />
          <ChartCard 
            title="Task Completion" 
            type="doughnut" 
            data={taskCompletionChartData} 
          />
          <ChartCard 
            title="Customer Health Score" 
            type="line" 
            data={healthScoreChartData} 
          />
        </div>

        {/* Recent Activity & Tasks */}
        <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* Recent Activity */}
          <Card className="col-span-2">
            <CardHeader className="px-4 py-5 sm:px-6 flex justify-between items-center border-b border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Recent Activity</h3>
              <Button variant="link" className="text-teal-600 hover:text-teal-500 p-0">View all</Button>
            </CardHeader>
            <div>
              {activitiesLoading ? (
                <div className="p-4 text-center text-gray-500">Loading activities...</div>
              ) : activities && activities.length > 0 ? (
                <div className="divide-y divide-gray-200">
                  {activities.map((activity: any) => (
                    <ActivityItem key={activity.id} activity={activity} />
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-gray-500">No recent activities</div>
              )}
            </div>
          </Card>

          {/* Upcoming Tasks */}
          <Card>
            <CardHeader className="px-4 py-5 sm:px-6 flex justify-between items-center border-b border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Upcoming Tasks</h3>
              <Button variant="link" className="text-teal-600 hover:text-teal-500 p-0">View all</Button>
            </CardHeader>
            <div className="divide-y divide-gray-200">
              {tasksLoading ? (
                <div className="p-4 text-center text-gray-500">Loading tasks...</div>
              ) : tasks && tasks.length > 0 ? (
                tasks.map((task: any) => (
                  <TaskItem 
                    key={task.id} 
                    task={task} 
                    onComplete={handleCompleteTask} 
                  />
                ))
              ) : (
                <div className="p-4 text-center text-gray-500">No upcoming tasks</div>
              )}
            </div>
            <div className="px-4 py-4 sm:px-6 border-t border-gray-200">
              <Button variant="outline" className="w-full flex justify-center items-center">
                <Plus className="h-4 w-4 mr-2" /> Add New Task
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
