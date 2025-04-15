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
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

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
  
  // Query for non-recurring invoices
  const { data: nonRecurringInvoices } = useQuery({
    queryKey: [`/api/chargebee/customers/${id}/non-recurring-invoices`],
    enabled: !!customer?.chargebee_customer_id,
  });
  
  // Query for current month non-recurring invoices
  const { data: currentMonthNonRecurringInvoices } = useQuery({
    queryKey: [`/api/chargebee/customers/${id}/current-month-non-recurring-invoices`],
    enabled: !!customer?.chargebee_customer_id,
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
  
  // Handle CSM assignment
  const handleAssignCSM = async (csmId: number) => {
    if (!csmId) {
      toast({
        title: "Error",
        description: "Please select a valid CSM",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Get the CSM details from the users data
      const selectedCsm = users.find(user => user.id === csmId);
      
      if (!selectedCsm) {
        throw new Error("Selected CSM not found");
      }
      
      // Call the API to assign the CSM
      await apiRequest(`/api/customers/${id}/assign-csm`, 'POST', { csmId });
      
      // Invalidate the customer query to refresh data
      queryClient.invalidateQueries({ queryKey: [`/api/customers/${id}`] });
      
      toast({
        title: "Success",
        description: `${selectedCsm.name} has been assigned as the CSM for this customer.`
      });
    } catch (error) {
      console.error("Error assigning CSM:", error);
      toast({
        title: "Error",
        description: "Failed to assign CSM. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
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
  
  // Prepare metrics data from Chargebee invoices
  const prepareChartData = () => {
    // Default to MRR-based data if no Chargebee invoices are available
    if (!externalData?.chargebee?.invoices || !externalData.chargebee.invoices.length) {
      return [
        { name: 'Jan', value: customer?.mrr || 0 },
        { name: 'Feb', value: customer?.mrr || 0 },
        { name: 'Mar', value: customer?.mrr || 0 },
        { name: 'Apr', value: customer?.mrr || 0 },
        { name: 'May', value: customer?.mrr || 0 },
        { name: 'Jun', value: customer?.mrr || 0 },
      ];
    }
    
    // Get invoices and sort by date
    const invoices = [...externalData.chargebee.invoices]
      .filter(invoice => invoice.status === 'paid')
      .sort((a, b) => a.date - b.date);
      
    // Group invoices by month
    const invoicesByMonth = invoices.reduce((months, invoice) => {
      const date = new Date(invoice.date * 1000);
      const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
      
      if (!months[monthKey]) {
        months[monthKey] = {
          name: date.toLocaleString('default', { month: 'short' }),
          value: 0,
          rawDate: date
        };
      }
      
      months[monthKey].value += invoice.total / 100; // Convert from cents to dollars
      return months;
    }, {});
    
    // Convert to array and sort by date
    let monthlyData = Object.values(invoicesByMonth)
      .sort((a: any, b: any) => a.rawDate - b.rawDate)
      .map((m: any) => ({ name: m.name, value: m.value }));
      
    // Get last 6 months or pad if less than 6
    if (monthlyData.length > 6) {
      monthlyData = monthlyData.slice(monthlyData.length - 6);
    } else if (monthlyData.length < 6) {
      const missingMonths = 6 - monthlyData.length;
      const lastValue = monthlyData.length > 0 ? monthlyData[monthlyData.length - 1].value : customer?.mrr || 0;
      
      for (let i = 0; i < missingMonths; i++) {
        monthlyData.push({ name: '—', value: lastValue });
      }
    }
    
    return monthlyData;
  };
  
  // Calculate revenue growth from Chargebee invoices
  const calculateGrowth = (): { percentage: number, label: string } => {
    if (!externalData?.chargebee?.invoices || !externalData.chargebee.invoices.length) {
      return { percentage: 0, label: 'No data' };
    }
    
    const invoices = externalData.chargebee.invoices
      .filter(invoice => invoice.status === 'paid')
      .sort((a, b) => a.date - b.date);
    
    if (invoices.length < 2) {
      return { percentage: 0, label: 'Not enough data' };
    }
    
    // Get first invoice and sum of all subsequent invoices
    const firstInvoice = invoices[0];
    const subsequentInvoices = invoices.slice(1);
    const firstAmount = firstInvoice.total / 100;
    const subsequentTotal = subsequentInvoices.reduce((sum, inv) => sum + (inv.total / 100), 0);
    const avgSubsequent = subsequentTotal / subsequentInvoices.length;
    
    // Calculate growth percentage
    const growthPercentage = ((avgSubsequent - firstAmount) / firstAmount) * 100;
    
    return {
      percentage: growthPercentage,
      label: `${growthPercentage.toFixed(1)}% growth`
    };
  };
  
  // Calculate non-recurring invoice metrics for current month
  const calculateNonRecurringMetrics = () => {
    if (!currentMonthNonRecurringInvoices?.length) {
      return {
        count: 0,
        subtotal: 0,
        totalSpent: 0
      };
    }
    
    console.log("Current month non-recurring invoices:", currentMonthNonRecurringInvoices);
    
    // Filter to only paid and truly non-recurring invoices
    const paidInvoices = currentMonthNonRecurringInvoices.filter(invoice => 
      invoice.status === 'paid' && invoice.recurring === false
    );
    
    console.log("Filtered paid non-recurring invoices for current month:", paidInvoices);
    
    return {
      count: paidInvoices.length,
      subtotal: paidInvoices.reduce((sum, inv) => sum + (inv.amount / 100), 0),
      totalSpent: paidInvoices.reduce((sum, inv) => sum + (inv.total / 100), 0)
    };
  };
  
  // Prepare add-on revenue trend data
  const prepareAddonRevenueChartData = () => {
    if (!nonRecurringInvoices?.length) {
      return [
        { name: 'Jan', value: 0 },
        { name: 'Feb', value: 0 },
        { name: 'Mar', value: 0 },
        { name: 'Apr', value: 0 },
        { name: 'May', value: 0 },
        { name: 'Jun', value: 0 },
      ];
    }
    
    // Get only non-recurring (recurring=false), paid invoices and sort by date
    const invoices = [...nonRecurringInvoices]
      .filter(invoice => invoice.status === 'paid' && invoice.recurring === false)
      .sort((a, b) => a.date - b.date);
    
    console.log("Non-recurring invoices for chart:", invoices);
      
    // Group invoices by month
    const invoicesByMonth = invoices.reduce((months, invoice) => {
      const date = new Date(invoice.date * 1000);
      const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
      
      if (!months[monthKey]) {
        months[monthKey] = {
          name: date.toLocaleString('default', { month: 'short' }),
          value: 0,
          rawDate: date
        };
      }
      
      months[monthKey].value += invoice.total / 100; // Convert from cents to dollars
      return months;
    }, {});
    
    // Convert to array and sort by date
    let monthlyData = Object.values(invoicesByMonth)
      .sort((a: any, b: any) => a.rawDate - b.rawDate)
      .map((m: any) => ({ name: m.name, value: m.value }));
    
    console.log("Monthly data:", monthlyData);
      
    // Get last 6 months or pad if less than 6
    if (monthlyData.length > 6) {
      monthlyData = monthlyData.slice(monthlyData.length - 6);
    } else if (monthlyData.length < 6) {
      const missingMonths = 6 - monthlyData.length;
      
      // Create empty months with zeros
      for (let i = 0; i < missingMonths; i++) {
        monthlyData.push({ name: '—', value: 0 });
      }
    }
    
    return monthlyData;
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
                      {customer.health_status ? customer.health_status.replace('_', ' ') : 'Unknown'}
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
                    <CardHeader className="pb-1">
                      <CardTitle className="text-lg flex items-center">
                        <DollarSign className="h-5 w-5 mr-1 text-teal-600" />
                        Financial Overview
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Tabs defaultValue="recurring" className="w-full">
                        <TabsList className="w-full justify-start mb-3 bg-gray-100">
                          <TabsTrigger value="recurring" className="text-xs">Recurring Revenue</TabsTrigger>
                          <TabsTrigger value="non-recurring" className="text-xs">Non-Recurring Revenue</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="recurring" className="mt-0 pt-0">
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
                            {(() => {
                              const growth = calculateGrowth();
                              const isPositiveGrowth = growth.percentage > 0;
                              
                              return (
                                <div className="flex items-center">
                                  {isPositiveGrowth ? (
                                    <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                                  ) : (
                                    <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                                  )}
                                  <span className={`text-sm font-medium ${isPositiveGrowth ? 'text-green-600' : 'text-red-600'}`}>
                                    {growth.label}
                                  </span>
                                </div>
                              );
                            })()}
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="non-recurring" className="mt-0 pt-0">
                          {(() => {
                            const nonRecurringMetrics = calculateNonRecurringMetrics();
                            
                            return (
                              <>
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                  <div className="text-center p-3 bg-gray-50 rounded-md">
                                    <p className="text-sm text-gray-500">Current Month Invoices</p>
                                    <p className="text-xl font-semibold">{nonRecurringMetrics.count}</p>
                                  </div>
                                  <div className="text-center p-3 bg-gray-50 rounded-md">
                                    <p className="text-sm text-gray-500">Total Spent</p>
                                    <p className="text-xl font-semibold">{formatINR(nonRecurringMetrics.totalSpent)}</p>
                                  </div>
                                </div>
                                
                                <div className="mb-4">
                                  <p className="text-sm text-gray-500 mb-1">Add-on Revenue Trend</p>
                                  <GradientChart 
                                    data={prepareAddonRevenueChartData()} 
                                    height={120} 
                                    showAxis={false}
                                    color="#6366f1"
                                  />
                                </div>
                                
                                <div className="p-3 bg-gray-50 rounded-md">
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-500">Current Month Subtotal</span>
                                    <span className="font-medium">{formatINR(nonRecurringMetrics.subtotal)}</span>
                                  </div>
                                </div>
                                
                                {/* External invoice link removed as requested */}
                              </>
                            );
                          })()}
                        </TabsContent>
                      </Tabs>
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
                                  {users && users.length > 0 ? (
                                    users.filter((user: any) => {
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
                                    ))
                                  ) : (
                                    <SelectItem value="" disabled>Loading team members...</SelectItem>
                                  )}
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
                  
                  <div className="flex items-start">
                    <Mail className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                    <div>
                      <p className="font-medium">{customer.name}</p>
                      <p className="text-sm text-gray-500">{customer.contact_email || 'No email'}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <Phone className="h-5 w-5 text-gray-400 mt-0.5 mr-3" />
                    <p>{customer.contact_phone || 'No phone number'}</p>
                  </div>
                </div>
                
                <div className="mt-6">
                  <h4 className="text-sm font-medium text-gray-500 mb-2">External Systems</h4>
                  <div className="space-y-2">
                    {/* HubSpot - external link removed */}
                    <Button variant="outline" className="w-full justify-start" disabled>
                        <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="#ff7a59">
                          <path d="M22.447 9.564h-5.01v5.011h5.01V9.564zm-9.206 0h-5.01v5.011h5.01V9.564zm-9.207 0h-2.43l-1.8 5.011h4.23V9.564zm18.413 7.525h-5.01v5.011h5.01v-5.011zm-9.206 0h-5.01v5.011h5.01v-5.011zm-9.207 0H.021l-0.021 5.011h4.23v-5.011zm18.413-15.049h-5.01v5.011h5.01V2.04zm-9.206 0h-5.01v5.011h5.01V2.04zm-9.207 0H.021L0 7.051h4.23V2.04z"/>
                        </svg>
                        HubSpot Data
                    </Button>

                    {/* Chargebee information */}
                    {(customer.chargebee_customer_id || externalData?.chargebee?.customer) && (
                      <div>
                        <Button variant="outline" className="w-full justify-start mb-1" asChild>
                          <a 
                            href={customer.chargebee_customer_id ? 
                              `https://getreelo.chargebee.com/d/customers/${customer.chargebee_customer_id}` : 
                              "https://getreelo.chargebee.com"} 
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



                    {/* Intercom - external link removed */}
                    <Button variant="outline" className="w-full justify-start" disabled>
                        <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="#1F8DED">
                          <path d="M12 1.6C6.273 1.6 1.6 6.273 1.6 12c0 5.727 4.673 10.4 10.4 10.4 5.727 0 10.4-4.673 10.4-10.4 0-5.727-4.673-10.4-10.4-10.4zM7.2 14.4c-1.323 0-2.4-1.077-2.4-2.4s1.077-2.4 2.4-2.4c1.323 0 2.4 1.077 2.4 2.4s-1.077 2.4-2.4 2.4zm5.5 1.323c0 .827-.673 1.5-1.5 1.5s-1.5-.673-1.5-1.5.673-1.5 1.5-1.5 1.5.673 1.5 1.5zm3.3-1.323c-1.323 0-2.4-1.077-2.4-2.4s1.077-2.4 2.4-2.4c1.323 0 2.4 1.077 2.4 2.4s-1.077 2.4-2.4 2.4z"/>
                        </svg>
                        Intercom Data
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="mt-4">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">Account Manager</CardTitle>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        {customer.assigned_csm ? "Change" : "Assign"} CSM
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Assign CSM to {customer.name}</DialogTitle>
                        <DialogDescription>
                          Select a Customer Success Manager to be responsible for this account.
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="py-4">
                        <div className="grid w-full items-center gap-4">
                          <div className="flex flex-col space-y-1.5">
                            <Label htmlFor="csm">Select CSM</Label>
                            <Select onValueChange={(value) => handleAssignCSM(parseInt(value))}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a CSM" />
                              </SelectTrigger>
                              <SelectContent>
                                {users && users.length > 0 ? (
                                  users
                                    .filter(user => user.role === 'csm')
                                    .map(csm => (
                                      <SelectItem key={csm.id} value={csm.id.toString()}>
                                        {csm.name}
                                      </SelectItem>
                                    ))
                                ) : (
                                  <SelectItem value="" disabled>Loading CSMs...</SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
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
