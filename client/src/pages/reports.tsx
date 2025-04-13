import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChartCard } from "@/components/dashboard/chart-card";
import { ChartData } from "@shared/types";
import { Calendar, Download, RefreshCw, Filter, Printer } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { addMonths, format, subMonths } from "date-fns";
import { formatCurrency, formatPercent } from "@/lib/utils";

export default function Reports() {
  const [dateRange, setDateRange] = useState<{
    from: Date;
    to: Date;
  }>({
    from: subMonths(new Date(), 3),
    to: new Date(),
  });
  
  const [reportTab, setReportTab] = useState("overview");
  const [customerSegment, setCustomerSegment] = useState("all");

  // Sample chart data for overview metrics
  const onboardingCompletionData: ChartData = {
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
    datasets: [
      {
        label: "Enterprise",
        data: [85, 90, 95, 88, 92, 94],
      },
      {
        label: "Mid-market",
        data: [75, 80, 82, 79, 85, 88],
      },
      {
        label: "Small Business",
        data: [70, 68, 75, 82, 80, 85],
      }
    ]
  };

  const taskCompletionData: ChartData = {
    labels: ["Onboarding", "Training", "QBR", "Review", "Technical", "Billing"],
    datasets: [
      {
        label: "Completion Rate",
        data: [92, 88, 75, 84, 90, 95],
      }
    ]
  };

  const campaignStatsData: ChartData = {
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
    datasets: [
      {
        label: "Sent",
        data: [120, 150, 180, 200, 220, 250],
      },
      {
        label: "Opened",
        data: [90, 120, 140, 160, 180, 210],
      },
      {
        label: "Clicked",
        data: [45, 60, 75, 90, 100, 125],
      }
    ]
  };

  const npsScoreData: ChartData = {
    labels: ["Q1", "Q2", "Q3", "Q4"],
    datasets: [
      {
        label: "Enterprise",
        data: [8.2, 8.5, 8.7, 9.0],
      },
      {
        label: "Mid-market",
        data: [7.8, 8.0, 8.3, 8.5],
      },
      {
        label: "Small Business",
        data: [7.5, 7.8, 8.0, 8.2],
      }
    ]
  };

  const renewalRatesData: ChartData = {
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
    datasets: [
      {
        label: "Renewal Rate",
        data: [92, 94, 95, 96, 93, 97],
      }
    ]
  };

  const nrrData: ChartData = {
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
    datasets: [
      {
        label: "Net Revenue Retention",
        data: [102, 105, 108, 110, 112, 115],
      }
    ]
  };

  const dataTaggingData: ChartData = {
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
    datasets: [
      {
        label: "Average Tagging %",
        data: [65, 70, 75, 80, 85, 90],
      }
    ]
  };

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Reports</h1>
          <div className="flex space-x-2">
            <Button variant="outline" className="flex items-center">
              <Printer className="h-4 w-4 mr-2" />
              Print
            </Button>
            <Button variant="outline" className="flex items-center">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Report Controls */}
        <div className="bg-white p-4 rounded-lg shadow mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">Date Range</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="justify-start text-left font-normal"
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {format(dateRange.from, "MMM d, yyyy")} - {format(dateRange.to, "MMM d, yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="range"
                  selected={{
                    from: dateRange.from,
                    to: dateRange.to,
                  }}
                  onSelect={(range) => {
                    if (range?.from && range?.to) {
                      setDateRange({ from: range.from, to: range.to });
                    }
                  }}
                  initialFocus
                />
                <div className="flex justify-between p-3 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const now = new Date();
                      setDateRange({
                        from: subMonths(now, 1),
                        to: now
                      });
                    }}
                  >
                    Last Month
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const now = new Date();
                      setDateRange({
                        from: subMonths(now, 3),
                        to: now
                      });
                    }}
                  >
                    Last Quarter
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const now = new Date();
                      setDateRange({
                        from: subMonths(now, 12),
                        to: now
                      });
                    }}
                  >
                    Last Year
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">Customer Segment</label>
            <Select value={customerSegment} onValueChange={setCustomerSegment}>
              <SelectTrigger>
                <SelectValue placeholder="Select segment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Customers</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
                <SelectItem value="mid-market">Mid-Market</SelectItem>
                <SelectItem value="small-business">Small Business</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <Button className="flex items-center w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Update Report
            </Button>
          </div>
        </div>

        {/* Report Tabs */}
        <Tabs value={reportTab} onValueChange={setReportTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
            <TabsTrigger value="engagement">Engagement</TabsTrigger>
            <TabsTrigger value="financial">Financial</TabsTrigger>
            <TabsTrigger value="health">Health</TabsTrigger>
          </TabsList>
          
          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <Card>
                <CardHeader className="pb-2">
                  <h3 className="text-lg font-medium">Summary Metrics</h3>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Total Customers</p>
                      <p className="text-2xl font-bold">125</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">ARR</p>
                      <p className="text-2xl font-bold">{formatCurrency(1750000)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Avg. NPS</p>
                      <p className="text-2xl font-bold">8.2</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Retention Rate</p>
                      <p className="text-2xl font-bold">94%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <h3 className="text-lg font-medium">Customer Success Health</h3>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium">Healthy (70+)</span>
                        <span className="text-sm font-medium text-green-600">85</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-green-500 h-2 rounded-full" style={{ width: "68%" }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium">At Risk (40-69)</span>
                        <span className="text-sm font-medium text-yellow-600">33</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-yellow-500 h-2 rounded-full" style={{ width: "26.4%" }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium">Red Zone (&lt;40)</span>
                        <span className="text-sm font-medium text-red-600">7</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-red-500 h-2 rounded-full" style={{ width: "5.6%" }}></div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ChartCard 
                title="Onboarding Completion (21/30 days)" 
                type="line" 
                data={onboardingCompletionData} 
              />
              <ChartCard 
                title="Task Completion Rates by Category" 
                type="bar" 
                data={taskCompletionData} 
              />
              <ChartCard 
                title="Campaign Stats (60 days)" 
                type="bar" 
                data={campaignStatsData} 
              />
              <ChartCard 
                title="NPS Score by Quarter" 
                type="line" 
                data={npsScoreData} 
              />
            </div>
          </TabsContent>
          
          {/* Onboarding Tab */}
          <TabsContent value="onboarding">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <Card>
                <CardHeader className="pb-2">
                  <h3 className="text-lg font-medium">Onboarding Stats</h3>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Avg. Onboarding Time</p>
                      <p className="text-2xl font-bold">24 days</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Completion Rate</p>
                      <p className="text-2xl font-bold">92%</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Customers Onboarding</p>
                      <p className="text-2xl font-bold">12</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader className="pb-2">
                  <h3 className="text-lg font-medium">Onboarding Progress</h3>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium">Welcome Email</span>
                        <span className="text-sm font-medium">100%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-teal-500 h-2 rounded-full" style={{ width: "100%" }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium">Account Setup</span>
                        <span className="text-sm font-medium">95%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-teal-500 h-2 rounded-full" style={{ width: "95%" }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium">Training Sessions</span>
                        <span className="text-sm font-medium">85%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-teal-500 h-2 rounded-full" style={{ width: "85%" }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium">Data Integration</span>
                        <span className="text-sm font-medium">75%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-teal-500 h-2 rounded-full" style={{ width: "75%" }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium">First Campaign</span>
                        <span className="text-sm font-medium">68%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-teal-500 h-2 rounded-full" style={{ width: "68%" }}></div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <ChartCard 
              title="Onboarding Completion Time by Account Type (days)" 
              type="bar" 
              data={{
                labels: ["Enterprise", "Mid-Market", "Small Business"],
                datasets: [
                  {
                    label: "Average Days",
                    data: [18, 22, 28],
                  }
                ]
              }}
              height={300}
            />
          </TabsContent>
          
          {/* Engagement Tab */}
          <TabsContent value="engagement">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ChartCard 
                title="Campaign Sent Stats (Monthly)" 
                type="line" 
                data={campaignStatsData} 
              />
              <ChartCard 
                title="Campaign Effectiveness" 
                type="doughnut" 
                data={{
                  labels: ["Open Rate", "Click Rate", "Conversion Rate"],
                  datasets: [
                    {
                      data: [75, 45, 25],
                    }
                  ]
                }}
              />
              <Card className="md:col-span-2">
                <CardHeader className="pb-2">
                  <h3 className="text-lg font-medium">Customer Engagement Summary</h3>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Avg. Communications</p>
                      <p className="text-2xl font-bold">12 / month</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Meeting Attendance</p>
                      <p className="text-2xl font-bold">88%</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Feature Adoption</p>
                      <p className="text-2xl font-bold">72%</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Support Tickets</p>
                      <p className="text-2xl font-bold">↓ 15%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <ChartCard 
                title="Review Meeting Attendance" 
                type="line" 
                data={{
                  labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
                  datasets: [
                    {
                      label: "Attendance Rate",
                      data: [82, 85, 88, 90, 92, 88],
                    }
                  ]
                }}
              />
              <ChartCard 
                title="Communication Channels" 
                type="doughnut" 
                data={{
                  labels: ["Email", "Meetings", "Phone", "Chat", "In-app"],
                  datasets: [
                    {
                      data: [40, 25, 15, 10, 10],
                    }
                  ]
                }}
              />
            </div>
          </TabsContent>
          
          {/* Financial Tab */}
          <TabsContent value="financial">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <Card>
                <CardHeader className="pb-2">
                  <h3 className="text-lg font-medium">Revenue Metrics</h3>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Total ARR</p>
                      <p className="text-2xl font-bold">{formatCurrency(1750000)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">MRR Growth</p>
                      <p className="text-2xl font-bold text-green-600">+8.2%</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">ARR per Customer</p>
                      <p className="text-2xl font-bold">{formatCurrency(14000)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader className="pb-2">
                  <h3 className="text-lg font-medium">Add-on Revenue</h3>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-500 mb-1">Total Add-on Revenue</p>
                    <p className="text-2xl font-bold">{formatCurrency(325000)}</p>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium">Premium Support</span>
                        <span className="text-sm font-medium">{formatCurrency(125000)}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full" style={{ width: "38.4%" }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium">Additional Users</span>
                        <span className="text-sm font-medium">{formatCurrency(95000)}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-purple-500 h-2 rounded-full" style={{ width: "29.2%" }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium">API Access</span>
                        <span className="text-sm font-medium">{formatCurrency(75000)}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-green-500 h-2 rounded-full" style={{ width: "23.1%" }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium">Storage</span>
                        <span className="text-sm font-medium">{formatCurrency(30000)}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-yellow-500 h-2 rounded-full" style={{ width: "9.2%" }}></div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ChartCard 
                title="Renewal Rates" 
                type="line" 
                data={renewalRatesData} 
              />
              <ChartCard 
                title="Net Revenue Retention" 
                type="line" 
                data={nrrData} 
              />
            </div>
          </TabsContent>
          
          {/* Health Tab */}
          <TabsContent value="health">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ChartCard 
                title="Data Tagging Percentage" 
                type="line" 
                data={dataTaggingData} 
              />
              <ChartCard 
                title="NPS Score Trend" 
                type="line" 
                data={npsScoreData} 
              />
              <Card className="md:col-span-2">
                <CardHeader className="pb-2">
                  <h3 className="text-lg font-medium">Red Zone Reasons</h3>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium">No campaign sent within 60 days</span>
                        <span className="text-sm font-medium">35%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-red-500 h-2 rounded-full" style={{ width: "35%" }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium">Low data tagging</span>
                        <span className="text-sm font-medium">28%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-red-500 h-2 rounded-full" style={{ width: "28%" }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium">No review meetings</span>
                        <span className="text-sm font-medium">20%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-red-500 h-2 rounded-full" style={{ width: "20%" }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium">Low NPS</span>
                        <span className="text-sm font-medium">12%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-red-500 h-2 rounded-full" style={{ width: "12%" }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium">Revenue drop</span>
                        <span className="text-sm font-medium">5%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-red-500 h-2 rounded-full" style={{ width: "5%" }}></div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <ChartCard 
                title="Feature Adoption" 
                type="bar" 
                data={{
                  labels: ["Dashboards", "Reports", "Analytics", "Tagging", "Automation", "API"],
                  datasets: [
                    {
                      label: "Adoption Rate",
                      data: [85, 72, 68, 55, 45, 32],
                    }
                  ]
                }}
              />
              
              <ChartCard 
                title="Health Score Distribution" 
                type="doughnut" 
                data={{
                  labels: ["Excellent (80-100)", "Good (60-79)", "Average (40-59)", "Poor (0-39)"],
                  datasets: [
                    {
                      data: [45, 35, 15, 5],
                    }
                  ]
                }}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
