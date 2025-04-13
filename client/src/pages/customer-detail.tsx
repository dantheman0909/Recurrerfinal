import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { 
  AlertTriangle, 
  Calendar, 
  ChevronLeft, 
  DollarSign, 
  Mail, 
  MessageSquare, 
  Phone, 
  Plus, 
  Star, 
  User
} from "lucide-react";
import { formatCurrency, formatDate, formatPercent } from "@/lib/utils";
import { ChartCard } from "@/components/dashboard/chart-card";
import type { ChartData } from "@shared/types";

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const customerId = parseInt(id);
  
  // Fetch customer details
  const { data: customer, isLoading: customerLoading } = useQuery({
    queryKey: [`/api/customers/${id}`],
    enabled: !!id,
  });
  
  // Fetch customer tasks
  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: [`/api/tasks/by-customer/${id}`],
    enabled: !!id,
  });
  
  // Fetch red zone status
  const { data: redZone } = useQuery({
    queryKey: [`/api/red-zone/by-customer/${id}`],
    enabled: !!id,
  });

  // Sample chart data for the customer
  const revenueChartData: ChartData = {
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
    datasets: [
      {
        label: "Monthly Revenue",
        data: [10000, 10000, 12500, 12500, 12500, 15000],
        fill: true,
        tension: 0.3,
      }
    ]
  };

  const campaignChartData: ChartData = {
    labels: ["Open Rate", "Click Rate", "Conversion"],
    datasets: [
      {
        data: [75, 45, 25],
      }
    ]
  };

  if (customerLoading) {
    return (
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <div className="text-center py-10">Loading customer details...</div>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <div className="text-center py-10">Customer not found</div>
        </div>
      </div>
    );
  }

  const redZoneReasons = redZone?.reasons || [];

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        {/* Header with back button */}
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="sm" className="mr-2" asChild>
            <a href="/customers">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back to Customers
            </a>
          </Button>
        </div>
        
        {/* Customer Header */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between">
            <div className="flex items-center mb-4 md:mb-0">
              <div className="flex-shrink-0 bg-gray-100 rounded-full p-4 mr-4">
                <User className="h-8 w-8 text-gray-600" />
              </div>
              <div>
                <div className="flex items-center">
                  <h1 className="text-2xl font-bold text-gray-900">{customer.name}</h1>
                  {customer.inRedZone && (
                    <Badge variant="outline" className="ml-3 bg-red-100 text-red-800 border-0 flex items-center">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Red Zone
                    </Badge>
                  )}
                </div>
                <div className="flex mt-1 space-x-4">
                  <div className="text-sm text-gray-500">{customer.industry}</div>
                  <div className="text-sm text-gray-500">{customer.website}</div>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" className="flex items-center">
                <Phone className="h-4 w-4 mr-2" />
                Call
              </Button>
              <Button variant="outline" size="sm" className="flex items-center">
                <Mail className="h-4 w-4 mr-2" />
                Email
              </Button>
              <Button variant="outline" size="sm" className="flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                Meeting
              </Button>
              <Button size="sm" className="flex items-center">
                <Plus className="h-4 w-4 mr-2" />
                Task
              </Button>
            </div>
          </div>
        </div>
        
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">ARR</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(customer.arr)}</p>
                </div>
                <div className="p-2 bg-teal-100 rounded-full">
                  <DollarSign className="h-6 w-6 text-teal-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">MRR</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(customer.mrr)}</p>
                </div>
                <div className="p-2 bg-blue-100 rounded-full">
                  <DollarSign className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">NPS Score</p>
                  <p className="text-2xl font-bold text-gray-900">{customer.npsScore || 'N/A'}</p>
                </div>
                <div className="p-2 bg-yellow-100 rounded-full">
                  <Star className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Data Tagging</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {customer.dataTaggingPercentage ? formatPercent(customer.dataTaggingPercentage) : 'N/A'}
                  </p>
                </div>
                <div className="p-2 bg-purple-100 rounded-full">
                  <i className="fas fa-tags h-6 w-6 text-purple-600"></i>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Main content tabs */}
        <Tabs defaultValue="overview">
          <TabsList className="mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="communication">Communication</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
          </TabsList>
          
          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column */}
              <div className="lg:col-span-2 space-y-6">
                {/* Red Zone Issues */}
                {customer.inRedZone && (
                  <Card className="border-red-200">
                    <CardHeader className="pb-3">
                      <div className="flex items-center">
                        <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
                        <h3 className="text-lg font-medium text-red-800">Red Zone Issues</h3>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {redZoneReasons.map((reason, index) => (
                          <li key={index} className="flex items-center text-gray-700">
                            <span className="h-2 w-2 bg-red-500 rounded-full mr-2"></span>
                            {reason === "delayed_onboarding" && "Delayed onboarding process"}
                            {reason === "no_qr_loyalty_setup" && "No QR/loyalty setup"}
                            {reason === "no_campaign_60_days" && "No campaign sent within 60 days"}
                            {reason === "no_monthly_campaigns" && "No monthly campaigns after onboarding"}
                            {reason === "no_review_meetings" && "No review meetings"}
                            {reason === "low_nps" && "Low NPS score"}
                            {reason === "low_data_tagging" && "Low data tagging percentage"}
                            {reason === "revenue_drop" && "Revenue drop"}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
                
                {/* Charts */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ChartCard
                    title="Revenue Trend"
                    type="line"
                    data={revenueChartData}
                  />
                  <ChartCard
                    title="Campaign Performance"
                    type="doughnut"
                    data={campaignChartData}
                  />
                </div>
                
                {/* Upcoming Tasks */}
                <Card>
                  <CardHeader className="pb-3 flex justify-between items-center">
                    <h3 className="text-lg font-medium">Upcoming Tasks</h3>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" /> Add Task
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {tasksLoading ? (
                      <div className="text-center py-4 text-gray-500">Loading tasks...</div>
                    ) : tasks && tasks.length > 0 ? (
                      <ul className="divide-y divide-gray-200">
                        {tasks.slice(0, 3).map((task: any) => (
                          <li key={task.id} className="py-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-gray-900">{task.title}</p>
                                <p className="text-xs text-gray-500">Due {formatDate(task.dueDate)}</p>
                              </div>
                              <Badge variant={task.status === 'completed' ? 'default' : 'outline'}>
                                {task.status === 'not_started' && 'Not Started'}
                                {task.status === 'in_progress' && 'In Progress'}
                                {task.status === 'completed' && 'Completed'}
                                {task.status === 'blocked' && 'Blocked'}
                              </Badge>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-center py-4 text-gray-500">No tasks found</div>
                    )}
                    {tasks && tasks.length > 3 && (
                      <div className="mt-4 text-center">
                        <Button variant="link" className="text-teal-600 hover:text-teal-500">
                          View all {tasks.length} tasks
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
              
              {/* Right Sidebar */}
              <div className="space-y-6">
                {/* Customer Info */}
                <Card>
                  <CardHeader className="pb-3">
                    <h3 className="text-lg font-medium">Customer Info</h3>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Status</p>
                      <Badge variant="outline" className={customer.status === 'active' ? 'bg-green-100 text-green-800 border-0 mt-1' : 'bg-yellow-100 text-yellow-800 border-0 mt-1'}>
                        {customer.status.charAt(0).toUpperCase() + customer.status.slice(1)}
                      </Badge>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-gray-500">Assigned CSM</p>
                      <div className="flex items-center mt-1">
                        <Avatar className="h-6 w-6 mr-2">
                          <AvatarFallback>
                            {customer.assignedToUserId?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{customer.assignedToUserId || 'Unassigned'}</span>
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-gray-500">Onboarding</p>
                      <p className="text-sm">
                        Start: {customer.onboardingStartDate ? formatDate(customer.onboardingStartDate) : 'N/A'}<br />
                        Completion: {customer.onboardingCompletionDate ? formatDate(customer.onboardingCompletionDate) : 'In Progress'}
                      </p>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-gray-500">Renewal Date</p>
                      <p className="text-sm">{customer.renewalDate ? formatDate(customer.renewalDate) : 'N/A'}</p>
                    </div>
                    
                    <Separator />
                    
                    <div>
                      <p className="text-sm font-medium text-gray-500">Last Review Meeting</p>
                      <p className="text-sm">{customer.lastReviewMeeting ? formatDate(customer.lastReviewMeeting) : 'None'}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm font-medium text-gray-500">Last Campaign</p>
                      <p className="text-sm">{customer.campaignStats?.lastSentDate ? formatDate(customer.campaignStats.lastSentDate) : 'None'}</p>
                    </div>
                  </CardContent>
                </Card>
                
                {/* External Links */}
                <Card>
                  <CardHeader className="pb-3">
                    <h3 className="text-lg font-medium">External Links</h3>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button variant="outline" className="w-full justify-start" asChild>
                      <a href={`https://app.chargebee.com/customers/${customer.externalIds?.chargebee}`} target="_blank" rel="noopener noreferrer">
                        <i className="fas fa-credit-card mr-2"></i> Chargebee
                      </a>
                    </Button>
                    <Button variant="outline" className="w-full justify-start" asChild>
                      <a href="#" target="_blank" rel="noopener noreferrer">
                        <i className="fas fa-headset mr-2"></i> Intercom
                      </a>
                    </Button>
                    <Button variant="outline" className="w-full justify-start" asChild>
                      <a href="#" target="_blank" rel="noopener noreferrer">
                        <i className="fas fa-project-diagram mr-2"></i> HubSpot
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
          
          {/* Tasks Tab */}
          <TabsContent value="tasks">
            <Card>
              <CardHeader className="pb-3 flex justify-between items-center">
                <h3 className="text-lg font-medium">All Tasks</h3>
                <Button>
                  <Plus className="h-4 w-4 mr-2" /> Add Task
                </Button>
              </CardHeader>
              <CardContent>
                {tasksLoading ? (
                  <div className="text-center py-4 text-gray-500">Loading tasks...</div>
                ) : tasks && tasks.length > 0 ? (
                  <div className="divide-y divide-gray-200">
                    {tasks.map((task: any) => (
                      <div key={task.id} className="py-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-base font-medium text-gray-900">{task.title}</p>
                            <p className="text-sm text-gray-500 mt-1">{task.description}</p>
                            <div className="flex items-center mt-2">
                              <Badge variant="outline" className={`mr-2 ${
                                task.status === 'completed' ? 'bg-green-100 text-green-800' :
                                task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                                task.status === 'blocked' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                              } border-0`}>
                                {task.status.split('_').map((word: string) => 
                                  word.charAt(0).toUpperCase() + word.slice(1)
                                ).join(' ')}
                              </Badge>
                              <p className="text-xs text-gray-500">Due {formatDate(task.dueDate)}</p>
                            </div>
                          </div>
                          <div className="flex items-center">
                            <Avatar className="h-8 w-8 mr-2">
                              <AvatarFallback>
                                {task.assignedToUserId?.charAt(0) || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <Button variant="outline" size="sm" className="ml-2">
                              <MessageSquare className="h-4 w-4 mr-1" /> {task.comments?.length || 0}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 text-gray-500">
                    <p>No tasks found for this customer</p>
                    <Button className="mt-4">
                      <Plus className="h-4 w-4 mr-2" /> Create First Task
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Communication Tab */}
          <TabsContent value="communication">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="pb-3">
                  <h3 className="text-lg font-medium">Recent Emails</h3>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-10 text-gray-500">
                    <Mail className="h-10 w-10 mx-auto mb-3 text-gray-400" />
                    <p>No email threads found</p>
                    <p className="text-sm mt-1">Connect Gmail to view email threads</p>
                    <Button className="mt-4">
                      Connect Gmail
                    </Button>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-3">
                  <h3 className="text-lg font-medium">Upcoming Meetings</h3>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-10 text-gray-500">
                    <Calendar className="h-10 w-10 mx-auto mb-3 text-gray-400" />
                    <p>No upcoming meetings</p>
                    <p className="text-sm mt-1">Connect Google Calendar to view meetings</p>
                    <Button className="mt-4">
                      Connect Calendar
                    </Button>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="md:col-span-2">
                <CardHeader className="pb-3">
                  <h3 className="text-lg font-medium">Campaign History</h3>
                </CardHeader>
                <CardContent>
                  {customer.campaignStats && customer.campaignStats.sent > 0 ? (
                    <div className="space-y-4">
                      <div className="flex justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-500">Total Campaigns Sent</p>
                          <p className="text-lg font-semibold">{customer.campaignStats.sent}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Open Rate</p>
                          <p className="text-lg font-semibold">
                            {Math.round((customer.campaignStats.opened / customer.campaignStats.sent) * 100)}%
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Click Rate</p>
                          <p className="text-lg font-semibold">
                            {Math.round((customer.campaignStats.clicked / customer.campaignStats.sent) * 100)}%
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Last Campaign</p>
                          <p className="text-lg font-semibold">
                            {customer.campaignStats.lastSentDate ? formatDate(customer.campaignStats.lastSentDate) : 'N/A'}
                          </p>
                        </div>
                      </div>
                      
                      <Button>
                        View Campaign Details
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-10 text-gray-500">
                      <Mail className="h-10 w-10 mx-auto mb-3 text-gray-400" />
                      <p>No campaigns sent yet</p>
                      <Button className="mt-4">
                        Send First Campaign
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          {/* Billing Tab */}
          <TabsContent value="billing">
            <Card>
              <CardHeader className="pb-3">
                <h3 className="text-lg font-medium">Billing Summary</h3>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Annual Recurring Revenue</p>
                    <p className="text-2xl font-bold">{formatCurrency(customer.arr)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Monthly Recurring Revenue</p>
                    <p className="text-2xl font-bold">{formatCurrency(customer.mrr)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Add-on Revenue</p>
                    <p className="text-2xl font-bold">{formatCurrency(customer.addOnRevenue || 0)}</p>
                  </div>
                </div>
                
                <div className="border rounded-lg p-4 mb-6">
                  <div className="flex justify-between mb-2">
                    <p className="font-medium">Next Invoice</p>
                    <p className="font-medium">{formatCurrency(customer.mrr)}</p>
                  </div>
                  <p className="text-sm text-gray-500">Due on {formatDate(customer.renewalDate || new Date())}</p>
                </div>
                
                <p className="mb-2 font-medium">Payment Method</p>
                <div className="p-4 border rounded-lg flex items-center">
                  <div className="bg-gray-100 rounded-md p-2 mr-3">
                    <i className="far fa-credit-card text-gray-600"></i>
                  </div>
                  <div>
                    <p className="font-medium">Credit Card ending in 4242</p>
                    <p className="text-sm text-gray-500">Expires 12/2024</p>
                  </div>
                </div>
                
                <div className="mt-6">
                  <Button variant="outline" className="mr-3">
                    View in Chargebee
                  </Button>
                  <Button>
                    Request Payment Update
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
