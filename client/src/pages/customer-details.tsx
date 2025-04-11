import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { 
  Card, 
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Building, 
  Mail, 
  Phone, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  CheckSquare,
  MessageSquare,
  ExternalLink
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { GradientChart } from "@/components/ui/gradient-chart";
import { format } from "date-fns";
import { TaskList } from "@/components/dashboard/task-list";

export default function CustomerDetails() {
  const { id } = useParams();
  
  const { data: customer, isLoading: isLoadingCustomer } = useQuery({
    queryKey: [`/api/customers/${id}`],
  });
  
  const { data: metrics } = useQuery({
    queryKey: [`/api/customers/${id}/metrics`],
  });
  
  const { data: tasks } = useQuery({
    queryKey: [`/api/tasks?customerId=${id}`],
  });
  
  const { data: alerts } = useQuery({
    queryKey: [`/api/red-zone?customerId=${id}`],
  });
  
  const { data: users } = useQuery({
    queryKey: ['/api/users'],
  });
  
  // Format users data for lookups
  const userMap = users?.reduce((acc: any, user: any) => {
    acc[user.id] = user;
    return acc;
  }, {}) || {};
  
  if (isLoadingCustomer) {
    return <div className="flex justify-center items-center h-full p-8">Loading customer data...</div>;
  }
  
  if (!customer) {
    return <div className="flex justify-center items-center h-full p-8">Customer not found</div>;
  }
  
  const getHealthBadgeStyles = (health: string) => {
    switch (health) {
      case 'healthy':
        return "bg-green-100 text-green-800";
      case 'at_risk':
        return "bg-yellow-100 text-yellow-800";
      case 'red_zone':
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };
  
  // Prepare metrics data for chart
  const prepareChartData = () => {
    const monthlyRevenue = [
      { name: 'Jan', value: customer?.mrr || 0 },
      { name: 'Feb', value: (customer?.mrr || 0) * 0.95 },
      { name: 'Mar', value: (customer?.mrr || 0) * 1.1 },
      { name: 'Apr', value: (customer?.mrr || 0) * 1.05 },
      { name: 'May', value: (customer?.mrr || 0) * 1.2 },
      { name: 'Jun', value: (customer?.mrr || 0) * 1.15 },
    ];
    
    return monthlyRevenue;
  };

  return (
    <>
      <div className="bg-white shadow">
        <div className="px-4 sm:px-6 lg:max-w-7xl lg:mx-auto lg:px-8">
          <div className="py-6 md:flex md:items-center md:justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center">
                <div className="bg-gray-100 rounded-md p-3 flex items-center justify-center mr-3">
                  {customer.logo_url ? (
                    <img 
                      src={customer.logo_url} 
                      alt={customer.name} 
                      className="h-10 w-10 object-contain" 
                    />
                  ) : (
                    <Building className="h-10 w-10 text-gray-600" />
                  )}
                </div>
                <div>
                  <div className="flex items-center">
                    <h1 className="text-2xl font-semibold text-gray-900">{customer.name}</h1>
                    <Badge className={cn("ml-3", getHealthBadgeStyles(customer.health_status))}>
                      {customer.health_status.replace('_', ' ')}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    {customer.industry || 'No industry'} • Onboarded on {customer.onboarded_at ? format(new Date(customer.onboarded_at), 'MMM d, yyyy') : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap md:mt-0 md:ml-4 gap-2">
              <Button variant="outline">
                <CheckSquare className="h-4 w-4 mr-2" />
                Create Task
              </Button>
              <Button>
                <MessageSquare className="h-4 w-4 mr-2" />
                Contact
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="w-full justify-start">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="tasks">Tasks</TabsTrigger>
                <TabsTrigger value="metrics">Metrics</TabsTrigger>
                <TabsTrigger value="communication">Communication</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center">
                        <DollarSign className="h-5 w-5 mr-1 text-teal-600" />
                        Financial Overview
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 bg-gray-50 rounded-md">
                          <p className="text-sm text-gray-500">MRR</p>
                          <p className="text-xl font-semibold">${customer.mrr?.toLocaleString() || 0}</p>
                        </div>
                        <div className="text-center p-3 bg-gray-50 rounded-md">
                          <p className="text-sm text-gray-500">ARR</p>
                          <p className="text-xl font-semibold">${customer.arr?.toLocaleString() || 0}</p>
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <p className="text-sm text-gray-500 mb-1">Revenue Trend</p>
                        <GradientChart 
                          data={prepareChartData()} 
                          height={120} 
                          showAxis={false} 
                        />
                      </div>
                      
                      <div className="mt-2 flex justify-between items-center">
                        <div className="flex items-center">
                          <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                          <span className="text-sm font-medium text-green-600">15% growth</span>
                        </div>
                        <a href="https://app.chargebee.com" target="_blank" rel="noopener noreferrer" className="text-sm text-teal-600 hover:text-teal-800 flex items-center">
                          View in Chargebee <ExternalLink className="h-3 w-3 ml-1" />
                        </a>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center">
                        <Calendar className="h-5 w-5 mr-1 text-teal-600" />
                        Key Dates
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center p-2 rounded bg-gray-50">
                          <div>
                            <p className="text-sm font-medium">Onboarding Date</p>
                            <p className="text-sm">{customer.onboarded_at ? format(new Date(customer.onboarded_at), 'MMM d, yyyy') : 'Not set'}</p>
                          </div>
                          <Badge variant="outline" className="bg-teal-50">Completed</Badge>
                        </div>
                        
                        <div className="flex justify-between items-center p-2 rounded bg-gray-50">
                          <div>
                            <p className="text-sm font-medium">Renewal Date</p>
                            <p className="text-sm">{customer.renewal_date ? format(new Date(customer.renewal_date), 'MMM d, yyyy') : 'Not set'}</p>
                          </div>
                          {customer.renewal_date && new Date(customer.renewal_date) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) && (
                            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                              Coming soon
                            </Badge>
                          )}
                        </div>
                        
                        <div className="flex justify-between items-center p-2 rounded bg-gray-50">
                          <div>
                            <p className="text-sm font-medium">Last Review Meeting</p>
                            <p className="text-sm">Apr 15, 2023</p>
                          </div>
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            3 months ago
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center">
                        <AlertTriangle className="h-5 w-5 mr-1 text-red-600" />
                        Red Zone Alerts
                      </CardTitle>
                      <CardDescription>Issues that require immediate attention</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {alerts && alerts.length > 0 ? (
                        <ul className="space-y-2">
                          {alerts.map((alert: any) => (
                            <li key={alert.id} className="p-3 bg-red-50 rounded-md border border-red-100">
                              <div className="flex items-start">
                                <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
                                <div>
                                  <p className="font-medium text-red-800">{alert.reason}</p>
                                  <p className="text-sm text-red-600 mt-1">
                                    Created {format(new Date(alert.created_at), 'MMM d, yyyy')}
                                  </p>
                                </div>
                              </div>
                              <div className="mt-2 flex justify-end">
                                <Button variant="outline" size="sm" className="text-red-600 bg-white border-red-200 hover:bg-red-50">
                                  Resolve Issue
                                </Button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="p-4 text-center text-gray-500">
                          No red zone alerts for this customer
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="tasks" className="mt-4">
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-center">
                      <CardTitle>Tasks</CardTitle>
                      <Button size="sm">Create Task</Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {tasks && tasks.length > 0 ? (
                      <TaskList tasks={tasks} users={userMap} />
                    ) : (
                      <div className="p-4 text-center text-gray-500">
                        No tasks for this customer
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="metrics" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Customer Metrics</CardTitle>
                    <CardDescription>Performance metrics over time</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="p-4 bg-gray-50 rounded-lg text-center">
                        <p className="text-sm text-gray-500">NPS Score</p>
                        <p className="text-3xl font-bold text-teal-600 mt-1">7.5</p>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-lg text-center">
                        <p className="text-sm text-gray-500">Data Tagging</p>
                        <p className="text-3xl font-bold text-teal-600 mt-1">62%</p>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-lg text-center">
                        <p className="text-sm text-gray-500">Campaign Success</p>
                        <p className="text-3xl font-bold text-teal-600 mt-1">83%</p>
                      </div>
                    </div>
                    
                    <div className="mt-4">
                      {/* More detailed metrics would be displayed here */}
                      <p className="text-gray-500 text-center">Detailed metric history will be displayed here</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="communication" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Communication History</CardTitle>
                    <CardDescription>Recent emails and meetings</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-500 text-center">Communication history will be displayed here</p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
          
          <div>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Contact Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start">
                    <Building className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                    <div>
                      <p className="font-medium">{customer.name}</p>
                      <p className="text-sm text-gray-500">{customer.industry || 'No industry'}</p>
                    </div>
                  </div>
                  
                  {customer.contact_name && (
                    <div className="flex items-start">
                      <Mail className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                      <div>
                        <p className="font-medium">{customer.contact_name}</p>
                        <p className="text-sm text-gray-500">{customer.contact_email || 'No email'}</p>
                      </div>
                    </div>
                  )}
                  
                  {customer.contact_phone && (
                    <div className="flex items-start">
                      <Phone className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                      <p>{customer.contact_phone}</p>
                    </div>
                  )}
                </div>
                
                <div className="mt-6">
                  <h4 className="text-sm font-medium text-gray-500 mb-2">External Systems</h4>
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full justify-start" asChild>
                      <a href="https://app.hubspot.com" target="_blank" rel="noopener noreferrer">
                        <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="#ff7a59">
                          <path d="M22.447 9.564h-5.01v5.011h5.01V9.564zm-9.206 0h-5.01v5.011h5.01V9.564zm-9.207 0h-2.43l-1.8 5.011h4.23V9.564zm18.413 7.525h-5.01v5.011h5.01v-5.011zm-9.206 0h-5.01v5.011h5.01v-5.011zm-9.207 0H.021l-0.021 5.011h4.23v-5.011zm18.413-15.049h-5.01v5.011h5.01V2.04zm-9.206 0h-5.01v5.011h5.01V2.04zm-9.207 0H.021L0 7.051h4.23V2.04z"/>
                        </svg>
                        View in HubSpot
                      </a>
                    </Button>
                    <Button variant="outline" className="w-full justify-start" asChild>
                      <a href="https://app.chargebee.com" target="_blank" rel="noopener noreferrer">
                        <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="#FF7846">
                          <path d="M19.998 6.293L15.04 2H4v20h16V6.293zM12 16.5c-2.48 0-4.5-2.02-4.5-4.5S9.52 7.5 12 7.5s4.5 2.02 4.5 4.5-2.02 4.5-4.5 4.5z"/>
                        </svg>
                        View in Chargebee
                      </a>
                    </Button>
                    <Button variant="outline" className="w-full justify-start" asChild>
                      <a href="https://app.intercom.com" target="_blank" rel="noopener noreferrer">
                        <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="#1F8DED">
                          <path d="M12 1.6C6.273 1.6 1.6 6.273 1.6 12c0 5.727 4.673 10.4 10.4 10.4 5.727 0 10.4-4.673 10.4-10.4 0-5.727-4.673-10.4-10.4-10.4zM7.2 14.4c-1.323 0-2.4-1.077-2.4-2.4s1.077-2.4 2.4-2.4c1.323 0 2.4 1.077 2.4 2.4s-1.077 2.4-2.4 2.4zm5.5 1.323c0 .827-.673 1.5-1.5 1.5s-1.5-.673-1.5-1.5.673-1.5 1.5-1.5 1.5.673 1.5 1.5zm3.3-1.323c-1.323 0-2.4-1.077-2.4-2.4s1.077-2.4 2.4-2.4c1.323 0 2.4 1.077 2.4 2.4s-1.077 2.4-2.4 2.4z"/>
                        </svg>
                        View in Intercom
                      </a>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="mt-4">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Account Manager</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <img 
                    src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" 
                    alt="Account Manager" 
                    className="h-12 w-12 rounded-full" 
                  />
                  <div className="ml-3">
                    <p className="font-medium">Sarah Johnson</p>
                    <p className="text-sm text-gray-500">Team Lead</p>
                  </div>
                </div>
                <div className="mt-4 flex space-x-2">
                  <Button variant="outline" className="flex-1">Message</Button>
                  <Button variant="outline" className="flex-1">Schedule</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
