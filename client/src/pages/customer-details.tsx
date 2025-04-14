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
import { cn, formatINR } from "@/lib/utils";
import { GradientChart } from "@/components/ui/gradient-chart";
import { format } from "date-fns";
import { TaskList } from "@/components/dashboard/task-list";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function CustomerDetails() {
  const { id } = useParams();
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskAssignee, setNewTaskAssignee] = useState("");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const { toast } = useToast();
  
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
  
  const { data: externalData } = useQuery({
    queryKey: [`/api/customers/${id}/external-data`],
  });
  
  // Handle task creation
  const handleCreateTask = async () => {
    if (!newTaskTitle) {
      toast({
        title: "Error",
        description: "Task title is required",
        variant: "destructive"
      });
      return;
    }
    
    setIsCreatingTask(true);
    
    try {
      const taskData = {
        title: newTaskTitle,
        description: newTaskDescription,
        customer_id: parseInt(id || "0"),
        assignee_id: newTaskAssignee ? parseInt(newTaskAssignee) : null,
        due_date: newTaskDueDate ? new Date(newTaskDueDate).toISOString() : null,
        status: "pending"
      };
      
      await apiRequest('/api/tasks', 'POST', taskData);
      
      // Reset form
      setNewTaskTitle('');
      setNewTaskDescription('');
      setNewTaskAssignee('');
      setNewTaskDueDate('');
      
      // Invalidate tasks query to refresh the list
      queryClient.invalidateQueries({ queryKey: [`/api/tasks?customerId=${id}`] });
      
      toast({
        title: "Success",
        description: "Task created successfully"
      });
      
    } catch (error) {
      console.error("Error creating task:", error);
      toast({
        title: "Error",
        description: "Failed to create task. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsCreatingTask(false);
    }
  };
  
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
                          <p className="text-xl font-semibold">{formatINR(customer.mrr)}</p>
                        </div>
                        <div className="text-center p-3 bg-gray-50 rounded-md">
                          <p className="text-sm text-gray-500">ARR</p>
                          <p className="text-xl font-semibold">{formatINR(customer.arr)}</p>
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
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm">Create Task</Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Create Task for {customer.name}</DialogTitle>
                          </DialogHeader>
                          <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                              <Label htmlFor="task-title">Task Title</Label>
                              <Input 
                                id="task-title" 
                                placeholder="Enter task title" 
                                value={newTaskTitle}
                                onChange={(e) => setNewTaskTitle(e.target.value)}
                              />
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="task-description">Description</Label>
                              <Textarea 
                                id="task-description" 
                                placeholder="Enter task description"
                                value={newTaskDescription}
                                onChange={(e) => setNewTaskDescription(e.target.value)}
                              />
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="task-assignee">Assign To</Label>
                              <Select 
                                value={newTaskAssignee}
                                onValueChange={setNewTaskAssignee}
                              >
                                <SelectTrigger id="task-assignee">
                                  <SelectValue placeholder="Select team member" />
                                </SelectTrigger>
                                <SelectContent>
                                  {users?.filter((user: any) => {
                                    // Get the current user from the users array
                                    const currentUser = users.find((u: any) => u.email === 'admin@recurrer.com');
                                    
                                    if (!currentUser) return true; // If can't determine current user, show all
                                    
                                    // Admin sees all users
                                    if (currentUser.role === 'admin') return true;
                                    
                                    // Team Lead sees themselves and their CSMs
                                    if (currentUser.role === 'team_lead') {
                                      return user.id === currentUser.id || user.team_lead_id === currentUser.id;
                                    }
                                    
                                    // CSM sees themselves and their team lead
                                    if (currentUser.role === 'csm') {
                                      return user.id === currentUser.id || user.id === currentUser.team_lead_id;
                                    }
                                    
                                    return true;
                                  }).map((user: any) => (
                                    <SelectItem key={user.id} value={user.id.toString()}>
                                      {user.name} {user.role === 'team_lead' ? '(TL)' : user.role === 'admin' ? '(Admin)' : ''}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="grid gap-2">
                              <Label htmlFor="task-due-date">Due Date</Label>
                              <Input 
                                id="task-due-date" 
                                type="date" 
                                value={newTaskDueDate}
                                onChange={(e) => setNewTaskDueDate(e.target.value)}
                              />
                            </div>
                            <div className="flex justify-end mt-4">
                              <Button 
                                variant="outline" 
                                className="mr-2"
                                onClick={() => {
                                  setNewTaskTitle('');
                                  setNewTaskDescription('');
                                  setNewTaskAssignee('');
                                  setNewTaskDueDate('');
                                }}
                              >
                                Cancel
                              </Button>
                              <Button 
                                onClick={() => {
                                  const dialogEl = document.querySelector('[role="dialog"]');
                                  if (dialogEl) {
                                    const closeButton = dialogEl.querySelector('[data-state="closed"]');
                                    if (closeButton) {
                                      (closeButton as HTMLElement).click();
                                    }
                                  }
                                  handleCreateTask();
                                }}
                                disabled={isCreatingTask || !newTaskTitle}
                              >
                                {isCreatingTask ? 'Creating...' : 'Create Task'}
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
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
                    {/* HubSpot */}
                    <Button variant="outline" className="w-full justify-start" asChild>
                      <a href="https://app.hubspot.com" target="_blank" rel="noopener noreferrer">
                        <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="#ff7a59">
                          <path d="M22.447 9.564h-5.01v5.011h5.01V9.564zm-9.206 0h-5.01v5.011h5.01V9.564zm-9.207 0h-2.43l-1.8 5.011h4.23V9.564zm18.413 7.525h-5.01v5.011h5.01v-5.011zm-9.206 0h-5.01v5.011h5.01v-5.011zm-9.207 0H.021l-0.021 5.011h4.23v-5.011zm18.413-15.049h-5.01v5.011h5.01V2.04zm-9.206 0h-5.01v5.011h5.01V2.04zm-9.207 0H.021L0 7.051h4.23V2.04z"/>
                        </svg>
                        View in HubSpot
                      </a>
                    </Button>

                    {/* Chargebee */}
                    {(customer.chargebee_customer_id || externalData?.chargebee?.customer) && (
                      <div>
                        <Button variant="outline" className="w-full justify-start mb-1" asChild>
                          <a 
                            href={customer.chargebee_customer_id ? 
                              `https://app.chargebee.com/customers/${customer.chargebee_customer_id}` : 
                              "https://app.chargebee.com"} 
                            target="_blank" 
                            rel="noopener noreferrer"
                          >
                            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="#FF7846">
                              <path d="M19.998 6.293L15.04 2H4v20h16V6.293zM12 16.5c-2.48 0-4.5-2.02-4.5-4.5S9.52 7.5 12 7.5s4.5 2.02 4.5 4.5-2.02 4.5-4.5 4.5z"/>
                            </svg>
                            View in Chargebee
                          </a>
                        </Button>
                        
                        {externalData?.chargebee?.error ? (
                          <p className="text-xs text-red-500 ml-2">
                            Error fetching Chargebee data
                          </p>
                        ) : externalData?.chargebee?.customer && (
                          <div className="text-xs text-gray-500 border rounded p-2 mb-2">
                            <p><span className="font-medium">Customer ID:</span> {customer.chargebee_customer_id}</p>
                            {customer.chargebee_subscription_id && (
                              <p><span className="font-medium">Subscription:</span> {customer.chargebee_subscription_id}</p>
                            )}
                            {externalData?.chargebee?.subscription && (
                              <p><span className="font-medium">Plan:</span> {externalData.chargebee.subscription.plan_id}</p>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* MySQL Data */}
                    <div>
                      <div className="flex items-center mb-2">
                        <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="#00758F">
                          <path d="M16.405 5.501c-.115 0-.193.014-.274.033v.013h.014c.054.104.146.18.214.273.054.107.1.214.154.32l.014-.015c.094-.066.14-.172.14-.333-.04-.047-.046-.094-.08-.14-.04-.067-.126-.1-.18-.153zM5.77 18.695h-.927a50.854 50.854 0 00-.27-4.41h-.008l-1.41 4.41H2.45l-1.4-4.41h-.01a72.892 72.892 0 00-.195 4.41H0c.055-1.966.192-3.81.41-5.53h1.15l1.335 4.064h.008l1.347-4.064h1.095c.242 2.015.384 3.86.428 5.53zm4.017-4.08c-.378 2.045-.876 3.533-1.492 4.46-.482.716-1.01 1.073-1.583 1.073-.153 0-.34-.046-.566-.138v-.494c.11.017.24.026.386.026.268 0 .483-.075.647-.222.197-.18.295-.382.295-.605 0-.155-.077-.47-.23-.944L6.23 14.615h.91l.727 2.36c.164.536.233.91.205 1.123.4-1.064.786-2.24 1.142-3.483h.88zm10.987 4.08h-1.046c0-.057 0-.15.007-.28.002-.118.007-.305.01-.562.002-.268.005-.6.005-.998l0-1.884c0-.723-.077-1.223-.232-1.502-.15-.282-.4-.423-.752-.423-.35 0-.67.162-.974.487L17.784 18.695h-.9v-4.845-.534-.806h.9v.652c.488-.55.994-.824 1.51-.824.383 0 .722.13 1.02.386.295.26.494.61.596 1.057.103.455.155 1.16.155 2.134z" />
                        </svg>
                        <span className="font-medium text-sm">MySQL Imported Data</span>
                      </div>
                      
                      {externalData?.mysql?.error ? (
                        <p className="text-xs text-red-500 ml-2">
                          Error fetching MySQL data
                        </p>
                      ) : externalData?.mysql?.company && (
                        <div className="text-xs text-gray-500 border rounded p-2 mb-2">
                          <p><span className="font-medium">Company ID:</span> {customer.mysql_company_id}</p>
                          {externalData.mysql.company?.company_name && (
                            <p><span className="font-medium">Name:</span> {externalData.mysql.company.company_name}</p>
                          )}
                          {externalData.mysql.company?.active_stores && (
                            <p><span className="font-medium">Active Stores:</span> {externalData.mysql.company.active_stores}</p>
                          )}
                          
                          {/* Additional MySQL data fields */}
                          {externalData.mysql.company?.growth_subscription_count && (
                            <p><span className="font-medium">Growth Subscriptions:</span> {externalData.mysql.company.growth_subscription_count}</p>
                          )}
                          {externalData.mysql.company?.loyalty_active_store_count && (
                            <p><span className="font-medium">Loyalty Active Stores:</span> {externalData.mysql.company.loyalty_active_store_count}</p>
                          )}
                          {externalData.mysql.company?.loyalty_type && (
                            <p><span className="font-medium">Loyalty Type:</span> {externalData.mysql.company.loyalty_type}</p>
                          )}
                          {externalData.mysql.company?.revenue_1_year && (
                            <p><span className="font-medium">Revenue (1Y):</span> {formatINR(externalData.mysql.company.revenue_1_year)}</p>
                          )}
                          {customer.updated_from_mysql_at && (
                            <p className="mt-2"><span className="font-medium">Last Sync:</span> {new Date(customer.updated_from_mysql_at).toLocaleString()}</p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Intercom */}
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
                {customer.assigned_csm && userMap[customer.assigned_csm] ? (
                  <div className="flex items-center">
                    <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-600">
                      {userMap[customer.assigned_csm].name.charAt(0)}
                    </div>
                    <div className="ml-3">
                      <p className="font-medium">{userMap[customer.assigned_csm].name}</p>
                      <p className="text-sm text-gray-500">{userMap[customer.assigned_csm].role === 'csm' ? 'Customer Success Manager' : userMap[customer.assigned_csm].role === 'team_lead' ? 'Team Lead' : userMap[customer.assigned_csm].role}</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-500 text-center">
                    No account manager assigned
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
