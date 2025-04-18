import { useState } from "react";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  CardDescription 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PieChart, Pie, Cell } from "recharts";
import { 
  BarChart2, 
  Calendar, 
  Download, 
  Filter, 
  PieChart as PieChartIcon,
  RefreshCw
} from "lucide-react";
import { GradientChart } from "@/components/ui/gradient-chart";
import { RefreshButton } from "@/components/ui/refresh-button";
import { MetricTimeframe } from "@shared/types";
import { cn, formatINR } from "@/lib/utils";

// Mock data for reports
const mockOnboardingData = [
  { name: 'Week 1', value: 75 },
  { name: 'Week 2', value: 85 },
  { name: 'Week 3', value: 92 },
  { name: 'Week 4', value: 98 },
];

const mockTaskCompletionData = [
  { name: 'Onboarding', complete: 92, incomplete: 8 },
  { name: 'Review', complete: 85, incomplete: 15 },
  { name: 'Campaign', complete: 76, incomplete: 24 },
  { name: 'QR Setup', complete: 65, incomplete: 35 },
  { name: 'Loyalty', complete: 88, incomplete: 12 },
];

const mockCampaignData = [
  { name: 'Jan', sent: 45, opened: 32, clicked: 18 },
  { name: 'Feb', sent: 52, opened: 38, clicked: 21 },
  { name: 'Mar', sent: 48, opened: 35, clicked: 19 },
  { name: 'Apr', sent: 61, opened: 45, clicked: 26 },
  { name: 'May', sent: 58, opened: 42, clicked: 24 },
  { name: 'Jun', sent: 65, opened: 50, clicked: 30 },
];

const mockNpsData = [
  { name: 'Q1', value: 7.5 },
  { name: 'Q2', value: 8.2 },
  { name: 'Q3', value: 7.8 },
  { name: 'Q4', value: 8.5 },
];

const mockRenewalData = [
  { name: 'Renewed', value: 85 },
  { name: 'Churned', value: 15 },
];

const mockAddOnRevenue = [
  { name: 'Base', value: 75 },
  { name: 'Add-ons', value: 25 },
];

export default function Reports() {
  const [timeframe, setTimeframe] = useState<MetricTimeframe>("monthly");
  
  const handleTimeframeChange = (newTimeframe: MetricTimeframe) => {
    setTimeframe(newTimeframe);
  };
  
  return (
    <>
      <div className="bg-white shadow">
        <div className="px-4 sm:px-6 lg:max-w-7xl lg:mx-auto lg:px-8">
          <div className="py-6 md:flex md:items-center md:justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-semibold text-gray-900">Reports</h1>
              <p className="mt-1 text-sm text-gray-500">
                Analyze customer success metrics and trends
              </p>
            </div>
            <div className="mt-4 flex flex-wrap md:mt-0 md:ml-4 gap-2">
              <Select value={timeframe} onValueChange={(value: MetricTimeframe) => handleTimeframeChange(value)}>
                <SelectTrigger className="w-[130px]">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2" />
                    <span>{timeframe.charAt(0).toUpperCase() + timeframe.slice(1)}</span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
              
              <RefreshButton
                variant="outline"
                onRefresh={async () => {
                  // Simulate data refresh with a delay
                  return new Promise((resolve) => setTimeout(resolve, 1000));
                }}
                successMessage="Report data refreshed successfully"
                errorMessage="Failed to refresh report data"
              >
                Refresh
              </RefreshButton>
              
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="w-full justify-start mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
            <TabsTrigger value="nps">NPS & Feedback</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              <MetricCard
                title="Onboarding Completion"
                value="92%"
                change={+8}
                description="21/30 days avg completion time"
              />
              <MetricCard
                title="Campaign Sent Rate"
                value="95%"
                change={+12}
                description="First 60 days after onboarding"
              />
              <MetricCard
                title="Average NPS Score"
                value="8.2/10"
                change={+0.7}
                description="Quarterly average"
              />
              <MetricCard
                title="Renewal Rate"
                value="85%"
                change={-3}
                description="Last 12 months"
              />
              <MetricCard
                title="Data Tagging"
                value="78%"
                change={+15}
                description="Customer data completeness"
              />
              <MetricCard
                title="Add-on Revenue"
                value={formatINR(245000)}
                change={+22}
                description="Per location average"
              />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Onboarding Completion</CardTitle>
                  <CardDescription>Progress over first 30 days by account type</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <GradientChart 
                      data={mockOnboardingData} 
                      height={300} 
                      showGrid={true}
                    />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Task Completion Rates</CardTitle>
                  <CardDescription>By category</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={mockTaskCompletionData}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                        <XAxis dataKey="name" />
                        <YAxis domain={[0, 100]} label={{ value: '%', position: 'insideLeft', offset: -5 }} />
                        <Tooltip 
                          formatter={(value, name) => [`${value}%`, name]}
                          labelFormatter={(label) => `Category: ${label}`}
                          contentStyle={{ 
                            backgroundColor: "white", 
                            borderRadius: "0.375rem", 
                            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                            border: "none"
                          }}
                        />
                        <Legend />
                        <Bar 
                          dataKey="complete" 
                          stackId="a" 
                          fill="#0D9298" 
                          name="Complete"
                          radius={[4, 4, 0, 0]}
                        />
                        <Bar 
                          dataKey="incomplete" 
                          stackId="a" 
                          fill="#9CA3AF" 
                          name="Incomplete"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="onboarding">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Onboarding Completion Rate</CardTitle>
                  <CardDescription>Percentage of completed onboarding steps over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <GradientChart 
                      data={mockOnboardingData} 
                      height={300} 
                      showGrid={true}
                    />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Task Completion Breakdown</CardTitle>
                  <CardDescription>Completion rates by task category</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={mockTaskCompletionData}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                        <XAxis dataKey="name" />
                        <YAxis domain={[0, 100]} label={{ value: '%', position: 'insideLeft', offset: -5 }} />
                        <Tooltip 
                          formatter={(value, name) => [`${value}%`, name]}
                          labelFormatter={(label) => `Category: ${label}`}
                          contentStyle={{ 
                            backgroundColor: "white", 
                            borderRadius: "0.375rem", 
                            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                            border: "none"
                          }}
                        />
                        <Legend />
                        <Bar 
                          dataKey="complete" 
                          stackId="a" 
                          fill="#0D9298" 
                          name="Complete"
                          radius={[4, 4, 0, 0]}
                        />
                        <Bar 
                          dataKey="incomplete" 
                          stackId="a" 
                          fill="#9CA3AF" 
                          name="Incomplete"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="campaigns">
            <Card>
              <CardHeader>
                <CardTitle>Campaign Performance</CardTitle>
                <CardDescription>Sent, opened, and clicked metrics for campaigns</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={mockCampaignData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value, name) => [value, name]}
                        labelFormatter={(label) => `Month: ${label}`}
                        contentStyle={{ 
                          backgroundColor: "white", 
                          borderRadius: "0.375rem", 
                          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                          border: "none"
                        }}
                      />
                      <Legend />
                      <Bar dataKey="sent" fill="#1E99A0" name="Sent" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="opened" fill="#0D9298" name="Opened" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="clicked" fill="#16797E" name="Clicked" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="revenue">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Renewal Rates</CardTitle>
                  <CardDescription>Percentage of customers who renewed their contracts</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80 flex items-center justify-center">
                    <ResponsiveContainer width="80%" height="100%">
                      <PieChart>
                        <Pie
                          data={mockRenewalData}
                          cx="50%"
                          cy="50%"
                          innerRadius={80}
                          outerRadius={120}
                          paddingAngle={2}
                          dataKey="value"
                          label={({name, value}) => `${name}: ${value}%`}
                          labelLine={false}
                        >
                          <Cell fill="#0D9298" />
                          <Cell fill="#9CA3AF" />
                        </Pie>
                        <Tooltip 
                          formatter={(value, name) => [`${value}%`, name]}
                          labelFormatter={() => 'Customer Renewal'}
                          contentStyle={{ 
                            backgroundColor: "white", 
                            borderRadius: "0.375rem", 
                            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                            border: "none"
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Add-on Revenue</CardTitle>
                  <CardDescription>Percentage of revenue from add-on services</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80 flex items-center justify-center">
                    <ResponsiveContainer width="80%" height="100%">
                      <PieChart>
                        <Pie
                          data={mockAddOnRevenue}
                          cx="50%"
                          cy="50%"
                          innerRadius={80}
                          outerRadius={120}
                          paddingAngle={2}
                          dataKey="value"
                          label={({name, value}) => `${name}: ${value}%`}
                          labelLine={false}
                        >
                          <Cell fill="#0D9298" />
                          <Cell fill="#1E99A0" />
                        </Pie>
                        <Tooltip 
                          formatter={(value, name) => [`${value}%`, name]}
                          labelFormatter={() => 'Revenue Distribution'}
                          contentStyle={{ 
                            backgroundColor: "white", 
                            borderRadius: "0.375rem", 
                            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                            border: "none"
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="nps">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>NPS Score Trend</CardTitle>
                  <CardDescription>Quarterly NPS score averages</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <GradientChart 
                      data={mockNpsData} 
                      height={300} 
                      showGrid={true}
                      gradientFrom="#0D9298"
                      gradientTo="rgba(13, 146, 152, 0)"
                    />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Feedback Categories</CardTitle>
                  <CardDescription>Most common feedback themes</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        data={[
                          { name: 'Product Quality', value: 87 },
                          { name: 'Customer Service', value: 82 },
                          { name: 'Ease of Use', value: 78 },
                          { name: 'Value', value: 72 },
                          { name: 'Reliability', value: 92 },
                        ]} 
                        layout="vertical"
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                        <XAxis type="number" domain={[0, 100]} />
                        <YAxis dataKey="name" type="category" width={120} />
                        <Tooltip 
                          formatter={(value) => [`${value}%`, 'Satisfaction']}
                          contentStyle={{ 
                            backgroundColor: "white", 
                            borderRadius: "0.375rem", 
                            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                            border: "none"
                          }}
                        />
                        <Bar dataKey="value" fill="#0D9298" barSize={24} radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

// Component for metric cards
function MetricCard({ title, value, change, description }: {
  title: string;
  value: string | number;
  change: number;
  description: string;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="mt-2 text-3xl font-semibold text-gray-900">{value}</p>
          </div>
          <Badge className={cn(
            "mt-1 px-2 py-1",
            change > 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
          )}>
            {change > 0 ? '+' : ''}{change}%
          </Badge>
        </div>
        <p className="mt-2 text-sm text-gray-500">{description}</p>
      </CardContent>
    </Card>
  );
}