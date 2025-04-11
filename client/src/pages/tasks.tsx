import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  CheckSquare, 
  Clock, 
  Filter, 
  Plus, 
  Search, 
  User, 
  Calendar 
} from "lucide-react";
import { Task } from "@shared/schema";
import { TaskStatus } from "@shared/types";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function Tasks() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [assigneeFilter, setAssigneeFilter] = useState<number | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  
  const { data: tasks, isLoading: isLoadingTasks } = useQuery({
    queryKey: ['/api/tasks'],
  });
  
  const { data: users } = useQuery({
    queryKey: ['/api/users'],
  });
  
  const { data: customers } = useQuery({
    queryKey: ['/api/customers'],
  });
  
  // Format users and customers data for lookups
  const userMap = users?.reduce((acc: any, user: any) => {
    acc[user.id] = user;
    return acc;
  }, {}) || {};
  
  const customerMap = customers?.reduce((acc: any, customer: any) => {
    acc[customer.id] = customer;
    return acc;
  }, {}) || {};
  
  const filteredTasks = tasks?.filter((task: Task) => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (task.description && task.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = !statusFilter || task.status === statusFilter;
    const matchesAssignee = !assigneeFilter || task.assigned_to === assigneeFilter;
    
    return matchesSearch && matchesStatus && matchesAssignee;
  });
  
  const getStatusBadgeStyles = (status: TaskStatus) => {
    switch (status) {
      case 'pending':
        return "bg-yellow-100 text-yellow-800";
      case 'in_progress':
        return "bg-green-100 text-green-800";
      case 'completed':
        return "bg-blue-100 text-blue-800";
      case 'overdue':
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };
  
  // Group tasks by status
  const tasksByStatus = {
    pending: filteredTasks?.filter((task: Task) => task.status === 'pending') || [],
    in_progress: filteredTasks?.filter((task: Task) => task.status === 'in_progress') || [],
    completed: filteredTasks?.filter((task: Task) => task.status === 'completed') || [],
    overdue: filteredTasks?.filter((task: Task) => task.status === 'overdue') || [],
  };

  return (
    <>
      <div className="bg-white shadow">
        <div className="px-4 sm:px-6 lg:max-w-7xl lg:mx-auto lg:px-8">
          <div className="py-6 md:flex md:items-center md:justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-semibold text-gray-900">Task Management</h1>
              <p className="mt-1 text-sm text-gray-500">
                Create, track, and manage customer success tasks
              </p>
            </div>
            <div className="mt-4 flex md:mt-0 md:ml-4">
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    New Task
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Task</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="title">Task Title</Label>
                      <Input id="title" placeholder="Enter task title" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea id="description" placeholder="Enter task description" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="customer">Customer</Label>
                      <Select>
                        <SelectTrigger id="customer">
                          <SelectValue placeholder="Select customer" />
                        </SelectTrigger>
                        <SelectContent>
                          {customers?.map((customer: any) => (
                            <SelectItem key={customer.id} value={customer.id.toString()}>
                              {customer.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="assignee">Assign To</Label>
                      <Select>
                        <SelectTrigger id="assignee">
                          <SelectValue placeholder="Select team member" />
                        </SelectTrigger>
                        <SelectContent>
                          {users?.map((user: any) => (
                            <SelectItem key={user.id} value={user.id.toString()}>
                              {user.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="due_date">Due Date</Label>
                      <Input id="due_date" type="date" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="status">Status</Label>
                      <Select>
                        <SelectTrigger id="status">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex justify-end mt-4">
                      <Button 
                        variant="outline" 
                        onClick={() => setIsCreateDialogOpen(false)}
                        className="mr-2"
                      >
                        Cancel
                      </Button>
                      <Button>Create Task</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </div>
      
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6 flex flex-col md:flex-row justify-between gap-4">
          <div className="relative w-full md:w-1/3">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <Input
              type="search"
              placeholder="Search tasks..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Select value={statusFilter || ""} onValueChange={(value) => setStatusFilter(value || null)}>
              <SelectTrigger className="w-[150px]">
                <div className="flex items-center">
                  <Filter className="h-4 w-4 mr-2" />
                  <span>{statusFilter ? statusFilter.replace('_', ' ') : 'Status'}</span>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={assigneeFilter?.toString() || ""} onValueChange={(value) => setAssigneeFilter(value ? parseInt(value) : null)}>
              <SelectTrigger className="w-[150px]">
                <div className="flex items-center">
                  <User className="h-4 w-4 mr-2" />
                  <span>Assignee</span>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Assignees</SelectItem>
                {users?.map((user: any) => (
                  <SelectItem key={user.id} value={user.id.toString()}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <Tabs defaultValue="list" className="w-full">
          <TabsList className="w-full justify-start mb-4">
            <TabsTrigger value="list">List View</TabsTrigger>
            <TabsTrigger value="kanban">Kanban View</TabsTrigger>
          </TabsList>
          
          <TabsContent value="list">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>All Tasks</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingTasks ? (
                  <div className="text-center py-10">Loading tasks...</div>
                ) : filteredTasks?.length > 0 ? (
                  <ul className="divide-y divide-gray-200">
                    {filteredTasks.map((task: Task) => (
                      <li key={task.id}>
                        <div className="block hover:bg-gray-50">
                          <div className="px-4 py-4 sm:px-6">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium text-teal-600 truncate">
                                {task.title}
                              </p>
                              <div className="ml-2 flex-shrink-0 flex">
                                <Badge className={cn("px-2 text-xs leading-5 font-semibold rounded-full", getStatusBadgeStyles(task.status))}>
                                  {task.status.replace('_', ' ')}
                                </Badge>
                              </div>
                            </div>
                            <div className="mt-2 sm:flex sm:justify-between">
                              <div className="sm:flex">
                                <p className="flex items-center text-sm text-gray-500">
                                  <User className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                                  Assigned to: {userMap[task.assigned_to]?.name || 'Unassigned'}
                                </p>
                                <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                                  <Building className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                                  {customerMap[task.customer_id]?.name || 'No customer'}
                                </p>
                              </div>
                              <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                                <Calendar className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400" />
                                <p>
                                  Due {task.due_date ? format(new Date(task.due_date), 'MMM d, yyyy') : 'No due date'}
                                </p>
                              </div>
                            </div>
                            {task.description && (
                              <div className="mt-2">
                                <p className="text-sm text-gray-500">{task.description}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-center py-10">
                    <p className="text-gray-500">No tasks match your search criteria.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="kanban">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <KanbanColumn 
                title="Pending" 
                icon={<Clock className="h-5 w-5 text-yellow-500" />}
                tasks={tasksByStatus.pending}
                userMap={userMap}
                customerMap={customerMap}
                getStatusBadgeStyles={getStatusBadgeStyles}
              />
              
              <KanbanColumn 
                title="In Progress" 
                icon={<CheckSquare className="h-5 w-5 text-green-500" />}
                tasks={tasksByStatus.in_progress}
                userMap={userMap}
                customerMap={customerMap}
                getStatusBadgeStyles={getStatusBadgeStyles}
              />
              
              <KanbanColumn 
                title="Completed" 
                icon={<CheckSquare className="h-5 w-5 text-blue-500" />}
                tasks={tasksByStatus.completed}
                userMap={userMap}
                customerMap={customerMap}
                getStatusBadgeStyles={getStatusBadgeStyles}
              />
              
              <KanbanColumn 
                title="Overdue" 
                icon={<Clock className="h-5 w-5 text-red-500" />}
                tasks={tasksByStatus.overdue}
                userMap={userMap}
                customerMap={customerMap}
                getStatusBadgeStyles={getStatusBadgeStyles}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

interface KanbanColumnProps {
  title: string;
  icon: React.ReactNode;
  tasks: Task[];
  userMap: Record<number, any>;
  customerMap: Record<number, any>;
  getStatusBadgeStyles: (status: TaskStatus) => string;
}

function KanbanColumn({ title, icon, tasks, userMap, customerMap, getStatusBadgeStyles }: KanbanColumnProps) {
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="flex items-center mb-3">
        {icon}
        <h3 className="text-lg font-medium ml-2">{title}</h3>
        <Badge className="ml-2">{tasks.length}</Badge>
      </div>
      
      <div className="space-y-3">
        {tasks.length > 0 ? (
          tasks.map((task) => (
            <Card key={task.id} className="cursor-pointer hover:shadow transition-shadow">
              <CardContent className="p-3">
                <h4 className="font-medium text-teal-600">{task.title}</h4>
                {task.description && (
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">{task.description}</p>
                )}
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center">
                    <User className="h-4 w-4 text-gray-400 mr-1" />
                    <span className="text-xs text-gray-500">
                      {userMap[task.assigned_to]?.name || 'Unassigned'}
                    </span>
                  </div>
                  {task.due_date && (
                    <span className="text-xs text-gray-500">
                      {format(new Date(task.due_date), 'MMM d')}
                    </span>
                  )}
                </div>
                <div className="mt-2">
                  <Badge variant="outline" className="text-xs">
                    {customerMap[task.customer_id]?.name || 'No customer'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="text-center py-6 text-gray-400 text-sm">
            No tasks
          </div>
        )}
      </div>
    </div>
  );
}
